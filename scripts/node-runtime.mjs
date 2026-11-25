import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { configuredRuntime } from "./database-engine.mjs";

const runtime = await configuredRuntime();
const explicit = process.argv[2]?.startsWith("--engine=")
  ? process.argv.splice(2, 1)[0].slice(9)
  : undefined;
if (runtime && explicit && explicit !== runtime.engine)
  throw new Error(
    "The requested engine differs from this installation. Create a separate installation for another engine.",
  );
const engine = explicit || runtime?.engine || "sqlite";
if (!["sqlite", "postgresql"].includes(engine))
  throw new Error("This command requires a SQLite or PostgreSQL installation.");
process.env.TBA_NODE_ENGINE = engine;
for (const [key, value] of Object.entries(runtime?.env || {}))
  if (process.env[key] === undefined) process.env[key] = value;

const root = resolve("work/node");
await mkdir(root, { recursive: true });
const directory = await mkdtemp(join(root, "run-"));
try {
  const outfile = join(directory, "server.mjs");
  await build({
    entryPoints: ["src/server/runtime/node.ts"],
    outdir: directory,
    entryNames: "server",
    outExtension: { ".js": ".mjs" },
    splitting: true,
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    target: "node24",
  });
  await import(pathToFileURL(outfile).href);
} finally {
  await rm(directory, { recursive: true, force: true });
}
