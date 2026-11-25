import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { createAuth } from "../auth";
import {
  type ApiRouter,
  assertAuthResponse,
  authCookies,
  body,
  challengeSchema,
  secondFactor,
  updatedHeaders,
} from "../http";
import {
  clearEnrollmentConfirmation,
  confirmEnrollmentCode,
  requireEnrollmentConfirmation,
  sendEnrollmentCode,
} from "../mfa-enrollment";
import {
  grantAssurance,
  logEvent,
  requireRecent,
  revokeTrust,
  throttleRequest,
} from "../security";
export function registerSecurity(api: ApiRouter) {
  api.post("/api/private/security/enroll/email", sendEnrollmentCode);
  api.post("/api/private/security/enroll/email/confirm", async (c) => {
    const b = await body(c, z.object({ code: z.string().regex(/^\d{6}$/) }));
    return confirmEnrollmentCode(c, b.code);
  });
  api.post("/api/private/security/enroll", async (c) => {
    const a = c.get("actor");
    await requireEnrollmentConfirmation(c);
    if (c.env.MFA_ENABLED !== "true" || a.twoFactorEnabled)
      throw new HTTPException(400);
    const r = await createAuth(c.env).api.enableTwoFactor({
      headers: c.req.raw.headers,
      body: { method: "totp" },
      asResponse: true,
    });
    await assertAuthResponse(r);
    authCookies(c, r);
    const d = (await r.json()) as { totpURI: string; backupCodes: string[] };
    return c.json({ totpURI: d.totpURI, backupCodes: d.backupCodes });
  });
  api.post("/api/private/security/confirm", async (c) => {
    const a = c.get("actor");
    await requireEnrollmentConfirmation(c);
    const b = await body(c, z.object({ code: z.string().regex(/^\d{6}$/) }));
    await throttleRequest(c, `mfa:${a.id}`, 5, 300);
    const r = await secondFactor(c, b.code, "totp");
    const auth = createAuth(c.env);
    const s = await auth.api.getSession({ headers: updatedHeaders(c, r) });
    if (!s) throw new HTTPException(401);
    await grantAssurance(c, { ...a, sessionId: s.session.id }, false);
    await clearEnrollmentConfirmation(c);
    await logEvent(c.env, a.id, "mfa.enabled", a.id);
    return c.json({ ok: true });
  });
  api.post("/api/private/security/disable", async (c) => {
    const a = c.get("actor");
    requireRecent(a);
    const b = await body(c, challengeSchema);
    await throttleRequest(c, `mfa:${a.id}`, 5, 300);
    await secondFactor(c, b.code, b.method);
    const r = await createAuth(c.env).api.disableTwoFactor({
      headers: c.req.raw.headers,
      body: {},
      asResponse: true,
    });
    await assertAuthResponse(r);
    authCookies(c, r);
    await revokeTrust(c, a);
    await logEvent(c.env, a.id, "mfa.disabled", a.id);
    return c.json({ ok: true });
  });
  api.post("/api/private/security/backup-codes", async (c) => {
    const a = c.get("actor");
    requireRecent(a);
    const b = await body(c, challengeSchema);
    await throttleRequest(c, `mfa:${a.id}`, 5, 300);
    await secondFactor(c, b.code, b.method);
    const r = await createAuth(c.env).api.generateBackupCodes({
      headers: c.req.raw.headers,
      body: {},
      asResponse: true,
    });
    await assertAuthResponse(r);
    const d = (await r.json()) as { backupCodes: string[] };
    await logEvent(c.env, a.id, "mfa.backup_codes.regenerated", a.id);
    return c.json({ backupCodes: d.backupCodes });
  });
  api.post("/api/private/security/revoke-trust", async (c) => {
    const a = c.get("actor");
    const b = await body(c, challengeSchema);
    if (!a.twoFactorEnabled) throw new HTTPException(400);
    await throttleRequest(c, `mfa:${a.id}`, 5, 300);
    const r = await secondFactor(c, b.code, b.method);
    const session = await createAuth(c.env).api.getSession({
      headers: updatedHeaders(c, r),
    });
    if (!session) throw new HTTPException(401);
    await revokeTrust(c, a);
    await grantAssurance(
      c,
      { ...a, sessionId: session.session.id, mfaEpoch: a.mfaEpoch + 1 },
      false,
    );
    await logEvent(c.env, a.id, "mfa.trust.revoked", a.id);
    return c.json({ ok: true });
  });
}
