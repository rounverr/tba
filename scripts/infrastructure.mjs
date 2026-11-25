import { requireD1 } from "./database-engine.mjs";
await requireD1();
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
const [operation, ...args] = process.argv.slice(2);
const { values } = parseArgs({
  args,
  options: {
    account: { type: "string" },
    name: { type: "string" },
    id: { type: "string" },
    confirm: { type: "boolean" },
    config: { type: "string" },
  },
});
const configPath = values.config || "wrangler.jsonc";
const config = JSON.parse(await readFile(configPath, "utf8"));
const account = values.account || config.account_id;
if (!account || !/^[a-f0-9]{32}$/.test(account))
  throw new Error("Provide --account with the exact Cloudflare account.");
function run(args, capture = false) {
  const r = spawnSync("npx", ["--no-install", "wrangler", ...args], {
    env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: account },
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (r.status !== 0)
    throw new Error(
      capture
        ? r.stderr
        : "The operation failed; configuration was not updated.",
    );
  return r.stdout;
}
const binding = config.d1_databases?.find((b) => b.binding === "DB");
if (!binding) throw new Error("The DB binding is missing");
if (["create", "link"].includes(operation)) {
  const databases = JSON.parse(run(["d1", "list", "--json"], true));
  if (operation === "create") {
    if (!values.name || !/^[a-z][a-z0-9-]{2,60}$/.test(values.name))
      throw new Error("Provide a valid --name");
    if (databases.some((d) => d.name === values.name))
      throw new Error(
        "A D1 database with this name already exists. Review its schema before using db:link.",
      );
    console.log(
      `Create D1 ${values.name} in account ${account}. No migrations will be applied.`,
    );
    if (!values.confirm)
      throw new Error(
        "Review the operation and run it again with --confirm after obtaining authorization.",
      );
    run(["d1", "create", values.name]);
    const created = JSON.parse(run(["d1", "list", "--json"], true)).find(
      (d) => d.name === values.name,
    );
    if (!created)
      throw new Error("Could not verify the new D1 database identifier.");
    binding.database_id = created.uuid;
    binding.database_name = created.name;
  } else {
    const existing = databases.find((d) => d.uuid === values.id);
    if (!existing)
      throw new Error("D1 database not found in the selected account.");
    run([
      "d1",
      "execute",
      existing.uuid,
      "--remote",
      "--command",
      "SELECT name,sql FROM sqlite_master WHERE type='table'",
    ]);
    console.log(
      `Link D1 ${existing.name}. Tables and data will not be changed.`,
    );
    if (!values.confirm)
      throw new Error(
        "Review the schema and run again with --confirm to save the binding.",
      );
    binding.database_id = existing.uuid;
    binding.database_name = existing.name;
  }
  config.account_id = account;
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
  console.log("Binding saved with the verified identifier.");
} else if (["migrate", "deploy"].includes(operation)) {
  if (
    !/^[a-f0-9-]{36}$/.test(binding.database_id || "") ||
    binding.database_name === "tba-local"
  )
    throw new Error("Explicitly link a remote D1 database before continuing.");
  if (!config.account_id || config.account_id !== account)
    throw new Error(
      "The account does not match the selected configuration file.",
    );
  if (!values.confirm)
    throw new Error(
      `Remote ${operation} on ${config.name}/${binding.database_name}. Review the target and add --confirm after obtaining authorization.`,
    );
  run(["d1", "info", binding.database_id, "--json"]);
  if (operation === "migrate")
    run([
      "d1",
      "migrations",
      "apply",
      "DB",
      "--remote",
      "--config",
      configPath,
    ]);
  else {
    if (
      !["resend", "cloudflare"].includes(config.vars.MAIL_PROVIDER) ||
      (config.vars.MAIL_PROVIDER === "cloudflare" &&
        !config.send_email?.some((x) => x.name === "EMAIL")) ||
      !config.vars.APP_URL.startsWith("https://")
    )
      throw new Error("Production requires HTTPS and a real mail provider.");
    run(["deploy", "--config", configPath]);
  }
} else throw new Error("Unsupported operation");
