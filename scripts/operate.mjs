import { spawn } from "node:child_process";
import { configuredRuntime, requireD1 } from "./database-engine.mjs";

const [operation, ...args] = process.argv.slice(2);
const config = await configuredRuntime();
const engine = config?.engine ?? "d1";
function run(entry, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry, ...options], {
      stdio: "inherit",
    });
    const forward = (signal) => child.kill(signal);
    process.on("SIGINT", forward);
    process.on("SIGTERM", forward);
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      process.off("SIGINT", forward);
      process.off("SIGTERM", forward);
      resolve(code ?? (signal === "SIGINT" ? 130 : 1));
    });
  });
}
const wrangler = "node_modules/wrangler/bin/wrangler.js";
const astro = "node_modules/astro/bin/astro.mjs";
const nodeActions = {
  migrate: "migrate",
  bootstrap: "bootstrap",
  start: "serve",
  dev: "serve",
};
if (engine !== "d1" && Object.hasOwn(nodeActions, operation)) {
  if (operation === "dev" && (await run(astro, ["build"]))) process.exit(1);
  process.exitCode = await run("scripts/node-runtime.mjs", [
    nodeActions[operation],
    ...args,
  ]);
} else {
  switch (operation) {
    case "bootstrap":
      process.exitCode = await run("scripts/bootstrap.mjs", args);
      break;
    case "dev":
      process.exitCode = await run(astro, ["dev", ...args]);
      break;
    default: {
      await requireD1();
      const commands = {
        "worker-dev": ["dev"],
        start: ["dev"],
        migrate: ["d1", "migrations", "apply", "DB", "--local"],
        "worker-check": ["deploy", "--dry-run", "--outdir", "work/worker"],
        types: ["types"],
        generate: [],
      };
      if (!Object.hasOwn(commands, operation))
        throw new Error("Unknown database operation");
      if (
        operation === "migrate" &&
        args.some((arg) => /^--remote(?:=|$)/.test(arg))
      )
        throw new Error(
          "Use db:migrate:remote for confirmed remote migrations",
        );
      if (
        operation === "worker-check" &&
        args.some((arg) => /^--(?:no-dry-run|dry-run=)/.test(arg))
      )
        throw new Error("The Worker check always runs without uploading");
      if (operation === "generate") {
        process.exitCode = await run("node_modules/drizzle-kit/bin.cjs", [
          "generate",
          ...args,
        ]);
        break;
      }
      process.exitCode = await run(wrangler, [...commands[operation], ...args]);
    }
  }
}
