// Optional browser suite: use an existing Playwright installation, no application dependency.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const playwright = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const { chromium } = playwright.default || playwright;
const base = process.env.AUTH_TEST_URL || "http://127.0.0.1:4321";
async function chooseLanguage(page, language) {
  const scope = (await page.locator("dialog[open]").count())
    ? page.locator("dialog[open]").last()
    : page;
  await scope.locator(".language-select .select-trigger").click();
  await scope
    .locator(`.language-select [role=option][data-value="${language}"]`)
    .click();
}
const catalogs = Object.fromEntries(
  await Promise.all(
    ["en", "es", "pt", "de", "fr", "it", "zh", "ja", "hi", "ar"].map(
      async (code) => [
        code,
        JSON.parse(
          await readFile(
            new URL(
              `../../src/lib/i18n/messages/${code}.json`,
              import.meta.url,
            ),
          ),
        ),
      ],
    ),
  ),
);
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const report = { languages: [], detections: 0, publicPages: 0, errors: [] };
const text = async (page, selector, expected) => {
  await page.waitForFunction(
    ({ selector, expected }) =>
      document.querySelector(selector)?.innerText.trim() === expected,
    { selector, expected },
  );
  assert.equal((await page.locator(selector).innerText()).trim(), expected);
};
async function fixture({
  language = "en",
  saved,
  preferred,
  mode = "open",
  captcha = false,
  blocked = false,
  viewport = { width: 1440, height: 1000 },
} = {}) {
  const context = await browser.newContext({ locale: language, viewport });
  await context.addInitScript(
    ({ saved, preferred, blocked }) => {
      localStorage.setItem("tba-theme", "dark");
      if (saved) localStorage.setItem("tba-language", saved);
      if (preferred) {
        Object.defineProperty(navigator, "languages", { get: () => preferred });
        Object.defineProperty(navigator, "language", {
          get: () => preferred.at(-1) || "zz",
        });
      }
      if (blocked) {
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new DOMException("Blocked", "SecurityError");
          },
        });
      }
      window.captchaLanguages = [];
      window.turnstile = {
        render(_element, options) {
          window.captchaLanguages.push(options.language);
          options.callback("captcha-proof");
          return String(window.captchaLanguages.length);
        },
        remove() {},
      };
    },
    { saved, preferred, blocked },
  );
  const page = await context.newPage(),
    calls = [],
    errors = [];
  let documents = 0,
    sendError = null,
    verifyError = null,
    pending = false,
    mfa = true,
    holdSend = null,
    holdSession = null;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydrat|Minified React/i.test(message.text())
    )
      errors.push(message.text());
  });
  page.on("request", (r) => {
    if (r.isNavigationRequest() && r.frame() === page.mainFrame()) documents++;
  });
  await context.route("**/api/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    calls.push({
      path,
      body: request.postDataJSON(),
      language: request.headers()["x-auth-language"],
    });
    let data = { ok: true },
      status = 200;
    if (path === "/api/public/config")
      data = {
        mode,
        google: true,
        mfa: true,
        trustDevice: true,
        ...(captcha ? { turnstileSiteKey: "test-key" } : {}),
      };
    if (path === "/api/access/send") {
      if (holdSend) await holdSend;
      if (sendError) {
        data = sendError.body;
        status = sendError.status;
      }
    }
    if (path === "/api/access/verify") {
      if (verifyError) {
        data = verifyError.body;
        status = verifyError.status;
      } else data = { pending };
    }
    if (path === "/api/session") {
      if (holdSession) await holdSession;
      data = { user: { email: "person@example.test" }, mfaRequired: mfa };
    }
    if (path === "/api/security/challenge") {
      data = { message: "El código no es válido. Intenta nuevamente." };
      status = 400;
    }
    if (path === "/api/auth/sign-in/social") {
      data = {
        message:
          "El servicio no está disponible. Intenta nuevamente o contacta al administrador.",
      };
      status = 503;
    }
    await route
      .fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      })
      .catch(() => {});
  });
  return {
    context,
    page,
    calls,
    errors,
    get documents() {
      return documents;
    },
    set sendError(v) {
      sendError = v;
    },
    set verifyError(v) {
      verifyError = v;
    },
    set pending(v) {
      pending = v;
    },
    set holdSend(v) {
      holdSend = v;
    },
    set holdSession(v) {
      holdSession = v;
    },
  };
}
async function ready(f, path = "/login/") {
  await f.page.goto(base + path, { waitUntil: "domcontentloaded" });
  await f.page
    .locator("html:not([data-auth-pending]) [data-auth-root]")
    .waitFor({ state: "visible" });
  await f.page.locator(".submit-button:not([disabled])").waitFor();
}
try {
  // Detection and first-paint bootstrap: hold hydration assets, inspect SSR visibility, then release.
  for (const [saved, preferred, expected] of [
    [null, ["es-AR"], "es"],
    [null, ["es-ES"], "es"],
    [null, ["pt-BR"], "pt"],
    [null, ["en-US"], "en"],
    [null, ["en-GB"], "en"],
    ["fr", ["es-AR"], "fr"],
    ["invalid", ["ko-KR", "de-DE", "es-ES"], "de"],
    [null, ["ko-KR"], "en"],
  ]) {
    const f = await fixture({ saved, preferred });
    let release;
    const gate = new Promise((resolve) => (release = resolve));
    await f.context.route("**/*.js", async (route) => {
      await gate;
      await route.continue();
    });
    await f.page.goto(base + "/login/", { waitUntil: "commit" });
    await f.page.waitForFunction(() =>
      document.querySelector("[data-auth-root]"),
    );
    assert.equal(await f.page.locator("html").getAttribute("lang"), expected);
    assert.equal(
      await f.page
        .locator("[data-auth-root]")
        .evaluate((el) => getComputedStyle(el).visibility),
      "hidden",
    );
    release();
    await f.page
      .locator("html:not([data-auth-pending]) .submit-button:not([disabled])")
      .waitFor();
    await text(f.page, "h1", catalogs[expected].signInTitle);
    assert.deepEqual(f.errors, []);
    report.detections++;
    await f.context.close();
  }
  for (const language of Object.keys(catalogs)) {
    const f = await fixture({
      language: language === "es" ? "es-AR" : language,
    });
    const { page } = f,
      m = catalogs[language];
    await ready(f);
    assert.equal(await page.locator("html").getAttribute("lang"), language);
    assert.equal(
      await page.locator("html").getAttribute("dir"),
      language === "ar" ? "rtl" : "ltr",
    );
    await text(page, "h1", m.signInTitle);
    await text(page, ".auth-description", m.signInDescription);
    assert.equal(await page.title(), `${m.pageTitle} · TBA`);
    await page.locator(".submit-button").click();
    await text(page, ".form-error", m.emailRequired);
    await page.locator("#email").fill("bad-address");
    await page.locator(".submit-button").click();
    await text(page, ".form-error", m.emailInvalid);
    assert.equal(
      f.calls.filter((c) => c.path === "/api/access/send").length,
      0,
    );
    await page.locator("#email").fill("person@example.test");
    const before = f.calls.length;
    await chooseLanguage(page, language === "en" ? "es" : "en");
    assert.equal(
      await page.locator("#email").inputValue(),
      "person@example.test",
    );
    await text(
      page,
      ".form-error",
      catalogs[language === "en" ? "es" : "en"].emailInvalid,
    );
    await chooseLanguage(page, language);
    assert.equal(f.calls.length, before);
    assert.equal(f.documents, 1);
    assert.equal(
      await page.evaluate(() => localStorage.getItem("tba-language")),
      language,
    );
    await page.getByRole("button", { name: m.helpLink, exact: true }).click();
    await text(page, "dialog h2", m.helpTitle);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog").count(), 0);
    // Registration texts, then preserve the selected intent through an OTP and approval.
    await page
      .getByRole("button", { name: m.createAccount, exact: true })
      .click();
    await text(page, "h1", m.signUpTitle);
    f.pending = true;
    await page.locator(".submit-button").click();
    await text(page, "h1", m.otpTitle);
    assert.equal(
      f.calls.findLast((c) => c.path === "/api/access/send").language,
      language,
    );
    assert.equal(
      f.calls.findLast((c) => c.path === "/api/access/send").body.intent,
      "register",
    );
    await page.locator("#code").fill("123");
    await page.locator(".submit-button").click();
    await text(page, ".form-error", m.codeInvalid);
    await page
      .locator("#code")
      .fill(
        language === "ar" ? "١٢٣٤٥٦" : language === "hi" ? "१२३४५६" : "123456",
      );
    assert.equal(await page.locator("#code").inputValue(), "123456");
    await page.locator("input[type=checkbox]").check();
    const callCount = f.calls.length;
    await chooseLanguage(page, language === "en" ? "de" : "en");
    assert.equal(await page.locator("#code").inputValue(), "123456");
    assert(await page.locator("input[type=checkbox]").isChecked());
    assert(await page.locator(".resend-line button").isDisabled());
    assert.equal(f.calls.length, callCount);
    assert.equal(f.documents, 1);
    await chooseLanguage(page, language);
    await page.locator(".submit-button").click();
    await text(page, "h1", m.pendingTitle);
    await text(page, ".pending-card p", m.pendingNotice);
    await page.getByRole("button", { name: m.backSignIn, exact: true }).click();
    await text(page, "h1", m.signInTitle);
    // Existing login, MFA, recovery, and server error translations.
    f.pending = false;
    await page.locator(".submit-button").click();
    await page.locator("#code").fill("123456");
    await page.locator(".submit-button").click();
    await text(page, "h1", m.mfaTitle);
    await page
      .getByRole("button", { name: m.useRecovery, exact: true })
      .click();
    await text(page, "h1", m.recoveryTitle);
    await page.locator("#code").fill("AbCdE-12345");
    await chooseLanguage(page, language === "en" ? "ar" : "en");
    assert.equal(await page.locator("#code").inputValue(), "AbCdE-12345");
    await chooseLanguage(page, language);
    await page.locator(".submit-button").click();
    await text(page, ".form-error", m.errorInvalidCode);
    assert.equal(f.calls.at(-1).body.method, "recovery");
    assert.equal(f.calls.at(-1).body.code, "AbCdE-12345");
    await page
      .getByRole("button", { name: m.useAuthenticator, exact: true })
      .click();
    await page.locator("#code").fill("123456");
    await page.locator(".submit-button").click();
    await text(page, ".form-error", m.errorInvalidCode);
    await page.locator(".back-link").click();
    for (const [status, body, key] of [
      [
        403,
        { code: "ACCESS_NOT_ENABLED", message: "Untranslated backend detail" },
        "errorAccessNotEnabled",
      ],
      [
        429,
        {
          message:
            "Demasiados intentos. Espera unos minutos y vuelve a intentar.",
        },
        "errorTooMany",
      ],
      [503, { message: "Internal SQL detail" }, "errorUnavailable"],
      [400, { message: "Internal SQL detail" }, "errorUnknown"],
    ]) {
      f.sendError = { status, body };
      await page.locator(".submit-button").click();
      await text(page, ".form-error", m[key]);
    }
    f.sendError = null;
    // Busy text changes while the same request remains pending.
    let release;
    f.holdSend = new Promise((resolve) => (release = resolve));
    await page.locator(".submit-button").click();
    await text(page, ".submit-button", m.loading);
    await chooseLanguage(page, language === "en" ? "fr" : "en");
    await text(
      page,
      ".submit-button",
      catalogs[language === "en" ? "fr" : "en"].loading,
    );
    release();
    await page.locator("#code").waitFor();
    f.holdSend = null;
    await chooseLanguage(page, language);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${language}: overflow at ${width}`,
      );
    }
    if (language === "ar") {
      assert.equal(await page.locator("#code").getAttribute("dir"), "ltr");
      assert.equal(
        await page
          .locator(".submit-button .directional-icon")
          .evaluate((el) => getComputedStyle(el).transform),
        "matrix(-1, 0, 0, 1, 0, 0)",
      );
      assert.equal(
        await page.locator(".recipient bdi").getAttribute("dir"),
        "ltr",
      );
    }
    // Persistence applies on a new document. Theme preference remains intact.
    await page.goto(base + "/login/");
    await page
      .locator("html:not([data-auth-pending]) .submit-button:not([disabled])")
      .waitFor();
    await text(page, "h1", m.signInTitle);
    assert.equal(await page.locator("html").getAttribute("lang"), language);
    assert.equal(
      await page.evaluate(() => localStorage.getItem("tba-theme")),
      "dark",
    );
    assert.deepEqual(f.errors, []);
    report.languages.push(language);
    console.log(`Authentication flows passed: ${language}`);
    await f.context.close();
  }
  // Public pages share the selector and language attributes.
  for (const language of Object.keys(catalogs)) {
    const f = await fixture({ saved: language }),
      m = catalogs[language];
    for (const [path, key] of [
      ["/denied/", "deniedHeading"],
      ["/404/", "notFoundHeading"],
    ]) {
      await f.page.goto(base + path, { waitUntil: "domcontentloaded" });
      await f.page
        .locator("html:not([data-auth-pending]) [data-auth-root]")
        .waitFor();
      await text(f.page, "h1", m[key]);
      report.publicPages++;
    }
    let release;
    f.holdSession = new Promise((resolve) => (release = resolve));
    await f.page.goto(base + "/login/complete/", {
      waitUntil: "domcontentloaded",
    });
    await f.page
      .locator("html:not([data-auth-pending]) [role=status]")
      .waitFor();
    await text(f.page, "[role=status]", m.completeLoading);
    const count = f.calls.filter((c) => c.path === "/api/session").length;
    await chooseLanguage(f.page, language === "en" ? "es" : "en");
    assert.equal(
      f.calls.filter((c) => c.path === "/api/session").length,
      count,
    );
    release();
    await f.page.waitForURL((url) => url.searchParams.get("mfa") === "1");
    report.publicPages++;
    assert.deepEqual(f.errors, []);
    await f.context.close();
  }
  // Storage unavailable, CAPTCHA language, reauthentication notices, approval entry and OAuth errors.
  const blocked = await fixture({ language: "pt-BR", blocked: true });
  await ready(blocked);
  await text(blocked.page, "h1", catalogs.pt.signInTitle);
  await chooseLanguage(blocked.page, "ar");
  await text(blocked.page, "h1", catalogs.ar.signInTitle);
  assert.deepEqual(blocked.errors, []);
  await blocked.context.close();
  const f = await fixture({ saved: "zh", mode: "approval", captcha: true });
  await ready(f, "/login/?reauth=profile");
  await text(f.page, ".form-notice", catalogs.zh.reauthProfile);
  await f.page
    .getByRole("button", { name: catalogs.zh.requestAccess, exact: true })
    .click();
  await f.page.locator("#email").fill("person@example.test");
  await f.page.waitForFunction(() => window.captchaLanguages.includes("zh-CN"));
  await chooseLanguage(f.page, "ar");
  await f.page.waitForFunction(() => window.captchaLanguages.includes("ar"));
  await f.page.locator(".submit-button").click();
  assert.equal(
    f.calls.findLast((c) => c.path === "/api/access/send").body.captchaToken,
    "captcha-proof",
  );
  await f.page.locator(".back-link").click();
  await f.page
    .getByRole("button", { name: catalogs.ar.google, exact: true })
    .click();
  await text(f.page, ".form-error", catalogs.ar.errorUnavailable);
  const selector = f.page.getByRole("combobox", {
    name: `${catalogs.ar.languageLabel}: العربية`,
    exact: true,
  });
  await selector.focus();
  await f.page.keyboard.press("ArrowDown");
  await f.page.keyboard.press("Home");
  await f.page.keyboard.press("ArrowDown");
  await f.page.keyboard.press("Enter");
  await text(f.page, "h1", catalogs.es.signUpTitle);
  assert.equal(
    await f.page.locator(".language-select select").inputValue(),
    "es",
  );
  assert.deepEqual(f.errors, []);
  await f.context.close();
  console.log(
    JSON.stringify({
      ...report,
      formStatePreserved: true,
      noLocaleReloadOrRequests: true,
      rtl: true,
      blockedStorage: true,
      localizedCaptcha: true,
      localizedOtpMailHeader: true,
      firstPaintHidden: true,
      keyboardSelector: true,
    }),
  );
} finally {
  await browser.close();
}
