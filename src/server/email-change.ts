import type { DBAdapter } from "better-auth/adapters";
import { atomic, command } from "./database/persistence";
import type { RuntimeEnv } from "./types";

export type EmailChange = {
  userId: string;
  newEmail: string;
  committed: boolean;
};

// Scoped to the official Email OTP confirmation call. Better Auth still owns
// OTP validation and consumption; the database commits identity and revocations together.
export function withEmailChange(
  adapter: DBAdapter,
  env: RuntimeEnv,
  change: EmailChange,
): DBAdapter {
  return {
    ...adapter,
    async update<T>(input: Parameters<DBAdapter["update"]>[0]) {
      if (input.model !== "user" || !("email" in input.update))
        return adapter.update<T>(input);
      if (
        change.committed ||
        input.update.email !== change.newEmail ||
        input.update.emailVerified !== true ||
        input.where.length !== 1 ||
        input.where[0].field !== "id" ||
        input.where[0].value !== change.userId ||
        (input.where[0].operator && input.where[0].operator !== "eq")
      )
        throw new Error("Unexpected email change update");
      const [
        {
          results: [row],
        },
      ] = await atomic(
        env.DB,
        [
          command(
            `UPDATE "user" SET email=?,email_verified=TRUE,updated_at=?,mfa_epoch=mfa_epoch+1 WHERE id=?
          RETURNING id,name,email,image,email_verified AS "emailVerified",created_at AS "createdAt",
          updated_at AS "updatedAt",two_factor_enabled AS "twoFactorEnabled",status,role_id AS "roleId",
          mfa_epoch AS "mfaEpoch",last_access AS "lastAccess"`,
            change.newEmail,
            Date.now(),
            change.userId,
          ),
          command("DELETE FROM trusted_device WHERE user_id=?", change.userId),
          command("DELETE FROM assurance WHERE user_id=?", change.userId),
          command("DELETE FROM session WHERE user_id=?", change.userId),
          command(
            "INSERT INTO audit(id,actor,action,resource,result,created_at) VALUES(?,?,?,?,'success',?)",
            crypto.randomUUID(),
            change.userId,
            "profile.email.changed",
            change.userId,
            Date.now(),
          ),
        ],
        true,
      );
      if (!row) throw new Error("Email change user missing");
      const user = row as {
        emailVerified: boolean | number;
        twoFactorEnabled: boolean | number | null;
        createdAt: number;
        updatedAt: number;
      };
      change.committed = true;
      return {
        ...user,
        emailVerified: !!user.emailVerified,
        twoFactorEnabled:
          user.twoFactorEnabled === null ? null : !!user.twoFactorEnabled,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      } as T;
    },
  };
}
