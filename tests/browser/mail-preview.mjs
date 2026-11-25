import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
const mod = await import(process.env.PLAYWRIGHT_MODULE || "playwright"),
  { chromium } = mod.default || mod;
const root = process.env.MAIL_PREVIEW_DIR;
if (!root)
  throw new Error(
    "Generate fixtures with MAIL_PREVIEW_DIR and tests/mail-template.test.ts first",
  );
const out = process.env.MAIL_SCREENSHOTS;
if (out) await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const requests = [],
    errors = [];
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  let checks = 0;
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
  ]) {
    for (const kind of [
      "sign-in",
      "change-email",
      "mfa-enroll",
      "changed",
      "approved",
      "request",
    ]) {
      const html = await readFile(join(root, language, kind + ".html"), "utf8");
      for (const width of [900, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: "light" });
        await page.setContent(html);
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator("html").getAttribute("lang"), language);
        assert.equal(
          await page.locator("html").getAttribute("dir"),
          language === "ar" ? "rtl" : "ltr",
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${language}/${kind}/${width} overflow`,
        );
        assert.equal(await page.locator("img,script,form").count(), 0);
        if (["sign-in", "change-email", "mfa-enroll"].includes(kind)) {
          assert.equal(await page.locator(".mail-code").innerText(), "012345");
          assert.equal(
            await page
              .locator(".mail-code")
              .evaluate((el) => getComputedStyle(el).direction),
            "ltr",
          );
        }
        if (
          out &&
          ["es", "en", "ar"].includes(language) &&
          [900, 390].includes(width)
        )
          await page.screenshot({
            path: join(out, `${language}-${kind}-${width}.png`),
            fullPage: true,
          });
        checks++;
      }
    }
  }
  await page.emulateMedia({ colorScheme: "dark" });
  await page.setContent(
    await readFile(join(root, "es", "sign-in.html"), "utf8"),
  );
  assert.equal(
    await page
      .locator(".mail-card")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgb(25, 31, 44)",
  );
  if (out)
    await page.screenshot({ path: join(out, "es-dark.png"), fullPage: true });
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      layouts: checks,
      languages: 10,
      messageKinds: 6,
      widths: [900, 390, 320],
      darkMode: true,
      externalResources: 0,
      pageErrors: 0,
    }),
  );
} finally {
  await browser.close();
}
