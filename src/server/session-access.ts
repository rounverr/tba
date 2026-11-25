import {
  one,
  command,
  isPostgreSQL,
  selectFields,
} from "./database/persistence";
import type { DBAdapter } from "better-auth/adapters";
import { eq, sql } from "drizzle-orm";
import { sessionJoins } from "./database/session-joins";
import {
  session,
  user,
  settings,
  assurance,
  trustedDevice,
} from "./database/schema";
import type { RuntimeEnv } from "./types";

export type SessionAccess = {
  includeAuthorization: boolean;
  trustHash: string;
  snapshot?: {
    session: typeof session.$inferSelect;
    user: typeof user.$inferSelect;
    authorizationVersion: number | null;
    grant: typeof assurance.$inferSelect | null;
    device: typeof trustedDevice.$inferSelect | null;
  };
};

// Only used by getActor. Better Auth verifies the signed cookie before it calls
// this adapter, and retains its expiry, refresh and output filtering behavior.
export function withSessionAccess(
  adapter: DBAdapter,
  env: RuntimeEnv,
  access: SessionAccess,
): DBAdapter {
  return {
    ...adapter,
    async findOne<T>(input: Parameters<DBAdapter["findOne"]>[0]) {
      if (input.model !== "session" || !input.join?.user)
        return adapter.findOne<T>(input);
      if (
        input.where?.length !== 1 ||
        input.where[0].field !== "token" ||
        typeof input.where[0].value !== "string" ||
        (input.where[0].operator && input.where[0].operator !== "eq")
      )
        throw new Error("Unexpected session access lookup");
      const token = input.where[0].value;
      const row = isPostgreSQL(env.DB)
        ? await env.DB.readSession(token, access)
        : await readSQLiteSession(env.DB, token, access);
      access.snapshot = row ?? undefined;
      if (!row) return null;
      const {
        authorizationSnapshot: _snapshot,
        authorizationVersion: _version,
        ...authSession
      } = row.session;
      return { ...authSession, user: row.user } as T;
    },
  };
}

async function readSQLiteSession(
  db: Exclude<
    RuntimeEnv["DB"],
    import("./database/persistence").PostgreSQLPersistence
  >,
  token: string,
  access: SessionAccess,
) {
  const joins = sessionJoins(access.trustHash);
  const query = selectFields(db, {
    session,
    user,
    grant: assurance,
    device: trustedDevice,
    authorizationVersion: access.includeAuthorization
      ? settings.authorizationVersion
      : sql<null>`null`,
  })
    .from(session)
    .innerJoin(user, joins.account)
    .leftJoin(assurance, joins.grant)
    .leftJoin(trustedDevice, joins.device)
    .$dynamic();
  if (access.includeAuthorization) query.leftJoin(settings, joins.settings);
  return (await query.where(eq(session.token, token)).get()) ?? null;
}
export type StoredAuthorization = {
  roleId: string | null;
  permissions: string[];
  isAdmin: boolean;
};

export function readAuthorization(
  raw: string | null,
): StoredAuthorization | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredAuthorization> | null;
    if (
      value &&
      (value.roleId === null || typeof value.roleId === "string") &&
      typeof value.isAdmin === "boolean" &&
      Array.isArray(value.permissions) &&
      value.permissions.every((permission) => typeof permission === "string")
    )
      return value as StoredAuthorization;
  } catch {
    // An unreadable snapshot must be rebuilt from the database.
  }
  return null;
}

// The role and version come from the same write, even if another Worker changed
// the role since the session lookup. The compare-and-set avoids duplicate rebuilds.
export async function rebuildAuthorization(
  env: RuntimeEnv,
  access: NonNullable<SessionAccess["snapshot"]>,
  trustedDeviceHash: string,
) {
  const { session: current, user: account } = access;
  const postgresql = isPostgreSQL(env.DB);
  const snapshot = postgresql
    ? `jsonb_build_object('roleId', "user".role_id, 'permissions', COALESCE(role.permissions, '[]'::jsonb), 'isAdmin', COALESCE(role.is_admin, FALSE))::text`
    : `json_object('roleId', "user".role_id, 'permissions', json(COALESCE(role.permissions,'[]')), 'isAdmin', json(CASE WHEN role.is_admin=1 THEN 'true' ELSE 'false' END))`;
  const result = await one<{ authorization_snapshot: string }>(
    env.DB,
    command(
      `UPDATE session SET
      authorization_snapshot = ${snapshot},
      authorization_version = settings.authorization_version
    FROM "user" CROSS JOIN settings LEFT JOIN role ON role.id="user".role_id
    WHERE session.id=? AND session.user_id="user".id AND settings.id=1
      AND session.expires_at>? AND "user".status='active' AND "user".email_verified=TRUE
      AND "user".role_id IS NOT DISTINCT FROM ? AND "user".mfa_epoch=? AND "user".two_factor_enabled IS NOT DISTINCT FROM ?
      AND session.authorization_snapshot IS NOT DISTINCT FROM ? AND session.authorization_version IS NOT DISTINCT FROM ?
      AND ("user".two_factor_enabled IS DISTINCT FROM TRUE OR EXISTS (
        SELECT 1 FROM assurance
        WHERE session_id=session.id AND user_id="user".id AND epoch="user".mfa_epoch
      ) OR EXISTS (
        SELECT 1 FROM trusted_device
        WHERE hash=? AND hash<>'' AND user_id="user".id AND epoch="user".mfa_epoch AND expires_at>?
      ))
    RETURNING authorization_snapshot`,
      current.id,
      Date.now(),
      account.roleId,
      account.mfaEpoch,
      account.twoFactorEnabled === null
        ? null
        : postgresql
          ? account.twoFactorEnabled
          : Number(account.twoFactorEnabled),
      current.authorizationSnapshot,
      current.authorizationVersion,
      trustedDeviceHash,
      Date.now(),
    ),
  );
  return result ? readAuthorization(result.authorization_snapshot) : null;
}
