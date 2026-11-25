import { parseConfigFileTextToJson } from "typescript";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import {
  Miniflare,
  convertV4MiniflareOptions,
  Response as MFResponse,
} from "miniflare";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, cp, readdir, rm } from "node:fs/promises";
import app from "../src/server/index";

let mf: Miniflare;
const invocations: string[] = [];
const root = "work/assets-test";
const modes: Record<string, string>[] = [{}, { "sec-fetch-mode": "navigate" }];
const origin = "https://app.example.test";
let security: Headers;
let securityNames: string[];
async function files(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
      ),
    )
  ).flat();
}
beforeAll(async () => {
  await mkdir(root, { recursive: true });
  execFileSync("npm", ["run", "build"], { stdio: "pipe" });
  await writeFile(
    `${root}/entry.ts`,
    `import app from '../../src/server/index';
export default {async fetch(request, env, ctx) {
  await env.TEST_HIT.fetch(request.url);
  return app.fetch(request, env, ctx);
}};`,
  );
  execFileSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "deploy",
      `${root}/entry.ts`,
      "--config",
      "wrangler.jsonc",
      "--dry-run",
      "--minify",
      "--outdir",
      `${root}/bundle`,
    ],
    { stdio: "pipe" },
  );
  await rm(`${root}/assets`, { recursive: true, force: true });
  await cp("dist", `${root}/assets`, { recursive: true });
  // An accidental static API file must never bypass the authentication gateway.
  await mkdir(`${root}/assets/api/private/users`, { recursive: true });
  await writeFile(
    `${root}/assets/api/private/users/index.html`,
    "API collision fixture",
  );
  const config = parseConfigFileTextToJson(
    "wrangler.jsonc",
    await readFile("wrangler.jsonc", "utf8"),
  ).config;
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: await readFile(`${root}/bundle/entry.js`, "utf8"),
      compatibilityDate: config.compatibility_date,
      compatibilityFlags: config.compatibility_flags,
      bindings: {
        ...config.vars,
        APP_URL: origin,
        BETTER_AUTH_SECRET: crypto.randomUUID() + crypto.randomUUID(),
      },
      d1Databases: { DB: "assets-test-local" },
      serviceBindings: {
        TEST_HIT: async (req) => {
          invocations.push(new URL(req.url).pathname);
          return new MFResponse(null);
        },
      },
      assets: {
        directory: `${root}/assets`,
        binding: config.assets.binding,
        run_worker_first: config.assets.run_worker_first,
        routerConfig: { has_user_worker: true },
        assetConfig: { not_found_handling: config.assets.not_found_handling },
      },
    }),
  );
  await mf.ready;
  const response = await mf.dispatchFetch(origin + "/api/test-missing");
  expect(response.status, await response.clone().text()).toBe(404);
  security = new Headers(response.headers);
  securityNames = (await readFile("public/_headers", "utf8"))
    .split("\n\n")[0]
    .split("\n")
    .flatMap((line) => {
      const match = line.match(/^  ([\w-]+):/);
      return match ? [match[1].toLowerCase()] : [];
    });
});
afterAll(async () => {
  await mf?.dispose();
});
function headersMatch(response: {
  headers: { get(name: string): string | null };
}) {
  for (const [key, value] of security) {
    if (!securityNames.includes(key)) continue;
    expect(response.headers.get(key), key).toBe(value);
  }
  expect(response.headers.get("x-powered-by")).toBeNull();
}
async function direct(
  path: string,
  init?: Parameters<Miniflare["dispatchFetch"]>[1],
) {
  const before = invocations.length;
  const response = await mf.dispatchFetch(origin + path, init);
  expect(invocations.length, `${path} invoked user Worker`).toBe(before);
  return response;
}
describe("Static Assets routing in workerd", () => {
  it("prerenders all admin pages without panel markup before authorization", async () => {
    const adminPages = (await files("dist/admin")).filter((file) =>
      file.endsWith(".html"),
    );
    expect(adminPages).toHaveLength(8);
    for (const file of adminPages) {
      const response = await direct(file.slice(4).replace(/index\.html$/, ""));
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html, file).not.toMatch(
        /<(?:div|aside|main)\b[^>]*class="[^"]*\b(?:dashboard-shell|dashboard-content|sidebar|loading-state)\b/,
      );
      headersMatch(response);
    }
  });
  it("uses selective API routing in the generic configuration", async () => {
    const config = parseConfigFileTextToJson(
      "wrangler.jsonc",
      await readFile("wrangler.jsonc", "utf8"),
    ).config;
    expect(config.assets.run_worker_first).toEqual(["/api", "/api/*"]);
  });
  it("serves every Astro page directly on navigation and reload, with security headers", async () => {
    for (const file of (await files("dist")).filter(
      (f) => f.endsWith(".html") && !f.endsWith("404.html"),
    )) {
      const path = file.slice(4).replace(/index\.html$/, "");
      for (const headers of modes) {
        const response = await direct(path, { headers });
        expect(response.status, path).toBe(200);
        expect(await response.text()).toBe(await readFile(file, "utf8"));
        headersMatch(response);
      }
    }
  });
  it("serves CSS, JS, images and fonts directly with unchanged bytes and security headers", async () => {
    for (const file of (await files("dist")).filter(
      (f) => !f.endsWith(".html") && !f.endsWith("_headers"),
    )) {
      const response = await direct(file.slice(4));
      expect(response.status, file).toBe(200);
      expect(Buffer.from(await response.arrayBuffer())).toEqual(
        await readFile(file),
      );
      headersMatch(response);
    }
  });
  it("keeps API navigation and asset collisions behind Hono authentication", async () => {
    for (const [path, status] of [
      ["/api", 404],
      ["/api/session", 401],
      ["/api/private/users", 401],
      ["/api/private/example", 401],
      ["/api/auth/get-session", 404],
    ] as const) {
      for (const headers of modes) {
        const before = invocations.length;
        const response = await mf.dispatchFetch(origin + path, { headers });
        expect(response.status, path).toBe(status);
        expect(invocations.length).toBe(before + 1);
        headersMatch(response);
        if (path !== "/api")
          expect(response.headers.get("cache-control")).toBe("no-store");
      }
    }
  });
  it("caches fingerprinted assets without caching private APIs or HTML indefinitely", async () => {
    const asset = (await files("dist/_astro")).find((file) =>
      file.endsWith(".js"),
    )!;
    const response = await direct(asset.slice(4));
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    const html = await direct("/login/");
    expect(html.headers.get("cache-control")).not.toContain("immutable");
    const api = await mf.dispatchFetch(origin + "/api/private/users");
    expect(api.status).toBe(401);
    expect(api.headers.get("cache-control")).toBe("no-store");
  });
  it("serves missing paths and reserved metadata as 404 without leaking files", async () => {
    for (const path of [
      "/missing-page/",
      "/missing.js",
      "/_headers",
      "/.env",
      "/wrangler.staging.jsonc",
    ]) {
      for (const headers of modes) {
        const response = await direct(path, { headers });
        expect(response.status, path).toBe(404);
        headersMatch(response);
      }
    }
  });
  it("serves HEAD and conditional requests without executing the user Worker", async () => {
    const response = await direct("/login/");
    const head = await direct("/login/", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    headersMatch(head);
    const conditional = await direct("/login/", {
      headers: { "if-none-match": response.headers.get("etag")! },
    });
    expect(conditional.status).toBe(304);
    expect(await conditional.text()).toBe("");
    headersMatch(conditional);
  });
  it("serves extensionless Astro paths outside the Worker", async () => {
    const response = await direct("/login");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      await readFile("dist/login/index.html", "utf8"),
    );
    headersMatch(response);
  });
  it("does not fetch assets from Hono even when a non-API request reaches it", async () => {
    let fetched = false;
    const response = await app.fetch(new Request(origin + "/login/"), {
      ASSETS: {
        fetch() {
          fetched = true;
          throw new Error("Unexpected assets fetch");
        },
      },
    });
    expect(response.status).toBe(404);
    expect(fetched).toBe(false);
  });
});
