import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const mod = await import(process.env.PLAYWRIGHT_MODULE || "playwright"),
  { chromium } = mod.default || mod;
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  for (const language of ["es", "en", "ar"]) {
    const m = JSON.parse(
      await readFile(
        new URL(`../../src/lib/i18n/panel/${language}.json`, import.meta.url),
      ),
    );
    const context = await browser.newContext({
        locale: language,
        viewport: { width: 1360, height: 1000 },
      }),
      page = await context.newPage(),
      calls = [],
      errors = [];
    let verified = false;
    page.on("pageerror", (error) => errors.push(error.message));
    await context.route("**/api/**", async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname;
      calls.push({ path, body: request.postDataJSON() });
      let status = 200,
        data = { ok: true };
      if (path === "/api/public/config")
        data = { mode: "closed", google: false, mfa: true, trustDevice: true };
      if (path === "/api/private/profile")
        data = {
          name: "Test",
          email: "test@example.test",
          mfaAvailable: true,
          mfaEnabled: false,
          _context: {
            user: { id: "a", name: "Test", email: "test@example.test" },
            isAdmin: true,
            permissions: [],
            mfaEnabled: false,
            mfaRequired: false,
          },
        };
      if (path === "/api/private/security/enroll") {
        if (!verified) {
          status = 403;
          data = {
            code: "MFA_ENROLL_CONFIRMATION_REQUIRED",
            message: "Confirma tu identidad para continuar.",
          };
        } else
          data = {
            totpURI: "otpauth://totp/Test?secret=JBSWY3DPEHPK3PXP&issuer=Test",
            backupCodes: ["abcde-12345"],
          };
      }
      if (path === "/api/private/security/enroll/email/confirm") {
        assert.equal(request.postDataJSON().code, "123456");
        verified = true;
      }
      await route.fulfill({ status, json: data });
    });
    await page.goto(
      (process.env.AUTH_TEST_URL || "http://127.0.0.1:4321") + "/login/",
    );
    await page.locator(".submit-button:not([disabled])").waitFor();
    assert.equal(await page.locator(".brand-sub").count(), 0);
    await page.goto(
      (process.env.AUTH_TEST_URL || "http://127.0.0.1:4321") +
        "/admin/security/",
    );
    await page
      .getByRole("button", {
        name: m.enableTwoStepVerification120,
        exact: true,
      })
      .click();
    await page
      .locator("#enrollment-email-code")
      .fill(language === "ar" ? "١٢٣٤٥٦" : "123456");
    assert.equal(await page.locator("dialog .language-select").count(), 0);
    assert.equal(new URL(page.url()).pathname, "/admin/security/");
    await page.locator("dialog button[type=submit]").click();
    await page.locator(".qr-image").waitFor();
    assert.equal(await page.locator("dialog .language-select").count(), 0);
    assert(
      await page
        .getByRole("heading", { name: m.connectYourAuthenticator, exact: true })
        .isVisible(),
    );
    assert.equal(
      calls.filter((call) => call.path === "/api/session").length,
      0,
    );
    assert.equal(
      calls.filter((call) => call.path === "/api/access/send").length,
      0,
    );
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`Inline MFA and inherited locale passed: ${language}`);
  }
} finally {
  await browser.close();
}
