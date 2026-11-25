// Optional browser test against a local immutable build; all API requests are mocked.
import assert from "node:assert/strict";
const mod = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const { chromium } = mod.default || mod;
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({ locale: "en" });
  await context.addInitScript(() => localStorage.setItem("tba-language", "en"));
  const calls = [],
    errors = [];
  const page = await context.newPage();
  let documents = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      documents++;
  });
  await context.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    assert.equal(url.pathname, "/api/private/users");
    const current = Number(url.searchParams.get("page"));
    assert([1, 2].includes(current));
    calls.push(current);
    return route.fulfill({
      json: {
        rows: Array.from({ length: current === 1 ? 20 : 1 }, (_, index) => ({
          id: `member-${(current - 1) * 20 + index}`,
          name: `Member ${(current - 1) * 20 + index + 1}`,
          email: `member${(current - 1) * 20 + index + 1}@example.test`,
          status: "active",
          roleId: "viewer",
          role: "Viewer",
          mfa: false,
          lastAccess: null,
        })),
        page: current,
        pageSize: 20,
        hasMore: current === 1,
        nextCursor: current === 1 ? "2" : null,
        ...(url.searchParams.get("summary") === "1" ? { total: 21 } : {}),
        _context: {
          user: {
            id: "self",
            name: "Administrator",
            email: "admin@example.test",
          },
          isAdmin: true,
          permissions: ["users.read"],
          mfaRequired: false,
          mfaEnabled: false,
        },
        _roles: { rows: [], permissions: [] },
      },
    });
  });
  await page.goto(
    (process.env.AUTH_TEST_URL || "http://127.0.0.1:4321") + "/admin/users/",
  );
  await page.getByText("Member 1", { exact: true }).waitFor();
  assert.equal(await page.locator("tbody tr").count(), 20);
  assert(
    await page
      .getByRole("button", { name: "Previous", exact: true })
      .isDisabled(),
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText("Member 21", { exact: true }).waitFor();
  assert.equal(await page.locator("tbody tr").count(), 1);
  assert.equal(
    await page.locator(".table-pagination span").innerText(),
    "Page 2",
  );
  assert(
    await page.getByRole("button", { name: "Next", exact: true }).isDisabled(),
  );
  assert.equal(await page.locator(".record-count strong").innerText(), "21");
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await page.getByText("Member 1", { exact: true }).waitFor();
  assert.equal(
    await page.locator(".table-pagination span").innerText(),
    "Page 1",
  );
  assert.equal(
    await page
      .locator(".table-toolbar,.search-toolbar,.table-sort-button")
      .count(),
    0,
  );
  assert.deepEqual(calls, [1, 2]);
  assert.equal(documents, 1);
  assert.deepEqual(errors, []);
  console.log(
    "Basic lists: bounded pages, next/previous, shared count, cached return and no reload passed.",
  );
  await context.close();
} finally {
  await browser.close();
}
