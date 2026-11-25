import { emailTemplate } from "./email/template";
import { mailCopy } from "./email/copy";
import { translate } from "../../lib/i18n/catalog.server";
import {
  enabledLanguageCodes,
  defaultLanguage,
  resolveLanguage,
  type Language,
} from "../../lib/i18n/config";
export function mailLanguage(header?: string): Language {
  return header
    ? (resolveLanguage(
        null,
        [header],
        enabledLanguageCodes,
        defaultLanguage,
      ) as Language)
    : defaultLanguage;
}
export function otpMail(
  language: Language,
  type: string,
  code: string,
  appName: string,
) {
  const c = mailCopy[language],
    change = type === "change-email",
    mfa = type === "mfa-enroll";
  const title = mfa
    ? c.mfaSubject
    : translate(language, change ? "mailChangeSubject" : "mailSubject");
  return {
    subject: `${appName} · ${title}`,
    text: mfa
      ? `${c.mfaInstruction} ${code}. ${c.expires}. ${c.ignore}`
      : translate(language, change ? "mailChangeBody" : "mailBody", { code }),
    html: emailTemplate({
      language,
      appName,
      title,
      body: mfa
        ? c.mfaInstruction
        : change
          ? c.changeInstruction
          : c.instruction,
      code,
    }),
  };
}
export function notificationMail(
  language: Language,
  kind: "changed" | "approved" | "request",
  appName: string,
  appUrl: string,
) {
  const c = mailCopy[language],
    title = c[`${kind}Subject`],
    body = c[`${kind}Body`];
  const url = new URL(
    kind === "request" ? "/admin/registrations/" : "/login/",
    appUrl,
  ).href;
  const label = kind === "request" ? c.review : c.signIn;
  return {
    subject: `${appName} · ${title}`,
    text: `${body}\n\n${label}: ${url}`,
    html: emailTemplate({
      language,
      appName,
      title,
      body,
      action: { label, url },
    }),
  };
}
