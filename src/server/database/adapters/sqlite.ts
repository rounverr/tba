import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { SQLitePersistence, SqlCommand } from "../persistence";
import * as schema from "../schema";

export function openSQLite(path: string, verbose?: (sql: string) => void) {
  const connection = new Database(path, {
    timeout: 5000,
    verbose:
      verbose &&
      ((sql) => {
        if (typeof sql === "string") verbose(sql);
      }),
  });
  try {
    connection.pragma("foreign_keys = ON");
    connection.pragma("journal_mode = WAL");
    const prepare = ({ text }: SqlCommand) => connection.prepare(text);
    const batch = connection.transaction(
      (queries: SqlCommand[], requireFirstRow: boolean) =>
        queries.map((query, index) => {
          const statement = prepare(query);
          if (statement.reader) {
            const results = statement.all(...query.parameters);
            if (requireFirstRow && index === 0 && !results.length)
              throw new Error("Atomic update did not return a row");
            return { results };
          }
          statement.run(...query.parameters);
          return { results: [] };
        }),
    );
    const persistence: SQLitePersistence = {
      kind: "sqlite",
      orm: drizzle(connection, { schema }),
      async one<T>(query: SqlCommand) {
        return (
          (prepare(query).get(...query.parameters) as T | undefined) ?? null
        );
      },
      async many<T>(query: SqlCommand) {
        return { results: prepare(query).all(...query.parameters) as T[] };
      },
      async execute(query) {
        return prepare(query).run(...query.parameters).changes;
      },
      async atomic(queries, requireFirstRow = false) {
        return batch.immediate(queries, requireFirstRow);
      },
    };
    return { connection, persistence };
  } catch (error) {
    connection.close();
    throw error;
  }
}
