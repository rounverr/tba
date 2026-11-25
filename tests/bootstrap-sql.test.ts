import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

it("round-trips D1 bootstrap values and removes private files after success or failure", async () => {
  const work = resolve("work");
  await mkdir(work, { recursive: true });
  const cwd = await mkdtemp(join(work, "bootstrap-test-"));
  try {
    const config = join(cwd, "wrangler.jsonc");
    const state = join(cwd, ".wrangler/state");
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      XDG_CONFIG_HOME: join(cwd, "logs"),
      WRANGLER_SEND_METRICS: "false",
    };
    delete env.CLOUDFLARE_API_TOKEN;
    delete env.WRANGLER_LOG;
    await writeFile(
      config,
      JSON.stringify({
        name: "tba-local-bootstrap-fixture",
        compatibility_date: "2026-11-04",
        d1_databases: [
          {
            binding: "DB",
            database_name: "tba-bootstrap-fixture",
            database_id: "00000000-0000-4000-8000-000000000001",
          },
        ],
      }),
    );
    const bootstrap = resolve("scripts/bootstrap.mjs");
    const run = (name: string) =>
      spawnSync(
        process.execPath,
        [
          bootstrap,
          "--config",
          config,
          "--name",
          name,
          "--email",
          "Admin@example.test",
        ],
        { cwd, env, encoding: "utf8" },
      );
    const name = `O'Neil "雪"; notes? 100% _ \\ ✅`;
    const failed = run(name);
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain("D1 bootstrap failed");
    expect(failed.stderr).not.toContain(name);
    expect(await readdir(join(cwd, "work"))).toEqual([]);
    const tool = resolve("node_modules/wrangler/bin/wrangler.js");
    const call = (...args: string[]) =>
      execFileSync(
        process.execPath,
        [
          tool,
          "d1",
          "execute",
          "DB",
          "--config",
          config,
          "--local",
          "--persist-to",
          state,
          "--json",
          ...args,
        ],
        { cwd, env, encoding: "utf8" },
      );
    const sqlFile = join(cwd, "schema.sql");
    await writeFile(sqlFile, await readFile("drizzle/0001_initial.sql"));
    call("--file", sqlFile);
    call("--file", resolve("drizzle/0002_defaults_and_guards.sql"));
    const ok = run(name);
    expect(ok.status, ok.stderr).toBe(0);
    expect(await readdir(join(cwd, "work"))).toEqual([]);
    expect(run("Replacement").status).toBe(0);
    expect(await readdir(join(cwd, "work"))).toEqual([]);
    const rows = JSON.parse(
      call("--command", 'SELECT name,email,role_id FROM "user"'),
    );
    expect(rows[0].results).toEqual([
      { name, email: "admin@example.test", role_id: "administrator" },
    ]);
    const invalid = run("two\nlines");
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain("single-line text");
    expect(await readdir(join(cwd, "work"))).toEqual([]);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
