import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

const mod = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const { chromium } = mod.default || mod;
const base = process.env.AUTH_TEST_URL || "http://127.0.0.1:4321";
// Use an isolated headed Chromium on a real window manager for this branch.
const headed = process.env.TBA_CHROMIUM_CDP;
const idleMs = Number(process.env.TBA_IDLE_MS ?? "601000");
const browser = headed
  ? await chromium.connectOverCDP(headed, { noDefaults: true })
  : await chromium.launch({
      executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
      headless: true,
      args: ["--no-sandbox"],
    });

try {
  const context = headed
    ? browser.contexts()[0]
    : await browser.newContext({ locale: "es-AR" });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("tba-language", "es"));
  const requests = [];
  let revoked = false;
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/")) requests.push(url);
  });
  await context.route("**/api/**", (route) => {
    const { pathname, searchParams } = new URL(route.request().url());
    if (pathname === "/api/public/config")
      return route.fulfill({
        json: { mode: "closed", google: false, mfa: true },
      });
    assert.equal(pathname, "/api/private/users");
    if (revoked)
      return route.fulfill({
        status: 401,
        json: { message: "Sign in to continue." },
      });
    const page = Number(searchParams.get("page") || 1);
    return route.fulfill({
      json: {
        _context: {
          user: { id: "self", name: "Test Admin", email: "admin@example.test" },
          isAdmin: true,
          permissions: [],
          mfaEnabled: false,
          mfaRequired: false,
        },
        ...(searchParams.get("includeRoles") === "1" && {
          _roles: { rows: [], permissions: [] },
        }),
        ...(searchParams.get("summary") === "1" && { total: 40 }),
        rows: [
          {
            id: "example",
            name: `Local fixture ${page}`,
            email: "fixture@example.test",
            roleId: "viewer",
            role: "Viewer",
            status: "active",
          },
        ],
        page,
        pageSize: 20,
        hasMore: page === 1,
        nextCursor: page === 1 ? "fixture-cursor" : null,
      },
    });
  });
  const settled = () => page.locator("main[aria-busy=false]").waitFor();
  async function noRequests(count) {
    await delay(400);
    assert.equal(requests.length, count);
    assert.equal(await page.locator("main").getAttribute("aria-busy"), "false");
  }
  async function read(action, params = {}) {
    const count = requests.length;
    const fetched = page.waitForResponse((response) =>
      response.url().includes("/api/private/users"),
    );
    await action();
    await fetched;
    await settled();
    assert.equal(requests.length, count + 1);
    for (const [key, value] of Object.entries(params))
      assert.equal(requests.at(-1).searchParams.get(key), value, key);
  }
  const row = (number) =>
    page.getByText(`Local fixture ${number}`, { exact: true });
  await read(() => page.goto(base + "/admin/users/"), { page: "1" });
  await row(1).waitFor();

  const visibility = (state) =>
    page.waitForFunction(
      (expected) => document.visibilityState === expected,
      state,
      { polling: 100, timeout: 7000 },
    );
  if (headed) {
    const tab = await context.newPage();
    await tab.bringToFront();
    await visibility("hidden");
    await page.bringToFront();
    await visibility("visible");

    // An unexpired catalog already shipped with Users. Hiding the tab must
    // preserve it and the original Users page for the next navigation.
    await page.locator(".sidebar a[href='/admin/roles']").click();
    await page.getByRole("heading", { name: "Roles y permisos" }).waitFor();
    await page.locator(".sidebar a[href='/admin/users']").click();
    await row(1).waitFor();
    await noRequests(1);
    await tab.close();
  }

  await read(() => page.getByRole("button", { name: "Siguiente" }).click(), {
    page: "2",
  });
  await row(2).waitFor();
  const count = requests.length;

  if (idleMs) {
    const started = performance.now();
    console.log(`Idle started for at least ${idleMs / 1000} seconds`);
    await delay(idleMs);
    await noRequests(count);
    console.log(
      `Idle: ${((performance.now() - started) / 1000).toFixed(2)} seconds, zero requests`,
    );
  } else {
    // Fixed time changes Date.now without fabricating browser focus or timers.
    await page.clock.setFixedTime(new Date(Date.now() + 31_000));
    await noRequests(count);
  }

  if (headed) {
    const cdp = await context.newCDPSession(page);
    const other = await context.newPage();
    const otherCdp = await context.newCDPSession(other);
    for (const session of [cdp, otherCdp])
      await session.send("Emulation.setFocusEmulationEnabled", {
        enabled: false,
      });
    for (let attempt = 0; attempt < 3; attempt++) {
      await other.bringToFront();
      await visibility("hidden");
      await page.bringToFront();
      await visibility("visible");
      await noRequests(count);
    }
    const { windowId } = await cdp.send("Browser.getWindowForTarget");
    await cdp.send("Browser.setWindowBounds", {
      windowId,
      bounds: { windowState: "minimized" },
    });
    assert.equal(
      (await cdp.send("Browser.getWindowBounds", { windowId })).bounds
        .windowState,
      "minimized",
    );
    await visibility("hidden");
    await cdp.send("Browser.setWindowBounds", {
      windowId,
      bounds: { windowState: "normal" },
    });
    await visibility("visible");
    await noRequests(count);
    await other.close();
    console.log("Three tab switches and minimize/restore: zero requests");
  }

  assert.equal(await row(2).count(), 1);
  await read(() => page.getByRole("button", { name: "Anterior" }).click(), {
    page: "1",
  });
  await row(1).waitFor();
  console.log("Basic pagination and displayed rows preserved.");

  if (headed) {
    await page.evaluate(() => {
      window.historyRestorations = [];
      window.addEventListener("pageshow", (event) =>
        window.historyRestorations.push(event.persisted),
      );
    });
    await page.goto("about:blank");
    await read(() => page.goBack({ waitUntil: "commit" }));
    assert.deepEqual(await page.evaluate(() => window.historyRestorations), [
      true,
    ]);
    await row(1).waitFor();
    console.log(
      "Chromium restored the original document from BFCache and revalidated once.",
    );
  }

  const historyEvent = (type, persisted) =>
    page.evaluate(
      ({ type, persisted }) => {
        window.dispatchEvent(new PageTransitionEvent(type, { persisted }));
      },
      { type, persisted },
    );
  const beforeHistory = requests.length;
  await historyEvent("pageshow", false);
  await noRequests(beforeHistory);
  await historyEvent("pagehide", true);
  assert.equal(
    await page
      .locator(".dashboard-shell")
      .evaluate((element) => element.style.visibility),
    "hidden",
  );
  await read(() => historyEvent("pageshow", true));
  await row(1).waitFor();
  assert.equal(
    await page
      .locator(".dashboard-shell")
      .evaluate((element) => element.style.visibility),
    "",
  );

  revoked = true;
  await historyEvent("pagehide", true);
  const rejected = page.waitForResponse(
    (response) =>
      response.url().includes("/api/private/users") &&
      response.status() === 401,
  );
  await historyEvent("pageshow", true);
  await rejected;
  await page.waitForURL("**/login/");
  assert.equal(await row(1).count(), 0);
  console.log(
    "BFCache handlers: one revalidation, private view hidden, revoked session redirected.",
  );
  await page.close();
} finally {
  await browser.close();
}
