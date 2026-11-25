// Optional Playwright regression: local built assets, mocked APIs, no real sign-in.
import assert from "node:assert/strict";
const mod = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const { chromium } = mod.default || mod;
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const base = process.env.AUTH_TEST_URL || "http://127.0.0.1:4321";
try {
  async function fixture(saved = "en", path = "/login/", slowReact = false) {
    const context = await browser.newContext({ locale: "en" });
    await context.addInitScript(
      (saved) => localStorage.setItem("tba-language", saved),
      saved,
    );
    const page = await context.newPage();
    let releaseReact;
    let reactReleased = !slowReact,
      languageBeforeReact = false;
    const reactGate = new Promise((resolve) => {
      releaseReact = () => {
        reactReleased = true;
        resolve();
      };
    });
    const safety = slowReact
      ? setTimeout(() => releaseReact(), 5000)
      : undefined;
    if (slowReact)
      await context.route(/\/_astro\/client\.[^/]+\.js/, async (route) => {
        await reactGate;
        await route.continue();
      });
    let documents = 0;
    const errors = [],
      chunks = [];
    let releasePortuguese, releaseJapanese;
    const portuguese = new Promise((resolve) => {
      releasePortuguese = resolve;
    });
    const japanese = new Promise((resolve) => {
      releaseJapanese = resolve;
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (slowReact && /\/_astro\/es\.[^/]+\.js/.test(request.url())) {
        languageBeforeReact = !reactReleased;
        releaseReact();
      }
      if (request.isNavigationRequest() && request.frame() === page.mainFrame())
        documents++;
      if (/\/_astro\/(pt|ja|fr)\.[^/]+\.js/.test(request.url()))
        chunks.push(request.url());
    });
    await context.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill({
        json:
          path === "/api/public/config"
            ? { mode: "closed", google: false, mfa: true, trustDevice: true }
            : path === "/api/private/profile"
              ? {
                  name: "Fixture",
                  email: "fixture@example.test",
                  mfaEnabled: false,
                  mfaAvailable: true,
                  _context: {
                    user: {
                      id: "self",
                      name: "Fixture",
                      email: "fixture@example.test",
                    },
                    permissions: [],
                    isAdmin: true,
                    mfaRequired: false,
                    mfaEnabled: false,
                  },
                }
              : { ok: true },
      });
    });
    await context.route(/\/_astro\/(pt|ja|fr)\.[^/]+\.js/, async (route) => {
      if (/\/fr\./.test(route.request().url())) return route.abort("failed");
      await (/\/ja\./.test(route.request().url()) ? japanese : portuguese);
      await route.continue();
    });
    await page.goto(base + path);
    clearTimeout(safety);
    const root = page.locator(
      path === "/login/" ? "[data-auth-root]" : "[data-app-root]",
    );
    await root.waitFor({ state: "visible" });
    async function choose(language) {
      await page.locator(".language-select .select-trigger").click();
      await page.locator(`.language-select [data-value="${language}"]`).click();
    }
    return {
      context,
      page,
      root,
      errors,
      chunks,
      choose,
      releasePortuguese,
      releaseJapanese,
      languageBeforeReact,
      get documents() {
        return documents;
      },
    };
  }
  const early = await fixture("es", "/login/", true);
  assert.equal(
    early.languageBeforeReact,
    true,
    "Detected language starts before the delayed React runtime",
  );
  assert.equal(await early.page.locator("html").getAttribute("lang"), "es");
  assert.deepEqual(early.errors, []);
  await early.context.close();
  // A cold language import cannot unmount, clear or hide an existing form.
  const f = await fixture();
  await f.page.locator("input[type=email]").fill("keep@example.test");
  await f.page.evaluate(() => {
    window.__languageHidden = false;
    window.__languageFrames = true;
    const check = () => {
      const root = document.querySelector("[data-auth-root]");
      if (!root || getComputedStyle(root).visibility === "hidden")
        window.__languageHidden = true;
      if (window.__languageFrames) requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
  await f.choose("pt");
  assert.equal(await f.page.locator("html").getAttribute("lang"), "en");
  assert.equal(
    await f.page.locator("input[type=email]").inputValue(),
    "keep@example.test",
  );
  f.releasePortuguese();
  await f.page.waitForFunction(() => document.documentElement.lang === "pt");
  await f.choose("en");
  await f.page.waitForFunction(() => document.documentElement.lang === "en");
  const count = f.chunks.length;
  await f.choose("pt");
  await f.page.waitForFunction(() => document.documentElement.lang === "pt");
  assert.equal(f.chunks.length, count);
  // The last choice wins even if an older import completes later.
  await f.choose("ja");
  await f.choose("de");
  await f.page.waitForFunction(() => document.documentElement.lang === "de");
  f.releaseJapanese();
  await f.page.waitForTimeout(150);
  assert.equal(await f.page.locator("html").getAttribute("lang"), "de");
  await f.choose("fr");
  await f.page.waitForTimeout(100);
  assert.equal(await f.page.locator("html").getAttribute("lang"), "de");
  assert.equal(
    await f.page.evaluate(() => localStorage.getItem("tba-language")),
    "de",
  );
  assert.equal(
    await f.page.locator("input[type=email]").inputValue(),
    "keep@example.test",
  );
  assert.equal(
    await f.page.evaluate(() => {
      window.__languageFrames = false;
      return window.__languageHidden;
    }),
    false,
  );
  assert.equal(f.documents, 1);
  assert.deepEqual(f.errors, []);
  await f.context.close();
  // Initial failures reveal a complete English fallback instead of an empty page.
  for (const path of ["/login/", "/admin/profile/"]) {
    const initial = await fixture("fr", path);
    assert.equal(await initial.page.locator("html").getAttribute("lang"), "en");
    assert.equal(await initial.page.locator("html").getAttribute("dir"), "ltr");
    assert.deepEqual(initial.errors, []);
    await initial.context.close();
  }
  console.log(
    "Lazy catalogs: delayed/cached changes, last-choice race, failure fallback, preserved forms, no flashes or navigation passed.",
  );
} finally {
  await browser.close();
}
