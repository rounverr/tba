import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.AUTH_TEST_URL || "http://127.0.0.1:8787";
const email = process.env.TBA_TEST_EMAIL || "administrator@example.test";
const engine = process.env.TBA_TEST_ENGINE || "sqlite";
const headed = process.env.TBA_CHROMIUM_CDP;
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
    : await browser.newContext({ locale: "en" });
  const page = await context.newPage();
  const response = await page.goto(base + "/login/");
  assert.equal(response.headers()["x-frame-options"], "DENY");
  assert.equal(
    (await page.request.get(base + "/api/private/users")).status(),
    401,
  );
  await page.locator("input[type=email]").fill(email);
  await page.locator(".submit-button").click();
  await page.locator("#code").waitFor();
  let code;
  for (let attempt = 0; attempt < 30 && !code; attempt++) {
    const inbox = await fetch("http://127.0.0.1:8025/messages").then((r) =>
      r.json(),
    );
    code = inbox
      .find((mail) => mail.to === email)
      ?.text.match(/\b\d{6}\b/)?.[0];
    if (!code) await delay(200);
  }
  assert.ok(code);
  await page.locator("#code").fill(code);
  await page.locator(".submit-button").click();
  await page.waitForURL("**/admin/");
  await page.locator(".dashboard-shell h1").waitFor();
  const profile = await page.request.get(
    base + "/api/private/profile?context=1",
  );
  assert.equal(profile.status(), 200);
  assert.equal((await profile.json())._context.user.email, email);
  const runId = Date.now();
  for (let n = 1; n <= 20; n++) {
    const add = await page.request.post(base + "/api/private/users", {
      headers: { origin: base },
      data: {
        name: `Synthetic member ${n}`,
        email: `member-${runId}-${n}@example.test`,
        roleId: "viewer",
      },
    });
    assert.equal(add.status(), 200);
  }
  for (const kind of ["users", "audit", "registrations"])
    assert.equal(
      (await page.request.get(base + "/api/private/export/" + kind)).status(),
      404,
    );
  const requests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      requests.push(request.url());
  });
  const table = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/private/users",
  );
  await page.goto(base + "/admin/users/");
  assert.equal((await table).status(), 200);
  await page.locator("main[aria-busy=false]").waitFor();
  await page
    .getByText("Synthetic member 20", { exact: true })
    .first()
    .waitFor();
  assert.equal(await page.locator("tbody tr").count(), 20);
  assert.equal(
    await page.locator(".table-toolbar,.table-sort-button").count(),
    0,
  );
  const next = page.waitForResponse(
    (response) => new URL(response.url()).searchParams.get("page") === "2",
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  assert.equal((await next).status(), 200);
  await page.getByText("Page 2", { exact: true }).waitFor();
  const visible = await page.locator("tbody").innerText();
  const before = requests.length;
  console.log(`${engine}: OTP real, dashboard y tabla de usuarios correctos.`);
  const otherTab = await context.newPage();
  const visibility = (state) =>
    headed
      ? page.waitForFunction(
          (expected) => document.visibilityState === expected,
          state,
          { polling: 100 },
        )
      : Promise.resolve();
  if (headed) {
    for (const tab of [page, otherTab]) {
      const control = await context.newCDPSession(tab);
      await control.send("Emulation.setFocusEmulationEnabled", {
        enabled: false,
      });
    }
  }
  for (let i = 0; i < 3; i++) {
    await otherTab.bringToFront();
    await visibility("hidden");
    await page.bringToFront();
    await visibility("visible");
  }
  if (headed) {
    const control = await context.newCDPSession(page);
    const { windowId } = await control.send("Browser.getWindowForTarget");
    await control.send("Browser.setWindowBounds", {
      windowId,
      bounds: { windowState: "minimized" },
    });
    await visibility("hidden");
    await control.send("Browser.setWindowBounds", {
      windowId,
      bounds: { windowState: "normal" },
    });
    await visibility("visible");
  }
  assert.equal(requests.length, before);
  const idleMs = Number(process.env.TBA_IDLE_MS || 601000);
  console.log(`${engine}: starting ${idleMs} ms of idle time on page 2.`);
  await delay(idleMs);
  assert.equal(requests.length, before);
  assert.equal(await page.locator("tbody").innerText(), visible);
  await page.getByText("Page 2", { exact: true }).waitFor();
  console.log(
    `${engine}: 0 extra requests over ${idleMs} ms and three tab changes${headed ? " plus minimize and restore" : ""}.`,
  );
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await page.getByText("Page 1", { exact: true }).waitFor();
  const modified = await page.request.post(base + "/api/private/profile", {
    headers: { origin: base },
    data: { name: `Test administrator ${engine}` },
  });
  assert.equal(modified.status(), 200);
  const fresh = await page.request.get(base + "/api/private/profile?context=1");
  assert.equal(
    (await fresh.json())._context.user.name,
    `Test administrator ${engine}`,
  );
} finally {
  await browser.close();
}
