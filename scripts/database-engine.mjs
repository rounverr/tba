import { readFile } from "node:fs/promises";

export const runtimeFile = "tba.runtime.json";
const nodeSettings = new Set([
  "APP_NAME",
  "APP_URL",
  "MAIL_PROVIDER",
  "MFA_ENABLED",
  "GOOGLE_ENABLED",
  "TRUST_DEVICE_ENABLED",
  "HOST",
  "PORT",
  "SQLITE_PATH",
]);
export const engines = ["d1", "sqlite", "postgresql"];
export async function configuredRuntime() {
  let config;
  try {
    config = JSON.parse(await readFile(runtimeFile, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  if (!engines.includes(config?.engine))
    throw new Error("Invalid database engine in " + runtimeFile);
  if (
    config.env !== undefined &&
    (!config.env ||
      typeof config.env !== "object" ||
      Object.entries(config.env).some(
        ([key, value]) => !nodeSettings.has(key) || typeof value !== "string",
      ))
  )
    throw new Error(
      "Invalid public runtime settings; put credentials in .dev.vars or the environment",
    );
  return config;
}
export async function requireD1() {
  const config = await configuredRuntime();
  if (config && config.engine !== "d1")
    throw new Error("This command requires a Cloudflare D1 installation.");
}
