import { readFile, writeFile, access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { parseArgs, parseEnv } from "node:util";
import { createInterface } from "node:readline/promises";
import { parseConfigFileTextToJson } from "typescript";
import { configuredRuntime, engines, runtimeFile } from "./database-engine.mjs";
const existing = await configuredRuntime();
const { values } = parseArgs({
  options: {
    name: { type: "string" },
    id: { type: "string" },
    domain: { type: "string" },
    database: { type: "string" },
    "db-engine": { type: "string" },
    "sqlite-path": { type: "string" },
    host: { type: "string" },
    port: { type: "string" },
    account: { type: "string" },
    mail: { type: "string" },
    google: { type: "string" },
    mfa: { type: "string" },
    trust: { type: "string" },
    r2: { type: "string" },
    locale: { type: "string" },
    languages: { type: "string" },
    theme: { type: "string" },
    interactive: { type: "boolean" },
  },
});
const registry = JSON.parse(
  await readFile("src/config/languages.json", "utf8"),
);
const supportedLanguages = Object.keys(registry);
if (values.interactive) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  if (!existing && !values["db-engine"]) {
    const selection = (
      await rl.question(
        "Select database engine:\n\n1. Cloudflare D1 (default)\n2. SQLite\n3. PostgreSQL\n\nChoice: ",
      )
    ).trim();
    values["db-engine"] = { "": "d1", 1: "d1", 2: "sqlite", 3: "postgresql" }[
      selection
    ];
    if (!values["db-engine"]) throw new Error("Select 1, 2 or 3");
  }
  const selected = values["db-engine"] || existing?.engine || "d1";
  for (const key of [
    "name",
    "id",
    "domain",
    ...(selected === "d1"
      ? ["database", "account"]
      : [...(selected === "sqlite" ? ["sqlite-path"] : []), "host", "port"]),
    "mail",
    "google",
    "mfa",
    "trust",
    ...(selected === "d1" ? ["r2"] : []),
    "locale",
    "languages",
    "theme",
  ])
    values[key] ||= await rl.question(
      key === "languages"
        ? `languages (${supportedLanguages.join(",")}; English is always enabled; Enter to keep): `
        : key === "mail"
          ? `mail (local, resend${selected === "d1" ? ", cloudflare" : ""}; Enter to keep): `
          : `${key} (Enter to keep): `,
    );
  rl.close();
}
for (const [key, value] of Object.entries(values))
  if (value === "") delete values[key];
for (const key of ["google", "mfa", "trust", "r2"])
  if (values[key] !== undefined && !["true", "false"].includes(values[key]))
    throw new Error(`${key} requires true or false`);
const engine = values["db-engine"] || existing?.engine || "d1";
if (!engines.includes(engine))
  throw new Error("db-engine requires d1, sqlite or postgresql");
if (existing && existing.engine !== engine)
  throw new Error(
    "This installation already uses another engine. Run setup in a separate copy.",
  );
const standalone = engine !== "d1";
if (
  (standalone &&
    ["database", "account", "r2"].some((key) => values[key] !== undefined)) ||
  (!standalone &&
    ["sqlite-path", "host", "port"].some((key) => values[key] !== undefined)) ||
  (engine !== "sqlite" && values["sqlite-path"] !== undefined)
)
  throw new Error(
    "The supplied options are incompatible with the selected engine",
  );
if (standalone && values.mail === "cloudflare")
  throw new Error("Standalone Node.js supports local or Resend mail");

const local = await readFile(".dev.vars", "utf8").catch((error) => {
  if (error.code !== "ENOENT") throw error;
  return null;
});
const localEnv = local === null ? {} : parseEnv(local);
const app = JSON.parse(await readFile("src/config/app.json", "utf8"));
const parsed = parseConfigFileTextToJson(
  "wrangler.jsonc",
  await readFile("wrangler.jsonc", "utf8"),
);
if (parsed.error) throw new Error("Invalid Wrangler JSONC configuration");
const cf = parsed.config;
const requestedLanguages =
  values.languages === undefined
    ? app.languages || supportedLanguages
    : values.languages.split(",").map((value) => value.trim().toLowerCase());
if (
  !Array.isArray(requestedLanguages) ||
  requestedLanguages.length === 0 ||
  requestedLanguages.some((code) => !supportedLanguages.includes(code))
)
  throw new Error(
    `languages must contain supported codes: ${supportedLanguages.join(",")}`,
  );
app.languages = supportedLanguages.filter(
  (code) => code === "en" || requestedLanguages.includes(code),
);
const locale =
  values.locale?.trim().toLowerCase() ||
  (app.languages.includes(app.locale) ? app.locale : "en");
if (!app.languages.includes(locale))
  throw new Error("locale must be one of the enabled languages");
app.locale = locale;
const has = (path) =>
  access(path).then(
    () => true,
    (error) => {
      if (error.code === "ENOENT") return false;
      throw error;
    },
  );
if (!existing) {
  const d1Linked = !!(
    cf.account_id ||
    cf.d1_databases?.[0]?.database_id ||
    (await has(".wrangler/state/v3/d1"))
  );
  const sqlitePath =
    process.env.SQLITE_PATH || localEnv.SQLITE_PATH || "work/sqlite/tba.db";
  const sqliteExists = await has(sqlitePath);
  if ((standalone && d1Linked) || (engine !== "sqlite" && sqliteExists))
    throw new Error(
      "An existing database installation was detected. Run setup in a separate copy.",
    );
}
const nodeEnv = {
  APP_NAME: app.name,
  APP_URL: "http://127.0.0.1:8787",
  MAIL_PROVIDER: "local",
  MFA_ENABLED: cf.vars.MFA_ENABLED,
  GOOGLE_ENABLED: cf.vars.GOOGLE_ENABLED,
  TRUST_DEVICE_ENABLED: cf.vars.TRUST_DEVICE_ENABLED,
  HOST: "127.0.0.1",
  PORT: "8787",
  ...(engine === "sqlite"
    ? { SQLITE_PATH: localEnv.SQLITE_PATH || "work/sqlite/tba.db" }
    : {}),
  ...existing?.env,
};
const target = standalone ? nodeEnv : cf.vars;
if (standalone) {
  if (
    values.port &&
    (!/^\d+$/.test(values.port) ||
      Number(values.port) < 1 ||
      Number(values.port) > 65535)
  )
    throw new Error("port must be an integer between 1 and 65535");
  if (values.host && !/^[A-Za-z0-9.:%-]+$/.test(values.host))
    throw new Error("Invalid HTTP host");
  if (values.host) nodeEnv.HOST = values.host;
  if (values.port) {
    const previous = new URL(nodeEnv.APP_URL);
    if (
      !values.domain &&
      ["127.0.0.1", "localhost", "[::1]"].includes(previous.hostname)
    ) {
      previous.port = values.port;
      nodeEnv.APP_URL = previous.origin;
    }
    nodeEnv.PORT = values.port;
  }
  if (values["sqlite-path"]) {
    if (/[\r\n\0]/.test(values["sqlite-path"]))
      throw new Error("Invalid SQLite path");
    nodeEnv.SQLITE_PATH = values["sqlite-path"];
  }
}
if (values.name) {
  app.name = values.name;
  target.APP_NAME = values.name;
}
if (values.id) {
  if (!/^[a-z][a-z0-9-]{1,50}$/.test(values.id))
    throw new Error("Invalid application identifier");
  if (!standalone) cf.name = values.id;
}
if (values.domain) {
  const origin = new URL(values.domain);
  if (
    origin.href !== origin.origin + "/" ||
    !["https:", "http:"].includes(origin.protocol)
  )
    throw new Error("The domain must be an HTTP or HTTPS origin");
  if (
    origin.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
  )
    throw new Error("The domain must use HTTPS");
  target.APP_URL = origin.origin;
}
if (values.account) {
  if (!/^[a-f0-9]{32}$/.test(values.account))
    throw new Error("Invalid Cloudflare account");
  cf.account_id = values.account;
}
if (values.database) cf.d1_databases[0].database_name = values.database;
if (values.mail) {
  if (!["local", "resend", "cloudflare"].includes(values.mail))
    throw new Error("Unsupported mail provider");
  if (values.mail === "cloudflare") {
    const pending = [];
    const binding = cf.send_email?.find((entry) => entry.name === "EMAIL");
    if (!binding)
      pending.push('Add send_email: [{ "name": "EMAIL" }] to wrangler.jsonc.');
    let localSender = "";
    try {
      const local = await readFile(".dev.vars", "utf8");
      const value =
        local.match(/^\s*(?:export\s+)?MAIL_FROM\s*=\s*(.*?)\s*$/m)?.[1] || "";
      localSender = value.replace(/^(["'])(.*)\1$/, "$2");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const sender = String(
      process.env.MAIL_FROM || localSender || cf.vars.MAIL_FROM || "",
    ).trim();
    const address = sender.match(/<([^<>]+)>$/)?.[1] || sender;
    if (
      /[\r\n]/.test(sender) ||
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address)
    )
      pending.push(
        "Set a valid MAIL_FROM in Wrangler vars, .dev.vars or the target environment, using your verified Email Sending domain.",
      );
    if (
      binding?.allowed_sender_addresses &&
      !binding.allowed_sender_addresses.some(
        (value) => value.toLowerCase() === address.toLowerCase(),
      )
    )
      pending.push(
        "Match MAIL_FROM to the EMAIL binding allowed_sender_addresses.",
      );
    if (pending.length) {
      console.log(
        "Cloudflare mail setup is pending. Email delivery will work after completing these steps:",
      );
      for (const step of pending) console.log(`- ${step}`);
      if (values.interactive) {
        const rl = createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        const answer = await rl.question(
          "Continue setup and configure mail later? [Y/n] ",
        );
        rl.close();
        if (/^n(?:o)?$/i.test(answer.trim())) {
          console.log(
            "Setup canceled. No files or remote resources were changed.",
          );
          process.exit(0);
        }
      }
      console.log(
        "Continuing setup; configure mail later or choose local/resend. No resources were created.",
      );
    } else {
      console.log(
        "Cloudflare mail configuration validated locally. Verify your sending domain and configure MAIL_FROM in the target environment before deployment. No resources were created.",
      );
    }
  }
  target.MAIL_PROVIDER = values.mail;
}
if (values.theme) {
  if (!["light", "dark"].includes(values.theme))
    throw new Error("Invalid theme");
  app.theme = values.theme;
}
if (values.mfa !== undefined) target.MFA_ENABLED = String(values.mfa);
if (values.trust !== undefined)
  target.TRUST_DEVICE_ENABLED = String(values.trust);
if (values.google !== undefined) target.GOOGLE_ENABLED = values.google;
if (values.google === "true")
  console.log(
    "Google requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. Credentials are still required to enable sign-in.",
  );
if (values.r2 !== undefined) app.r2Requested = values.r2 === "true";
if (values.r2 === "true")
  console.log(
    "R2 is optional. No bucket was created or linked. See docs/en/operations.md.",
  );
if (standalone) {
  const publicOrigin = new URL(localEnv.APP_URL || nodeEnv.APP_URL);
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(
    publicOrigin.hostname,
  );
  const provider = localEnv.MAIL_PROVIDER || nodeEnv.MAIL_PROVIDER;
  if (
    (!loopback && publicOrigin.protocol !== "https:") ||
    !["local", "resend"].includes(provider) ||
    (provider === "local" && !loopback)
  )
    throw new Error(
      "Standalone needs local mail on loopback or Resend with an HTTPS public origin",
    );
  if (
    provider === "resend" &&
    !(process.env.RESEND_API_KEY || localEnv.RESEND_API_KEY)
  )
    console.log("Set RESEND_API_KEY and MAIL_FROM before using Resend.");
  if (engine === "postgresql")
    console.log(
      "Use a maintained PostgreSQL release; see docs/en/database-engines.md for tested versions.",
    );
  if (
    engine === "postgresql" &&
    !(process.env.DATABASE_URL || localEnv.DATABASE_URL)
  )
    console.log(
      "Set DATABASE_URL in .dev.vars or the environment before migrating PostgreSQL.",
    );
}
const runtime = {
  engine,
  ...(standalone
    ? { id: values.id || existing?.id || cf.name, env: nodeEnv }
    : {}),
};
await writeFile(runtimeFile, JSON.stringify(runtime, null, 2) + "\n", {
  flag: existing ? "w" : "wx",
});
await writeFile("src/config/app.json", JSON.stringify(app, null, 2) + "\n");
if (!standalone)
  await writeFile("wrangler.jsonc", JSON.stringify(cf, null, 2) + "\n");
try {
  await access(".dev.vars");
} catch {
  await writeFile(
    ".dev.vars",
    `BETTER_AUTH_SECRET=${randomBytes(48).toString("base64url")}\n`,
    { mode: 0o600, flag: "wx" },
  );
}
console.log("Local configuration prepared. No remote resources were created.");
