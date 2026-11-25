import { requireD1 } from "./database-engine.mjs";
await requireD1();
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir, mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    remote: { type: "boolean" },
    account: { type: "string" },
    confirm: { type: "boolean" },
    config: { type: "string" },
  },
});
if (!values.email || !/^\S+@\S+\.\S+$/.test(values.email))
  throw new Error("Provide --email");
if (values.remote && (!values.confirm || !values.account))
  throw new Error(
    "Remote bootstrap requires --account and --confirm after authorization.",
  );
const configPath = values.config || "wrangler.jsonc";
const config = JSON.parse(await readFile(configPath, "utf8"));
if (
  values.remote &&
  (!config.d1_databases[0].database_id || config.account_id !== values.account)
)
  throw new Error("Remote binding or account has not been validated.");
if (/[\u0000-\u001f\u007f]/.test((values.name ?? "") + values.email))
  throw new Error(
    "Bootstrap names and email addresses must be single-line text",
  );
const literal = (value) =>
  `CAST(X'${Buffer.from(value, "utf8").toString("hex")}' AS TEXT)`;
const now = Date.now();
const email = values.email.trim().toLowerCase();
await mkdir("work", { recursive: true });
const directory = await mkdtemp(join("work", "bootstrap-"));
const file = join(directory, "bootstrap.sql");
// Only an empty installation can receive its first administrator through bootstrap.
try {
  await writeFile(
    file,
    `INSERT INTO user(id,name,email,email_verified,created_at,updated_at,status,role_id) SELECT ${literal(randomUUID())},${literal(values.name || "Administrator")},${literal(email)},0,${now},${now},'active','administrator' WHERE NOT EXISTS(SELECT 1 FROM user WHERE role_id='administrator' AND status='active');`,
    { mode: 0o600, flag: "wx" },
  );
  const result = spawnSync(
    "npx",
    [
      "--no-install",
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--config",
      configPath,
      values.remote ? "--remote" : "--local",
      "--file",
      file,
    ],
    {
      stdio: "ignore",
      env: {
        ...process.env,
        WRANGLER_LOG_PATH: join(directory, "wrangler.log"),
        ...(values.account ? { CLOUDFLARE_ACCOUNT_ID: values.account } : {}),
      },
    },
  );
  if (result.status !== 0) {
    console.error(
      "D1 bootstrap failed. Check the selected database, migrations and Wrangler configuration.",
    );
    process.exitCode = result.status || 1;
  } else
    console.log(
      "Bootstrap processed. Sign-in requires email verification by OTP. Existing administrators are not replaced.",
    );
} finally {
  await rm(directory, { recursive: true, force: true });
}
