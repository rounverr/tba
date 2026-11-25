import { afterEach, describe, expect, it } from "vitest";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdtemp,
  mkdir,
  copyFile,
  readFile,
  writeFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseConfigFileTextToJson } from "typescript";

const run = promisify(execFile);
const roots: string[] = [];
const setup = resolve("scripts/setup.mjs");
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "tba-setup-"));
  roots.push(root);
  await mkdir(join(root, "src/config"), { recursive: true });
  for (const path of [
    "src/config/app.json",
    "src/config/languages.json",
    "wrangler.jsonc",
  ])
    await copyFile(path, join(root, path));
  return {
    root,
    run: (...args: string[]) =>
      run(process.execPath, [setup, ...args], { cwd: root }),
    app: async () =>
      JSON.parse(await readFile(join(root, "src/config/app.json"), "utf8")),
  };
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("local setup language selection", () => {
  it("enables only English and Portuguese without removing any catalog", async () => {
    const f = await fixture();
    const { stdout } = await f.run("--languages", "en,pt");
    expect((await f.app()).languages).toEqual(["en", "pt"]);
    expect((await f.app()).locale).toBe("en");
    expect(stdout).toContain("Local configuration prepared");
    for (const language of [
      "en",
      "es",
      "pt",
      "de",
      "fr",
      "it",
      "zh",
      "ja",
      "hi",
      "ar",
    ])
      expect(
        await readFile(`src/lib/i18n/messages/${language}.json`, "utf8"),
      ).not.toBe("");
    const secret = await readFile(join(f.root, ".dev.vars"), "utf8");
    expect(secret).toMatch(/^BETTER_AUTH_SECRET=\S{64}\n$/);
  });
  it("keeps English enabled, deduplicates selection and falls back from a disabled old default", async () => {
    const f = await fixture();
    const app = await f.app();
    await writeFile(
      join(f.root, "src/config/app.json"),
      JSON.stringify({ ...app, locale: "es" }),
    );
    await f.run("--languages", "PT,pt");
    expect((await f.app()).languages).toEqual(["en", "pt"]);
    expect((await f.app()).locale).toBe("en");
    await f.run("--languages", "en");
    expect((await f.app()).languages).toEqual(["en"]);
  });
  it("preserves existing secrets, identity, bindings, mail and registration-independent settings", async () => {
    const f = await fixture();
    const secret = "BETTER_AUTH_SECRET=local-fixture-secret\nWAVICC_API_KEY=\n";
    await writeFile(join(f.root, ".dev.vars"), secret);
    const original = await readFile(join(f.root, "wrangler.jsonc"), "utf8");
    await f.run("--languages", "en,ar", "--locale", "ar");
    expect((await f.app()).locale).toBe("ar");
    expect(await readFile(join(f.root, ".dev.vars"), "utf8")).toBe(secret);
    expect(
      JSON.parse(await readFile(join(f.root, "wrangler.jsonc"), "utf8")),
    ).toEqual(parseConfigFileTextToJson("wrangler.jsonc", original).config);
  });
  it.each([
    ["--languages", "en,xx"],
    ["--languages", "en,pt", "--locale", "de"],
    ["--languages", " , "],
  ])(
    "rejects invalid selection without writing local configuration: %s %s",
    async (...args) => {
      const f = await fixture();
      const before = await readFile(
        join(f.root, "src/config/app.json"),
        "utf8",
      );
      const config = await readFile(join(f.root, "wrangler.jsonc"), "utf8");
      await expect(f.run(...args)).rejects.toThrow();
      expect(await readFile(join(f.root, "src/config/app.json"), "utf8")).toBe(
        before,
      );
      expect(await readFile(join(f.root, "wrangler.jsonc"), "utf8")).toBe(
        config,
      );
      await expect(readFile(join(f.root, ".dev.vars"))).rejects.toThrow();
    },
  );
  it.each(["en", "es", "pt", "de", "fr", "it", "zh", "ja", "hi", "ar"])(
    "accepts %s as an enabled application default",
    async (locale) => {
      const f = await fixture();
      await f.run("--locale", locale);
      expect((await f.app()).locale).toBe(locale);
    },
  );
});

describe("setup mail providers", () => {
  it.each(["local", "resend"])(
    "preserves the %s provider option",
    async (provider) => {
      const f = await fixture();
      await f.run("--mail", provider);
      const config = JSON.parse(
        await readFile(join(f.root, "wrangler.jsonc"), "utf8"),
      );
      expect(config.vars.MAIL_PROVIDER).toBe(provider);
      expect(config.send_email).toBeUndefined();
    },
  );
  it("accepts Cloudflare with the EMAIL binding and sender without provisioning or changing restrictions", async () => {
    const f = await fixture();
    const path = join(f.root, "wrangler.jsonc");
    const config = parseConfigFileTextToJson(
      "wrangler.jsonc",
      await readFile(path, "utf8"),
    ).config;
    config.send_email = [
      { name: "EMAIL", allowed_sender_addresses: ["sender@example.test"] },
    ];
    config.vars.MAIL_FROM = "sender@example.test";
    await writeFile(path, JSON.stringify(config));
    await f.run("--mail", "cloudflare");
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual({
      ...config,
      vars: { ...config.vars, MAIL_PROVIDER: "cloudflare" },
    });
  });
  it.each(["binding", "sender", "invalid-sender", "restricted-sender"])(
    "allows deferring Cloudflare %s without provisioning resources",
    async (reason) => {
      const f = await fixture(),
        path = join(f.root, "wrangler.jsonc");
      const config = parseConfigFileTextToJson(
        "wrangler.jsonc",
        await readFile(path, "utf8"),
      ).config;
      if (reason !== "binding")
        config.send_email = [
          {
            name: "EMAIL",
            ...(reason === "restricted-sender"
              ? { allowed_sender_addresses: ["other@example.test"] }
              : {}),
          },
        ];
      if (reason !== "sender")
        config.vars.MAIL_FROM =
          reason === "invalid-sender" ? "invalid" : "sender@example.test";
      await writeFile(path, JSON.stringify(config));
      const { stdout } = await f.run("--mail", "cloudflare");
      expect(stdout).toContain("setup is pending");
      expect(stdout).toContain("configure mail later");
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual({
        ...config,
        vars: { ...config.vars, MAIL_PROVIDER: "cloudflare" },
      });
      expect((await f.app()).languages).toContain("en");
    },
  );
  it("reads a quoted local sender while preserving secrets exactly", async () => {
    const f = await fixture(),
      path = join(f.root, "wrangler.jsonc");
    const config = parseConfigFileTextToJson(
      "wrangler.jsonc",
      await readFile(path, "utf8"),
    ).config;
    config.send_email = [{ name: "EMAIL" }];
    await writeFile(path, JSON.stringify(config));
    const secrets =
      'BETTER_AUTH_SECRET=existing-fixture-secret\nMAIL_FROM="TBA <sender@example.test>"\nWAVICC_API_KEY=\n';
    await writeFile(join(f.root, ".dev.vars"), secrets);
    await f.run("--mail", "cloudflare");
    expect(await readFile(join(f.root, ".dev.vars"), "utf8")).toBe(secrets);
    expect(
      JSON.parse(await readFile(path, "utf8")).vars.MAIL_FROM,
    ).toBeUndefined();
  });
  it("rejects unsupported mail without enabling the future Wavicc placeholder", async () => {
    const f = await fixture();
    await expect(f.run("--mail", "wavicc")).rejects.toThrow();
  });
});

it.each([true, false])(
  "lets interactive users choose whether to defer mail: %s",
  async (proceed) => {
    const f = await fixture();
    const original = await readFile(join(f.root, "wrangler.jsonc"), "utf8");
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [setup, "--mail", "cloudflare", "--interactive"],
        { cwd: f.root, stdio: ["pipe", "pipe", "pipe"] },
      );
      let stdout = "",
        stderr = "";
      child.stdout.on("data", (chunk) => {
        const text = String(chunk);
        stdout += text;
        if (text.includes("Choice: ")) child.stdin.write("\n");
        else if (text.includes("[Y/n] "))
          child.stdin.write(proceed ? "y\n" : "n\n");
        else if (text.includes("Enter to keep): ")) child.stdin.write("\n");
      });
      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0
          ? resolve(stdout)
          : reject(new Error(stderr || `Setup exited ${code}`)),
      );
    });
    expect(output).toContain("Continue setup and configure mail later?");
    if (proceed) {
      expect(output).toContain("Continuing setup");
      expect(
        JSON.parse(await readFile(join(f.root, "wrangler.jsonc"), "utf8")).vars
          .MAIL_PROVIDER,
      ).toBe("cloudflare");
    } else {
      expect(output).toContain("Setup canceled");
      expect(await readFile(join(f.root, "wrangler.jsonc"), "utf8")).toBe(
        original,
      );
      await expect(readFile(join(f.root, ".dev.vars"))).rejects.toThrow();
    }
  },
);

describe("database engine setup", () => {
  it.each(["sqlite", "postgresql"])(
    "configures %s independently and protects the selection",
    async (engine) => {
      const f = await fixture();
      const wrangler = join(f.root, "wrangler.jsonc");
      const before = await readFile(wrangler, "utf8");
      const secret = "BETTER_AUTH_SECRET=local-test-only\n";
      await writeFile(join(f.root, ".dev.vars"), secret);
      await f.run(
        "--db-engine",
        engine,
        "--port",
        "4588",
        "--name",
        "Standalone",
      );
      const marker = JSON.parse(
        await readFile(join(f.root, "tba.runtime.json"), "utf8"),
      );
      expect(marker).toMatchObject({
        engine,
        env: {
          APP_NAME: "Standalone",
          APP_URL: "http://127.0.0.1:4588",
          PORT: "4588",
        },
      });
      expect(marker.env.DATABASE_URL).toBeUndefined();
      expect(await readFile(join(f.root, ".dev.vars"), "utf8")).toBe(secret);
      expect(await readFile(wrangler, "utf8")).toBe(before);
      await expect(f.run("--db-engine", "d1")).rejects.toThrow(
        "already uses another engine",
      );
      await expect(f.run("--mail", "cloudflare")).rejects.toThrow(
        "Standalone Node.js",
      );
      await expect(f.run("--database", "legacy-meaning")).rejects.toThrow(
        "incompatible",
      );
    },
  );

  it("recognizes an existing local D1 database before selecting another engine", async () => {
    const f = await fixture();
    await mkdir(join(f.root, ".wrangler/state/v3/d1"), { recursive: true });
    await expect(f.run("--db-engine", "sqlite")).rejects.toThrow(
      "existing database installation",
    );
  });
});
