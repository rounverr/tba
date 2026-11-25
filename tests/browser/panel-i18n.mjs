import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
const module = await import(process.env.PLAYWRIGHT_MODULE || "playwright"),
  { chromium } = module.default || module;
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const base = process.env.AUTH_TEST_URL || "http://127.0.0.1:4321",
  out = process.env.I18N_SCREENSHOTS;
const languages = ["en", "es", "pt", "de", "fr", "it", "zh", "ja", "hi", "ar"];
const catalogs = Object.fromEntries(
  await Promise.all(
    languages.map(async (code) => [
      code,
      JSON.parse(
        await readFile(
          new URL(`../../src/lib/i18n/panel/${code}.json`, import.meta.url),
        ),
      ),
    ]),
  ),
);
async function choose(page, language) {
  const scope = page;
  await scope.locator(".language-select .select-trigger").click();
  await scope
    .locator(`.language-select [role=option][data-value="${language}"]`)
    .click();
}
async function text(page, selector, value) {
  await page.waitForFunction(
    ({ selector, value }) =>
      document.querySelector(selector)?.textContent.trim() === value,
    { selector, value },
  );
}
async function fixture(language) {
  const context = await browser.newContext({
    locale: language === "es" ? "es-AR" : language,
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript(() => localStorage.setItem("tba-theme", "dark"));
  const page = await context.newPage(),
    calls = [],
    preferenceCalls = [],
    errors = [];
  let docs = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /hydrat|Minified React/i.test(m.text()))
      errors.push(m.text());
  });
  page.on("request", (r) => {
    if (r.isNavigationRequest() && r.frame() === page.mainFrame()) docs++;
  });
  const user = {
      id: "self",
      name: "Synthetic administrator",
      email: "administrator@example.test",
    },
    session = {
      user,
      isAdmin: true,
      mfaRequired: false,
      mfaEnabled: true,
      permissions: [],
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
    { id: "custom", name: "Equipo editorial", permissions: ["app.read"] },
  ];
  await context.route("**/api/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname;
    if (path === "/api/private/profile/language") {
      preferenceCalls.push(request.postDataJSON());
      return route.fulfill({ json: { ok: true } });
    }
    calls.push({
      path,
      method: request.method(),
      language: request.headers()["x-auth-language"],
      params: Object.fromEntries(url.searchParams),
      body: request.postDataJSON(),
    });
    let data = { ok: true };
    if (path === "/api/private/users")
      data = {
        rows: [
          {
            id: "member",
            name: "María García",
            email: "maria@example.test",
            roleId: "editor",
            role: "Editor",
            status: "active",
            mfa: true,
            lastAccess: Date.now(),
          },
        ],
        total: 1,
        pageSize: 20,
        nextCursor: null,
      };
    if (path === "/api/private/roles")
      data = {
        rows: roles,
        permissions: ["app.read", "users.edit", "audit.read"],
      };
    if (path === "/api/private/audit")
      data = {
        rows: [
          {
            id: "a",
            actor: "self",
            actor_name: user.name,
            email: user.email,
            resource: "editor",
            resource_role_name: "Editor",
            action: "role.updated",
            result: "success",
            created_at: Date.now(),
          },
        ],
        total: 1,
        pageSize: 30,
        nextCursor: null,
      };
    if (path === "/api/private/registrations")
      data = {
        rows: [
          {
            id: "req",
            email: "request@example.test",
            status: "pending",
            created_at: Date.now(),
            resolved_at: null,
          },
        ],
        total: 1,
        pageSize: 30,
        nextCursor: null,
      };
    if (path === "/api/private/settings")
      data = { mode: "closed", publicRoleId: "viewer" };
    if (path === "/api/private/profile")
      data = { ...user, mfaAvailable: true, mfaEnabled: true };
    if (path === "/api/private/dashboard")
      data = { users: 5000, pending: 10, events: 25000 };
    if (path === "/api/private/security/enroll")
      data = {
        totpURI:
          "otpauth://totp/TBA:test@example.test?secret=JBSWY3DPEHPK3PXP&issuer=TBA",
        backupCodes: ["abcde-fghij", "klmno-pqrst"],
      };
    if (path === "/api/private/profile/email/request")
      data = { ok: true, mfaRequired: true };
    if (request.method() === "GET" && path.startsWith("/api/private/"))
      data = {
        ...data,
        _context: session,
        ...(url.searchParams.get("includeRoles") === "1"
          ? {
              _roles: {
                rows: roles,
                permissions: ["app.read", "users.edit", "audit.read"],
              },
            }
          : {}),
      };
    await route.fulfill({ json: data });
  });
  return {
    context,
    page,
    calls,
    preferenceCalls,
    errors,
    get docs() {
      return docs;
    },
  };
}
const report = {
  languages: [],
  views: 0,
  noExtraDataRequests: true,
  formsKept: true,
  confirmationKept: true,
  keyboardMenu: true,
  rtl: true,
};
try {
  for (const language of languages) {
    const f = await fixture(language),
      { page } = f,
      m = catalogs[language];
    await page.goto(base + "/admin/users/");
    await page.locator("tbody tr").waitFor();
    await text(page, ".page-heading h1", m.users);
    assert.equal(f.calls.length, 1);
    const trigger = page.locator(".language-select .select-trigger");
    await trigger.click();
    const popup = page.locator(".language-select [role=listbox]");
    assert(await popup.isVisible());
    assert.equal(await popup.getByRole("option").count(), 10);
    assert.equal(
      await page
        .locator(`.language-select [data-value="${language}"]`)
        .getAttribute("aria-selected"),
      "true",
    );
    assert.equal(
      await trigger
        .locator("span svg")
        .evaluate((el) => getComputedStyle(el).transform),
      "none",
    );
    let rect = await popup.boundingBox();
    assert(rect.x >= 0 && rect.x + rect.width <= 1440);
    await page.keyboard.press("Escape");
    assert(await trigger.evaluate((el) => el === document.activeElement));
    const before = f.calls.length;
    await choose(page, language === "en" ? "es" : "en");
    await choose(page, language);
    assert.equal(f.calls.length, before);
    assert.equal(f.preferenceCalls.length, 2);
    assert.equal(f.preferenceCalls.at(-1).language, language);
    assert.equal(f.docs, 1);
    assert.equal(
      (await page.locator("tbody td").first().innerText()).includes(
        "María García",
      ),
      true,
    );
    // Language changes retain an uncontrolled account form in the basic panel.
    await page.getByRole("button", { name: m.createUser, exact: true }).click();
    await page.locator("dialog input[name=name]").fill("Keep this name");
    await page.locator("dialog input[name=email]").fill("draft@example.test");
    const previous = f.calls.length;
    assert.equal(await page.locator("dialog h2").innerText(), m.oneMorePerson);
    assert.equal(
      await page.locator("dialog input[name=name]").inputValue(),
      "Keep this name",
    );
    assert.equal(
      await page.locator("dialog input[name=email]").inputValue(),
      "draft@example.test",
    );
    assert.equal(f.calls.length, previous);
    assert.equal(await page.locator("dialog .language-select").count(), 0);
    await page.locator("dialog .modal-close").click();
    await page.getByRole("button", { name: m.manage, exact: true }).click();
    await page.locator("dialog button[type=submit]").click();
    await page
      .getByRole("dialog", { name: m.confirmAccessChange, exact: true })
      .waitFor();
    assert.equal(await page.locator("dialog .language-select").count(), 0);
    await page
      .getByRole("dialog", { name: m.confirmAccessChange, exact: true })
      .getByRole("button", { name: m.back, exact: true })
      .click();
    await page.locator("dialog .modal-close").click();
    // All eight views retain the language through client-side navigation.
    for (const [path, key] of [
      ["", "overview"],
      ["/users", "users"],
      ["/registrations", "accessRequests"],
      ["/roles", "rolesAndPermissions"],
      ["/audit", "auditLog"],
      ["/settings", "accessAndRegistration"],
      ["/profile", "myProfile"],
      ["/security", "security"],
    ]) {
      await page.locator(`.sidebar a[href="/admin${path}"]`).click();
      await page.waitForURL(
        (url) => url.pathname.replace(/\/$/, "") === "/admin" + path,
      );
      if (path === "")
        await page.waitForFunction(() =>
          document.querySelector(".welcome-card"),
        );
      else await text(page, ".page-heading h1", m[key]);
      assert.equal(await page.locator("html").getAttribute("lang"), language);
      report.views++;
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 900 });
        if (
          !(await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ))
        ) {
          const overflow = await page.evaluate(() =>
            Array.from(document.querySelectorAll("[data-app-root] *"))
              .filter(
                (el) =>
                  el.getBoundingClientRect().right > innerWidth + 1 &&
                  getComputedStyle(el).position !== "fixed",
              )
              .map((el) => ({
                tag: el.tagName,
                className: el.className,
                width: el.getBoundingClientRect().width,
                text: el.textContent.slice(0, 60),
              }))
              .slice(0, 12),
          );
          throw new Error(JSON.stringify({ language, path, width, overflow }));
        }
      }
      await page.setViewportSize({ width: 1440, height: 1000 });

      if (path === "/audit") {
        assert.deepEqual(await page.locator("thead th").allTextContents(), [
          m.name,
          m.author,
          m.activity,
          m.resource,
          m.result,
          m.date,
        ]);
        assert(
          await page
            .locator("tbody")
            .innerText()
            .then(
              (value) =>
                value.includes("Synthetic administrator") &&
                value.includes(m.roleUpdated),
            ),
        );
      }
      if (path === "/registrations") {
        await page
          .getByRole("combobox", { name: m.roleForApproval, exact: true })
          .click();
        assert(
          await page
            .getByRole("option", { name: m.administrator, exact: true })
            .isVisible(),
        );
        await page.keyboard.press("Escape");
      }
      if (path === "/roles") {
        assert(
          await page
            .getByRole("heading", { name: m.administrator, exact: true })
            .isVisible(),
        );
        assert(
          await page
            .getByRole("heading", { name: "Equipo editorial", exact: true })
            .isVisible(),
        );
      }
    }
    assert.equal(f.docs, 1);
    assert.equal(f.calls.filter((c) => c.path === "/api/session").length, 0);
    if (out && ["en", "es", "ar", "de", "hi", "zh", "ja"].includes(language)) {
      await mkdir(out, { recursive: true });
      await trigger.click();
      await page.screenshot({
        path: `${out}/panel-${language}-1440.png`,
        fullPage: false,
      });
      await page.keyboard.press("Escape");
    }
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 900 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${language} overflow ${width}`,
      );
      await trigger.click();
      rect = await popup.boundingBox();
      assert(
        rect.x >= 0 && rect.x + rect.width <= width,
        `${language} menu ${width}`,
      );
      await page.keyboard.press("Escape");
      if (out && language === "ar")
        await page.screenshot({
          path: `${out}/panel-${language}-${width}.png`,
          fullPage: false,
        });
    }
    if (language === "ar") {
      assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
      await page.setViewportSize({ width: 1440, height: 1000 });
      const side = await page.locator(".sidebar").boundingBox();
      assert(side.x > 1000);
      assert.equal(
        await page
          .locator(".dashboard-main")
          .evaluate((el) => getComputedStyle(el).marginLeft),
        "0px",
      );
    }
    if (["en", "es", "ar"].includes(language)) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.locator('.sidebar a[href="/admin/profile"]').click();
      await page
        .getByRole("button", { name: m.changeEmail, exact: true })
        .click();
      await page.locator("#new-email").fill("new@example.test");
      await page.locator("dialog form button[type=submit]").click();
      await page
        .locator("#new-email-code")
        .fill(language === "ar" ? "١٢٣٤٥٦" : "123456");
      assert.equal(
        await page.locator("#new-email-code").inputValue(),
        "123456",
      );
      await page.locator("dialog form button[type=submit]").click();
      await page
        .locator("#email-mfa-code")
        .fill(language === "ar" ? "٦٥٤٣٢١" : "654321");
      assert.equal(
        await page.locator("#email-mfa-code").inputValue(),
        "654321",
      );
      await page.locator("dialog form button[type=submit]").click();
      await page
        .getByText(m.yourEmailWasUpdatedSuccessfully, { exact: true })
        .waitFor();
      assert.deepEqual(
        f.calls.findLast(
          (call) => call.path === "/api/private/profile/email/confirm",
        ).body,
        {
          newEmail: "new@example.test",
          code: "123456",
          mfaCode: "654321",
          method: "totp",
        },
      );
    }
    assert.deepEqual(f.errors, []);
    report.languages.push(language);
    console.log(`Workspace passed: ${language}`);
    await f.context.close();
  }
  // Dialogs inherit the header preference and intentionally have no selector.
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
