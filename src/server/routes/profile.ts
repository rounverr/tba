import { one, command, execute } from "../database/persistence";
import { enabledLanguageCodes } from "../../lib/i18n/config";
import { mailLanguage, notificationMail } from "../services/auth-mail";
import {
  saveMailLanguage,
  rememberMailLanguage,
} from "../services/email/language";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { createAuth } from "../auth";
import type { EmailChange } from "../email-change";
import {
  type ApiRouter,
  assertAuthResponse,
  body,
  emailSchema,
  secondFactor,
  updatedHeaders,
} from "../http";
import {
  clearTrustCookie,
  logEvent,
  requireRecent,
  throttleRequest,
} from "../security";
import { sendMail } from "../services/mail";
export function registerProfile(api: ApiRouter) {
  api.get("/api/private/dashboard", async (c) => {
    const a = c.get("actor");
    if (!a.isAdmin) return c.json({ users: null, pending: null, events: null });
    const counts = await one(
      c.env.DB,
      command(
        "SELECT (SELECT count(*) FROM \"user\" WHERE status='active') AS users,(SELECT count(*) FROM registration WHERE status='pending') AS pending,(SELECT count(*) FROM audit WHERE created_at>?) AS events",
        Date.now() - 86400000,
      ),
    );
    return c.json(counts);
  });
  api.get("/api/private/profile", (c) => {
    const a = c.get("actor");
    return c.json({
      name: a.name,
      email: a.email,
      mfaEnabled: a.twoFactorEnabled,
      mfaAvailable: c.env.MFA_ENABLED === "true",
      trustDevice: c.env.TRUST_DEVICE_ENABLED === "true",
    });
  });
  api.post("/api/private/profile/language", async (c) => {
    const b = await body(
      c,
      z.object({ language: z.enum(enabledLanguageCodes) }),
    );
    await saveMailLanguage(c.env, c.get("actor").id, b.language);
    return c.json({ ok: true });
  });
  api.post("/api/private/profile", async (c) => {
    const a = c.get("actor");
    const b = await body(
      c,
      z.object({ name: z.string().trim().min(1).max(80) }),
    );
    await execute(
      c.env.DB,
      command(
        'UPDATE "user" SET name=?,updated_at=? WHERE id=?',
        b.name,
        Date.now(),
        a.id,
      ),
    );
    await logEvent(c.env, a.id, "profile.update", a.id);
    return c.json({ ok: true });
  });
  api.post("/api/private/profile/email/request", async (c) => {
    const a = c.get("actor");
    requireRecent(a);
    const b = await body(c, z.object({ newEmail: emailSchema }));
    if (b.newEmail === a.email)
      throw new HTTPException(400, {
        message: "Enter an address different from your current one.",
      });
    await throttleRequest(c, `email-change:send:${a.id}`, 1, 60);
    await throttleRequest(c, `email-change:destination:${b.newEmail}`, 3, 900);
    const language = mailLanguage(c.req.header("X-Auth-Language"));
    await rememberMailLanguage(c.env, a.id, language);
    const r = await createAuth(
      c.env,
      false,
      undefined,
      undefined,
      language,
    ).api.requestEmailChangeEmailOTP({
      headers: c.req.raw.headers,
      body: b,
      asResponse: true,
    });
    await assertAuthResponse(r);
    return c.json({ ok: true, mfaRequired: a.twoFactorEnabled });
  });
  api.post("/api/private/profile/email/confirm", async (c) => {
    const a = c.get("actor");
    requireRecent(a);
    const b = await body(
      c,
      z.object({
        newEmail: emailSchema,
        code: z.string().regex(/^\d{6}$/),
        mfaCode: z.string().min(6).max(32).optional(),
        method: z.enum(["totp", "recovery"]).default("totp"),
      }),
    );
    await throttleRequest(c, `email-change:verify:${a.id}`, 5, 300);
    let headers = c.req.raw.headers;
    if (a.twoFactorEnabled) {
      if (!b.mfaCode)
        return c.json(
          {
            message: "Confirm the change with your second factor.",
            code: "MFA_CONFIRMATION_REQUIRED",
          },
          403,
        );
      await throttleRequest(c, `mfa:${a.id}`, 5, 300);
      const factor = await secondFactor(c, b.mfaCode, b.method);
      headers = updatedHeaders(c, factor);
    }
    const change: EmailChange = {
      userId: a.id,
      newEmail: b.newEmail,
      committed: false,
    };
    try {
      const r = await createAuth(c.env, false, change).api.changeEmailEmailOTP({
        headers,
        body: { newEmail: b.newEmail, otp: b.code },
        asResponse: true,
      });
      if (!change.committed) await assertAuthResponse(r);
      else if (!r.ok) console.error("email_change_response_after_commit");
    } catch (error) {
      if (!change.committed) throw error;
      // A cookie/response failure after D1 committed cannot undo the change.
      // All sessions are already revoked, so no replacement cookie is needed.
      console.error("email_change_response_after_commit");
    }
    if (!change.committed) throw new Error("Email change did not commit");
    clearTrustCookie(c);
    c.executionCtx.waitUntil(
      (async () => {
        const mail = notificationMail(
          mailLanguage(c.req.header("X-Auth-Language")),
          "changed",
          c.env.APP_NAME,
          c.env.APP_URL,
        );
        await sendMail(c.env, a.email, mail.subject, mail.text, mail.html);
      })().catch(async () => {
        console.error("email_change_notification_failed");
        await logEvent(c.env, a.id, "mail.delivery", null, "failed").catch(
          () => {},
        );
      }),
    );
    return c.json({ ok: true, signInRequired: true });
  });
}
