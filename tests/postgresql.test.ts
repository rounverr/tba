import { setTimeout as pause } from "node:timers/promises";
import type { Pool, PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../src/server/index";
import { rebuildAuthorization } from "../src/server/session-access";
import { readBasicList } from "../src/server/basic-lists";
import type { RuntimeEnv } from "../src/server/types";
import { postgresqlFixture, testPostgreSQL } from "./persistence-fixture";

let database: Awaited<ReturnType<typeof postgresqlFixture>>;
const migrations = [
  "0001_initial.sql",
  "0002_defaults_and_guards.sql",
  "0003_session_authorization.sql",
];
const user = `INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,status,role_id)
VALUES($1,$1,$1||'@example.test',TRUE,$2,$2,'active',$3)`;
async function independent<T>(
  pool: Pool,
  run: (one: PoolClient, two: PoolClient) => Promise<T>,
) {
  const one = await pool.connect();
  const two = await pool.connect();
  try {
    const first = await one.query("SELECT pg_backend_pid() AS pid");
    const second = await two.query("SELECT pg_backend_pid() AS pid");
    expect(first.rows[0].pid).not.toBe(second.rows[0].pid);
    return await run(one, two);
  } finally {
    await Promise.allSettled([one.query("ROLLBACK"), two.query("ROLLBACK")]);
    one.release();
    two.release();
  }
}
async function waitForLock(pool: Pool, applicationName: string) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const result = await pool.query(
      "SELECT 1 FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock'",
      [applicationName],
    );
    if (result.rowCount) return;
    await pause(10);
  }
  throw new Error("Expected PostgreSQL lock contention");
}

describe.skipIf(!testPostgreSQL)("PostgreSQL independent connections", () => {
  beforeAll(async () => {
    database = await postgresqlFixture(migrations);
  });
  afterAll(async () => {
    await database?.dispose();
  });

  it("rejects the competing removal of the final administrator", async () => {
    const { pool } = database;
    const now = Date.now();
    await pool.query(user, ["admin-a", now, "administrator"]);
    await pool.query(user, ["admin-b", now, "administrator"]);
    await independent(pool, async (first, second) => {
      const label = "tba-test-admin-lock";
      await first.query("BEGIN");
      await second.query("BEGIN");
      await second.query(`SET LOCAL application_name = '${label}'`);
      await first.query(
        `UPDATE "user" SET status='suspended' WHERE id='admin-a'`,
      );
      const blocked = second
        .query(`DELETE FROM "user" WHERE id='admin-b'`)
        .catch((error: unknown) => error);
      await waitForLock(pool, label);
      await first.query("COMMIT");
      expect(await blocked).toMatchObject({ code: "23514" });
      await second.query("ROLLBACK");
    });
    const { rows } = await pool.query(
      `SELECT id FROM "user" WHERE status='active' AND role_id='administrator'`,
    );
    expect(rows).toEqual([{ id: "admin-b" }]);
    expect(
      (await pool.query("SELECT active_count FROM tba_admin_guard")).rows,
    ).toEqual([{ active_count: 1 }]);
  });

  it("rolls back a transaction after a lock timeout and reuses its connections", async () => {
    const { pool } = database;
    await independent(pool, async (first, second) => {
      await first.query("BEGIN");
      await first.query(`SELECT id FROM "user" WHERE id='admin-b' FOR UPDATE`);
      await second.query("BEGIN");
      await second.query("SET LOCAL lock_timeout='100ms'");
      await second.query(
        "INSERT INTO audit(id,action,result,created_at) VALUES('uncommitted','test','success',1)",
      );
      await expect(
        second.query(`UPDATE "user" SET name='stale' WHERE id='admin-b'`),
      ).rejects.toMatchObject({ code: "55P03" });
      await second.query("ROLLBACK");
      expect(
        (await second.query("SELECT id FROM audit WHERE id='uncommitted'"))
          .rowCount,
      ).toBe(0);
      expect((await second.query("SELECT 1")).rowCount).toBe(1);
    });
  });

  it("does not tag a snapshot with the version from a different role state", async () => {
    const { pool, persistence } = database;
    const now = Date.now();
    await pool.query(
      "INSERT INTO role(id,name,permissions) VALUES('concurrent','Concurrent','[\"users.edit\"]')",
    );
    await pool.query(user, ["snapshot-user", now, "concurrent"]);
    await pool.query(
      `INSERT INTO session(id,token,user_id,created_at,updated_at,expires_at)
      VALUES ('session-fixture','test-session-token','snapshot-user',$1,$1,$2)`,
      [now, now + 60000],
    );
    const access = { includeAuthorization: true, trustHash: "" };
    const env = { DB: persistence } as RuntimeEnv;
    const read = async () =>
      (await persistence.readSession("test-session-token", access))!;
    const stale = await read();
    await independent(pool, async (first, second) => {
      await first.query("BEGIN");
      await first.query(
        `UPDATE role SET permissions='[]' WHERE id='concurrent'`,
      );
      // A different connection sees the previous permissions and version together
      // while the role update and trigger are still uncommitted.
      expect(await rebuildAuthorization(env, stale, "")).toMatchObject({
        permissions: ["users.edit"],
      });
      const previous = await second.query(
        "SELECT authorization_version FROM session WHERE id='session-fixture'",
      );
      expect(previous.rows[0].authorization_version).toBe(
        stale.authorizationVersion,
      );
      await first.query("COMMIT");
      const current = await read();
      expect(current.authorizationVersion).toBe(
        stale.authorizationVersion! + 1,
      );
      expect(await rebuildAuthorization(env, current, "")).toMatchObject({
        permissions: [],
      });
      const fresh = await read();
      expect(fresh.session.authorizationVersion).toBe(
        current.authorizationVersion,
      );
      expect(await rebuildAuthorization(env, current, "")).toBeNull();
    });
  });

  it("enforces the IP rate limit under concurrent OTP requests", async () => {
    const origin = "http://127.0.0.1:8787";
    const env = {
      DB: database.persistence,
      APP_URL: origin,
      APP_NAME: "TBA",
      MAIL_PROVIDER: "local",
      BETTER_AUTH_SECRET: crypto.randomUUID() + crypto.randomUUID(),
    } as RuntimeEnv;
    const statuses = await Promise.all(
      Array.from({ length: 21 }, async (_, index) => {
        const response = await app.fetch(
          new Request(origin + "/api/access/send", {
            method: "POST",
            headers: {
              origin,
              "content-type": "application/json",
              "cf-connecting-ip": "192.0.2.10",
            },
            body: JSON.stringify({ email: `unknown-${index}@example.test` }),
          }),
          env,
          { waitUntil() {}, passThroughOnException() {}, props: {} },
        );
        return response.status;
      }),
    );
    expect(statuses.filter((status) => status === 403)).toHaveLength(20);
    expect(statuses.filter((status) => status === 429)).toHaveLength(1);
  });

  it("orders timestamp ties by PostgreSQL row identity and projects only public audit fields", async () => {
    const { pool, persistence } = database;
    const at = Date.now();
    await pool.query(
      `INSERT INTO audit(id,action,result,created_at)
      SELECT 'list-audit-' || n,'login','success',$1
      FROM generate_series(1, 21) AS n ORDER BY n`,
      [at],
    );
    const first = await readBasicList(
      persistence,
      "audit",
      new URLSearchParams({ summary: "1" }),
    );
    expect(first.total).toBeGreaterThanOrEqual(21);
    expect(first.rows).toHaveLength(20);
    expect(first.hasMore).toBe(true);
    expect(first.rows[0]).toMatchObject({
      id: "list-audit-21",
      actor: null,
      resource: null,
      created_at: at,
    });
    expect(first.rows[0]).not.toHaveProperty("rowid");
    const second = await readBasicList(
      persistence,
      "audit",
      new URLSearchParams({ page: "2" }),
    );
    expect(second.rows[0]).toMatchObject({ id: "list-audit-1" });
    expect(second).not.toHaveProperty("total");
  });
});
