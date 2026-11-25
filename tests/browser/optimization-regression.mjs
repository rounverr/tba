const mod = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const playwright = mod.default || mod;
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
const [
  base = "http://127.0.0.1:4321",
  dist = process.cwd() + "/dist",
  out = process.cwd() + "/work/optimization-report",
] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const browser = await playwright.chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const actor = {
  user: {
    id: "self",
    name: "Synthetic administrator",
    email: "administrator@example.test",
  },
  isAdmin: true,
  permissions: [],
  mfaEnabled: false,
  mfaRequired: false,
};
const roles = [
  {
    id: "administrator",
    name: "Administrador",
    isAdmin: true,
    permissions: [],
  },
  { id: "editor", name: "Editor", permissions: ["app.read", "users.edit"] },
  {
    id: "viewer",
    name: "Visualizador",
    isPublic: true,
    permissions: ["app.read", "audit.read"],
  },
];
const now = 1793980800000;
const data = {
  dashboard: { users: 2, pending: 1, events: 75 },
  profile: {
    name: actor.user.name,
    email: actor.user.email,
    mfaEnabled: false,
    mfaAvailable: true,
  },
  users: {
    rows: [
      {
        id: "member",
        name: "Synthetic member",
        email: "member@example.test",
        roleId: "editor",
        role: "Editor",
        status: "active",
        mfa: true,
        lastAccess: now,
      },
      {
        id: "self",
        name: actor.user.name,
        email: actor.user.email,
        roleId: "administrator",
        role: "Administrador",
        status: "active",
        mfa: false,
        lastAccess: now,
      },
    ],
    total: 2,
    page: 1,
    pageSize: 20,
    hasMore: false,
    nextCursor: null,
  },
  registrations: {
    rows: [
      {
        id: "r",
        email: "new@example.test",
        created_at: now,
        status: "pending",
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
    hasMore: false,
    nextCursor: null,
  },
  roles: { rows: roles, permissions: ["app.read", "users.edit", "audit.read"] },
  audit: {
    rows: [
      {
        id: "a",
        action: "login.first_factor",
        actor: "self",
        actor_name: actor.user.name,
        email: actor.user.email,
        resource: "self",
        resource_email: actor.user.email,
        result: "success",
        created_at: now,
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
    hasMore: false,
    nextCursor: null,
  },
  settings: { mode: "closed", publicRoleId: "viewer" },
};
const report = { initial: {}, navigation: {}, errors: [] };
try {
  for (const path of ["/login/", "/admin/users/"]) {
    const samples = [];
    for (let sample = 0; sample < 3; sample++) {
      const context = await browser.newContext({
        locale: "es-AR",
        viewport: { width: 1440, height: 1000 },
      });
      await context.addInitScript(() => {
        localStorage.setItem("tba-theme", "dark");
        Date.now = () => 1793980800000;
        window.dateFormatterCreations = 0;
        const Original = Intl.DateTimeFormat;
        Intl.DateTimeFormat = new Proxy(Original, {
          construct(target, args, newTarget) {
            window.dateFormatterCreations++;
            return Reflect.construct(target, args, newTarget);
          },
        });
      });
      const page = await context.newPage(),
        assets = new Set(),
        calls = [];
      page.on("pageerror", (e) => report.errors.push(e.message));
      page.on("request", (r) => {
        const p = new URL(r.url()).pathname;
        if (p.endsWith(".js")) assets.add(p);
        if (p.startsWith("/api/")) calls.push(p);
      });
      await context.route("**/api/**", (r) => {
        const u = new URL(r.request().url()),
          p = u.pathname;
        let value =
          p === "/api/public/config"
            ? { mode: "closed", google: false, mfa: true, trustDevice: true }
            : p === "/api/private/security/enroll"
              ? {
                  totpURI:
                    "otpauth://totp/Test?secret=JBSWY3DPEHPK3PXP&issuer=Test",
                  backupCodes: ["test-only-code"],
                }
              : {
                  ...(data[p.split("/").at(-1)] || { ok: true }),
                  _context: actor,
                  ...(u.searchParams.get("includeRoles") === "1"
                    ? { _roles: data.roles }
                    : {}),
                };
        return r.fulfill({ json: value });
      });
      await page.goto(base + path);
      await page
        .locator(
          path === "/login/" ? ".submit-button:not([disabled])" : "tbody tr",
        )
        .first()
        .waitFor();
      if (path === "/admin/users/") {
        assert.equal(
          await page.locator(".table-toolbar,.table-sort-button").count(),
          0,
        );
        assert.equal(
          await page
            .getByRole("button", { name: "Siguiente", exact: true })
            .isDisabled(),
          true,
        );
      }
      await page.evaluate(() => document.fonts.ready);
      const client = await context.newCDPSession(page);
      await client.send("Performance.enable");
      await client.send("HeapProfiler.collectGarbage");
      const { metrics } = await client.send("Performance.getMetrics");
      let raw = 0,
        gzip = 0;
      for (const asset of assets) {
        const b = await readFile(dist + asset);
        raw += b.length;
        gzip += gzipSync(b).length;
      }
      samples.push({
        dateFormatterCreations: await page.evaluate(
          () => window.dateFormatterCreations,
        ),
        jsFiles: [...assets].sort(),
        jsBytes: raw,
        jsGzipBytes: gzip,
        apiCalls: [...calls],
        heapBytes: metrics.find((x) => x.name === "JSHeapUsedSize").value,
      });
      if (sample === 0) {
        const name = path === "/login/" ? "login" : "users";
        await page.screenshot({
          path: `${out}/${name}.png`,
          animations: "disabled",
        });
        if (name === "users") {
          let documents = 0;
          page.on("request", (r) => {
            if (r.isNavigationRequest()) documents++;
          });
          for (const view of [
            "registrations",
            "roles",
            "audit",
            "settings",
            "profile",
            "security",
            "",
          ]) {
            await page
              .locator(`.sidebar a[href='/admin${view ? "/" + view : ""}']`)
              .first()
              .click();
            await page.waitForFunction(
              (view) =>
                !document.querySelector(".navigation-pending") &&
                location.pathname.replace(/\/$/, "") ===
                  "/admin" + (view ? "/" + view : ""),
              view,
            );
            await page.evaluate(() => document.fonts.ready);
            await page.waitForTimeout(100);
            await page.screenshot({
              path: `${out}/${view || "dashboard"}.png`,
              animations: "disabled",
            });
          }
          const beforeQrAssets = new Set(assets);
          await page.locator(".sidebar a[href='/admin/security']").click();
          await page
            .getByRole("button", {
              name: "Activar verificación en dos pasos",
              exact: true,
            })
            .click();
          await page.locator(".qr-image").waitFor();
          await page.screenshot({
            path: `${out}/mfa.png`,
            animations: "disabled",
          });
          await page.locator(".manual-mfa-toggle").click();
          await page.locator(".manual-key").waitFor();
          await page.screenshot({
            path: `${out}/mfa-manual.png`,
            animations: "disabled",
          });
          report.navigation = {
            documents,
            apiCalls: calls,
            qrAssets: [...assets].filter((p) => !beforeQrAssets.has(p)),
          };
          if (process.env.AUDIT_EXPECT_LAZY_QR === "1")
            assert(report.navigation.qrAssets.length > 0);
        }
      }
      await context.close();
    }
    report.initial[path] = samples;
    console.log(`Measured ${path}`);
  }
  {
    const context = await browser.newContext({ locale: "es-AR" });
    const calls = [];
    const restrictedPermissions = ["app.read", "users.read"];
    let activePermissions = [
      ...restrictedPermissions,
      "audit.read",
      "users.create",
    ];
    await context.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      calls.push(url.pathname);
      return route.fulfill({
        json: {
          ...data[url.pathname.split("/").at(-1)],
          _context: {
            ...actor,
            isAdmin: false,
            permissions: activePermissions,
          },
          ...(url.searchParams.get("includeRoles") === "1" && {
            _roles: data.roles,
          }),
        },
      });
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => report.errors.push(error.message));
    const createUser = page.getByRole("button", {
      name: "Crear usuario",
      exact: true,
    });
    const menu = (path) => page.locator(`.sidebar a[href='/admin${path}']`);
    await page.goto(base + "/admin/users/");
    await createUser.waitFor();
    await menu("/audit").waitFor();
    await menu("/roles").click();
    await page
      .getByRole("heading", { name: "Roles y permisos", exact: true })
      .waitFor();
    await menu("/users").click();
    await createUser.waitFor();
    assert.deepEqual(calls, ["/api/private/users"]);

    activePermissions = restrictedPermissions;
    await menu("").click();
    await menu("/audit").waitFor({ state: "hidden" });
    await menu("/users").click();
    await page.locator("tbody tr").first().waitFor();
    assert.equal(await createUser.count(), 0);
    assert.deepEqual(calls, [
      "/api/private/users",
      "/api/private/dashboard",
      "/api/private/users",
    ]);
    report.permissionRefresh = calls;
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  if (process.env.AUDIT_EXPECT_LAZY_QR === "1") {
    const context = await browser.newContext({ locale: "es-AR" });
    const calls = [];
    await context.route("**/api/**", (route) => {
      calls.push(new URL(route.request().url()).pathname);
      return route.fulfill({ json: { ...data.profile, _context: actor } });
    });
    const chunk = report.navigation.qrAssets[0];
    await context.route(`**${chunk}`, (route) => route.abort("failed"));
    const page = await context.newPage();
    await page.goto(base + "/admin/security/");
    const button = page.getByRole("button", {
      name: "Activar verificación en dos pasos",
      exact: true,
    });
    await button.click();
    await page.locator(".form-error").waitFor();
    assert.equal(calls.includes("/api/private/security/enroll"), false);
    assert.equal(await page.locator(".qr-image").count(), 0);
    assert.equal(await button.isEnabled(), true);
    report.rendererFailureStartsNoEnrollment = true;
    await context.close();
  }
  await writeFile(out + "/browser.json", JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
