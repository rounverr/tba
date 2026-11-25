import { expect, it } from "vitest";
import app from "../src/server/index";
import { openPostgreSQL } from "../src/server/database/adapters/postgresql";
import type { RuntimeEnv } from "../src/server/types";
import { postgresqlFixture, testPostgreSQL } from "./persistence-fixture";

it.runIf(testPostgreSQL)(
  "runs authenticated operations with a non-owner PostgreSQL role",
  async () => {
    const fixture = await postgresqlFixture([
      "0001_initial.sql",
      "0002_defaults_and_guards.sql",
      "0003_session_authorization.sql",
    ]);
    const role = "tba_runtime_" + crypto.randomUUID().replaceAll("-", "");
    const owner = fixture.pool;
    let runtime: ReturnType<typeof openPostgreSQL> | undefined;
    let created = false;
    try {
      await owner.query(
        `CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`,
      );
      created = true;
      await owner.query(
        "CREATE TABLE tba_migration (name text PRIMARY KEY, sha text NOT NULL)",
      );
      await owner.query(`GRANT USAGE ON SCHEMA ${fixture.schema} TO ${role};
      GRANT SELECT, INSERT, UPDATE, DELETE ON "user", session, account, assurance, rate_limit, registration,
        registration_event, throttle, trusted_device, two_factor, verification TO ${role};
      GRANT SELECT, INSERT, UPDATE ON role TO ${role};
      GRANT SELECT, INSERT ON audit TO ${role};
      GRANT SELECT, UPDATE ON settings TO ${role};
      GRANT SELECT, UPDATE (active_count) ON tba_admin_guard TO ${role};
      GRANT SELECT ON tba_migration TO ${role};
      REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA ${fixture.schema} FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION tba_admin_delta(bigint) TO ${role}`);
      const now = Date.now();
      await owner.query(
        `INSERT INTO "user"(id,name,email,created_at,updated_at,status,role_id)
      VALUES('sql-privilege-admin','SQL fixture','privilege@example.test',$1,$1,'active','administrator')`,
        [now],
      );

      const url = new URL(process.env.TBA_TEST_DATABASE_URL!);
      url.username = role;
      url.password = "";
      runtime = openPostgreSQL(url.href, { schema: fixture.schema });
      expect(
        (await runtime.pool.query("SELECT current_user AS name")).rows[0].name,
      ).toBe(role);
      expect(
        (await runtime.pool.query("SELECT count(*) FROM tba_migration"))
          .rowCount,
      ).toBe(1);

      const mail: string[] = [];
      const origin = "http://localhost:8787";
      const env = {
        DB: runtime.persistence,
        APP_URL: origin,
        APP_NAME: "TBA SQL fixture",
        BETTER_AUTH_SECRET: crypto.randomUUID() + crypto.randomUUID(),
        MAIL_PROVIDER: "cloudflare",
        MAIL_FROM: "fixture@example.test",
        EMAIL: {
          async send(message: { text: string }) {
            mail.push(message.text);
            return { messageId: "fixture" };
          },
        },
        GOOGLE_ENABLED: "false",
        MFA_ENABLED: "true",
        TRUST_DEVICE_ENABLED: "true",
      } as RuntimeEnv;
      let cookie = "";
      async function call(path: string, data?: unknown) {
        const pending: Promise<unknown>[] = [];
        const response = await app.fetch(
          new Request(origin + "/api" + path, {
            method: data === undefined ? "GET" : "POST",
            headers: { origin, "Content-Type": "application/json", cookie },
            body: data === undefined ? undefined : JSON.stringify(data),
          }),
          env,
          {
            waitUntil(p) {
              pending.push(p);
            },
            passThroughOnException() {},
            props: {},
          },
        );
        await Promise.all(pending);
        const cookies = response.headers.getSetCookie();
        if (cookies.length)
          cookie = cookies.map((entry) => entry.split(";")[0]).join("; ");
        return response;
      }

      const email = "privilege@example.test";
      expect((await call("/access/send", { email })).status).toBe(200);
      const code = mail.at(-1)?.match(/\b\d{6}\b/)?.[0];
      expect(code).toBeTruthy();
      expect((await call("/access/verify", { email, code })).status).toBe(200);
      expect((await call("/private/users?context=1&summary=1")).status).toBe(
        200,
      );
      expect(
        (
          await call("/private/roles", {
            id: "privilege-role",
            name: "Test role",
            permissions: ["app.read"],
            isPublic: false,
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await call("/private/users", {
            name: "Second admin",
            email: "second-privilege@example.test",
            roleId: "administrator",
          })
        ).status,
      ).toBe(200);
      const id = (
        await owner.query('SELECT id FROM "user" WHERE email=$1', [
          "second-privilege@example.test",
        ])
      ).rows[0].id;
      expect((await call("/private/users/" + id + "/delete", {})).status).toBe(
        200,
      );
      expect((await call("/private/users?page=1&summary=1")).status).toBe(200);
      expect((await call("/private/export/users")).status).toBe(404);
      await expect(
        runtime.pool.query('UPDATE "user" SET status=$1 WHERE id=$2', [
          "disabled",
          "sql-privilege-admin",
        ]),
      ).rejects.toMatchObject({ code: "23514" });
      for (const sql of [
        "CREATE TABLE forbidden_relation(id integer)",
        "ALTER TABLE settings ADD COLUMN forbidden integer",
        "DROP TABLE tba_migration",
        "DELETE FROM audit WHERE id='missing'",
        "UPDATE tba_migration SET sha='missing'",
        "CREATE ROLE forbidden_role",
      ])
        await expect(runtime.pool.query(sql)).rejects.toMatchObject({
          code: "42501",
        });
    } finally {
      await runtime?.pool.end();
      try {
        if (created) {
          await owner.query(`DROP OWNED BY ${role}`);
          await owner.query(`DROP ROLE ${role}`);
        }
      } finally {
        await fixture.dispose();
      }
    }
  },
);
