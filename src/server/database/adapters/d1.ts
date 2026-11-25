import { drizzle } from "drizzle-orm/d1";
import * as schema from "../schema";

export function createD1Database(binding: D1Database) {
  return drizzle(binding);
}

export function createD1AuthDatabase(binding: D1Database) {
  return drizzle(binding, { schema });
}
