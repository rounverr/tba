import { expect, it, vi } from "vitest";
import {
  configuredLanguageCodes,
  languageCodes,
  resolveLanguage,
  languageDirection,
} from "../src/lib/i18n/config";
import { authErrorKey } from "../src/lib/i18n/errors";
import legacyErrors from "../src/lib/i18n/auth-error-sources.json";
import { messages, type MessageKey } from "../src/lib/i18n/catalog";

it("limits detection and stored preferences to enabled languages with English retained", () => {
  const enabled = configuredLanguageCodes(["pt"]);
  expect(enabled).toEqual(["en", "pt"]);
  expect(resolveLanguage("es", ["es-AR", "pt-BR"], enabled)).toBe("pt");
  expect(resolveLanguage("ar", ["ja-JP"], enabled)).toBe("en");
  expect(resolveLanguage(null, ["ja-JP"], enabled, "pt")).toBe("pt");
  expect(configuredLanguageCodes([])).toEqual(["en"]);
  expect(configuredLanguageCodes(["unknown"])).toEqual(["en"]);
  expect(configuredLanguageCodes(undefined)).toEqual(languageCodes);
  expect(
    languageDirection(
      resolveLanguage(null, ["ar-EG"], configuredLanguageCodes(["ar"])) as "ar",
    ),
  ).toBe("rtl");
});

it("recognizes English server errors and their legacy translations consistently", () => {
  for (const [legacy, key] of Object.entries(legacyErrors)) {
    expect(authErrorKey({ message: legacy })).toBe(key);
    expect(authErrorKey({ message: messages.en[key as MessageKey] })).toBe(key);
  }
});

it("limits current and deferred email preferences to English and Portuguese when configured", async () => {
  vi.resetModules();
  vi.doMock("../src/config/app.json", () => ({
    default: { locale: "en", languages: ["en", "pt"] },
  }));
  try {
    const { mailLanguage } = await import("../src/server/services/auth-mail");
    const { recipientLanguage } =
      await import("../src/server/services/email/language");
    expect(mailLanguage("pt-BR")).toBe("pt");
    expect(mailLanguage("es-AR")).toBe("en");
    expect(mailLanguage()).toBe("en");
    const env = {
      DB: {
        prepare: () => ({
          bind: () => ({ first: async () => ({ value: "es" }) }),
        }),
      },
    };
    expect(
      await recipientLanguage(
        env as unknown as Parameters<typeof recipientLanguage>[0],
        "fixture",
      ),
    ).toBe("en");
  } finally {
    vi.doUnmock("../src/config/app.json");
    vi.resetModules();
  }
});
