import type { PoolClient } from "pg";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, stat } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { contained, publicRoot } from "./paths";

async function resolveStoragePath(requested: string): Promise<string> {
  try {
    return await realpath(requested);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const parent = dirname(requested);
    if (parent === requested) throw error;
    const entry = await lstat(requested).catch(
      (missing: NodeJS.ErrnoException) => {
        if (missing.code !== "ENOENT") throw missing;
        return null;
      },
    );
    if (entry) throw new Error("SQLite file has an unresolved link");
    return resolve(await resolveStoragePath(parent), basename(requested));
  }
}

export async function databasePath(
  requested = resolve(process.env.SQLITE_PATH || "work/sqlite/tba.db"),
  directory = resolve("dist"),
) {
  const root = await publicRoot(directory, true);
  if (contained(root, requested) || contained(directory, requested))
    throw new Error("SQLite must be outside dist");
  const actual = await resolveStoragePath(requested);
  if (contained(root, actual)) throw new Error("SQLite must be outside dist");
  await mkdir(dirname(actual), { recursive: true, mode: 0o700 });
  const info = await stat(actual).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
  if (
    info &&
    (!info.isFile() || (process.platform !== "win32" && info.mode & 0o077))
  )
    throw new Error("SQLite must be a regular private file (0600)");
  for (const suffix of ["-wal", "-shm", "-journal"]) {
    const info = await lstat(actual + suffix).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
        return null;
      },
    );
    if (info && !info.isFile())
      throw new Error("SQLite auxiliary files must be regular files");
  }
  return actual;
}

const names = [
  "0001_initial.sql",
  "0002_defaults_and_guards.sql",
  "0003_session_authorization.sql",
];
const history =
  "CREATE TABLE IF NOT EXISTS tba_migration (name TEXT PRIMARY KEY, sha TEXT NOT NULL)";
const appliedSql = "SELECT name,sha FROM tba_migration ORDER BY name";
type Applied = { name: string; sha: string }[];
async function migrations(postgresql: boolean) {
  return Promise.all(
    names.map(async (name) => {
      const text = await readFile(
        `drizzle/${postgresql ? "postgresql/" : ""}${name}`,
        "utf8",
      );
      return {
        name,
        text,
        sha: createHash("sha256").update(text).digest("hex"),
      };
    }),
  );
}
function unapplied(
  applied: Applied,
  scripts: Awaited<ReturnType<typeof migrations>>,
) {
  if (
    !applied.every(
      (row, index) =>
        scripts[index]?.name === row.name && scripts[index].sha === row.sha,
    )
  )
    throw new Error("Database migration history does not match");
  return scripts.slice(applied.length);
}
const bootstrap = `INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,status,role_id)
SELECT ?,?,?,FALSE,?,?,'active','administrator'
WHERE NOT EXISTS(SELECT 1 FROM "user" WHERE role_id='administrator' AND status='active')`;

export class SQLiteDriverUnavailable extends Error {
  constructor() {
    super(
      "SQLite driver unavailable. Run npm ci --include=optional on a supported Node.js and platform. If no compatible binary is available, follow the better-sqlite3 native build instructions.",
    );
  }
}
async function openSQLiteStorage() {
  try {
    const { openSQLite } = await import("../database/adapters/sqlite");
    return openSQLite(await databasePath());
  } catch (error) {
    if (
      error instanceof Error &&
      ([
        "ERR_MODULE_NOT_FOUND",
        "MODULE_NOT_FOUND",
        "ERR_DLOPEN_FAILED",
      ].includes((error as NodeJS.ErrnoException).code || "") ||
        /Could not locate the bindings file|NODE_MODULE_VERSION/i.test(
          error.message,
        ))
    )
      throw new SQLiteDriverUnavailable();
    throw error;
  }
}

export async function openStorage(engine: string) {
  const scripts = await migrations(engine === "postgresql");
  if (engine === "sqlite") {
    const { connection, persistence } = await openSQLiteStorage();
    function ready() {
      const found = connection
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type='table' AND name='tba_migration'",
        )
        .get();
      if (
        !found ||
        unapplied(connection.prepare(appliedSql).all() as Applied, scripts)
          .length
      )
        throw new Error("Run npm run db:migrate:local first");
    }
    return {
      persistence,
      ready,
      migrate() {
        connection
          .transaction(() => {
            connection.exec(history);
            for (const { name, text, sha } of unapplied(
              connection.prepare(appliedSql).all() as Applied,
              scripts,
            )) {
              connection.exec(text);
              connection
                .prepare("INSERT INTO tba_migration (name,sha) VALUES (?,?)")
                .run(name, sha);
            }
          })
          .immediate();
      },
      bootstrap(email: string, name: string) {
        ready();
        const now = Date.now();
        connection
          .transaction(() => {
            connection
              .prepare(bootstrap)
              .run(crypto.randomUUID(), name, email, now, now);
          })
          .immediate();
      },
      close: () => connection.close(),
    };
  }
  if (engine !== "postgresql")
    throw new Error("Select SQLite or PostgreSQL to use Node.js");
  const { openPostgreSQL, postgresTarget } =
    await import("../database/adapters/postgresql");
  const env = process.env;
  const destination = postgresTarget(env.DATABASE_URL);
  function confirmLabel(value?: string) {
    const label = destination.loopback
      ? destination.name
      : `${destination.url.hostname}:${destination.url.port || "5432"}/${destination.name}`;
    if (value !== label)
      throw new Error(
        "Pass --target with the exact PostgreSQL database name (host:port/database for a non-loopback host)",
      );
  }
  async function confirmConnection(client: PoolClient) {
    const { rows } = await client.query("SELECT current_database() AS name");
    if (rows[0]?.name !== destination.name)
      throw new Error(
        "The connected PostgreSQL database does not match --target",
      );
  }
  const { persistence, transaction, pool } = openPostgreSQL(env.DATABASE_URL, {
    max: env.PG_POOL_MAX,
    timeout: env.PG_CONNECT_TIMEOUT_MS,
    idle: env.PG_IDLE_TIMEOUT_MS,
    ca: env.PG_CA_FILE ? await readFile(env.PG_CA_FILE, "utf8") : undefined,
  });
  async function ready() {
    const {
      rows: [row],
    } = await pool.query("SELECT to_regclass('tba_migration') AS history");
    if (
      !row?.history ||
      unapplied((await pool.query(appliedSql)).rows as Applied, scripts).length
    )
      throw new Error(
        "Run npm run db:migrate:local -- --target <database> first",
      );
  }
  return {
    persistence,
    ready,
    async migrate(target?: string) {
      confirmLabel(target);
      await transaction(async (client) => {
        await confirmConnection(client);
        await client.query("SELECT pg_advisory_xact_lock(41991, 2822)");
        await client.query(history);
        for (const { name, text, sha } of unapplied(
          (await client.query(appliedSql)).rows as Applied,
          scripts,
        )) {
          await client.query(text);
          await client.query(
            "INSERT INTO tba_migration (name,sha) VALUES ($1,$2)",
            [name, sha],
          );
        }
      });
    },
    async bootstrap(email: string, name: string, target?: string) {
      confirmLabel(target);
      await ready();
      const now = Date.now();
      await transaction(async (client) => {
        await confirmConnection(client);
        await client.query(
          "SELECT id FROM tba_admin_guard WHERE id=1 FOR UPDATE",
        );
        await client.query(
          `INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,status,role_id)
          SELECT $1,$2,$3,FALSE,$4,$5,'active','administrator'
          WHERE NOT EXISTS(SELECT 1 FROM "user" WHERE role_id='administrator' AND status='active')`,
          [crypto.randomUUID(), name, email, now, now],
        );
      });
    },
    close: () => pool.end(),
  };
}
