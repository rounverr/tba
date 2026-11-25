import { describe, it, expect, vi } from "vitest";
import { createLanguageCache } from "../src/lib/i18n/language-cache";
import { messages, loadAuthLanguage, translate } from "../src/lib/i18n/catalog";
import { panelMessages, loadPanelLanguage } from "../src/lib/i18n/panel";
import { otpMail } from "../src/server/services/auth-mail";
import type { Language } from "../src/lib/i18n/config";

describe("lazy language catalogs", () => {
  it("starts with English only, loads independent namespaces and keeps mail complete without a browser preload", async () => {
    expect(Object.keys(messages)).toEqual(["en"]);
    expect(Object.keys(panelMessages)).toEqual(["en"]);
    expect(otpMail("ar", "sign-in", "123456", "TBA").subject).toMatch(
      /[\u0600-\u06ff]/,
    );
    expect(Object.keys(messages)).toEqual(["en"]);
    await loadAuthLanguage("pt");
    expect(Object.keys(messages).sort()).toEqual(["en", "pt"]);
    expect(Object.keys(panelMessages)).toEqual(["en"]);
    expect(translate("pt", "languageLabel")).not.toBe(
      translate("en", "languageLabel"),
    );
    await loadPanelLanguage("pt");
    expect(Object.keys(panelMessages).sort()).toEqual(["en", "pt"]);
    expect(translate("fr", "loading")).toBe(messages.en.loading);
  });
  it("deduplicates in-flight imports and retains completed catalogs in memory", async () => {
    let finish!: (value: { default: { text: string } }) => void;
    const loader = vi.fn(
      () =>
        new Promise<{ default: { text: string } }>((resolve) => {
          finish = resolve;
        }),
    );
    const loaders = Object.fromEntries(
      (["es", "pt", "de", "fr", "it", "zh", "ja", "hi", "ar"] as const).map(
        (code) => [code, loader],
      ),
    ) as Record<Exclude<Language, "en">, typeof loader>;
    const cache = createLanguageCache({ text: "English" }, loaders);
    const first = cache.load("es"),
      second = cache.load("es");
    expect(first).toBe(second);
    expect(loader).toHaveBeenCalledOnce();
    expect(cache.has("es")).toBe(false);
    expect(cache.catalogs.en.text).toBe("English");
    finish({ default: { text: "Español" } });
    await first;
    expect(await cache.load("es")).toEqual({ text: "Español" });
    expect(loader).toHaveBeenCalledOnce();
  });
  it("does not publish failed catalogs and retries without poisoning the cache", async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValue({ default: { text: "Français" } });
    const loaders = Object.fromEntries(
      (["es", "pt", "de", "fr", "it", "zh", "ja", "hi", "ar"] as const).map(
        (code) => [code, loader],
      ),
    ) as Record<Exclude<Language, "en">, typeof loader>;
    const cache = createLanguageCache({ text: "English" }, loaders);
    await expect(cache.load("fr")).rejects.toThrow("Offline");
    expect(cache.has("fr")).toBe(false);
    expect(cache.catalogs.en.text).toBe("English");
    expect(await cache.load("fr")).toEqual({ text: "Français" });
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
