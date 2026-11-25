import { beforeAll } from "vitest";
import { loadAuthLanguage } from "../src/lib/i18n/catalog";
vi.mock("../src/config/app.json", async (importOriginal) => {
  const actual = await importOriginal<{ default: Record<string, unknown> }>();
  return {
    default: {
      ...actual.default,
      locale: "en",
      languages: Object.keys(
        (await import("../src/config/languages.json")).default,
      ),
    },
  };
});
import { describe, expect, it, vi } from "vitest";
import {
  languages,
  languageCodes,
  languageDirection,
  resolveLanguage,
} from "../src/lib/i18n/config";
import { messages, translate, type MessageKey } from "../src/lib/i18n/catalog";
import { authErrorKey, normalizeOtpDigits } from "../src/lib/i18n/errors";
import { mailLanguage, otpMail } from "../src/server/services/auth-mail";

describe("authentication languages", () => {
  it("covers the same nonempty keys and interpolation parameters in ten catalogs", () => {
    expect(languageCodes).toEqual([
      "en",
      "es",
      "pt",
      "de",
      "fr",
      "it",
      "zh",
      "ja",
      "hi",
      "ar",
    ]);
    const parameters = (text: string) =>
      [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const { code } of languages) {
      expect(Object.keys(messages[code]!).sort()).toEqual(
        Object.keys(messages.en).sort(),
      );
      for (const key of Object.keys(messages.en) as MessageKey[]) {
        expect(messages[code]![key].trim(), `${code}.${key}`).not.toBe("");
        expect(parameters(messages[code]![key]), `${code}.${key}`).toEqual(
          parameters(messages.en[key]),
        );
        const translated = translate(code, key, {
          app: "Test",
          organization: "Example",
          code: "123456",
          seconds: 42,
        });
        expect(translated).not.toMatch(/\{\w+\}|undefined/);
        expect(translated).not.toBe(key);
      }
    }
  });
  it.each([
    "es-AR",
    "es-ES",
    "pt-BR",
    "en-US",
    "en-GB",
    "de-DE",
    "fr-CA",
    "it-IT",
    "zh-CN",
    "ja-JP",
    "hi-IN",
    "ar-EG",
  ])("recognizes the regional browser language %s", (variant) => {
    expect(resolveLanguage(null, [variant], languageCodes)).toBe(
      variant.split("-")[0],
    );
  });
  it("prioritizes a supported saved language, then the ordered browser list, then English", () => {
    expect(resolveLanguage("FR-ca", ["es-AR"], languageCodes)).toBe("fr");
    expect(
      resolveLanguage("invalid", ["ko-KR", "PT_br", "de"], languageCodes),
    ).toBe("pt");
    expect(resolveLanguage(null, ["ko-KR", "sv"], languageCodes)).toBe("en");
    expect(resolveLanguage(null, [], languageCodes)).toBe("en");
    expect(resolveLanguage("", [" ja-JP "], languageCodes)).toBe("ja");
  });
  it("keeps the head bootstrap resolver self-contained", () => {
    const bootResolve = new Function(
      `return (${resolveLanguage.toString()})`,
    )() as typeof resolveLanguage;
    expect(bootResolve("ar", ["es"], languageCodes)).toBe("ar");
    expect(bootResolve(null, ["zz"], languageCodes)).toBe("en");
  });
  it("falls back to English for missing messages and never exposes unknown keys", () => {
    const previous = messages.fr!.loading;
    try {
      messages.fr!.loading = "";
      expect(translate("fr", "loading")).toBe(messages.en.loading);
      expect(translate("fr", "unknown.internal.key" as MessageKey)).toBe(
        messages.en.errorUnknown,
      );
    } finally {
      messages.fr!.loading = previous;
    }
    expect(
      languages
        .filter(({ code }) => languageDirection(code) === "rtl")
        .map(({ code }) => code),
    ).toEqual(["ar"]);
  });
  it("localizes authentication errors without displaying raw server details", () => {
    expect(authErrorKey({ code: "ACCESS_NOT_ENABLED" })).toBe(
      "errorAccessNotEnabled",
    );
    expect(authErrorKey({ code: "MFA_REQUIRED" })).toBe("errorMfaRequired");
    expect(
      authErrorKey({ message: "El código no es válido o ha vencido." }),
    ).toBe("errorInvalidCode");
    expect(
      authErrorKey({ message: "Completa la verificación de seguridad." }),
    ).toBe("errorCaptcha");
    expect(authErrorKey({ status: 429 })).toBe("errorTooMany");
    expect(authErrorKey({ status: 503, message: "Internal SQL detail" })).toBe(
      "errorUnavailable",
    );
    expect(authErrorKey({ status: 401 })).toBe("errorSession");
    expect(authErrorKey(new TypeError("Failed to fetch"))).toBe("errorNetwork");
    expect(authErrorKey(null)).toBe("errorUnknown");
    expect(authErrorKey({ message: "constructor" })).toBe("errorUnknown");
    expect(authErrorKey({ message: "Internal SQL detail" })).toBe(
      "errorUnknown",
    );
  });
  it.each(["١٢٣٤٥٦", "۱۲۳۴۵۶", "१२३४५६", "１２３４５６", "12 34-56extra7"])(
    "normalizes localized OTP digits without changing the code value: %s",
    (value) => {
      expect(normalizeOtpDigits(value)).toBe("123456");
    },
  );
  it("translates OTP email presentation while preserving the code and legacy callers", () => {
    for (const language of languageCodes) {
      expect(mailLanguage(language)).toBe(language);
      for (const type of ["sign-in", "change-email"]) {
        const result = otpMail(language, type, "123456", "Test App");
        expect(result.subject).toBe(
          `Test App · ${messages[language]![type === "change-email" ? "mailChangeSubject" : "mailSubject"]}`,
        );
        expect(result.text.match(/123456/g)).toHaveLength(1);
        expect(result.text).toContain("5");
        expect(result.text).not.toContain("{code}");
      }
    }
    expect(mailLanguage()).toBe("en");
    expect(mailLanguage("pt-BR")).toBe("pt");
    expect(mailLanguage("not-supported")).toBe("en");
    expect(otpMail("es", "sign-in", "123456", "TBA")).toMatchObject({
      subject: "TBA · Tu código de acceso",
      text: messages.es!.mailBody.replace("{code}", "123456"),
    });
  });
});

beforeAll(async () => {
  await Promise.all(
    (["en", "es", "pt", "de", "fr", "it", "zh", "ja", "hi", "ar"] as const).map(
      loadAuthLanguage,
    ),
  );
});
