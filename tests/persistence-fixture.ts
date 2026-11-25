import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  command,
  execute,
  many,
  one,
  type Persistence,
} from "../src/server/database/persistence";

export const testSQLite = process.env.TBA_TEST_ENGINE === "sqlite";

export async function sqliteFixture(migrations: string[]) {
  const { openSQLite } = await import("../src/server/database/adapters/sqlite");
  const directory = await mkdtemp(join(tmpdir(), "tba-sqlite-"));
  const path = join(directory, "test.sqlite");
  const statements: string[] = [];
  const sqlite = openSQLite(path, (sql) => statements.push(sql));
  try {
    for (const migration of migrations)
      sqlite.connection.exec(await readFile("drizzle/" + migration, "utf8"));
  } catch (error) {
    sqlite.connection.close();
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  return {
    ...sqlite,
    path,
    statements,
    async dispose() {
      sqlite.connection.close();
      await rm(directory, { recursive: true, force: true });
    },
  };
}

export function fixtureSql(db: Persistence, text: string) {
  function bind(...parameters: unknown[]) {
    const query = command(text, ...parameters);
    return {
      first: <T = Record<string, unknown>>() => one<T>(db, query),
      all: <T = Record<string, unknown>>() => many<T>(db, query),
      run: () => execute(db, query),
    };
  }
  return { ...bind(), bind };
}

export const testPostgreSQL = process.env.TBA_TEST_ENGINE === "postgresql";
export const testStandalone = testSQLite || testPostgreSQL;

export async function postgresqlFixture(migrations: string[]) {
  const { postgresTarget, openPostgreSQL } =
    await import("../src/server/database/adapters/postgresql");
  const url = process.env.TBA_TEST_DATABASE_URL;
  if (!postgresTarget(url).loopback)
    throw new Error("PostgreSQL integration needs an isolated loopback server");
  const schema = "tba_test_" + crypto.randomUUID().replaceAll("-", "");
  const admin = openPostgreSQL(url);
  const statements: string[] = [];
  const db = openPostgreSQL(url, {
    schema,
    onStatement: (sql) => statements.push(sql),
  });
  async function dispose() {
    await db.pool.end();
    try {
      await admin.pool.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
    } finally {
      await admin.pool.end();
    }
  }
  try {
    await admin.pool.query('CREATE SCHEMA "' + schema + '"');
    for (const migration of migrations)
      await db.pool.query(
        await readFile("drizzle/postgresql/" + migration, "utf8"),
      );
  } catch (error) {
    await dispose();
    throw error;
  }
  return { ...db, schema, statements, dispose };
}
