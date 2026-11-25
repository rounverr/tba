import { afterEach, expect, it, vi } from "vitest";
import { api } from "../../src/lib/utils";

afterEach(() => vi.unstubAllGlobals());

it("sends the active interface language even when storage is unavailable", async () => {
  vi.stubGlobal("document", {
    documentElement: { dataset: { authLocale: "ar" } },
  });
  vi.stubGlobal("localStorage", {
    getItem() {
      throw new Error("Storage blocked");
    },
  });
  const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetch);
  await api("/private/profile/email/request", {
    newEmail: "test@example.test",
  });
  expect(fetch.mock.calls[0][1].headers["X-Auth-Language"]).toBe("ar");
});

it("preserves the explicit language used by login", async () => {
  vi.stubGlobal("document", {
    documentElement: { dataset: { authLocale: "en" } },
  });
  const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetch);
  await api("/access/code", { email: "test@example.test" }, undefined, "ja");
  expect(fetch.mock.calls[0][1].headers["X-Auth-Language"]).toBe("ja");
});

it("retains compatibility with callers outside the browser", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetch);
  await api("/public/config");
  expect(fetch.mock.calls[0][1].headers).not.toHaveProperty("X-Auth-Language");
});
