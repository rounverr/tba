import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
const mod = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const { chromium } = mod.default || mod;
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const base = process.env.AUTH_TEST_URL || "http://127.0.0.1:4321";
const screenshots = process.env.SECURITY_SCREENSHOTS;
if (screenshots) await mkdir(screenshots, { recursive: true });
try {
  for (const language of ["en", "es", "ar"]) {
    const m = JSON.parse(
      await readFile(
        new URL(`../../src/lib/i18n/panel/${language}.json`, import.meta.url),
      ),
    );
    const context = await browser.newContext({
      locale: language,
      viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript(() => {
      localStorage.setItem("tba-theme", "dark");
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async (value) => {
            window.copiedRecovery = value;
          },
        },
      });
    });
    const page = await context.newPage(),
      errors = [],
      calls = [];
    const codes = Array.from({ length: 10 }, (_, i) => `TEST${i}-CODE${i}`);
    let enabled = false;
    page.on("pageerror", (e) => errors.push(e.message));
    await context.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname,
        body = route.request().postDataJSON();
      calls.push({ path, body });
      let data = { ok: true },
        status = 200;
      if (path === "/api/private/profile")
        data = {
          name: "Test User",
          email: "test@example.test",
          mfaEnabled: enabled,
          mfaAvailable: true,
          _context: {
            user: { id: "self", name: "Test User", email: "test@example.test" },
            isAdmin: true,
            permissions: [],
            mfaEnabled: enabled,
            mfaRequired: false,
          },
        };
      if (path === "/api/private/security/enroll")
        data = {
          totpURI: "otpauth://totp/Test?secret=JBSWY3DPEHPK3PXP&issuer=Test",
          backupCodes: codes,
        };
      if (path === "/api/private/security/confirm") enabled = true;
      if (path === "/api/private/security/disable") {
        if (body.code === "invalid-code") {
          status = 400;
          data = {
            message: "El código no es válido o ha vencido. Intenta nuevamente.",
          };
        } else {
          assert.equal(body.code, language === "es" ? "123456" : codes[0]);
          assert.equal(body.method, language === "es" ? "totp" : "recovery");
          enabled = false;
        }
      }
      return route.fulfill({ status, json: data });
    });
    await page.goto(base + "/admin/security/");
    await page
      .getByRole("button", {
        name: m.enableTwoStepVerification120,
        exact: true,
      })
      .click();
    await page.locator(".mfa-setup-form input[name=code]").fill("123456");
    await page.locator(".mfa-setup-form button[type=submit]").click();
    await page.locator(".recovery-actions").waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(
        await page
          .locator(".recovery-actions")
          .evaluate((el) => getComputedStyle(el).gap),
        "14px",
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const boxes = await page
        .locator(".recovery-actions .button")
        .evaluateAll((els) =>
          els.map((el) => {
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          }),
        );
      for (let i = 1; i < boxes.length; i++) {
        const a = boxes[i - 1],
          b = boxes[i];
        if (Math.abs(a.y - b.y) < 1)
          assert(
            Math.abs(
              (language === "ar" ? a.x - b.x - b.width : b.x - a.x - a.width) -
                14,
            ) < 1,
          );
        else assert(b.y >= a.y + a.height + 13);
      }
      if (screenshots)
        await page
          .locator(".recovery-codes")
          .screenshot({ path: `${screenshots}/${language}-${width}.png` });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: m.copyCodes, exact: true }).click();
    assert.equal(
      await page.evaluate(() => window.copiedRecovery),
      codes.join("\n"),
    );
    const waiting = page.waitForEvent("download");
    await page
      .getByRole("button", { name: m.downloadTxt, exact: true })
      .click();
    const download = await waiting;
    assert.equal(download.suggestedFilename(), m.recoveryFileName);
    let contents = "";
    for await (const chunk of await download.createReadStream())
      contents += chunk.toString("utf8");
    assert(contents.includes(m.recoveryFileHint));
    assert(contents.includes(codes.join("\n")));
    assert.equal(await page.locator(".sidebar .brand-sub").count(), 0);
    assert.equal(
      await page.locator(".dashboard-header .private-badge").count(),
      0,
    );
    assert(
      (await page.locator(".dashboard-footer").innerText()).includes(
        m.privateSpace,
      ),
    );
    assert(
      !(await page.locator(".dashboard-footer").innerText()).includes(
        m.yourAccessProtectedEveryStepOfThe,
      ),
    );
    await page
      .getByRole("button", { name: m.revokeTrustedDevices, exact: true })
      .click();
    await page.locator(".admin-modal input[name=code]").fill("123456");
    await page.locator(".admin-modal button[type=submit]").click();
    await page
      .getByRole("dialog", { name: m.revokeTrustedDevices, exact: true })
      .getByRole("button", { name: m.revokeTrust, exact: true })
      .click();
    await page.waitForFunction(() => !document.querySelector("dialog[open]"));
    assert.equal(new URL(page.url()).pathname, "/admin/security/");
    assert(enabled);
    assert.equal(
      calls.filter((c) => c.path === "/api/private/security/revoke-trust")
        .length,
      1,
    );
    await page.getByRole("button", { name: m.disableMfa, exact: true }).click();
    assert.equal(await page.locator("dialog .form-notice").count(), 0);
    if (language !== "es") {
      await page
        .getByRole("combobox", { name: m.verificationMethod, exact: true })
        .click();
      await page
        .getByRole("option", { name: m.recoveryCode, exact: true })
        .click();
    }
    const form = page.locator(".admin-modal form");
    async function confirm(code) {
      await form.locator("input[name=code]").fill(code);
      await form.locator("button[type=submit]").click();
      const dialog = page.getByRole("dialog", {
        name: m.disableTwoStepVerification,
        exact: true,
      });
      await dialog
        .getByRole("button", { name: m.disableSecondFactor, exact: true })
        .click();
    }
    await confirm("invalid-code");
    await page.locator(".admin-modal .form-error").waitFor();
    assert(enabled);
    assert(await page.locator(".recovery-actions").isVisible());
    await confirm(language === "es" ? "123456" : codes[0]);
    await page
      .getByRole("button", {
        name: m.enableTwoStepVerification120,
        exact: true,
      })
      .waitFor();
    assert.equal(
      await page.locator("dialog[open],.recovery-codes,.form-error").count(),
      0,
    );
    assert.equal(
      calls.filter((c) => c.path === "/api/private/security/disable").length,
      2,
    );
    assert.equal(new URL(page.url()).pathname, "/admin/security/");
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      `Recovery spacing, localized download and MFA disable passed: ${language}`,
    );
  }
} finally {
  await browser.close();
}
