import { serve } from "@hono/node-server";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { parseArgs } from "node:util";
import api from "../index";
import { openStorage, SQLiteDriverUnavailable } from "./node-storage";
import { publicRoot, readPublicAsset, requestPath } from "./paths";
import { clientAddress } from "./client-address";
import type { RuntimeEnv } from "../types";
import { isLocalUrl } from "../policy";

const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
  [".ico", "image/x-icon"],
]);
async function staticHandler() {
  const root = await publicRoot(resolve("dist"));
  const headerText = await readFile("public/_headers", "utf8");
  const securityHeaders = new Headers(
    headerText
      .split(/\r?\n/)
      .slice(1)
      .filter(
        (line) => /^  [\w-]+: /.test(line) && !line.includes("Cache-Control:"),
      )
      .map((line) => {
        const delimiter = line.indexOf(":");
        return [line.slice(2, delimiter), line.slice(delimiter + 2)];
      }),
  );
  return async (request: Request, pathname: string) => {
    if (!["GET", "HEAD"].includes(request.method))
      return new Response(null, { status: 405, headers: securityHeaders });
    const decoded = pathname;
    async function readAsset(path: string) {
      if (!mime.has(extname(path))) return null;
      return readPublicAsset(root, path);
    }
    const path = extname(decoded)
      ? decoded
      : decoded.replace(/\/$/, "") + "/index.html";
    const asset = await readAsset(path);
    const body = asset ?? (await readAsset("/404.html"));
    const headers = new Headers(securityHeaders);
    headers.set(
      "Content-Type",
      asset ? mime.get(extname(path))! : mime.get(".html")!,
    );
    headers.set(
      "Cache-Control",
      asset && /^\/_astro\//.test(path)
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    );
    return new Response(request.method === "HEAD" ? null : body, {
      status: asset ? 200 : 404,
      headers,
    });
  };
}

if (process.platform !== "win32") process.umask(0o077);
const action = process.argv[2];
if (!["migrate", "bootstrap", "serve"].includes(action))
  throw new Error("Expected migrate, bootstrap or serve");
const engine = process.env.TBA_NODE_ENGINE || "sqlite";
let storage: Awaited<ReturnType<typeof openStorage>> | undefined;
try {
  storage = await openStorage(engine);
  if (action === "migrate" || action === "bootstrap") {
    const { values } = parseArgs({
      args: process.argv.slice(3),
      options: {
        target: { type: "string" },
        email: { type: "string" },
        name: { type: "string" },
      },
    });
    if (action === "migrate") {
      await storage.migrate(values.target);
    } else {
      const email = values.email?.trim().toLowerCase();
      if (!email || !/^\S+@\S+\.\S+$/.test(email))
        throw new Error("Provide --email");
      await storage.bootstrap(
        email,
        values.name?.trim() || "Administrator",
        values.target,
      );
    }
  } else {
    await storage.ready();
    const hostname = process.env.HOST || "127.0.0.1";
    const port = Number(process.env.PORT || 8787);
    const origin = new URL(process.env.APP_URL || `http://127.0.0.1:${port}`);
    const secret = process.env.BETTER_AUTH_SECRET;
    if (
      (origin.protocol !== "https:" &&
        (origin.protocol !== "http:" || !isLocalUrl(origin.href))) ||
      origin.href !== origin.origin + "/" ||
      !secret ||
      secret.length < 32
    )
      throw new Error(
        "Set an APP_URL origin and BETTER_AUTH_SECRET of at least 32 characters",
      );
    const provider = process.env.MAIL_PROVIDER || "local";
    if (
      !["local", "resend"].includes(provider) ||
      (provider === "local" && !isLocalUrl(origin.href))
    )
      throw new Error(
        "Set MAIL_PROVIDER to resend or use the local mailbox on localhost",
      );
    const env: RuntimeEnv = {
      ...process.env,
      DB: storage.persistence,
      APP_URL: origin.origin,
      APP_NAME: process.env.APP_NAME || "TBA",
      MAIL_PROVIDER: provider,
      MFA_ENABLED: process.env.MFA_ENABLED || "true",
      TRUST_DEVICE_ENABLED: process.env.TRUST_DEVICE_ENABLED || "true",
      GOOGLE_ENABLED: process.env.GOOGLE_ENABLED || "false",
      BETTER_AUTH_SECRET: secret,
    };
    const staticFile = await staticHandler();
    const identify = clientAddress(process.env.TRUSTED_PROXIES);
    const pending = new Set<Promise<unknown>>();
    const server = serve(
      {
        hostname,
        port,
        overrideGlobalObjects: false,
        fetch(request, { incoming }) {
          const pathname = requestPath(incoming.url || "");
          if (pathname === null) return new Response(null, { status: 400 });
          const url = new URL(request.url);
          if (url.host !== origin.host)
            return new Response(null, { status: 421 });
          if (url.pathname !== "/api" && !url.pathname.startsWith("/api/"))
            return staticFile(request, pathname);
          const headers = new Headers(request.headers);
          for (const name of [
            "forwarded",
            "x-forwarded-for",
            "x-forwarded-host",
            "x-forwarded-proto",
            "x-real-ip",
          ])
            headers.delete(name);
          headers.set("host", origin.host);
          headers.set(
            "cf-connecting-ip",
            identify(
              incoming.socket.remoteAddress,
              "headersDistinct" in incoming
                ? incoming.headersDistinct["x-forwarded-for"]
                : undefined,
            ),
          );
          return api.fetch(
            new Request(origin.origin + url.pathname + url.search, {
              method: request.method,
              headers,
              body: request.body,
              duplex: "half",
              signal: request.signal,
            } as RequestInit),
            env,
            {
              waitUntil(promise) {
                pending.add(promise);
                void promise.then(
                  () => pending.delete(promise),
                  () => pending.delete(promise),
                );
              },
              passThroughOnException() {},
              props: {},
            },
          );
        },
      },
      ({ port }) =>
        console.log(`TBA ${engine} listening on ${hostname}:${port}`),
    );
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      const shutdown = () =>
        server.close((error) => (error ? reject(error) : resolve()));
      process.once("SIGTERM", shutdown);
      process.once("SIGINT", shutdown);
    });
    while (pending.size) await Promise.allSettled([...pending]);
  }
} catch (error) {
  if (error instanceof SQLiteDriverUnavailable) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    if (engine !== "postgresql") throw error;
    // Driver errors may contain connection details or data values.
    const message =
      error instanceof Error &&
      /^(?:Pass --target|Set a valid|DATABASE_URL needs|Use sslmode|Run npm|The connected PostgreSQL|Database migration history|Provide --email|Set an APP_URL|Set MAIL_PROVIDER|TRUSTED_PROXIES)/.test(
        error.message,
      )
        ? error.message
        : "PostgreSQL operation failed. Check the target, credentials and database logs.";
    console.error(message);
    process.exitCode = 1;
  }
} finally {
  await storage?.close();
}
