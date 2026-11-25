import { findRole } from "../database/records";
import { execute, command, atomic, many, one } from "../database/persistence";
import {
  rememberMailLanguage,
  recipientLanguage,
} from "../services/email/language";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { createAuth } from "../auth";
import {
  type ApiRouter,
  accessSchema,
  authCookies,
  body,
  challengeSchema,
  config,
  secondFactor,
  sessionContext,
} from "../http";
import {
  getActor,
  grantAssurance,
  logEvent,
  throttleRequest,
} from "../security";
import { mailLanguage, notificationMail } from "../services/auth-mail";
import { sendMail } from "../services/mail";
import { deliverRegistrationEvent } from "../services/registration-hook";
export function registerAccess(api: ApiRouter) {
  api.get("/api/public/config", async (c) => {
    const s = await config(c);
    return c.json({
      mode: s.mode,
      google: !!(
        c.env.GOOGLE_ENABLED === "true" &&
        c.env.GOOGLE_CLIENT_ID &&
        c.env.GOOGLE_CLIENT_SECRET
      ),
      mfa: c.env.MFA_ENABLED === "true",
      trustDevice: c.env.TRUST_DEVICE_ENABLED === "true",
      turnstileSiteKey: c.env.TURNSTILE_SITE_KEY || null,
    });
  });
  api.post("/api/access/send", async (c) => {
    const { email, intent, captchaToken } = await body(c, accessSchema);
    await throttleRequest(
      c,
      `send:ip:${c.req.header("cf-connecting-ip") || "local"}`,
      20,
      900,
    );
    await throttleRequest(c, `send:email:${email}`, 1, 60);
    if (intent === "register" && c.env.TURNSTILE_SITE_KEY) {
      if (!c.env.TURNSTILE_SECRET_KEY || !captchaToken)
        throw new HTTPException(400, {
          message: "Complete the security verification.",
        });
      const result = (await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          body: new URLSearchParams({
            secret: c.env.TURNSTILE_SECRET_KEY,
            response: captchaToken,
          }),
        },
      ).then((r) => r.json())) as {
        success: boolean;
        hostname: string;
        action: string;
      };
      if (
        !result.success ||
        result.hostname !== new URL(c.env.APP_URL).hostname ||
        result.action !== "register"
      )
        throw new HTTPException(400, {
          message: "The security verification expired. Please try again.",
        });
    }
    const u = await one<{ status: string }>(
      c.env.DB,
      command('SELECT status FROM "user" WHERE email=?', email),
    );
    if (intent === "register" && (await config(c)).mode === "closed")
      throw new HTTPException(403, {
        message: "Registration is closed. Contact your administrator.",
      });
    const eligible =
      intent === "login"
        ? u?.status === "active"
        : !u || u.status === "pending";
    if (intent === "login" && !eligible)
      return c.json(
        {
          message:
            "We could not find an enabled account with this email. Check the address or request access from your administrator.",
          code: "ACCESS_NOT_ENABLED",
        },
        403,
      );
    // Delivery runs after the response; registration retains its uniform response.
    if (eligible)
      c.executionCtx.waitUntil(
        createAuth(
          c.env,
          intent === "register",
          undefined,
          undefined,
          mailLanguage(c.req.header("X-Auth-Language")),
        )
          .api.sendVerificationOTP({ body: { email, type: "sign-in" } })
          .then(() => {})
          .catch(() => logEvent(c.env, null, "mail.delivery", null, "failed")),
      );
    return c.json({ ok: true });
  });
  api.post("/api/access/verify", async (c) => {
    const { email, intent, code } = await body(
      c,
      accessSchema.extend({ code: z.string().regex(/^\d{6}$/) }),
    );
    await throttleRequest(c, `verify:${email}`, 10, 900);
    const before = await one<{ status: string }>(
      c.env.DB,
      command('SELECT status FROM "user" WHERE email=?', email),
    );
    if (intent === "login" && before?.status !== "active")
      throw new HTTPException(400, {
        message: "The code is invalid or has expired. Please try again.",
      });
    if (
      intent === "register" &&
      ((await config(c)).mode === "closed" ||
        before?.status === "active" ||
        before?.status === "suspended" ||
        before?.status === "disabled")
    )
      throw new HTTPException(400, {
        message:
          "We could not complete registration. Contact your administrator.",
      });
    const auth = createAuth(c.env, intent === "register");
    const r = await auth.api.signInEmailOTP({
      headers: c.req.raw.headers,
      body: { email, otp: code },
      asResponse: true,
    });
    if (!r.ok) {
      await logEvent(c.env, null, "login", null, "failed");
      throw new HTTPException(400, {
        message: "The code is invalid or has expired. Please try again.",
      });
    }
    const u = await one<{ id: string }>(
      c.env.DB,
      command('SELECT id FROM "user" WHERE email=?', email),
    );
    if (!u) throw new HTTPException(400);
    if (intent === "register") {
      const now = await config(c);
      if (now.mode === "closed") {
        await execute(
          c.env.DB,
          command("DELETE FROM session WHERE user_id=?", u.id),
        );
        throw new HTTPException(403, {
          message: "Registration is closed. Contact your administrator.",
        });
      }
      if (now.mode === "approval") {
        await rememberMailLanguage(
          c.env,
          u.id,
          mailLanguage(c.req.header("X-Auth-Language")),
        );

        await atomic(c.env.DB, [
          command(
            "INSERT INTO registration(id,user_id,status,created_at) VALUES(?,?,'pending',?) ON CONFLICT DO NOTHING",
            crypto.randomUUID(),
            u.id,
            Date.now(),
          ),
          command("DELETE FROM session WHERE user_id=?", u.id),
        ]);
        await logEvent(c.env, u.id, "registration.request", u.id);
        c.executionCtx.waitUntil(
          (async () => {
            const admins = await many<{ id: string; email: string }>(
              c.env.DB,
              command(
                "SELECT id,email FROM \"user\" WHERE status='active' AND role_id IN(SELECT id FROM role WHERE is_admin=TRUE)",
              ),
            );
            await Promise.allSettled(
              admins.results.map(async (a) => {
                const mail = notificationMail(
                  await recipientLanguage(c.env, a.id),
                  "request",
                  c.env.APP_NAME,
                  c.env.APP_URL,
                );
                return sendMail(
                  c.env,
                  a.email,
                  mail.subject,
                  mail.text,
                  mail.html,
                );
              }),
            );
          })(),
        );
        return c.json({ pending: true });
      }
      const publicRole = now.publicRoleId
        ? await findRole(c.env.DB, now.publicRoleId)
        : null;
      if (!publicRole)
        throw new HTTPException(403, {
          message: "Registration is unavailable.",
        });
      // A pending request never becomes approved merely because registration mode changes.
      const pending = await one(
        c.env.DB,
        command("SELECT id FROM registration WHERE user_id=?", u.id),
      );
      if (pending)
        throw new HTTPException(403, {
          message: "Your request needs administrator review.",
        });
      const result = await one(
        c.env.DB,
        command(
          "UPDATE \"user\" SET status='active',role_id=? WHERE id=? AND status='pending' AND email_verified=TRUE AND EXISTS(SELECT 1 FROM settings WHERE mode='open' AND public_role_id=?) RETURNING id",
          publicRole!.id,
          u.id,
          publicRole!.id,
        ),
      );
      if (!result)
        throw new HTTPException(403, {
          message: "Registration settings changed. Please try again.",
        });
      await logEvent(c.env, u.id, "registration.open", u.id);
      await deliverRegistrationEvent(c.env, u.id);
    }
    await rememberMailLanguage(
      c.env,
      u.id,
      mailLanguage(c.req.header("X-Auth-Language")),
    );
    authCookies(c, r);
    await execute(
      c.env.DB,
      command('UPDATE "user" SET last_access=? WHERE id=?', Date.now(), u.id),
    );
    await logEvent(c.env, u.id, "login.first_factor", u.id);
    return c.json({ ok: true });
  });
  // Only OAuth and logout are public Better Auth routes. Never expose plugin management,
  // OTP introspection, direct signup or second-factor mutations outside the policy gateway.
  api.on(["GET", "POST"], "/api/auth/*", async (c) => {
    const path = new URL(c.req.url).pathname.slice("/api/auth".length);
    if (!["/sign-in/social", "/callback/google", "/sign-out"].includes(path))
      throw new HTTPException(404);
    if (path === "/sign-in/social") {
      const b = (await c.req.raw.clone().json()) as { provider?: string };
      if (b.provider !== "google") throw new HTTPException(400);
    }
    if (path === "/sign-out") {
      const s = await createAuth(c.env).api.getSession({
        headers: c.req.raw.headers,
      });
      if (s) await logEvent(c.env, s.user.id, "logout", s.user.id);
    }
    return createAuth(c.env).handler(c.req.raw);
  });
  api.get("/api/session", async (c) => {
    const { actor, mfaRequired } = await getActor(c, { allowPendingMfa: true });
    return c.json(sessionContext(actor, mfaRequired));
  });
  api.post("/api/security/challenge", async (c) => {
    const { actor } = await getActor(c, {
      allowPendingMfa: true,
      includeAuthorization: false,
    });
    const b = await body(c, challengeSchema);
    if (!actor.twoFactorEnabled) throw new HTTPException(400);
    await throttleRequest(c, `mfa:${actor.id}`, 5, 300);
    try {
      await secondFactor(c, b.code, b.method);
    } catch {
      await logEvent(c.env, actor.id, "mfa.verify", actor.id, "failed");
      throw new HTTPException(400, {
        message: "The code is invalid or has expired. Please try again.",
      });
    }
    await grantAssurance(c, actor, b.trustDevice);
    await logEvent(
      c.env,
      actor.id,
      b.method === "recovery" ? "mfa.recovery" : "mfa.verify",
      actor.id,
    );
    return c.json({ ok: true });
  });
}
