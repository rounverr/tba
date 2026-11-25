import pg, { type PoolClient, type PoolConfig } from "pg";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../schema-postgresql";
import { sessionJoins } from "../session-joins";
import type { PostgreSQLPersistence, SqlCommand } from "../persistence";

export function postgresTarget(value: string | undefined) {
  let url: URL;
  try {
    url = new URL(value || "");
  } catch {
    throw new Error("Set a valid PostgreSQL DATABASE_URL");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    !/^\/[a-zA-Z0-9_.-]+$/.test(url.pathname) ||
    url.hash ||
    [...url.searchParams.keys()].some((key) => key !== "sslmode") ||
    url.searchParams.getAll("sslmode").length > 1
  )
    throw new Error(
      "DATABASE_URL needs an explicit PostgreSQL host and database; only sslmode is supported",
    );
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const mode =
    url.searchParams.get("sslmode") || (loopback ? "disable" : "verify-full");
  if (mode !== "verify-full" && !(mode === "disable" && loopback))
    throw new Error(
      "Use sslmode=verify-full or disable TLS for a loopback PostgreSQL server",
    );
  return {
    url,
    loopback,
    tls: mode === "verify-full",
    name: url.pathname.slice(1),
  };
}

function bounded(value: string | undefined, fallback: number, maximum: number) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum)
    throw new Error("Invalid PostgreSQL pool setting");
  return number;
}

// Portable, single-statement SQL. Use the native PostgreSQL path for migrations.
export function postgresStatement({ text, parameters }: SqlCommand) {
  let position = 0;
  const sql = text.replace(
    /'(?:''|[^'])*'|"(?:""|[^"])*"|\?[|&]|--|\/\*|[?'"$;\x00]/g,
    (token: string, offset: number) => {
      if (token === "?") return `$${++position}`;
      if (token === ";" && text.slice(offset + 1).trim() === "") return token;
      if (
        token.length > 1 &&
        (token.startsWith("'") || token.startsWith('"')) &&
        !/(?:^|[^a-z0-9_])(?:e|u&)$/i.test(
          text.slice(Math.max(0, offset - 3), offset),
        )
      )
        return token;
      throw new Error("Unsupported portable PostgreSQL statement syntax");
    },
  );
  if (position !== parameters.length)
    throw new Error("Invalid SQL parameter count");
  return { text: sql, values: parameters };
}

export function openPostgreSQL(
  value: string | undefined,
  options: {
    ca?: string;
    max?: string;
    timeout?: string;
    idle?: string;
    schema?: string;
    onStatement?: (sql: string) => void;
  } = {},
) {
  const { url, tls, name } = postgresTarget(value);
  url.search = "";
  const config: PoolConfig = {
    connectionString: url.href,
    ssl: tls ? { rejectUnauthorized: true, ca: options.ca } : false,
    max: bounded(options.max, 10, 100),
    connectionTimeoutMillis: bounded(options.timeout, 5000, 60000),
    idleTimeoutMillis: bounded(options.idle, 30000, 300000),
    statement_timeout: 15000,
    lock_timeout: 5000,
    idle_in_transaction_session_timeout: 15000,
    application_name: "tba",
    options: "-c standard_conforming_strings=on",
    types: {
      getTypeParser(oid, format) {
        if (oid === 20 && (!format || format === "text"))
          return (value: string) => {
            const number = Number(value);
            if (!Number.isSafeInteger(number))
              throw new RangeError(
                "PostgreSQL bigint exceeds safe integer range",
              );
            return number;
          };
        return pg.types.getTypeParser(oid, format);
      },
    },
  };
  // Integration fixtures use independent schemas on an isolated local server.
  if (options.schema) {
    if (!/^[a-z][a-z0-9_]*$/.test(options.schema))
      throw new Error("Invalid PostgreSQL schema");
    config.options += " -c search_path=" + options.schema;
  }
  const pool = new pg.Pool(config);
  pool.on("error", () =>
    console.error("PostgreSQL idle connection closed unexpectedly"),
  );
  const orm = drizzle(pool, {
    schema,
    logger: options.onStatement ? { logQuery: options.onStatement } : undefined,
  });
  async function transaction<T>(run: (client: PoolClient) => Promise<T>) {
    const client = await pool.connect();
    let discard = false;
    try {
      await client.query("BEGIN");
      const result = await run(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        discard = true;
      }
      throw error;
    } finally {
      client.release(discard);
    }
  }
  const query = (input: SqlCommand) => {
    options.onStatement?.(input.text);
    return pool.query(postgresStatement(input));
  };
  const persistence: PostgreSQLPersistence = {
    kind: "postgresql",
    orm,
    authSchema: schema,
    async readSession(token, access) {
      const { session, user, settings, assurance, trustedDevice } = schema;
      const joins = sessionJoins(access.trustHash);
      const query = orm
        .select({
          session,
          user,
          grant: assurance,
          device: trustedDevice,
          authorizationVersion: access.includeAuthorization
            ? settings.authorizationVersion
            : sql<null>`null`,
        })
        .from(session)
        .innerJoin(user, joins.account)
        .leftJoin(assurance, joins.grant)
        .leftJoin(trustedDevice, joins.device)
        .$dynamic();
      if (access.includeAuthorization) query.leftJoin(settings, joins.settings);
      return (await query.where(eq(session.token, token)).limit(1))[0] ?? null;
    },
    async one<T>(input: SqlCommand) {
      return ((await query(input)).rows[0] as T | undefined) ?? null;
    },
    async many<T>(input: SqlCommand) {
      return { results: (await query(input)).rows as T[] };
    },
    async execute(input) {
      return (await query(input)).rowCount || 0;
    },
    async atomic(queries, requireFirstRow) {
      return transaction(async (client) => {
        const results = [];
        for (const input of queries) {
          options.onStatement?.(input.text);
          const { rows } = await client.query(postgresStatement(input));
          if (requireFirstRow && results.length === 0 && !rows.length)
            throw new Error("Atomic update did not return a row");
          results.push({ results: rows });
        }
        return results;
      });
    },
  };
  return { pool, name, persistence, transaction };
}
