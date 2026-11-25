import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
const mod = await import(process.env.PLAYWRIGHT_MODULE || "playwright"),
  { chromium } = mod.default || mod;
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const base = process.env.AUTH_TEST_URL || "http://127.0.0.1:4321",
  screenshots = process.env.DELETE_SELECT_SCREENSHOTS;
if (screenshots) await mkdir(screenshots, { recursive: true });
try {
  for (const language of ["es", "en", "ar"]) {
    const m = JSON.parse(
      await readFile(
        new URL(`../../src/lib/i18n/panel/${language}.json`, import.meta.url),
      ),
    );
    const context = await browser.newContext({
      locale: language,
      viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript(() =>
      localStorage.setItem("tba-theme", "dark"),
    );
    const page = await context.newPage(),
      errors = [],
      deletions = [],
      authorizationRecovery = [];
    let deleted = false,
      status = "active",
      documents = 0,
      tableReads = 0;
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (r.isNavigationRequest() && r.frame() === page.mainFrame())
        documents++;
    });
    const actor = {
      user: {
        id: "self",
        name: "Test Admin",
        email: "admin@example.test",
      },
      isAdmin: true,
      permissions: [],
      mfaEnabled: false,
      mfaRequired: false,
    };
    await context.route("**/api/**", (r) => {
      const request = r.request(),
        path = new URL(request.url()).pathname;
      if (path === "/api/public/config")
        return r.fulfill({
          json: { mode: "closed", google: false, mfa: true },
        });
      if (path === "/api/session") {
        authorizationRecovery.push("refresh");
        return r.fulfill({
          json:
            language === "ar"
              ? { ...actor, user: { ...actor.user, id: "other" } }
              : actor,
        });
      }
      if (path === "/api/private/users/victim/delete") {
        assert.deepEqual(request.postDataJSON(), {});
        assert.equal(request.headers()["x-tba-authorization-refresh"], "1");
        if (language !== "es") {
          authorizationRecovery.push("delete");
          if (authorizationRecovery.length === 1)
            return r.fulfill({
              status: 409,
              json: {
                code: "authorization_changed",
                message: "Your permissions changed.",
              },
            });
        }
        deletions.push(path);
        deleted = true;
        return r.fulfill({ json: { ok: true } });
      }
      if (path === "/api/private/users/victim") {
        assert.deepEqual(request.postDataJSON(), {
          status: "suspended",
          roleId: "viewer",
        });
        status = "suspended";
        return r.fulfill({ json: { ok: true } });
      }
      assert.equal(path, "/api/private/users");
      tableReads++;
      return r.fulfill({
        json: {
          rows: deleted
            ? []
            : [
                {
                  id: "victim",
                  name: "Deletion example",
                  email: "victim@example.test",
                  roleId: "viewer",
                  role: "Visualizador",
                  status,
                  mfa: false,
                  lastAccess: null,
                },
              ],
          total: deleted ? 0 : 1,
          page: 1,
          pageSize: 20,
          nextCursor: null,
          _context: actor,
          _roles: {
            rows: [
              {
                id: "viewer",
                name: "Visualizador",
                isAdmin: false,
                isPublic: true,
                permissions: ["app.read"],
              },
            ],
            permissions: [],
          },
        },
      });
    });
    await page.goto(base + "/admin/users/");
    await page.getByRole("button", { name: m.manage, exact: true }).click();
    const picker = page.getByRole("combobox", {
        name: m.accountStatus,
        exact: true,
      }),
      native = page.locator("select[name=status]");
    assert.equal(
      await page
        .locator(".admin-modal")
        .getByRole("button", { name: m.deleteUser, exact: true })
        .count(),
      0,
    );
    assert.equal(await native.locator("option[value=delete]").count(), 0);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await picker.scrollIntoViewIfNeeded();
      await page.evaluate(
        () =>
          new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r)),
          ),
      );
      await picker.click();
      const menu = page.locator(".admin-modal [role=listbox]").first();
      await menu.waitFor({ state: "visible" });
      assert.equal(await menu.getByRole("option").count(), 4);
      const positions = await menu.getByRole("option").evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { y: r.y, height: r.height };
        }),
      );
      for (let i = 0; i < positions.length; i++) {
        assert(positions[i].height >= 44);
        if (i)
          assert(
            positions[i].y - positions[i - 1].y - positions[i - 1].height >= 3,
          );
      }
      const box = await menu.boundingBox();
      assert(box && box.x >= 0 && box.x + box.width <= width);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      if (screenshots)
        await page.screenshot({
          path: `${screenshots}/${language}-${width}.png`,
        });
      await menu
        .getByRole("option", { name: m.deleteUser, exact: true })
        .click();
      const confirm = page.getByRole("dialog", {
        name: m.confirmDeleteUser,
        exact: true,
      });
      await confirm.waitFor();
      assert((await confirm.innerText()).includes("victim@example.test"));
      assert.equal(await native.inputValue(), "active");
      await confirm.getByRole("button", { name: m.back, exact: true }).click();
      assert.equal(deletions.length, 0);
      assert.equal(await native.inputValue(), "active");
    }
    await picker.click();
    await page.getByRole("option", { name: m.suspended, exact: true }).click();
    await page.locator(".admin-modal button[type=submit]").click();
    await page
      .getByRole("dialog", { name: m.confirmAccessChange, exact: true })
      .getByRole("button", { name: m.saveAndCloseSessions, exact: true })
      .click();
    await page.locator(".admin-modal").waitFor({ state: "hidden" });
    assert.equal(status, "suspended");
    assert.equal(tableReads, 2);
    await page.getByRole("button", { name: m.manage, exact: true }).click();
    await picker.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    const confirm = page.getByRole("dialog", {
      name: m.confirmDeleteUser,
      exact: true,
    });
    await confirm
      .getByRole("button", { name: m.deleteUser, exact: true })
      .click();
    if (language === "ar") {
      await page.waitForURL("**/login/");
      assert.deepEqual(authorizationRecovery, ["delete", "refresh"]);
      assert.deepEqual(deletions, []);
      assert.equal(tableReads, 2);
      assert.deepEqual(errors, []);
      console.log("Authorization retry discarded after identity change: ar");
      await context.close();
      continue;
    }
    await page.getByText(m.userDeleted, { exact: true }).waitFor();
    assert.equal(await page.locator("tbody tr").count(), 0);
    assert.equal(await page.locator("dialog[open]").count(), 0);
    assert.equal(deletions.length, 1);
    assert.equal(tableReads, 3);
    assert.deepEqual(
      authorizationRecovery,
      language === "en" ? ["delete", "refresh", "delete"] : [],
    );
    assert.equal(documents, 1);
    assert.deepEqual(errors, []);
    console.log(
      `Status selection, action cancellation, deletion, spacing, keyboard and responsive passed: ${language}`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
