import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/server/database/schema.ts",
  out: "./drizzle/generated",
  dialect: "sqlite",
});
