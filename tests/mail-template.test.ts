import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it, expect, afterEach, vi } from "vitest";
import { languageCodes } from "../src/lib/i18n/config";
import { otpMail, notificationMail } from "../src/server/services/auth-mail";
import { emailTemplate } from "../src/server/services/email/template";
import { mailCopy } from "../src/server/services/email/copy";
import { sendMail } from "../src/server/services/mail";
const cases = languageCodes.flatMap((language) =>
  [
    "sign-in",
    "change-email",
    "mfa-enroll",
    "changed",
    "approved",
    "request",
  ].map((kind) => ({ language, kind })),
);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("transactional email presentation", () => {
  it.each(cases)(
    "renders $kind in $language with HTML and plain text",
    async ({ language, kind }) => {
      const otp = ["sign-in", "change-email", "mfa-enroll"].includes(kind);
      const mail = otp
        ? otpMail(language, kind, "012345", "TBA")
        : notificationMail(
            language,
            kind as "changed" | "approved" | "request",
            "TBA",
            "https://example.test",
          );
      if (process.env.MAIL_PREVIEW_DIR) {
        const dir = join(process.env.MAIL_PREVIEW_DIR, language);
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, kind + ".html"), mail.html);
      }
      expect(mail.subject).toMatch(/^TBA · /);
      expect(mail.html).toContain(
        `<html lang="${language}" dir="${language === "ar" ? "rtl" : "ltr"}">`,
      );
      expect(mail.html).toContain('role="presentation"');
      expect(mail.html).not.toMatch(
        /<img|<script|<form|<link|https?:\/\/[^" ]+\.(?:png|woff)/i,
      );
      expect(mail.html).not.toMatch(/\{(?:code|app)\}/);
      expect(mail.text).not.toMatch(/\{(?:code|app)\}/);
      expect(
        new TextEncoder().encode(JSON.stringify(mail)).length,
      ).toBeLessThan(16384);
      if (otp) {
        expect(mail.text.match(/012345/g)).toHaveLength(1);
        expect(mail.html.match(/012345/g)).toHaveLength(1);
        expect(mail.html).toContain('dir="ltr"');
        expect(mail.html).toContain(mailCopy[language].expires);
      } else {
        expect(mail.html).toContain(
          kind === "request"
            ? "https://example.test/admin/registrations/"
            : "https://example.test/login/",
        );
        expect(mail.text).toContain("https://example.test/");
      }
    },
  );
  it("keeps every notification catalog complete", () => {
    const keys = Object.keys(mailCopy.en).sort();
    for (const language of languageCodes) {
      expect(Object.keys(mailCopy[language]).sort()).toEqual(keys);
      for (const value of Object.values(mailCopy[language]))
        expect(value.trim()).not.toBe("");
    }
  });
  it("escapes dynamic content and rejects unsafe action links", () => {
    const html = emailTemplate({
      language: "es",
      appName: '<img src=x onerror="evil()">',
      title: "<script>evil()</script>",
      body: "<b>untrusted & text</b>",
      code: '"<tag>',
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;b&gt;untrusted &amp; text&lt;/b&gt;");
    expect(() =>
      emailTemplate({
        language: "en",
        appName: "Test",
        title: "Test",
        body: "Test",
        action: { url: "javascript:alert(1)", label: "Test" },
      }),
    ).toThrow("Invalid mail action URL");
  });
  it("sends both parts through the Cloudflare binding", async () => {
    const send = vi.fn().mockResolvedValue({ messageId: "test" }),
      mail = otpMail("ar", "sign-in", "012345", "Test");
    await sendMail(
      {
        APP_URL: "https://example.test",
        MAIL_PROVIDER: "cloudflare",
        MAIL_FROM: "sender@example.test",
        EMAIL: { send },
      },
      "recipient@example.test",
      mail.subject,
      mail.text,
      mail.html,
    );
    expect(send).toHaveBeenCalledExactlyOnceWith({
      from: "sender@example.test",
      to: "recipient@example.test",
      ...mail,
    });
  });
  it.each(["resend", "local"])(
    "sends both parts through %s",
    async (provider) => {
      const fetch = vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 204 }));
      vi.stubGlobal("fetch", fetch);
      const mail = notificationMail(
        "ja",
        "approved",
        "Test",
        "https://example.test",
      );
      await sendMail(
        {
          APP_URL:
            provider === "local"
              ? "http://localhost:8787"
              : "https://example.test",
          MAIL_PROVIDER: provider,
          MAIL_FROM: "sender@example.test",
          RESEND_API_KEY: "test-only-key",
        },
        "recipient@example.test",
        mail.subject,
        mail.text,
        mail.html,
      );
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject(mail);
    },
  );
});
