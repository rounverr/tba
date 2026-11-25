import {
  saveMailLanguage,
  mailLanguageIdentifier,
} from "../src/server/services/email/language";
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { createServer, type Server } from "node:http";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createOTP } from "@better-auth/utils/otp";
import { base32 } from "@better-auth/utils/base32";
import app from "../src/server/index";
import * as emailChange from "../src/server/email-change";
import type { RuntimeEnv as Environment } from "../src/server/types";
import {
  fixtureSql,
  sqliteFixture,
  postgresqlFixture,
  testSQLite,
  testPostgreSQL,
  testStandalone,
} from "./persistence-fixture";
import { isSQLite, isPostgreSQL } from "../src/server/database/persistence";
type RuntimeEnv = Environment;
import { languageCodes } from "../src/lib/i18n/config";
import { otpMail, notificationMail } from "../src/server/services/auth-mail";
let mf: Miniflare;
let env: RuntimeEnv;
let postgres: Awaited<ReturnType<typeof postgresqlFixture>> | undefined;
let sqlite: Awaited<ReturnType<typeof sqliteFixture>> | undefined;
const fixture = (sql: string) => fixtureSql(env.DB, sql);
let mailServer: Server;
const mails: { to: string; subject: string; text: string; html?: string }[] =
  [];
const pending: Promise<unknown>[] = [];
const origin =
  process.env.TBA_TEST_HTTPS === "1"
    ? "https://app.example.test"
    : "http://localhost:8787";
class Client {
  constructor(private worker = false) {}
  cookies = new Map<string, string>();
  async call(
    path: string,
    body?: unknown,
    requestOrigin = origin,
    language?: string,
    refreshAuthorization = false,
  ) {
    const request = new Request(origin + "/api" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "content-type": "application/json",
        origin: requestOrigin,
        cookie: Array.from(this.cookies, ([k, v]) => `${k}=${v}`).join("; "),
        ...(language ? { "X-Auth-Language": language } : {}),
        ...(refreshAuthorization ? { "X-TBA-Authorization-Refresh": "1" } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const response =
      this.worker && !testStandalone
        ? await mf.dispatchFetch(request.url, {
            method: request.method,
            headers: Object.fromEntries(request.headers),
            body: body === undefined ? undefined : JSON.stringify(body),
          })
        : await app.fetch(request, env, {
            waitUntil(p) {
              pending.push(p);
            },
            passThroughOnException() {},
            props: {},
          });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const i = pair.indexOf("=");
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
    await Promise.all(pending.splice(0));
    return response;
  }
  async json<T = Record<string, unknown>>(path: string, body?: unknown) {
    const r = await this.call(path, body);
    return { status: r.status, data: (await r.json()) as T };
  }
}
const admin = new Client();
let adminId = "";
let uri = "";
let recoveryCodes: string[] = [];
async function codeFor(email: string) {
  const msg = mails.findLast((m) => m.to === email && /\b\d{6}\b/.test(m.text));
  const code = msg?.text.match(/\b\d{6}\b/)?.[0];
  if (!code) throw new Error("Mail was not delivered");
  return code;
}
async function login(client: Client, email: string) {
  await fixture("DELETE FROM throttle").run();
  await client.call("/access/send", { email });
  return client.call("/access/verify", { email, code: await codeFor(email) });
}
async function totp() {
  return createOTP(
    base32.decode(new URL(uri).searchParams.get("secret")!),
  ).totp();
}
function countStatements() {
  const standalone = sqlite || postgres;
  if (standalone) {
    standalone.statements.length = 0;
    return { statements: standalone.statements, restore() {} };
  }
  const original = env.DB;
  if (isSQLite(original) || isPostgreSQL(original))
    throw new Error("Missing SQLite fixture");
  const statements: string[] = [];
  const sqlByStatement = new WeakMap<D1PreparedStatement, string>();
  const wrap = (
    sql: string,
    statement: D1PreparedStatement,
  ): D1PreparedStatement => {
    const tracked = new Proxy(statement, {
      get(target, key) {
        if (key === "bind")
          return (...values: unknown[]) => wrap(sql, target.bind(...values));
        const value = Reflect.get(target, key);
        if (typeof value !== "function") return value;
        return (...args: unknown[]) => {
          if (["all", "first", "run", "raw"].includes(String(key)))
            statements.push(sql);
          return value.apply(target, args);
        };
      },
    });
    sqlByStatement.set(tracked, sql);
    return tracked;
  };
  env.DB = new Proxy(original, {
    get(target, key) {
      if (key === "prepare")
        return (sql: string) => wrap(sql, target.prepare(sql));
      if (key === "batch")
        return (batch: D1PreparedStatement[]) => {
          statements.push(
            ...batch.map((statement) => sqlByStatement.get(statement)!),
          );
          return target.batch(batch);
        };
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return {
    statements,
    restore: () => {
      env.DB = original;
    },
  };
}
beforeAll(async () => {
  mailServer = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    mails.push(JSON.parse(raw));
    res.writeHead(204).end();
  });
  await new Promise<void>((resolve) =>
    mailServer.listen(8025, "127.0.0.1", resolve),
  );
  const runtimeBindings = {
    APP_URL: origin,
    APP_NAME: "TBA",
    MAIL_PROVIDER: process.env.TBA_TEST_HTTPS === "1" ? "cloudflare" : "local",
    MFA_ENABLED: "true",
    TRUST_DEVICE_ENABLED: "true",
    GOOGLE_ENABLED: "false",
    BETTER_AUTH_SECRET: crypto.randomUUID() + crypto.randomUUID(),
  };
  const migrations = [
    "0001_initial.sql",
    "0002_defaults_and_guards.sql",
    "0003_session_authorization.sql",
  ];
  async function createFixture() {
    if (testPostgreSQL) {
      postgres = await postgresqlFixture([...migrations]);
      return postgres.persistence;
    }
    if (testSQLite) {
      sqlite = await sqliteFixture(migrations);
      return sqlite.persistence;
    }
    execFileSync(
      process.execPath,
      [
        "node_modules/wrangler/bin/wrangler.js",
        "deploy",
        "--config",
        "wrangler.jsonc",
        "--dry-run",
        "--minify",
        "--outdir",
        "work/auth-runtime",
      ],
      { stdio: "pipe" },
    );
    mf = new Miniflare(
      convertV4MiniflareOptions({
        modules: true,
        script: await readFile("work/auth-runtime/index.js", "utf8"),
        bindings: runtimeBindings,
        d1Databases: { DB: "tba-test" },
        compatibilityDate: "2026-11-04",
        compatibilityFlags: ["nodejs_compat"],
      }),
    );
    const db = await mf.getD1Database("DB");
    return db;
  }
  const db = await createFixture();
  env = {
    DB: db,
    ASSETS: {
      fetch: async () => new Response("404", { status: 404 }),
      connect() {
        throw new Error("Not used in API tests");
      },
    },
    ...runtimeBindings,
    ...(process.env.TBA_TEST_HTTPS === "1"
      ? {
          MAIL_FROM: "mail@example.test",
          EMAIL: {
            send: async (message: {
              to: string;
              subject: string;
              text: string;
            }) => {
              mails.push(message);
            },
          },
        }
      : {}),
  } as RuntimeEnv;
  if (!isSQLite(db) && !isPostgreSQL(db)) {
    const first = await readFile("drizzle/0001_initial.sql", "utf8");
    for (const stmt of first
      .split("--> statement-breakpoint")
      .filter((s) => s.trim()))
      await db.prepare(stmt).run();
    const defaults = await readFile(
      "drizzle/0002_defaults_and_guards.sql",
      "utf8",
    );
    const split = defaults.indexOf("CREATE TRIGGER");
    for (const stmt of defaults
      .slice(0, split)
      .split(";")
      .filter((s) => s.trim()))
      await db.prepare(stmt).run();
    for (const stmt of defaults
      .slice(split)
      .split(/(?<=END;)\s*/)
      .filter((s) => s.trim()))
      await db.prepare(stmt).run();
    const authorization = await readFile(
      "drizzle/0003_session_authorization.sql",
      "utf8",
    );
    for (const stmt of authorization.split("--> statement-breakpoint"))
      await db.prepare(stmt.trim()).run();
  }
  adminId = crypto.randomUUID();
  await fixture(
    "INSERT INTO \"user\"(id,name,email,email_verified,status,role_id,created_at,updated_at) VALUES(?,'Test Admin','admin@example.test',FALSE,'active','administrator',?,?)",
  )
    .bind(adminId, Date.now(), Date.now())
    .run();
});
afterAll(async () => {
  await mf?.dispose();
  await sqlite?.dispose();
  await postgres?.dispose();
  if (mailServer)
    await new Promise<void>((resolve) => mailServer.close(() => resolve()));
});
describe(`Real Better Auth + ${testPostgreSQL ? "PostgreSQL" : testSQLite ? "SQLite" : "D1"} flows`, () => {
  it("denies anonymous requests to private export paths", async () => {
    for (const kind of ["users", "audit", "registrations"])
      expect((await new Client().call(`/private/export/${kind}`)).status).toBe(
        401,
      );
  });
  it("denies anonymous protected API", async () =>
    expect((await new Client().call("/private/users")).status).toBe(401));
  it("denies CSRF origin", async () =>
    expect(
      (
        await new Client().call(
          "/access/send",
          { email: "a@example.test" },
          "https://evil.test",
        )
      ).status,
    ).toBe(403));
  it("blocks raw signup and OTP bypass", async () => {
    for (const p of [
      "/auth/sign-in/email-otp",
      "/auth/email-otp/send-verification-otp",
      "/auth/two-factor/disable",
      "/auth/get-session",
      "/auth/email-otp/request-email-change",
      "/auth/email-otp/change-email",
    ])
      expect((await new Client().call(p, {})).status).toBe(404);
  });
  it("keeps closed registration closed", async () =>
    expect(
      (
        await new Client().call("/access/send", {
          email: "new@example.test",
          intent: "register",
        })
      ).status,
    ).toBe(403));
  it("explains that an unknown address has no enabled access without creating a user or sending mail", async () => {
    const r = await new Client().call("/access/send", {
      email: "unknown@example.test",
    });
    expect(r.status).toBe(403);
    expect(await r.json()).toMatchObject({
      code: "ACCESS_NOT_ENABLED",
      message: expect.stringContaining("enabled account"),
    });
    expect(
      await fixture(
        "SELECT id FROM \"user\" WHERE email='unknown@example.test'",
      ).first(),
    ).toBeNull();
    expect(mails.some((m) => m.to === "unknown@example.test")).toBe(false);
  });
  it("authenticates authorized account using delivered OTP", async () => {
    await fixture("DELETE FROM throttle").run();
    const { statements, restore } = countStatements();
    const counts = () => ({
      total: statements.length,
      settings: statements.filter((sql) => sql.includes('from "settings"'))
        .length,
    });
    try {
      expect(
        (await admin.call("/access/send", { email: "admin@example.test" }))
          .status,
      ).toBe(200);
      const send = counts();
      statements.length = 0;
      const code = await codeFor("admin@example.test");
      expect(
        (
          await admin.call("/access/verify", {
            email: "admin@example.test",
            code,
          })
        ).status,
      ).toBe(200);
      const verify = counts();
      statements.length = 0;
      const s = await admin.json<{ mfaRequired: boolean; isAdmin: boolean }>(
        "/session",
      );
      expect(s.data.isAdmin).toBe(true);
      expect(s.data.mfaRequired).toBe(false);
      expect(Object.keys(s.data).sort()).toEqual([
        "isAdmin",
        "mfaEnabled",
        "mfaRequired",
        "permissions",
        "user",
      ]);
      expect(statements[0]).not.toContain('join "role"');
      expect(statements[1]).toMatch(/^UPDATE session SET/);
      expect(statements[1]).toContain("role.permissions");
      if (!testPostgreSQL)
        expect({ send, verify, session: counts() }).toEqual({
          send: { total: 5, settings: 0 },
          verify: { total: 22, settings: 0 },
          session: { total: 2, settings: 0 },
        });
    } finally {
      restore();
    }
  });
  it("uses the same no-access message for pending, suspended and disabled accounts without sending OTP", async () => {
    for (const status of ["pending", "suspended", "disabled"]) {
      const email = `no-access-${status}@example.test`;
      await fixture(
        "INSERT INTO \"user\"(id,name,email,email_verified,status,role_id,created_at,updated_at) VALUES(?,?,?,TRUE,?,'viewer',?,?)",
      )
        .bind(
          crypto.randomUUID(),
          "No Access Test",
          email,
          status,
          Date.now(),
          Date.now(),
        )
        .run();
      const response = await new Client().json("/access/send", { email });
      expect(response.status).toBe(403);
      expect(response.data).toEqual({
        code: "ACCESS_NOT_ENABLED",
        message:
          "We could not find an enabled account with this email. Check the address or request access from your administrator.",
      });
      expect(mails.some((mail) => mail.to === email)).toBe(false);
    }
  });
  it("invalidates a used OTP", async () =>
    expect(
      (
        await new Client().call("/access/verify", {
          email: "admin@example.test",
          code: await codeFor("admin@example.test"),
        })
      ).status,
    ).toBe(400));
  it("allows protected API for authenticated administrator", async () =>
    expect((await admin.call("/private/users")).status).toBe(200));
  it("protects final administrator at database level", async () => {
    await expect(
      fixture("UPDATE \"user\" SET status='disabled' WHERE id=?")
        .bind(adminId)
        .run(),
    ).rejects.toThrow();
    await expect(
      fixture('DELETE FROM "user" WHERE id=?').bind(adminId).run(),
    ).rejects.toThrow();
  });
  it("preserves an active administrator under competing status writes", async () => {
    const second = crypto.randomUUID();
    const rows =
      "SELECT count(*) AS total FROM \"user\" WHERE role_id='administrator' AND status='active'";
    await fixture(
      "INSERT INTO \"user\"(id,name,email,email_verified,status,role_id,created_at,updated_at) VALUES(?,'Second Admin','second-administrator@example.test',FALSE,'active','administrator',?,?)",
    )
      .bind(second, Date.now(), Date.now())
      .run();
    const disable = (id: string) =>
      fixture("UPDATE \"user\" SET status='disabled' WHERE id=?")
        .bind(id)
        .run();
    try {
      const results = await Promise.allSettled([
        disable(adminId),
        disable(second),
      ]);
      expect(results.map((result) => result.status).sort()).toEqual([
        "fulfilled",
        "rejected",
      ]);
      expect(await fixture(rows).first()).toEqual({ total: 1 });
    } finally {
      await fixture("UPDATE \"user\" SET status='active' WHERE id=?")
        .bind(adminId)
        .run();
      await fixture('DELETE FROM "user" WHERE id=?').bind(second).run();
    }
  });
  it("deletes users and dependent data while keeping the audit record", async () => {
    const id = crypto.randomUUID();
    const email = "deleted-account@example.test";
    const now = Date.now();
    await fixture(
      "INSERT INTO \"user\"(id,name,email,email_verified,status,role_id,created_at,updated_at) VALUES(?,?,?,TRUE,'active','viewer',?,?)",
    )
      .bind(id, "Account to delete", email, now, now)
      .run();
    await fixture(
      "INSERT INTO registration(id,user_id,created_at) VALUES(?,?,?)",
    )
      .bind(crypto.randomUUID(), id, now)
      .run();
    await fixture(
      "INSERT INTO registration_event(user_id,updated_at) VALUES(?,?)",
    )
      .bind(id, now)
      .run();
    await fixture(
      "INSERT INTO session(id,expires_at,token,created_at,updated_at,user_id) VALUES(?,?,?,?,?,?)",
    )
      .bind(
        crypto.randomUUID(),
        now + 3600000,
        crypto.randomUUID(),
        now,
        now,
        id,
      )
      .run();
    await fixture(
      "INSERT INTO account(id,account_id,provider_id,user_id,created_at,updated_at) VALUES(?,?,?,?,?,?)",
    )
      .bind(crypto.randomUUID(), email, "credential", id, now, now)
      .run();
    expect(
      (await admin.call(`/private/users/${adminId}/delete`, {})).status,
    ).toBe(403);
    expect(
      (await new Client().call(`/private/users/${id}/delete`, {})).status,
    ).toBe(401);
    await saveMailLanguage(env, id, "ar");
    expect((await admin.call(`/private/users/${id}/delete`, {})).status).toBe(
      200,
    );
    expect(
      await fixture("SELECT 1 FROM verification WHERE identifier=?")
        .bind(mailLanguageIdentifier(id))
        .first(),
    ).toBeNull();
    for (const table of [
      "user",
      "registration",
      "registration_event",
      "session",
      "account",
    ]) {
      const column = table === "user" ? "id" : "user_id";
      expect(
        await fixture(`SELECT 1 FROM "${table}" WHERE ${column}=?`)
          .bind(id)
          .first(),
      ).toBeNull();
    }
    const record = await fixture(
      "SELECT actor,action,resource FROM audit WHERE action='user.deleted' AND resource=?",
    )
      .bind(email)
      .first<{ actor: string; action: string; resource: string }>();
    expect(record).toMatchObject({
      actor: adminId,
      action: "user.deleted",
      resource: email,
    });
    expect((await admin.call(`/private/users/${id}/delete`, {})).status).toBe(
      404,
    );
  });
  it("confirms enrollment inline and retains recent-login checks for other security changes", async () => {
    await fixture("UPDATE session SET created_at=? WHERE user_id=?")
      .bind(Date.now() - 360000, adminId)
      .run();
    for (const route of ["enroll", "confirm", "disable", "backup-codes"]) {
      const result = await admin.json<{ code: string }>(
        `/private/security/${route}`,
        {},
      );
      expect(result.status).toBe(403);
      expect(result.data.code).toBe(
        ["enroll", "confirm"].includes(route)
          ? "MFA_ENROLL_CONFIRMATION_REQUIRED"
          : "RECENT_AUTH_REQUIRED",
      );
    }
    expect(
      (await admin.call("/private/security/enroll/email", {})).status,
    ).toBe(200);
    expect(
      (await admin.call("/private/security/enroll/email", {})).status,
    ).toBe(429);
    const emailCode = await codeFor("admin@example.test");
    const stored = await fixture(
      "SELECT value FROM verification WHERE identifier LIKE 'mfa-enroll:%'",
    ).first<{ value: string }>();
    expect(Object.keys(JSON.parse(stored!.value)).sort()).toEqual([
      "attempts",
      "hash",
    ]);
    const wrong = emailCode.slice(0, 5) + (emailCode[5] === "0" ? "1" : "0");
    expect(
      (
        await admin.call("/private/security/enroll/email/confirm", {
          code: wrong,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await admin.call("/private/security/enroll/email/confirm", {
          code: emailCode,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await admin.call("/private/security/enroll/email/confirm", {
          code: emailCode,
        })
      ).status,
    ).toBe(400);
    expect((await admin.call("/private/security/enroll", {})).status).toBe(200);
    expect(
      (await admin.call("/private/security/revoke-trust", {})).status,
    ).toBe(400);
    const another = new Client();
    await login(another, "admin@example.test");
    await fixture("UPDATE session SET created_at=? WHERE user_id=?")
      .bind(Date.now() - 360000, adminId)
      .run();
    expect((await another.call("/private/security/enroll", {})).status).toBe(
      403,
    );
    await fixture(
      "UPDATE verification SET expires_at=? WHERE identifier LIKE 'mfa-enroll:%'",
    )
      .bind(Date.now() - 1)
      .run();
    expect((await admin.call("/private/security/enroll", {})).status).toBe(403);
    await fixture("DELETE FROM throttle").run();
    await admin.call("/private/security/enroll/email", {});
    const limitedCode = await codeFor("admin@example.test");
    const invalid =
      limitedCode.slice(0, 5) + (limitedCode[5] === "0" ? "1" : "0");
    for (let attempt = 0; attempt < 5; attempt++)
      expect(
        (
          await admin.call("/private/security/enroll/email/confirm", {
            code: invalid,
          })
        ).status,
      ).toBe(400);
    await fixture("DELETE FROM throttle").run();
    expect(
      (
        await admin.call("/private/security/enroll/email/confirm", {
          code: limitedCode,
        })
      ).status,
    ).toBe(400);
    expect((await admin.call("/private/profile")).status).toBe(200);
    expect((await login(admin, "admin@example.test")).status).toBe(200);
    const recent = await fixture(
      "SELECT created_at FROM session WHERE user_id=? ORDER BY created_at DESC LIMIT 1",
    )
      .bind(adminId)
      .first<{ created_at: number }>();
    expect(Date.now() - recent!.created_at).toBeLessThan(300000);
  });
  it("resolves audited user resources to email without changing stored identifiers", async () => {
    const result = await admin.json<{
      rows: { action: string; resource: string; resource_email: string }[];
    }>("/private/audit");
    expect(result.status).toBe(200);
    const event = result.data.rows.find(
      (r) => r.action === "login.first_factor",
    );
    expect(event?.resource).toBe(adminId);
    expect(event?.resource_email).toBe("admin@example.test");
  });
  it("does not activate MFA before TOTP confirmation", async () => {
    await fixture("UPDATE session SET created_at=? WHERE user_id=?")
      .bind(Date.now() - 360000, adminId)
      .run();
    await fixture("DELETE FROM throttle").run();
    const cookiesBefore = [...admin.cookies];
    expect(
      (await admin.call("/private/security/enroll/email", {})).status,
    ).toBe(200);
    expect(
      (
        await admin.call("/private/security/enroll/email/confirm", {
          code: await codeFor("admin@example.test"),
        })
      ).status,
    ).toBe(200);
    expect([...admin.cookies]).toEqual(cookiesBefore);

    const r = await admin.json<{ totpURI: string; backupCodes: string[] }>(
      "/private/security/enroll",
      {},
    );
    expect(r.status).toBe(200);
    uri = r.data.totpURI;
    recoveryCodes = r.data.backupCodes;
    expect(recoveryCodes).toHaveLength(10);
    const u = await fixture(
      'SELECT CAST(two_factor_enabled AS INTEGER) AS mfa FROM "user" WHERE id=?',
    )
      .bind(adminId)
      .first<{ mfa: number }>();
    expect(u?.mfa).toBe(0);
  });
  it("confirms TOTP and preserves access using rotated session", async () => {
    expect(
      (await admin.call("/private/security/confirm", { code: await totp() }))
        .status,
    ).toBe(200);
    expect((await admin.call("/private/users")).status).toBe(200);
  });
  it("blocks passwordless MFA bypass then allows second factor", async () => {
    const c = new Client();
    expect((await login(c, "admin@example.test")).status).toBe(200);
    expect(
      (await c.json<{ mfaRequired: boolean }>("/session")).data.mfaRequired,
    ).toBe(true);
    const pendingSession = await fixture(
      "SELECT authorization_snapshot FROM session WHERE user_id=? ORDER BY created_at DESC LIMIT 1",
    )
      .bind(adminId)
      .first();
    expect(pendingSession?.authorization_snapshot).toBeNull();
    expect((await c.call("/private/users")).status).toBe(403);
    expect(
      (
        await c.call("/security/challenge", {
          code: await totp(),
          trustDevice: true,
        })
      ).status,
    ).toBe(200);
    expect((await c.call("/private/users")).status).toBe(200);
    expect(c.cookies.has("tba.trust")).toBe(true);
    admin.cookies = c.cookies;
  });
  it("keeps fresh-session view reads within a small D1 query budget", async () => {
    const { statements, restore } = countStatements();
    const measured: Record<string, number> = {};
    try {
      for (const view of [
        "profile",
        "users",
        "audit",
        "roles",
        "settings",
        "registrations",
        "dashboard",
      ]) {
        statements.length = 0;
        expect((await admin.call(`/private/${view}`)).status).toBe(200);
        measured[view] = statements.length;
        expect(statements[0]).not.toContain('join "role"');
        expect(statements[0]).not.toContain('"role"."permissions"');
      }
      statements.length = 0;
      const combined = await admin.json<{
        _context: { user: { id: string }; isAdmin: boolean };
        _roles: { rows: unknown[] };
      }>("/private/users?context=1&includeRoles=1");
      expect(combined.status).toBe(200);
      expect(combined.data._context.user.id).toBe(adminId);
      expect(combined.data._context.isAdmin).toBe(true);
      expect(combined.data._roles.rows.length).toBeGreaterThan(0);
      measured.combinedUsers = statements.length;
      expect(measured).toEqual({
        profile: 1,
        users: 2,
        audit: 2,
        roles: 2,
        settings: 3,
        registrations: 2,
        dashboard: 2,
        combinedUsers: 3,
      });
      statements.length = 0;
      const withTotal = await admin.json<{ total: number; pageSize: number }>(
        "/private/users?context=1&includeRoles=1&summary=1&page=1",
      );
      expect(withTotal.status).toBe(200);
      expect(withTotal.data.total).toBeGreaterThan(0);
      expect(withTotal.data.pageSize).toBe(20);
      expect(statements.length).toBe(4);
      statements.length = 0;
      expect(
        (await admin.call("/private/audit?context=1&summary=1&page=1")).status,
      ).toBe(200);
      expect(statements.length).toBe(3);
      statements.length = 0;
      const withoutTotal = await admin.json("/private/users?context=1&page=1");
      expect(withoutTotal.data).not.toHaveProperty("total");
      expect(statements.length).toBe(2);
      statements.length = 0;
      const profile = await admin.json<{ _context: { isAdmin: boolean } }>(
        "/private/profile?context=1",
      );
      expect(profile.data._context.isAdmin).toBe(true);
      expect(statements).toHaveLength(1);
      expect(statements[0]).not.toContain('join "role"');
      expect(statements[0]).toContain('join "settings"');

      for (const [query, budget] of [
        ["page=1&summary=1", 3],
        ["page=2&summary=1", 3],
        ["page=2", 2],
      ] as const) {
        statements.length = 0;
        expect(
          (await admin.call(`/private/users?context=1&${query}`)).status,
        ).toBe(200);
        expect(statements).toHaveLength(budget);
      }
      statements.length = 0;
      expect(
        (await admin.call("/private/profile", { name: "Test Admin" })).status,
      ).toBe(200);
      expect(statements).toHaveLength(3);
      expect(statements[0]).not.toContain('join "role"');
    } finally {
      restore();
    }
  });
  it("initializes a legacy signed session without changing its identity", async () => {
    const cookie = [...admin.cookies].find(([key]) =>
      key.endsWith("session_token"),
    )?.[1];
    expect(cookie).toBeDefined();
    const token = decodeURIComponent(cookie!).split(".")[0];
    const original = await fixture(
      "SELECT id, token, expires_at FROM session WHERE token=?",
    )
      .bind(token)
      .first<{ id: string; token: string; expires_at: number }>();
    expect(original).not.toBeNull();
    await fixture(
      "UPDATE session SET authorization_version=NULL, authorization_snapshot=NULL WHERE id=?",
    )
      .bind(original!.id)
      .run();
    const { statements, restore } = countStatements();
    try {
      expect((await admin.call("/private/profile?context=1")).status).toBe(200);
      expect(statements).toHaveLength(2);
      expect(statements[1]).toMatch(/^UPDATE session SET/);
      statements.length = 0;
      expect((await admin.call("/private/profile?context=1")).status).toBe(200);
      expect(statements).toHaveLength(1);
      expect(statements[0]).not.toContain('join "role"');
    } finally {
      restore();
    }
    const upgraded = await fixture(
      "SELECT id, token, expires_at, authorization_version FROM session WHERE id=?",
    )
      .bind(original!.id)
      .first();
    expect(upgraded).toMatchObject({
      ...original,
      authorization_version: expect.any(Number),
    });
  });
  it("requires first factor even with a trusted device", async () => {
    const c = new Client();
    c.cookies.set("tba.trust", admin.cookies.get("tba.trust")!);
    expect((await c.call("/private/users")).status).toBe(401);
    expect((await login(c, "admin@example.test")).status).toBe(200);
    expect((await c.call("/private/users")).status).toBe(200);
  });
  it("rejects a tampered session cookie even when the original session still exists", async () => {
    const c = new Client();
    c.cookies = new Map(admin.cookies);
    const sessionCookie = [...c.cookies.keys()].find((key) =>
      key.includes("session_token"),
    )!;
    c.cookies.set(sessionCookie, c.cookies.get(sessionCookie)! + "tampered");
    expect((await c.call("/private/profile?context=1")).status).toBe(401);
    expect((await admin.call("/private/profile")).status).toBe(200);
  });
  it("observes permission loss, suspension and session deletion on the next request", async () => {
    expect(
      (
        await admin.call("/private/users", {
          name: "Live Access Test",
          email: "live-access@example.test",
          roleId: "viewer",
        })
      ).status,
    ).toBe(200);
    const c = new Client();
    await login(c, "live-access@example.test");
    const member = await fixture(
      "SELECT id FROM \"user\" WHERE email='live-access@example.test'",
    ).first<{ id: string }>();
    const roleBefore = await fixture(
      "SELECT permissions FROM role WHERE id='viewer'",
    ).first<{ permissions: string | string[] }>();
    try {
      await fixture(
        "UPDATE role SET permissions='[\"app.read\",\"users.read\"]' WHERE id='viewer'",
      ).run();
      expect((await c.call("/private/users?context=1")).status).toBe(200);
      expect((await c.call("/private/registrations")).status).toBe(200);
      expect((await c.call("/private/audit")).status).toBe(403);
      await fixture(
        "UPDATE role SET permissions='[\"app.read\"]' WHERE id='viewer'",
      ).run();
      expect((await c.call("/private/users?context=1")).status).toBe(403);
      expect((await c.call("/private/registrations")).status).toBe(403);
      expect((await c.call("/private/profile")).status).toBe(200);
      await fixture("UPDATE \"user\" SET status='suspended' WHERE id=?")
        .bind(member!.id)
        .run();
      expect((await c.call("/private/profile")).status).toBe(403);
      await fixture("UPDATE \"user\" SET status='active' WHERE id=?")
        .bind(member!.id)
        .run();
      await fixture("DELETE FROM session WHERE user_id=?")
        .bind(member!.id)
        .run();
      expect((await c.call("/private/profile")).status).toBe(401);
      expect((await c.call("/private/users")).status).toBe(401);
    } finally {
      await fixture("UPDATE role SET permissions=? WHERE id='viewer'")
        .bind(
          typeof roleBefore!.permissions === "string"
            ? roleBefore!.permissions
            : JSON.stringify(roleBefore!.permissions),
        )
        .run();
    }
  });
  it("expires trusted devices after 30 days", async () => {
    await fixture("UPDATE trusted_device SET expires_at=?")
      .bind(Date.now() - 1)
      .run();
    const c = new Client();
    c.cookies.set("tba.trust", admin.cookies.get("tba.trust")!);
    await login(c, "admin@example.test");
    expect((await c.call("/private/users")).status).toBe(403);
  });
  it("accepts recovery once after the first factor", async () => {
    const c = new Client();
    await login(c, "admin@example.test");
    expect(
      (
        await c.call("/security/challenge", {
          method: "recovery",
          code: recoveryCodes[0],
        })
      ).status,
    ).toBe(200);
    const next = new Client();
    await login(next, "admin@example.test");
    expect(
      (
        await next.call("/security/challenge", {
          method: "recovery",
          code: recoveryCodes[0],
        })
      ).status,
    ).toBe(400);
  });
  it("requires an existing registration role and explicit confirmation", async () => {
    for (const publicRoleId of ["missing-role", null]) {
      expect(
        (
          await admin.call("/private/settings", {
            mode: "open",
            publicRoleId,
            confirmed: true,
          })
        ).status,
      ).toBe(400);
    }
    expect(
      (
        await admin.call("/private/settings", {
          mode: "open",
          publicRoleId: "viewer",
        })
      ).status,
    ).toBe(400);
  });
  it("supports approval registration with no protected access", async () => {
    expect(
      (
        await admin.call("/private/settings", {
          mode: "approval",
          publicRoleId: "viewer",
        })
      ).status,
    ).toBe(200);
    const c = new Client();
    await fixture("DELETE FROM throttle").run();
    await c.call("/access/send", {
      email: "pending@example.test",
      intent: "register",
    });
    const r = await c.json<{ pending: boolean }>("/access/verify", {
      email: "pending@example.test",
      intent: "register",
      code: await codeFor("pending@example.test"),
    });
    expect(r.status).toBe(200);
    expect(r.data.pending).toBe(true);
    expect((await c.call("/private/example")).status).toBe(401);
  });
  it("requires an explicit role to approve, then enables access", async () => {
    const req = await fixture(
      "SELECT r.id FROM registration r JOIN \"user\" u ON u.id=r.user_id WHERE u.email='pending@example.test'",
    ).first<{ id: string }>();
    expect(
      (
        await admin.call(`/private/registrations/${req!.id}`, {
          decision: "approved",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await admin.call(`/private/registrations/${req!.id}`, {
          decision: "approved",
          roleId: "viewer",
        })
      ).status,
    ).toBe(200);
    const c = new Client();
    expect((await login(c, "pending@example.test")).status).toBe(200);
    expect((await c.call("/private/example")).status).toBe(200);
    expect((await c.call("/private/users")).status).toBe(403);
  });
  it("open registration assigns the configured role and runs extension once", async () => {
    await admin.call("/private/settings", {
      mode: "open",
      publicRoleId: "viewer",
      confirmed: true,
    });
    const c = new Client();
    await fixture("DELETE FROM throttle").run();
    await c.call("/access/send", {
      email: "public@example.test",
      intent: "register",
    });
    const r = await c.call("/access/verify", {
      email: "public@example.test",
      intent: "register",
      code: await codeFor("public@example.test"),
    });
    expect(r.status).toBe(200);
    expect((await c.call("/private/example")).status).toBe(200);
    expect((await c.call("/private/settings")).status).toBe(403);
    const u = await fixture(
      "SELECT id,role_id FROM \"user\" WHERE email='public@example.test'",
    ).first<{ id: string; role_id: string }>();
    expect(u?.role_id).toBe("viewer");
    const event = await fixture(
      "SELECT status,attempts FROM registration_event WHERE user_id=?",
    )
      .bind(u!.id)
      .first<{ status: string; attempts: number }>();
    expect(event?.status).toBe("done");
    expect(event?.attempts).toBe(1);
  });
  it("rechecks mode before completing registration", async () => {
    await fixture("DELETE FROM throttle").run();
    const c = new Client();
    await c.call("/access/send", {
      email: "race@example.test",
      intent: "register",
    });
    await admin.call("/private/settings", {
      mode: "closed",
      publicRoleId: "viewer",
    });
    expect(
      (
        await c.call("/access/verify", {
          email: "race@example.test",
          intent: "register",
          code: await codeFor("race@example.test"),
        })
      ).status,
    ).toBe(400);
  });
  it("revokes a suspended user immediately", async () => {
    const c = new Client();
    await login(c, "public@example.test");
    await fixture(
      "UPDATE \"user\" SET status='suspended' WHERE email='public@example.test'",
    ).run();
    expect((await c.call("/private/example")).status).toBe(403);
  });
  it("presents the existing viewer role as Visualizador", async () => {
    const result = await admin.json<{ rows: { id: string; name: string }[] }>(
      "/private/roles",
    );
    expect(result.data.rows.find((r) => r.id === "viewer")?.name).toBe(
      "Visualizador",
    );
  });
  it("lists all configured roles and assigns the selected custom management role", async () => {
    const publicRole = {
      id: "public-reader",
      name: "Lectores",
      permissions: ["app.read", "users.edit"],
      isPublic: false,
    };
    expect((await admin.call("/private/roles", publicRole)).status).toBe(200);
    const available = await admin.json<{
      registrationRoles: { id: string; name: string }[];
    }>("/private/settings?context=1");
    expect(available.status).toBe(200);
    expect(available.data.registrationRoles.map((r) => r.id).sort()).toEqual([
      "administrator",
      "editor",
      "public-reader",
      "viewer",
    ]);
    expect(
      available.data.registrationRoles.find((r) => r.id === "public-reader")
        ?.name,
    ).toBe("Lectores");
    try {
      expect(
        (
          await admin.call("/private/settings", {
            mode: "open",
            publicRoleId: publicRole.id,
            confirmed: true,
          })
        ).status,
      ).toBe(200);
      expect(
        (await admin.json<{ publicRoleId: string }>("/private/settings")).data
          .publicRoleId,
      ).toBe(publicRole.id);
      // An active registration role keeps its normal editing behavior.
      expect((await admin.call("/private/roles", publicRole)).status).toBe(200);
      await fixture("DELETE FROM throttle").run();
      const c = new Client(),
        email = "selected-role@example.test";
      expect(
        (await c.call("/access/send", { email, intent: "register" })).status,
      ).toBe(200);
      expect(
        (
          await c.call("/access/verify", {
            email,
            intent: "register",
            code: await codeFor(email),
            roleId: "administrator",
          })
        ).status,
      ).toBe(200);
      const account = await fixture('SELECT role_id FROM "user" WHERE email=?')
        .bind(email)
        .first<{ role_id: string }>();
      expect(account?.role_id).toBe(publicRole.id);
      expect(
        (await c.json<{ permissions: string[] }>("/session")).data.permissions,
      ).toEqual(publicRole.permissions);
      expect((await c.call("/private/example")).status).toBe(200);
      expect((await c.call("/private/users")).status).toBe(403);
      expect(
        (
          await c.call("/private/settings", {
            mode: "open",
            publicRoleId: "administrator",
            confirmed: true,
          })
        ).status,
      ).toBe(403);
      // Existing accounts keep the role they already had.
      expect(
        (
          await fixture(
            "SELECT role_id FROM \"user\" WHERE email='public@example.test'",
          ).first<{ role_id: string }>()
        )?.role_id,
      ).toBe("viewer");
    } finally {
      await admin.call("/private/settings", {
        mode: "closed",
        publicRoleId: "viewer",
      });
    }
  });
  it("uses the latest selected role when completing email verification", async () => {
    try {
      await admin.call("/private/settings", {
        mode: "open",
        publicRoleId: "public-reader",
        confirmed: true,
      });
      await fixture("DELETE FROM throttle").run();
      const c = new Client(),
        email = "changed-role@example.test";
      expect(
        (await c.call("/access/send", { email, intent: "register" })).status,
      ).toBe(200);
      expect(
        (
          await admin.call("/private/settings", {
            mode: "open",
            publicRoleId: "viewer",
            confirmed: true,
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await c.call("/access/verify", {
            email,
            intent: "register",
            code: await codeFor(email),
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await fixture('SELECT role_id FROM "user" WHERE email=?')
            .bind(email)
            .first<{ role_id: string }>()
        )?.role_id,
      ).toBe("viewer");
    } finally {
      await admin.call("/private/settings", {
        mode: "closed",
        publicRoleId: "viewer",
      });
    }
  });
  it.each(["editor", "administrator"])(
    "assigns %s only when explicitly selected by an administrator",
    async (roleId) => {
      try {
        expect(
          (
            await admin.call("/private/settings", {
              mode: "open",
              publicRoleId: roleId,
              confirmed: true,
            })
          ).status,
        ).toBe(200);
        await fixture("DELETE FROM throttle").run();
        const c = new Client(),
          email = `configured-${roleId}@example.test`;
        expect(
          (await c.call("/access/send", { email, intent: "register" })).status,
        ).toBe(200);
        expect(
          (
            await c.call("/access/verify", {
              email,
              intent: "register",
              code: await codeFor(email),
              roleId: "viewer",
            })
          ).status,
        ).toBe(200);
        expect(
          (
            await fixture('SELECT role_id FROM "user" WHERE email=?')
              .bind(email)
              .first<{ role_id: string }>()
          )?.role_id,
        ).toBe(roleId);
        const session = await c.json<{
          isAdmin: boolean;
          permissions: string[];
        }>("/session");
        expect(session.status).toBe(200);
        expect(session.data.isAdmin).toBe(roleId === "administrator");
        if (roleId === "editor") {
          const configured = await fixture(
            "SELECT permissions FROM role WHERE id=?",
          )
            .bind(roleId)
            .first<{ permissions: string | string[] }>();
          expect(session.data.permissions).toEqual(
            typeof configured!.permissions === "string"
              ? JSON.parse(configured!.permissions)
              : configured!.permissions,
          );
          expect(
            (
              await c.call("/private/settings", {
                mode: "closed",
                publicRoleId: "viewer",
              })
            ).status,
          ).toBe(403);
        }
      } finally {
        await admin.call("/private/settings", {
          mode: "closed",
          publicRoleId: "viewer",
        });
      }
    },
  );
  it("refuses registration if the configured role is missing", async () => {
    try {
      expect(
        (
          await admin.call("/private/settings", {
            mode: "open",
            publicRoleId: "public-reader",
            confirmed: true,
          })
        ).status,
      ).toBe(200);
      await fixture("DELETE FROM throttle").run();
      const c = new Client(),
        email = "revoked-role@example.test";
      await c.call("/access/send", { email, intent: "register" });
      // Simulate an externally invalidated configuration before verification completes.
      await fixture("UPDATE settings SET public_role_id=NULL WHERE id=1").run();
      expect(
        (
          await c.call("/access/verify", {
            email,
            intent: "register",
            code: await codeFor(email),
          })
        ).status,
      ).toBe(403);
      expect((await c.call("/private/example")).status).toBe(401);
      expect(
        await fixture('SELECT status,role_id FROM "user" WHERE email=?')
          .bind(email)
          .first<{ status: string; role_id: string | null }>(),
      ).toMatchObject({ status: "pending", role_id: null });
    } finally {
      await admin.call("/private/settings", {
        mode: "closed",
        publicRoleId: "viewer",
      });
    }
  });
  it("requires a session and completed MFA to request an email change", async () => {
    expect(
      (
        await new Client().call("/private/profile/email/request", {
          newEmail: "new@example.test",
        })
      ).status,
    ).toBe(401);
    const pending = new Client();
    await login(pending, "admin@example.test");
    expect(
      (
        await pending.call("/private/profile/email/request", {
          newEmail: "new@example.test",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await pending.call("/auth/email-otp/request-email-change", {
          newEmail: "new@example.test",
        })
      ).status,
    ).toBe(404);
  });
  it("changes email only after a user-bound OTP and invalidates old sessions", async () => {
    expect(
      (
        await admin.call("/private/users", {
          name: "Change Test",
          email: "change@example.test",
          roleId: "viewer",
        })
      ).status,
    ).toBe(200);
    const owner = new Client();
    await login(owner, "change@example.test");
    const setup = await owner.json<{ totpURI: string }>(
      "/private/security/enroll",
      {},
    );
    expect(setup.status).toBe(200);
    const memberCode = () =>
      createOTP(
        base32.decode(new URL(setup.data.totpURI).searchParams.get("secret")!),
      ).totp();
    expect(
      (
        await owner.call("/private/security/confirm", {
          code: await memberCode(),
        })
      ).status,
    ).toBe(200);
    const initial = await fixture(
      "SELECT id,role_id,status,two_factor_enabled FROM \"user\" WHERE email='change@example.test'",
    ).first<{
      id: string;
      role_id: string;
      status: string;
      two_factor_enabled: number;
    }>();
    expect(initial?.two_factor_enabled).toBe(testPostgreSQL ? true : 1);
    await fixture("UPDATE session SET created_at=? WHERE user_id=?")
      .bind(Date.now() - 360000, initial!.id)
      .run();
    const stale = await owner.json<{ code: string }>(
      "/private/profile/email/request",
      { newEmail: "changed@example.test" },
    );
    expect(stale.status).toBe(403);
    expect(stale.data.code).toBe("RECENT_AUTH_REQUIRED");
    await login(owner, "change@example.test");
    expect(
      (await owner.call("/security/challenge", { code: await memberCode() }))
        .status,
    ).toBe(200);
    const otherSession = new Client();
    await login(otherSession, "change@example.test");
    expect(
      (
        await otherSession.call("/security/challenge", {
          code: await memberCode(),
          trustDevice: true,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await owner.call("/private/profile/email/request", {
          newEmail: "changed@example.test",
        })
      ).status,
    ).toBe(200);
    const otp = await codeFor("changed@example.test");
    const noFactor = await owner.json<{ code: string }>(
      "/private/profile/email/confirm",
      { newEmail: "changed@example.test", code: otp },
    );
    expect(noFactor.status).toBe(403);
    expect(noFactor.data.code).toBe("MFA_CONFIRMATION_REQUIRED");
    expect(
      (
        await owner.call("/private/profile/email/confirm", {
          newEmail: "changed@example.test",
          code: otp,
          mfaCode: "not-a-totp",
        })
      ).status,
    ).toBe(400);
    await fixture("DELETE FROM throttle").run();

    expect(
      (
        await owner.call("/private/profile/email/confirm", {
          newEmail: "other@example.test",
          mfaCode: await memberCode(),
          code: otp,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await owner.call("/private/profile/email/confirm", {
          newEmail: "changed@example.test",
          mfaCode: await memberCode(),
          code: "000000" === otp ? "999999" : "000000",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await fixture('SELECT email FROM "user" WHERE id=?')
          .bind(initial!.id)
          .first<{ email: string }>()
      )?.email,
    ).toBe("change@example.test");
    expect(
      (
        await owner.call("/private/profile/email/confirm", {
          newEmail: "changed@example.test",
          mfaCode: await memberCode(),
          code: otp,
        })
      ).status,
    ).toBe(200);
    const updated = await fixture(
      "SELECT id,role_id,status,two_factor_enabled,email_verified FROM \"user\" WHERE email='changed@example.test'",
    ).first();
    expect(updated).toMatchObject({
      ...initial,
      email_verified: testPostgreSQL ? true : 1,
    });
    expect((await owner.call("/private/profile")).status).toBe(401);
    expect((await otherSession.call("/private/profile")).status).toBe(401);
    expect(
      (
        await owner.call("/private/profile/email/confirm", {
          newEmail: "changed@example.test",
          mfaCode: await memberCode(),
          code: otp,
        })
      ).status,
    ).toBe(401);
    const trust = await fixture(
      "SELECT COUNT(*) AS count FROM trusted_device WHERE user_id=?",
    )
      .bind(initial!.id)
      .first<{ count: number }>();
    expect(trust?.count).toBe(0);
    await login(owner, "changed@example.test");
    expect((await owner.call("/private/profile")).status).toBe(403);
    expect(
      (await owner.call("/security/challenge", { code: await memberCode() }))
        .status,
    ).toBe(200);
    expect((await owner.call("/private/profile")).status).toBe(200);
    expect(
      mails.some(
        (m) => m.to === "change@example.test" && m.text.includes("was updated"),
      ),
    ).toBe(true);
  });
  async function emailOwner(tag: string) {
    await fixture("DELETE FROM throttle").run();
    const email = `${tag}@example.test`;
    expect(
      (
        await admin.call("/private/users", {
          name: "Email Test",
          email,
          roleId: "viewer",
        })
      ).status,
    ).toBe(200);
    const owner = new Client();
    await login(owner, email);
    const id = (await fixture('SELECT id FROM "user" WHERE email=?')
      .bind(email)
      .first<{ id: string }>())!.id;
    const newEmail = `${tag}-new@example.test`;
    expect(
      (await owner.call("/private/profile/email/request", { newEmail })).status,
    ).toBe(200);
    return { owner, id, email, newEmail, code: await codeFor(newEmail) };
  }
  it("rolls back email, sessions and audit together if an atomic statement fails", async () => {
    const { owner, id, email, newEmail, code } = await emailOwner("rollback");
    const before = await fixture(
      'SELECT email,mfa_epoch FROM "user" WHERE id=?',
    )
      .bind(id)
      .first();
    if (postgres)
      await postgres.pool
        .query(`CREATE FUNCTION fail_tba_email_audit() RETURNS trigger LANGUAGE plpgsql AS
      $$ BEGIN IF NEW.action='profile.email.changed' THEN RAISE EXCEPTION 'test batch failure'; END IF; RETURN NEW; END; $$;
      CREATE TRIGGER fail_email_audit BEFORE INSERT ON audit FOR EACH ROW EXECUTE FUNCTION fail_tba_email_audit()`);
    else
      await fixture(
        "CREATE TRIGGER fail_email_audit BEFORE INSERT ON audit WHEN NEW.action='profile.email.changed' BEGIN SELECT RAISE(ABORT,'test batch failure'); END",
      ).run();
    try {
      expect(
        (await owner.call("/private/profile/email/confirm", { newEmail, code }))
          .status,
      ).toBe(503);
      expect(
        await fixture('SELECT email,mfa_epoch FROM "user" WHERE id=?')
          .bind(id)
          .first(),
      ).toEqual(before);
      expect((await owner.call("/private/profile")).status).toBe(200);
      expect(
        (
          await fixture(
            "SELECT COUNT(*) n FROM audit WHERE actor=? AND action='profile.email.changed'",
          )
            .bind(id)
            .first<{ n: number }>()
        )?.n,
      ).toBe(0);
    } finally {
      await fixture(
        postgres
          ? "DROP TRIGGER fail_email_audit ON audit"
          : "DROP TRIGGER fail_email_audit",
      ).run();
    }
    expect(before).toMatchObject({ email });
  });
  it("returns success if Better Auth fails after the atomic change committed", async () => {
    const { owner, id, newEmail, code } = await emailOwner("response-fault");
    const real = emailChange.withEmailChange;
    const spy = vi
      .spyOn(emailChange, "withEmailChange")
      .mockImplementation((...args) => {
        const adapter = real(...args);
        return {
          ...adapter,
          async update<T>(input: Parameters<typeof adapter.update>[0]) {
            const result = await adapter.update<T>(input);
            if (args[2].committed)
              throw new Error("simulated post-commit response failure");
            return result;
          },
        };
      });
    try {
      const result = await owner.json("/private/profile/email/confirm", {
        newEmail,
        code,
      });
      expect(result.status).toBe(200);
      expect(result.data.signInRequired).toBe(true);
      expect(
        (
          await fixture('SELECT email FROM "user" WHERE id=?')
            .bind(id)
            .first<{ email: string }>()
        )?.email,
      ).toBe(newEmail);
      expect((await owner.call("/private/profile")).status).toBe(401);
      expect(
        (
          await fixture(
            "SELECT COUNT(*) n FROM audit WHERE actor=? AND action='profile.email.changed'",
          )
            .bind(id)
            .first<{ n: number }>()
        )?.n,
      ).toBe(1);
    } finally {
      spy.mockRestore();
    }
  });
  it("keeps a successful change successful when the old-address notification fails", async () => {
    const { owner, id, newEmail, code } =
      await emailOwner("notification-fault");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    try {
      expect(
        (await owner.call("/private/profile/email/confirm", { newEmail, code }))
          .status,
      ).toBe(200);
      expect((await owner.call("/private/profile")).status).toBe(401);
      expect(
        (
          await fixture('SELECT email FROM "user" WHERE id=?')
            .bind(id)
            .first<{ email: string }>()
        )?.email,
      ).toBe(newEmail);
      expect(
        (
          await fixture(
            "SELECT COUNT(*) n FROM audit WHERE actor=? AND action='mail.delivery' AND result='failed'",
          )
            .bind(id)
            .first<{ n: number }>()
        )?.n,
      ).toBe(1);
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it("delivers OTPs in all ten requested languages without changing single-use verification", async () => {
    const email = "languages@example.test";
    const now = Date.now();
    await fixture(
      "INSERT INTO \"user\"(id,name,email,email_verified,status,role_id,created_at,updated_at) VALUES(?,'Language Test',?,TRUE,'active','viewer',?,?)",
    )
      .bind(crypto.randomUUID(), email, now, now)
      .run();
    const client = new Client();
    for (const language of languageCodes) {
      await fixture("DELETE FROM throttle").run();
      expect(
        (await client.call("/access/send", { email }, origin, language)).status,
      ).toBe(200);
      const mail = mails.findLast((message) => message.to === email)!;
      const code = await codeFor(email);
      expect(mail).toMatchObject(otpMail(language, "sign-in", code, "TBA"));
    }
    const code = await codeFor(email);
    expect(
      (await client.call("/access/verify", { email, code }, origin, "ar"))
        .status,
    ).toBe(200);
    expect(
      (await client.call("/access/verify", { email, code }, origin, "ar"))
        .status,
    ).toBe(400);
    expect((await client.call("/session")).status).toBe(200);
  });
  it("never audits secrets or codes", async () => {
    const r = await fixture("SELECT * FROM audit").all();
    const text = JSON.stringify(r.results);
    expect(text).not.toContain(env.BETTER_AUTH_SECRET);
    expect(text).not.toContain(recoveryCodes[0]);
    expect(text).not.toContain(await codeFor("admin@example.test"));
  });
  it.each([
    ["totp", false],
    ["recovery", false],
    ["totp", true],
    ["recovery", true],
  ] as const)(
    "disables MFA in one successful confirmation using %s, workerd=%s",
    async (method, worker) => {
      await fixture("DELETE FROM throttle").run();
      const id = crypto.randomUUID(),
        email = `disable-${method}-${worker}@example.test`;
      await fixture(
        "INSERT INTO \"user\"(id,name,email,email_verified,status,role_id,created_at,updated_at) VALUES(?,'Disable Test',?,TRUE,'active','viewer',?,?)",
      )
        .bind(id, email, Date.now(), Date.now())
        .run();
      const owner = new Client();
      expect((await login(owner, email)).status).toBe(200);
      const setup = await owner.json<{
        totpURI: string;
        backupCodes: string[];
      }>("/private/security/enroll", {});
      const otp = () =>
        createOTP(
          base32.decode(
            new URL(setup.data.totpURI).searchParams.get("secret")!,
          ),
        ).totp();
      expect(
        (await owner.call("/private/security/confirm", { code: await otp() }))
          .status,
      ).toBe(200);
      expect(
        (
          await owner.call("/security/challenge", {
            code: await otp(),
            trustDevice: true,
          })
        ).status,
      ).toBe(200);
      const code = method === "totp" ? await otp() : setup.data.backupCodes[0];
      const caller = new Client(worker);
      caller.cookies = new Map(owner.cookies);
      expect((await caller.call("/private/profile")).status).toBe(200);
      const wrong =
        method === "totp"
          ? code === "000000"
            ? "111111"
            : "000000"
          : "invalid-recovery";
      expect(
        (
          await caller.call("/private/security/disable", {
            method,
            code: wrong,
          })
        ).status,
      ).toBe(400);
      expect(
        await fixture(
          'SELECT CAST(two_factor_enabled AS INTEGER) enabled FROM "user" WHERE id=?',
        )
          .bind(id)
          .first(),
      ).toEqual({ enabled: 1 });
      const oldSession = new Client(worker);
      oldSession.cookies = new Map(caller.cookies);
      const response = await caller.call("/private/security/disable", {
        method,
        code,
      });
      expect(response.status, await response.clone().text()).toBe(200);
      expect(
        await fixture(
          "SELECT count(*) n FROM audit WHERE actor=? AND action='mfa.disabled' AND result='success'",
        )
          .bind(id)
          .first(),
      ).toEqual({ n: 1 });
      expect(
        await fixture(
          'SELECT CAST(two_factor_enabled AS INTEGER) enabled FROM "user" WHERE id=?',
        )
          .bind(id)
          .first(),
      ).toEqual({ enabled: 0 });
      expect(
        await fixture("SELECT id FROM two_factor WHERE user_id=?")
          .bind(id)
          .first(),
      ).toBeNull();
      expect((await caller.call("/private/profile")).status).toBe(200);
      expect((await oldSession.call("/private/profile")).status).toBe(401);
      for (const table of ["assurance", "trusted_device"])
        expect(
          await fixture(`SELECT count(*) n FROM ${table} WHERE user_id=?`)
            .bind(id)
            .first(),
        ).toEqual({ n: 0 });
      const cleared = response.headers
        .getSetCookie()
        .find((value) =>
          value.startsWith(
            origin.startsWith("https:") ? "__Host-tba.trust=" : "tba.trust=",
          ),
        )!;
      expect(cleared).toContain("Max-Age=0");
      expect(cleared).toContain("Path=/");
      if (origin.startsWith("https:")) expect(cleared).toContain("Secure");
    },
  );
  it.each(["totp", "recovery"] as const)(
    "revokes trust inline with %s on an older session",
    async (method) => {
      const id = crypto.randomUUID(),
        email = `trust-${method}@example.test`;
      await fixture(
        "INSERT INTO \"user\"(id,name,email,email_verified,status,role_id,created_at,updated_at) VALUES(?,'Trust Test',?,TRUE,'active','viewer',?,?)",
      )
        .bind(id, email, Date.now(), Date.now())
        .run();
      const loginClient = new Client();
      await login(loginClient, email);
      const owner = new Client(true);
      owner.cookies = new Map(loginClient.cookies);
      const setup = await owner.json<{
        totpURI: string;
        backupCodes: string[];
      }>("/private/security/enroll", {});
      const otp = () =>
        createOTP(
          base32.decode(
            new URL(setup.data.totpURI).searchParams.get("secret")!,
          ),
        ).totp();
      expect(
        (await owner.call("/private/security/confirm", { code: await otp() }))
          .status,
      ).toBe(200);
      expect(
        (
          await owner.call("/security/challenge", {
            code: await otp(),
            trustDevice: true,
          })
        ).status,
      ).toBe(200);
      await fixture("UPDATE session SET created_at=? WHERE user_id=?")
        .bind(Date.now() - 360000, id)
        .run();
      expect(
        (
          await owner.call("/private/security/revoke-trust", {
            method,
            code: "invalid-code",
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await fixture("SELECT count(*) n FROM trusted_device WHERE user_id=?")
            .bind(id)
            .first<{ n: number }>()
        )?.n,
      ).toBe(1);
      const result = await owner.call("/private/security/revoke-trust", {
        method,
        code: method === "totp" ? await otp() : setup.data.backupCodes[0],
      });
      expect(result.status, await result.clone().text()).toBe(200);
      expect(
        (
          await fixture("SELECT count(*) n FROM trusted_device WHERE user_id=?")
            .bind(id)
            .first<{ n: number }>()
        )?.n,
      ).toBe(0);
      expect((await owner.call("/private/profile")).status).toBe(200);
      expect(
        (await owner.json<{ mfaEnabled: boolean }>("/private/profile")).data
          .mfaEnabled,
      ).toBe(true);
      expect(
        (
          await fixture("SELECT count(*) n FROM assurance WHERE user_id=?")
            .bind(id)
            .first<{ n: number }>()
        )?.n,
      ).toBe(1);
    },
  );
  it("clears the trust cookie after a confirmed email change without a post-commit error", async () => {
    const id = crypto.randomUUID(),
      email = "cookie-clear@example.test",
      newEmail = "cookie-clear-new@example.test";
    await fixture(
      "INSERT INTO \"user\"(id,name,email,email_verified,status,role_id,created_at,updated_at) VALUES(?,'Cookie Test',?,TRUE,'active','viewer',?,?)",
    )
      .bind(id, email, Date.now(), Date.now())
      .run();
    const owner = new Client();
    await login(owner, email);
    expect(
      (await owner.call("/private/profile/email/request", { newEmail })).status,
    ).toBe(200);
    const result = await owner.call("/private/profile/email/confirm", {
      newEmail,
      code: await codeFor(newEmail),
    });
    expect(result.status, await result.clone().text()).toBe(200);
    expect(
      ((await result.json()) as { signInRequired: boolean }).signInRequired,
    ).toBe(true);
    expect((await owner.call("/private/profile")).status).toBe(401);
  });
  it("localizes profile and MFA emails and stores only the actor's language preference", async () => {
    const id = crypto.randomUUID(),
      email = "mail-style@example.test",
      now = Date.now(),
      c = new Client();
    await fixture(
      "INSERT INTO \"user\"(id,name,email,email_verified,status,role_id,created_at,updated_at) VALUES(?,'Mail Style',?,TRUE,'active','viewer',?,?)",
    )
      .bind(id, email, now, now)
      .run();
    await login(c, email);
    expect(
      (await new Client().call("/private/profile/language", { language: "ja" }))
        .status,
    ).toBe(401);
    expect(
      (await c.call("/private/profile/language", { language: "xx" })).status,
    ).toBe(400);
    expect(
      (
        await c.call("/private/profile/language", {
          language: "ja",
          userId: adminId,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await fixture("SELECT value FROM verification WHERE identifier=?")
          .bind(mailLanguageIdentifier(id))
          .first<{ value: string }>()
      )?.value,
    ).toBe("ja");
    const other = await fixture(
      "SELECT value FROM verification WHERE identifier=?",
    )
      .bind(mailLanguageIdentifier(adminId))
      .first<{ value: string }>();
    expect(other?.value).not.toBe("ja");
    expect(
      (await c.call("/private/security/enroll/email", {}, origin, "ar")).status,
    ).toBe(200);
    const mfaMail = mails.findLast((m) => m.to === email)!;
    expect(mfaMail).toMatchObject(
      otpMail("ar", "mfa-enroll", await codeFor(email), "TBA"),
    );
    const newEmail = "mail-style-new@example.test";
    expect(
      (
        await c.call(
          "/private/profile/email/request",
          { newEmail },
          origin,
          "ja",
        )
      ).status,
    ).toBe(200);
    const code = await codeFor(newEmail);
    expect(mails.findLast((m) => m.to === newEmail)).toMatchObject(
      otpMail("ja", "change-email", code, "TBA"),
    );
    expect(
      (
        await c.call(
          "/private/profile/email/confirm",
          { newEmail, code },
          origin,
          "ja",
        )
      ).status,
    ).toBe(200);
    expect(mails.findLast((m) => m.to === email)).toMatchObject(
      notificationMail("ja", "changed", "TBA", origin),
    );
    expect((await c.call("/private/profile")).status).toBe(401);
  });
  it("uses each recipient's saved language for delayed request and approval notices", async () => {
    expect(
      (await admin.call("/private/profile/language", { language: "de" }))
        .status,
    ).toBe(200);
    try {
      expect(
        (
          await admin.call("/private/settings", {
            mode: "approval",
            publicRoleId: "viewer",
          })
        ).status,
      ).toBe(200);
      await fixture("DELETE FROM throttle").run();
      const c = new Client(),
        email = "localized-approval@example.test";
      expect(
        (
          await c.call(
            "/access/send",
            { email, intent: "register" },
            origin,
            "ar",
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await c.call(
            "/access/verify",
            { email, intent: "register", code: await codeFor(email) },
            origin,
            "ar",
          )
        ).status,
      ).toBe(200);
      expect(
        mails.findLast((m) => m.to === "admin@example.test"),
      ).toMatchObject(notificationMail("de", "request", "TBA", origin));
      const request = await fixture(
        'SELECT r.id FROM registration r JOIN "user" u ON u.id=r.user_id WHERE u.email=?',
      )
        .bind(email)
        .first<{ id: string }>();
      expect(
        (
          await admin.call(
            `/private/registrations/${request!.id}`,
            { decision: "approved", roleId: "viewer" },
            origin,
            "de",
          )
        ).status,
      ).toBe(200);
      expect(mails.findLast((m) => m.to === email)).toMatchObject(
        notificationMail("ar", "approved", "TBA", origin),
      );
    } finally {
      await admin.call("/private/settings", {
        mode: "closed",
        publicRoleId: "viewer",
      });
      await admin.call("/private/profile/language", { language: "es" });
    }
  });
  it("applies role changes and session revocation across Worker requests", async () => {
    const roleId = "live-delegated";
    const roleBody = { id: roleId, name: "Delegated access", isPublic: false };
    expect(
      (
        await admin.call("/private/roles", {
          ...roleBody,
          permissions: ["users.edit"],
        })
      ).status,
    ).toBe(200);

    async function createMember(email: string, memberRole: string) {
      expect(
        (
          await admin.call("/private/users", {
            name: "Concurrent access test",
            email,
            roleId: memberRole,
          })
        ).status,
      ).toBe(200);
      const client = new Client();
      expect((await login(client, email)).status).toBe(200);
      return client;
    }
    const delegated = await createMember("delegated@example.test", roleId);
    const target = await createMember(
      "revocation-target@example.test",
      "viewer",
    );
    const targetId = (await target.json<{ user: { id: string } }>("/session"))
      .data.user.id;
    const revokePath = `/private/users/${targetId}/revoke`;
    const worker = new Client(true);
    worker.cookies = new Map(delegated.cookies);
    const targetWorker = new Client(true);
    targetWorker.cookies = new Map(target.cookies);

    expect((await worker.call(revokePath, {})).status).toBe(200);
    expect((await targetWorker.call("/private/profile")).status).toBe(401);
    expect(
      (
        await admin.call("/private/roles", {
          ...roleBody,
          permissions: [],
        })
      ).status,
    ).toBe(200);

    const { statements, restore } = countStatements();
    try {
      const stale = await delegated.call(
        revokePath,
        {},
        origin,
        undefined,
        true,
      );
      expect(stale.status).toBe(409);
      expect(await stale.json()).toMatchObject({
        code: "authorization_changed",
      });
      expect(statements).toHaveLength(1);
      expect(statements[0]).toMatch(/^select/i);
    } finally {
      restore();
    }
    const checks = await Promise.all([
      worker.call(revokePath, {}),
      delegated.call(revokePath, {}),
      worker.call("/private/profile?context=1"),
    ]);
    expect(checks.map((response) => response.status)).toEqual([403, 403, 200]);
    expect(await checks[2].json()).toMatchObject({
      _context: { isAdmin: false, permissions: [] },
    });

    expect(
      (
        await admin.call("/private/roles", {
          ...roleBody,
          permissions: ["users.edit"],
        })
      ).status,
    ).toBe(200);
    const original = env.DB;
    let changedDuringRebuild = false;
    env.DB =
      isSQLite(original) || isPostgreSQL(original)
        ? new Proxy(original, {
            get(target, key) {
              if (key !== "one") return Reflect.get(target, key);
              return async (
                query: import("../src/server/database/persistence").SqlCommand,
              ) => {
                if (query.text.startsWith("UPDATE session SET")) {
                  await fixtureSql(
                    target,
                    "UPDATE role SET permissions='[]' WHERE id=?",
                  )
                    .bind(roleId)
                    .run();
                  changedDuringRebuild = true;
                }
                return target.one(query);
              };
            },
          })
        : new Proxy(original, {
            get(target, key) {
              if (key === "prepare")
                return (sql: string) => {
                  const statement = target.prepare(sql);
                  if (!sql.startsWith("UPDATE session SET")) return statement;
                  return {
                    bind(...values: unknown[]) {
                      const bound = statement.bind(...values);
                      return {
                        async first() {
                          await target
                            .prepare(
                              "UPDATE role SET permissions='[]' WHERE id=?",
                            )
                            .bind(roleId)
                            .run();
                          changedDuringRebuild = true;
                          return bound.first();
                        },
                      };
                    },
                  };
                };
              const value = Reflect.get(target, key);
              return typeof value === "function" ? value.bind(target) : value;
            },
          });
    try {
      expect((await delegated.call(revokePath, {})).status).toBe(403);
      expect(changedDuringRebuild).toBe(true);
    } finally {
      env.DB = original;
    }
    const stored = await fixture(
      'SELECT s.authorization_snapshot, s.authorization_version, settings.authorization_version AS current_version FROM session s JOIN "user" u ON u.id=s.user_id CROSS JOIN settings WHERE u.email=? AND settings.id=1',
    )
      .bind("delegated@example.test")
      .first<{
        authorization_snapshot: string;
        authorization_version: number;
        current_version: number;
      }>();
    expect(stored?.authorization_version).toBe(stored?.current_version);
    expect(JSON.parse(stored!.authorization_snapshot)).toEqual({
      roleId,
      permissions: [],
      isAdmin: false,
    });

    const shortenedExpiry = Date.now() + 7 * 60 * 60 * 1000;
    await fixture(
      'UPDATE session SET expires_at=?, authorization_version=NULL WHERE user_id=(SELECT id FROM "user" WHERE email=?)',
    )
      .bind(shortenedExpiry, "delegated@example.test")
      .run();
    const renewed = await delegated.call(
      revokePath,
      {},
      origin,
      undefined,
      true,
    );
    expect(renewed.status).toBe(403);
    const renewedSession = await fixture(
      'SELECT expires_at, authorization_version FROM session WHERE user_id=(SELECT id FROM "user" WHERE email=?)',
    )
      .bind("delegated@example.test")
      .first<{ expires_at: number; authorization_version: number }>();
    expect(renewedSession!.expires_at).toBeGreaterThan(shortenedExpiry);
    expect(renewedSession!.authorization_version).toBe(stored?.current_version);

    expect((await delegated.call("/auth/sign-out", {})).status).toBe(200);
    expect((await worker.call("/private/profile")).status).toBe(401);
  });
  it("keeps names and role labels literal in authorized basic lists", async () => {
    const name = `O'Neil "雪" 100%_`;
    const email = "sql-notes@example.test";
    const label = "Café d'Artagnan";
    const roleId = "sql-notes-role";
    expect(
      (
        await admin.call("/private/roles", {
          id: roleId,
          name: label,
          permissions: ["app.read"],
          isPublic: false,
        })
      ).status,
    ).toBe(200);
    expect(
      (await admin.call("/private/users", { name, email, roleId })).status,
    ).toBe(200);
    const path = "/private/users?page=1&summary=1";
    const users = await admin.json<{
      rows: { name: string; email: string }[];
      total: number;
    }>(path);
    expect(users.status).toBe(200);
    expect(users.data.total).toBeGreaterThan(0);
    expect(users.data.rows[0]).toMatchObject({ name, email, role: label });
    for (const kind of ["users", "registrations", "audit"])
      expect((await admin.call(`/private/export/${kind}`)).status).toBe(404);
    const viewer = new Client();
    expect((await login(viewer, email)).status).toBe(200);
    expect((await viewer.call(path)).status).toBe(403);
    expect((await new Client().call(path)).status).toBe(401);
    expect(
      await fixture('SELECT name,role_id FROM "user" WHERE email=?')
        .bind(email)
        .first(),
    ).toEqual({ name, role_id: roleId });
  });
});
