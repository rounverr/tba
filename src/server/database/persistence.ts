import { createD1AuthDatabase, createD1Database } from "./adapters/d1";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { SelectedFields } from "drizzle-orm/sqlite-core/query-builders/select.types";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as pgSchema from "./schema-postgresql";
import type * as schema from "./schema";

export type SqlCommand = { text: string; parameters: unknown[] };
export type RowSet<T> = { results: T[] };
export interface SQLitePersistence {
  kind: "sqlite";
  orm: BetterSQLite3Database<typeof schema>;
  one<T>(query: SqlCommand): Promise<T | null>;
  many<T>(query: SqlCommand): Promise<RowSet<T>>;
  execute(query: SqlCommand): Promise<number>;
  atomic(
    queries: SqlCommand[],
    requireFirstRow?: boolean,
  ): Promise<RowSet<unknown>[]>;
}
export interface PostgreSQLPersistence {
  kind: "postgresql";
  orm: NodePgDatabase<typeof pgSchema>;
  authSchema: typeof pgSchema;
  readSession(
    token: string,
    access: import("../session-access").SessionAccess,
  ): Promise<NonNullable<
    import("../session-access").SessionAccess["snapshot"]
  > | null>;
  one<T>(query: SqlCommand): Promise<T | null>;
  many<T>(query: SqlCommand): Promise<RowSet<T>>;
  execute(query: SqlCommand): Promise<number>;
  atomic(
    queries: SqlCommand[],
    requireFirstRow?: boolean,
  ): Promise<RowSet<unknown>[]>;
}
export type Persistence =
  D1Database | SQLitePersistence | PostgreSQLPersistence;

export function isPostgreSQL(db: Persistence): db is PostgreSQLPersistence {
  return "kind" in db && db.kind === "postgresql";
}
function isStandalone(
  db: Persistence,
): db is SQLitePersistence | PostgreSQLPersistence {
  return isSQLite(db) || isPostgreSQL(db);
}

export function isSQLite(db: Persistence): db is SQLitePersistence {
  return "kind" in db && db.kind === "sqlite";
}
export function authDatabase(db: Persistence) {
  return isStandalone(db) ? db.orm : createD1AuthDatabase(db);
}
export function command(text: string, ...parameters: unknown[]): SqlCommand {
  return { text, parameters };
}
export function one<T>(db: Persistence, query: SqlCommand) {
  return isStandalone(db)
    ? db.one<T>(query)
    : db
        .prepare(query.text)
        .bind(...query.parameters)
        .first<T>();
}
export function many<T>(
  db: Persistence,
  query: SqlCommand,
): Promise<RowSet<T>> {
  return isStandalone(db)
    ? db.many<T>(query)
    : db
        .prepare(query.text)
        .bind(...query.parameters)
        .all<T>();
}
export async function execute(db: Persistence, query: SqlCommand) {
  if (isStandalone(db)) return db.execute(query);
  return (
    await db
      .prepare(query.text)
      .bind(...query.parameters)
      .run()
  ).meta.changes;
}
export function atomic(
  db: Persistence,
  queries: SqlCommand[],
  requireFirstRow = false,
) {
  return isStandalone(db)
    ? db.atomic(queries, requireFirstRow)
    : db.batch(
        queries.map(({ text, parameters }) =>
          db.prepare(text).bind(...parameters),
        ),
      );
}

export function selectFields<T extends SelectedFields>(
  db: D1Database | SQLitePersistence,
  fields: T,
) {
  return isStandalone(db)
    ? db.orm.select(fields)
    : createD1Database(db).select(fields);
}
