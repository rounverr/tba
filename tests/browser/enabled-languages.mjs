import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const mod = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const { chromium } = mod.default || mod;
const base = process.env.AUTH_TEST_URL;
if (!base)
  throw new Error(
    "AUTH_TEST_URL must point to the English/Portuguese fixture build",
  );
const catalog = {};
for (const language of ["en", "pt"])
  catalog[language] = JSON.parse(
    await readFile(
      new URL(`../../src/lib/i18n/panel/${language}.json`, import.meta.url),
    ),
  );
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({
    locale: "es-AR",
    viewport: { width: 1360, height: 1000 },
  });
  await context.addInitScript(() => {
    if (!localStorage.getItem("tba-language"))
      localStorage.setItem("tba-language", "es");
  });
  const page = await context.newPage();
  let documents = 0;
  const calls = [],
    errors = [];
  page.on("request", (r) => {
    if (r.isNavigationRequest() && r.frame() === page.mainFrame()) documents++;
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route("**/api/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    calls.push({
      path,
      body: request.postDataJSON(),
      language: request.headers()["x-auth-language"],
    });
    let data = { ok: true };
    if (path === "/api/public/config")
      data = { mode: "closed", google: false, mfa: true, trustDevice: true };
    if (path === "/api/private/profile")
      data = {
        name: "Fixture",
        email: "fixture@example.test",
        mfaAvailable: true,
        mfaEnabled: false,
        _context: {
          user: {
            id: "fixture",
            name: "Fixture",
            email: "fixture@example.test",
          },
          isAdmin: true,
          permissions: [],
          mfaRequired: false,
          mfaEnabled: false,
        },
      };
    await route.fulfill({ json: data });
  });
  async function choose(language) {
    await page.locator(".language-select .select-trigger").click();
    assert.deepEqual(
      await page
        .locator(".language-select [role=option]")
        .evaluateAll((items) => items.map((item) => item.dataset.value)),
      ["en", "pt"],
    );
    await page.locator(`.language-select [data-value=${language}]`).click();
    await page.waitForFunction(
      (language) => document.documentElement.lang === language,
      language,
    );
  }
  await page.goto(base + "/login/");
  await page.locator(".submit-button:not([disabled])").waitFor();
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  const email = page.locator("input[type=email]");
  await email.fill("draft@example.test");
  await choose("pt");
  assert.equal(await email.inputValue(), "draft@example.test");
  assert.equal(documents, 1);
  await page.goto(base + "/admin/profile/");
  await page.getByLabel(catalog.pt.name, { exact: true }).waitFor();
  await page
    .getByLabel(catalog.pt.name, { exact: true })
    .fill("Keep this draft");
  await choose("en");
  assert.equal(
    await page.getByLabel(catalog.en.name, { exact: true }).inputValue(),
    "Keep this draft",
  );
  const persisted = page.waitForResponse(
    (response) =>
      response.url().includes("/api/private/profile/language") &&
      response.request().postDataJSON()?.language === "pt",
  );
  await choose("pt");
  await persisted;
  assert.equal(
    await page.getByLabel(catalog.pt.name, { exact: true }).inputValue(),
    "Keep this draft",
  );
  assert.equal(documents, 2);
  assert.equal(
    calls.filter((c) => c.path === "/api/private/profile").length,
    1,
  );
  assert.equal(
    calls.filter((c) => c.path === "/api/private/profile/language").at(-1).body
      .language,
    "pt",
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("tba-language")),
    "pt",
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      enabledLanguages: ["en", "pt"],
      disabledSavedLanguageFallback: "en",
      browserFallback: true,
      loginAndPanel: true,
      formsKept: true,
      noReload: true,
      noDataReload: true,
      pageErrors: errors.length,
    }),
  );
} finally {
  await browser.close();
}
