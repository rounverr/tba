import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" }).default(
    false,
  ),
  status: text("status").notNull().default("pending"),
  roleId: text("role_id").references(() => role.id),
  mfaEpoch: integer("mfa_epoch").notNull().default(0),
  lastAccess: integer("last_access"),
});
export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    authorizationSnapshot: text("authorization_snapshot"),
    authorizationVersion: integer("authorization_version"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);
export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);
export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);
export const twoFactor = sqliteTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: integer("verified", { mode: "boolean" }).default(false),
    failedVerificationCount: integer("failed_verification_count").default(0),
    lockedUntil: integer("locked_until", { mode: "timestamp_ms" }),
  },
  (t) => [uniqueIndex("two_factor_user_idx").on(t.userId)],
);
export const rateLimit = sqliteTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("last_request").notNull(),
});
export const role = sqliteTable("role", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  permissions: text("permissions", { mode: "json" })
    .$type<string[]>()
    .notNull(),
});
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  authorizationVersion: integer("authorization_version").notNull().default(1),
  mode: text("mode").notNull().default("closed"),
  publicRoleId: text("public_role_id").references(() => role.id),
  updatedAt: integer("updated_at"),
  updatedBy: text("updated_by"),
});
export const registration = sqliteTable("registration", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id),
  status: text("status").notNull().default("pending"),
  createdAt: integer("created_at").notNull(),
  resolvedAt: integer("resolved_at"),
  resolvedBy: text("resolved_by"),
  roleId: text("role_id"),
});
export const audit = sqliteTable(
  "audit",
  {
    id: text("id").primaryKey(),
    actor: text("actor"),
    action: text("action").notNull(),
    resource: text("resource"),
    result: text("result").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("audit_date_idx").on(t.createdAt)],
);
export const assurance = sqliteTable("assurance", {
  sessionId: text("session_id")
    .primaryKey()
    .references(() => session.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  epoch: integer("epoch").notNull(),
  verifiedAt: integer("verified_at").notNull(),
});
export const trustedDevice = sqliteTable("trusted_device", {
  hash: text("hash").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  epoch: integer("epoch").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
export const registrationEvent = sqliteTable("registration_event", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
});
export const throttle = sqliteTable("throttle", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
