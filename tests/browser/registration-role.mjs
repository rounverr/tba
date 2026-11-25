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
const screenshots = process.env.REGISTRATION_SCREENSHOTS;
if (screenshots) await mkdir(screenshots, { recursive: true });
const languages = (
  process.env.REGISTRATION_LANGUAGES || "en,es,pt,de,fr,it,zh,ja,hi,ar"
).split(",");
let diagnostic;
try {
  for (const language of languages) {
    const m = JSON.parse(
      await readFile(
        new URL(`../../src/lib/i18n/panel/${language}.json`, import.meta.url),
      ),
    );
    const context = await browser.newContext({
      locale: language,
      viewport: { width: 1440, height: 1100 },
    });
    await context.addInitScript(() =>
      localStorage.setItem("tba-theme", "dark"),
    );
    const page = await context.newPage(),
      calls = [],
      errors = [];
    diagnostic = { language, page, calls, errors };
    let documents = 0;
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame())
        documents++;
    });
    let config = { mode: "closed", publicRoleId: "viewer" };
    let roles = [
      {
        id: "administrator",
        name: "Administrador",
        isAdmin: true,
        isPublic: false,
        permissions: [],
      },
      {
        id: "editor",
        name: "Editor",
        isAdmin: false,
        isPublic: false,
        permissions: ["app.read", "users.edit"],
      },
      {
        id: "viewer",
        name: "Visualizador",
        isPublic: true,
        isAdmin: false,
        permissions: ["app.read"],
      },
      {
        id: "public-reader",
        name: "Lectores",
        isPublic: false,
        isAdmin: false,
        permissions: ["app.read", "users.edit"],
      },
    ];
    await context.route("**/api/**", (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname;
      if (path === "/api/private/profile/language") {
        assert.equal(request.method(), "POST");
        assert(
          ["en", "es", "pt", "de", "fr", "it", "zh", "ja", "hi", "ar"].includes(
            request.postDataJSON().language,
          ),
        );
        return route.fulfill({ json: { ok: true } });
      }
      assert.equal(
        path,
        "/api/private/settings",
        "Settings must load roles in the same request",
      );
      const body = request.postDataJSON();
      calls.push({ method: request.method(), path, body });
      if (request.method() === "POST") {
        assert.equal(body.mode, "open");
        assert.equal(body.publicRoleId, "public-reader");
        assert.equal(body.confirmed, true);
        config = { mode: body.mode, publicRoleId: body.publicRoleId };
        return route.fulfill({ json: { ok: true } });
      }
      return route.fulfill({
        json: {
          ...config,
          registrationRoles: roles,
          _context: {
            user: {
              id: "self",
              name: "Test Admin",
              email: "test@example.test",
            },
            isAdmin: true,
            permissions: [],
            mfaRequired: false,
            mfaEnabled: false,
          },
        },
      });
    });
    await page.goto(base + "/admin/settings/");
    const form = page.locator(".settings-panel");
    await form.waitFor();
    assert.equal(calls.length, 1);
    assert.equal(await page.locator(".registration-role-card").count(), 0);
    await page.locator("input[name=mode][value=open]").check();
    const picker = page.locator("#registration-role");
    const native = page.locator("select[name=publicRoleId]");
    async function openPicker() {
      await picker.scrollIntoViewIfNeeded();
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      await picker.click();
      await form.locator("[role=listbox]").waitFor({ state: "visible" });
    }
    assert.equal(
      await picker.getAttribute("aria-describedby"),
      "registration-role-hint",
    );
    assert.equal(await native.inputValue(), "viewer");
    await form.locator("input[type=checkbox]").check();
    await picker.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    assert.equal(await native.inputValue(), "public-reader");
    assert(
      (await form.locator(".registration-role-access").innerText()).includes(
        m.editUsers,
      ),
    );
    assert.equal(await form.locator("input[type=checkbox]").isChecked(), false);
    await openPicker();
    await page.keyboard.press("Home");
    await page.keyboard.press("Enter");
    assert.equal(await native.inputValue(), "administrator");
    assert.equal(
      await form
        .locator(".registration-role-access .permission-tags")
        .innerText(),
      m.fullAdministrativeControl,
    );
    await openPicker();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    assert.equal(await native.inputValue(), "public-reader");
    assert(
      (await form.locator(".check-label").innerText()).includes("Lectores"),
    );
    await form.locator("button[type=submit]").click();
    assert.equal(calls.filter((call) => call.method === "POST").length, 0);
    // Changing mode or language keeps the selected role, without requests or reloads.
    await page.locator("input[name=mode][value=approval]").check();
    assert.equal(await page.locator(".registration-role-card").count(), 0);
    await page.locator("input[name=mode][value=open]").check();
    assert.equal(await native.inputValue(), "public-reader");
    for (const next of [language === "en" ? "es" : "en", language]) {
      await page.locator(".language-select .select-trigger").click();
      await page
        .locator(`.language-select [role=option][data-value="${next}"]`)
        .click();
      assert.equal(await native.inputValue(), "public-reader");
    }
    assert.equal(calls.length, 1);
    assert.equal(documents, 1);
    assert.equal(await picker.innerText(), "Lectores");
    assert.equal(
      await form.locator(".registration-role-heading label").innerText(),
      m.initialRegistrationRole,
    );
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1100 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert(
        await form
          .locator("input[type=radio],input[type=checkbox]")
          .evaluateAll((inputs) =>
            inputs.every((input) => input.getBoundingClientRect().width >= 12),
          ),
      );
      await openPicker();
      const popup = page.locator(".registration-role-card [role=listbox]");
      assert.equal(await popup.getByRole("option").count(), 5);
      assert.equal(
        await popup.locator('[data-value="administrator"]').isEnabled(),
        true,
      );
      assert.equal(
        await popup.locator('[data-value="editor"]').isEnabled(),
        true,
      );
      assert.equal(
        await popup
          .getByRole("option", { name: "Lectores", exact: true })
          .getAttribute("aria-selected"),
        "true",
      );
      const box = await popup.boundingBox();
      assert(box && box.x >= 0 && box.x + box.width <= width);
      await page.keyboard.press("Escape");
      if (screenshots)
        await form.screenshot({
          path: `${screenshots}/${language}-${width}.png`,
        });
    }
    await form.locator("input[type=checkbox]").check();
    await form.locator("button[type=submit]").click();
    await page.waitForFunction(
      () =>
        !document.querySelector(".settings-panel button[type=submit]")
          ?.disabled &&
        !document.querySelector(".settings-panel input[type=checkbox]")
          ?.checked,
    );
    assert.equal(calls.filter((call) => call.method === "POST").length, 1);
    assert.equal(await native.inputValue(), "public-reader");
    assert.equal(documents, 1);
    await page.reload();
    await picker.waitFor();
    assert.equal(await native.inputValue(), "public-reader");
    assert.equal(
      await page.locator("input[name=mode][value=open]").isChecked(),
      true,
    );
    // A missing configured role requires a new choice; no fallback role is silently sent.
    roles = roles.filter((role) => role.id !== "public-reader");
    await page.reload();
    await picker.waitFor();
    assert.equal(await native.inputValue(), "");
    assert.equal(await form.locator("button[type=submit]").isDisabled(), true);
    // With no configured roles, explain how to create one and prevent saving.
    roles = [];
    await page.reload();
    await picker.waitFor();
    assert.equal(await picker.isDisabled(), true);
    assert.equal(await form.locator("button[type=submit]").isDisabled(), true);
    assert.equal(
      await form.locator(".registration-role-note").innerText(),
      m.noRegistrationRoles,
    );
    assert.deepEqual(errors, []);
    console.log(
      `Open registration role, keyboard, persistence, language, mobile and empty state passed: ${language}`,
    );
    await context.close();
  }
} catch (error) {
  if (diagnostic)
    console.error({
      language: diagnostic.language,
      url: diagnostic.page.url(),
      errors: diagnostic.errors,
      calls: diagnostic.calls,
      text: await diagnostic.page.locator("body").innerText(),
    });
  throw error;
} finally {
  await browser.close();
}
