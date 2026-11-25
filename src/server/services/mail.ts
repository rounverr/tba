import type { RuntimeEnv } from "../types";
import { isLocalUrl } from "../policy";
export async function sendMail(
  env: Pick<
    RuntimeEnv,
    "APP_URL" | "MAIL_PROVIDER" | "EMAIL" | "MAIL_FROM" | "RESEND_API_KEY"
  >,
  to: string,
  subject: string,
  text: string,
  html?: string,
) {
  if (env.MAIL_PROVIDER === "local" && isLocalUrl(env.APP_URL)) {
    const r = await fetch("http://127.0.0.1:8025/mail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, text, ...(html ? { html } : {}) }),
    });
    if (!r.ok) throw new Error("Local mailbox unavailable");
    return;
  }
  if (env.MAIL_PROVIDER === "cloudflare") {
    if (!env.EMAIL || !env.MAIL_FROM)
      throw new Error(
        "Cloudflare Email Sending binding or MAIL_FROM is missing",
      );
    await env.EMAIL.send({
      from: env.MAIL_FROM,
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    });
    return;
  }
  if (env.MAIL_PROVIDER !== "resend" || !env.RESEND_API_KEY || !env.MAIL_FROM)
    throw new Error("Transactional mail is not configured");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [to],
      subject,
      text,
      ...(html ? { html } : {}),
    }),
  });
  if (!r.ok) throw new Error("Mail provider rejected delivery");
}
