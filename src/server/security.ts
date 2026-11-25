import { execute, command, atomic, one } from "./database/persistence";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { RuntimeEnv, Actor } from "./types";
import { createAuth } from "./auth";
import { isLocalUrl } from "./policy";
import {
  readAuthorization,
  rebuildAuthorization,
  type SessionAccess,
} from "./session-access";
export type AppContext = Context<{
  Bindings: RuntimeEnv;
  Variables: { actor: Actor };
}>;
export async function logEvent(
  env: RuntimeEnv,
  actor: string | null,
  action: string,
  resource: string | null,
  result = "success",
) {
  await execute(
    env.DB,
    command(
      "INSERT INTO audit(id,actor,action,resource,result,created_at) VALUES(?,?,?,?,?,?)",
      crypto.randomUUID(),
      actor,
      action,
      resource,
      result,
      Date.now(),
    ),
  );
}
export async function hashToken(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
const cookieName = (env: RuntimeEnv) =>
  isLocalUrl(env.APP_URL) ? "tba.trust" : "__Host-tba.trust";
export class AuthorizationChanged extends HTTPException {
  constructor() {
    super(409, { message: "Your permissions changed. Please try again." });
  }
}
type ActorOptions = {
  allowPendingMfa?: boolean;
  includeAuthorization?: boolean;
  rejectStaleAuthorization?: boolean;
};
export function getActor(c: AppContext, options: ActorOptions = {}) {
  return resolveActor(c, options, true);
}
async function resolveActor(
  c: AppContext,
  {
    allowPendingMfa = false,
    includeAuthorization = true,
    rejectStaleAuthorization = false,
  }: ActorOptions,
  retry: boolean,
): Promise<{ actor: Actor; mfaRequired: boolean }> {
  const token =
    c.env.TRUST_DEVICE_ENABLED === "true"
      ? getCookie(c, cookieName(c.env))
      : undefined;
  const access: SessionAccess = {
    includeAuthorization,
    trustHash:
      token && /^[a-f0-9]{64}$/.test(token) ? await hashToken(token) : "",
  };
  const auth = createAuth(c.env, false, undefined, access);
  const response = await auth.api.getSession({
    headers: c.req.raw.headers,
    asResponse: true,
  });
  if (!response.ok) throw new Error("Session lookup failed");
  const sessionCookies = response.headers.getSetCookie();
  for (const cookie of sessionCookies)
    c.header("Set-Cookie", cookie, { append: true });
  const s = await response.json();
  if (!s || !access.snapshot)
    throw new HTTPException(401, { message: "Sign in to continue." });
  const {
    user: u,
    authorizationVersion,
    grant,
    device: d,
    session: current,
  } = access.snapshot;
  if (!u || u.status !== "active" || !u.emailVerified)
    throw new HTTPException(403, {
      message:
        "We could not authorize your access. Contact your administrator.",
    });
  let assured = !u.twoFactorEnabled;
  let assureTrustedDevice = false;
  if (u.twoFactorEnabled) {
    assured = !!grant && grant.userId === u.id && grant.epoch === u.mfaEpoch;
    if (!assured && c.env.TRUST_DEVICE_ENABLED === "true") {
      if (token) {
        if (
          d &&
          d.userId === u.id &&
          d.epoch === u.mfaEpoch &&
          d.expiresAt > Date.now()
        ) {
          assured = true;
          assureTrustedDevice = true;
        }
      }
    }
  }
  if (!assured && !allowPendingMfa)
    throw new HTTPException(403, {
      message: "Complete two-step verification.",
    });
  let authorization =
    assured && includeAuthorization
      ? readAuthorization(current.authorizationSnapshot)
      : null;
  const needsAuthorization =
    assured &&
    includeAuthorization &&
    (!authorization ||
      authorization.roleId !== u.roleId ||
      authorizationVersion === null ||
      current.authorizationVersion !== authorizationVersion);
  // Better Auth returns a new session cookie when it has renewed the session.
  // In that case, rebuild inline so the retry signal never follows a write.
  if (needsAuthorization && rejectStaleAuthorization && !sessionCookies.length)
    throw new AuthorizationChanged();
  if (assureTrustedDevice)
    await execute(
      c.env.DB,
      command(
        "INSERT INTO assurance(session_id,user_id,epoch,verified_at) VALUES(?,?,?,?) ON CONFLICT DO NOTHING",
        current.id,
        u.id,
        u.mfaEpoch,
        Date.now(),
      ),
    );
  if (needsAuthorization) {
    if (authorizationVersion === null)
      throw new Error("Authorization version is unavailable");
    authorization = await rebuildAuthorization(
      c.env,
      access.snapshot,
      assureTrustedDevice ? access.trustHash : "",
    );
    if (!authorization) {
      if (retry)
        return resolveActor(
          c,
          { allowPendingMfa, includeAuthorization, rejectStaleAuthorization },
          false,
        );
      throw new Error("Could not refresh session authorization");
    }
  }
  const actor: Actor = {
    id: u.id,
    email: u.email,
    name: u.name,
    status: u.status,
    roleId: u.roleId,
    twoFactorEnabled: !!u.twoFactorEnabled,
    mfaEpoch: u.mfaEpoch,
    sessionId: current.id,
    sessionCreatedAt: current.createdAt.getTime(),
    permissions: authorization?.permissions ?? [],
    isAdmin: authorization?.isAdmin ?? false,
  };
  c.set("actor", actor);
  return { actor, mfaRequired: !assured };
}
export function requirePermission(actor: Actor, permission: string) {
  if (!actor.isAdmin && !actor.permissions.includes(permission))
    throw new HTTPException(403, {
      message: "You do not have permission to perform this action.",
    });
}
export class RecentAuthRequired extends HTTPException {
  constructor() {
    super(403, {
      message:
        "Confirm your identity with a new sign-in to change security settings. Your previous sign-in was over five minutes ago.",
    });
  }
}
export function requireRecent(actor: Actor) {
  if (Date.now() - actor.sessionCreatedAt > 300000)
    throw new RecentAuthRequired();
}
export async function grantAssurance(
  c: AppContext,
  actor: Actor,
  trust: boolean,
) {
  await execute(
    c.env.DB,
    command(
      "INSERT INTO assurance(session_id,user_id,epoch,verified_at) VALUES(?,?,?,?) ON CONFLICT(session_id) DO UPDATE SET epoch=excluded.epoch,verified_at=excluded.verified_at",
      actor.sessionId,
      actor.id,
      actor.mfaEpoch,
      Date.now(),
    ),
  );
  if (trust && c.env.TRUST_DEVICE_ENABLED === "true") {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    await execute(
      c.env.DB,
      command(
        "INSERT INTO trusted_device(hash,user_id,epoch,expires_at) VALUES(?,?,?,?)",
        await hashToken(token),
        actor.id,
        actor.mfaEpoch,
        Date.now() + 2592000000,
      ),
    );
    setCookie(c, cookieName(c.env), token, {
      httpOnly: true,
      secure: !isLocalUrl(c.env.APP_URL),
      sameSite: "Strict",
      path: "/",
      maxAge: 2592000,
    });
  }
}
export async function revokeTrust(c: AppContext, actor: Actor) {
  await atomic(c.env.DB, [
    command("DELETE FROM trusted_device WHERE user_id=?", actor.id),
    command('UPDATE "user" SET mfa_epoch=mfa_epoch+1 WHERE id=?', actor.id),
    command("DELETE FROM assurance WHERE user_id=?", actor.id),
  ]);
  clearTrustCookie(c);
}
export function clearTrustCookie(c: AppContext) {
  deleteCookie(c, cookieName(c.env), {
    path: "/",
    secure: !isLocalUrl(c.env.APP_URL),
    httpOnly: true,
    sameSite: "Strict",
  });
}
export async function throttleRequest(
  c: AppContext,
  key: string,
  max: number,
  seconds: number,
) {
  const until = Date.now() + seconds * 1000;
  const row = await one<{ count: number }>(
    c.env.DB,
    command(
      "INSERT INTO throttle(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN throttle.expires_at<=? THEN 1 ELSE throttle.count+1 END,expires_at=CASE WHEN throttle.expires_at<=? THEN ? ELSE throttle.expires_at END RETURNING count",
      await hashToken(key),
      until,
      Date.now(),
      Date.now(),
      until,
    ),
  );
  if (!row || row.count > max)
    throw new HTTPException(429, {
      message: "Too many attempts. Wait a few minutes and try again.",
    });
}
