import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import {
  command,
  execute,
  many,
  one,
  type Persistence,
} from "../src/server/database/persistence";
import { postgresStatement } from "../src/server/database/adapters/postgresql";
import { readBasicList } from "../src/server/basic-lists";
import {
  testPostgreSQL,
  testSQLite,
  postgresqlFixture,
  sqliteFixture,
} from "./persistence-fixture";

const text = `O’Neil "雪", D'Angelo; notes? 100% _ \\ ✅`;
let db: Persistence;
let close: () => Promise<unknown>;
beforeAll(async () => {
  if (testPostgreSQL) {
    const fixture = await postgresqlFixture([]);
    db = fixture.persistence;
    close = fixture.dispose;
  } else if (testSQLite) {
    const fixture = await sqliteFixture([]);
    db = fixture.persistence;
    close = fixture.dispose;
  } else {
    const mf = new Miniflare(
      convertV4MiniflareOptions({
        modules: true,
        script: "export default {fetch(){return new Response('fixture')}}",
        d1Databases: { DB: "sql-boundary-test" },
        compatibilityDate: "2026-11-04",
      }),
    );
    close = () => mf.dispose();
    db = await mf.getD1Database("DB");
  }
  const rowIdentity = testPostgreSQL
    ? "rowid bigint GENERATED ALWAYS AS IDENTITY,"
    : "";
  await execute(
    db,
    command("CREATE TABLE role(id text PRIMARY KEY,name text)"),
  );
  await execute(
    db,
    command(`
    CREATE TABLE "user"(${rowIdentity}id text PRIMARY KEY,name text,email text,
      status text,role_id text,two_factor_enabled boolean,last_access bigint)
  `),
  );
  await execute(
    db,
    command("INSERT INTO role(id,name) VALUES(?,?)", "viewer", "Consulta"),
  );
  for (let n = 1; n <= 21; n++)
    await execute(
      db,
      command(
        'INSERT INTO "user"(id,name,email,role_id) VALUES(?,?,?,?)',
        String(n),
        n === 21 ? text : "Synthetic account",
        `test-${n}@example.test`,
        "viewer",
      ),
    );
  await execute(
    db,
    command(
      "CREATE TABLE tba_literal_probe(id TEXT PRIMARY KEY,note TEXT,related TEXT)",
    ),
  );
  await execute(
    db,
    command(
      "INSERT INTO tba_literal_probe(id,note,related) VALUES(?,?,?)",
      "note",
      text,
      null,
    ),
  );
  await execute(
    db,
    command(
      "INSERT INTO tba_literal_probe(id,note,related) VALUES(?,?,?)",
      "sentinel",
      "another note",
      "preserve",
    ),
  );
});
afterAll(async () => {
  await close?.();
});

describe("SQL structure and literal values", () => {
  it("round-trips Unicode, apostrophes, quotes, semicolons, nulls and question marks through the real driver", async () => {
    expect(
      (
        await many(
          db,
          command(
            "SELECT id,note,related FROM tba_literal_probe WHERE note=?",
            text,
          ),
        )
      ).results,
    ).toEqual([{ id: "note", note: text, related: null }]);
  });

  it("reuses a stored value as a bound parameter in later reads and writes", async () => {
    const row = await one<{ note: string }>(
      db,
      command("SELECT note FROM tba_literal_probe WHERE id=?", "note"),
    );
    expect(row?.note).toBe(text);
    expect(
      await execute(
        db,
        command(
          "UPDATE tba_literal_probe SET related=? WHERE note=?",
          "checked",
          row!.note,
        ),
      ),
    ).toBe(1);
    expect(
      await one(
        db,
        command(
          "SELECT note,related FROM tba_literal_probe WHERE id=?",
          "sentinel",
        ),
      ),
    ).toEqual({ note: "another note", related: "preserve" });
    expect(
      (await many(db, command("SELECT id FROM tba_literal_probe ORDER BY id")))
        .results,
    ).toEqual([{ id: "note" }, { id: "sentinel" }]);
  });

  it("keeps list ordering and projection fixed with literal text and extra query fields", async () => {
    const baseline = await readBasicList(
      db,
      "users",
      new URLSearchParams({ summary: "1" }),
    );
    const additional = await readBasicList(
      db,
      "users",
      new URLSearchParams({
        summary: "1",
        q: text,
        sort: "name",
        direction: "asc",
        cursor: "unused",
      }),
    );
    expect(additional).toEqual(baseline);
    expect(baseline.total).toBe(21);
    expect(baseline.hasMore).toBe(true);
    expect(baseline.rows).toHaveLength(20);
    expect(baseline.rows[0]).toEqual({
      id: "21",
      name: text,
      email: "test-21@example.test",
      status: null,
      roleId: "viewer",
      mfa: null,
      lastAccess: null,
      role: "Visualizador",
    });
    const second = await readBasicList(
      db,
      "users",
      new URLSearchParams({ page: "2" }),
    );
    expect(second.rows).toEqual([expect.objectContaining({ id: "1" })]);
    expect(second.hasMore).toBe(false);
  });

  it("rejects invalid page boundaries before querying the database", async () => {
    for (const page of ["0", "-1", "1.5", "01", "100001", "1e2", text])
      await expect(
        readBasicList(db, "users", new URLSearchParams({ page })),
      ).rejects.toMatchObject({ status: 400 });
  });
});

describe("portable PostgreSQL grammar", () => {
  it("preserves quoted text, doubled quotes and parameter order", async () => {
    const sql = `SELECT 'O''Neil?' AS "note?", ?::text AS "say""?", ?::text AS nullable;`;
    const parameters = [text, null];
    const statement = postgresStatement(command(sql, ...parameters));
    expect(statement).toEqual({
      text: `SELECT 'O''Neil?' AS "note?", $1::text AS "say""?", $2::text AS nullable;`,
      values: parameters,
    });
    if (testPostgreSQL)
      expect(await one(db, command(sql, ...parameters))).toEqual({
        "note?": "O'Neil?",
        'say"?': text,
        nullable: null,
      });
  });

  it("rejects unsupported syntax and marker mismatches with a generic message", () => {
    for (const sql of [
      "SELECT 'unfinished",
      'SELECT "unfinished',
      "SELECT 1 -- note",
      "SELECT 1 /* note */",
      "SELECT $$note$$",
      "SELECT $tag$note$tag$",
      "SELECT E'note'",
      "SELECT U&'note'",
      "SELECT $1",
      "SELECT 1; SELECT 2",
      "SELECT '{}'::jsonb ?| ARRAY['key']",
      "SELECT '{}'::jsonb ?& ARRAY['key']",
    ])
      expect(() => postgresStatement(command(sql))).toThrow(
        "Unsupported portable PostgreSQL",
      );
    expect(() => postgresStatement(command("SELECT ?, ?", text))).toThrow(
      "Invalid SQL parameter count",
    );
    expect(() => postgresStatement(command("SELECT 1", text))).toThrow(
      "Invalid SQL parameter count",
    );
    expect(() =>
      postgresStatement(command("SELECT '{}'::jsonb ? 'key'")),
    ).toThrow("Invalid SQL parameter count");
  });
});
