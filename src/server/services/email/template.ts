import { languageDirection, type Language } from "../../../lib/i18n/config";
import { mailCopy } from "./copy";
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function emailTemplate(input: {
  language: Language;
  appName: string;
  title: string;
  body: string;
  code?: string;
  action?: { label: string; url: string };
}) {
  if (
    input.action &&
    !["https:", "http:"].includes(new URL(input.action.url).protocol)
  )
    throw new Error("Invalid mail action URL");
  const { language, appName, title, body, code, action } = input,
    c = mailCopy[language],
    dir = languageDirection(language),
    align = dir === "rtl" ? "right" : "left";
  return `<!doctype html><html lang="${language}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escape(title)}</title><style>@media(max-width:480px){.mail-content{padding:28px 22px!important}.mail-title{font-size:25px!important}.mail-code{font-size:30px!important;letter-spacing:7px!important}}@media(prefers-color-scheme:dark){.mail-background{background:#10141d!important}.mail-card{background:#191f2c!important;border-color:#30394a!important}.mail-title,.mail-body{color:#edf1fa!important}.mail-muted{color:#b2bdd0!important}.mail-code-box{background:#242f4a!important;border-color:#35466c!important}.mail-code{color:#b4c9ff!important}.mail-rule{border-color:#30394a!important}}</style></head><body class="mail-background" style="margin:0;padding:0;background:#f3f5f9;font-family:Arial,'Helvetica Neue',sans-serif;color:#172033;-webkit-text-size-adjust:100%">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;overflow:hidden;mso-hide:all">${escape(code ? c.expires : title)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" dir="${dir}"><tr><td align="center" style="padding:40px 16px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" class="mail-card" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e1e6ef;border-radius:18px;border-collapse:separate;overflow:hidden"><tr><td style="height:4px;background:#2854cf;font-size:1px;line-height:4px">&nbsp;</td></tr><tr><td class="mail-content" style="padding:38px 42px;text-align:${align}">
<p style="margin:0 0 30px;font-size:14px;line-height:22px;font-weight:700;letter-spacing:1px;color:#2854cf">${escape(appName)}</p>
<p class="mail-muted" style="margin:0 0 12px;font-size:11px;line-height:18px;font-weight:700;letter-spacing:1.5px;color:#69768b">${escape(c.security)}</p>
<h1 class="mail-title" style="margin:0 0 18px;font-size:29px;line-height:1.3;letter-spacing:-0.6px;font-weight:600;color:#172033">${escape(title)}</h1>
<p class="mail-body" style="margin:0;font-size:15px;line-height:1.8;color:#536176">${escape(body)}</p>
${code ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 16px"><tr><td align="center" class="mail-code-box" style="padding:24px 12px;border:1px solid #e0e7fa;border-radius:12px;background:#f2f5ff"><span class="mail-code" dir="ltr" style="display:inline-block;font-family:Consolas,Monaco,monospace;font-size:36px;line-height:1.3;letter-spacing:10px;font-weight:600;color:#2449b6">${escape(code)}</span></td></tr></table><p class="mail-muted" style="margin:0;text-align:center;font-size:12px;line-height:20px;color:#69768b">${escape(c.expires)}</p>` : ""}
${action ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:26px"><tr><td bgcolor="#2854cf" style="border-radius:8px"><a href="${escape(action.url)}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:14px;line-height:20px;text-decoration:none;font-weight:600;border:1px solid #2854cf;border-radius:8px">${escape(action.label)}</a></td></tr></table>` : ""}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="mail-rule" style="margin-top:30px;border-top:1px solid #e8ecf3"><tr><td style="padding-top:22px"><p class="mail-muted" style="margin:0;font-size:12px;line-height:1.8;color:#778296">${escape(code ? c.ignore : c.footer.replace("{app}", appName))}</p>${code ? `<p class="mail-muted" style="margin:12px 0 0;font-size:11px;line-height:1.7;color:#8b95a6">${escape(c.footer.replace("{app}", appName))}</p>` : ""}</td></tr></table>
</td></tr></table></td></tr></table></body></html>`;
}
