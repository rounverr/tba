import { sql } from "drizzle-orm";

// Keep both Drizzle dialects on the same predicates for identity and MFA.
export function sessionJoins(trustHash: string) {
  return {
    account: sql`"user"."id" = "session"."user_id"`,
    grant: sql`"user"."two_factor_enabled" = TRUE
      AND "assurance"."session_id" = "session"."id"
      AND "assurance"."user_id" = "user"."id"
      AND "assurance"."epoch" = "user"."mfa_epoch"`,
    device: sql`"user"."two_factor_enabled" = TRUE
      AND "assurance"."session_id" IS NULL
      AND "trusted_device"."hash" = ${trustHash}
      AND "trusted_device"."user_id" = "user"."id"`,
    settings: sql`"settings"."id" = 1`,
  };
}
