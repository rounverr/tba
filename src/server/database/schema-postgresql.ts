import {
  pgTable,
  text,
  integer,
  boolean,
  bigint,
  jsonb,
  customType,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Business SQL stores milliseconds since the Unix epoch across engines.
const milliseconds = customType<{ data: Date; driverData: number }>({
  dataType: () => "bigint",
  toDriver: (date) => date.getTime(),
  fromDriver: (value) => new Date(Number(value)),
});
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: milliseconds("created_at").notNull(),
  updatedAt: milliseconds("updated_at").notNull(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  status: text("status").notNull().default("pending"),
  roleId: text("role_id").references(() => role.id),
  mfaEpoch: integer("mfa_epoch").notNull().default(0),
  lastAccess: bigint("last_access", { mode: "number" }),
});
export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: milliseconds("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: milliseconds("created_at").notNull(),
    updatedAt: milliseconds("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    authorizationSnapshot: text("authorization_snapshot"),
    authorizationVersion: bigint("authorization_version", { mode: "number" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);
export const account = pgTable(
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
    accessTokenExpiresAt: milliseconds("access_token_expires_at"),
    refreshTokenExpiresAt: milliseconds("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: milliseconds("created_at").notNull(),
    updatedAt: milliseconds("updated_at").notNull(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);
export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: milliseconds("expires_at").notNull(),
    createdAt: milliseconds("created_at").notNull(),
    updatedAt: milliseconds("updated_at").notNull(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);
export const twoFactor = pgTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: boolean("verified").default(false),
    failedVerificationCount: integer("failed_verification_count").default(0),
    lockedUntil: milliseconds("locked_until"),
  },
  (t) => [uniqueIndex("two_factor_user_idx").on(t.userId)],
);
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
export const role = pgTable("role", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  isPublic: boolean("is_public").notNull().default(false),
  permissions: jsonb("permissions").$type<string[]>().notNull(),
});
export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  authorizationVersion: bigint("authorization_version", { mode: "number" })
    .notNull()
    .default(1),
  mode: text("mode").notNull().default("closed"),
  publicRoleId: text("public_role_id").references(() => role.id),
  updatedAt: bigint("updated_at", { mode: "number" }),
  updatedBy: text("updated_by"),
});
export const registration = pgTable("registration", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id),
  status: text("status").notNull().default("pending"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  resolvedAt: bigint("resolved_at", { mode: "number" }),
  resolvedBy: text("resolved_by"),
  roleId: text("role_id"),
});
export const audit = pgTable(
  "audit",
  {
    id: text("id").primaryKey(),
    actor: text("actor"),
    action: text("action").notNull(),
    resource: text("resource"),
    result: text("result").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("audit_date_idx").on(t.createdAt)],
);
export const assurance = pgTable("assurance", {
  sessionId: text("session_id")
    .primaryKey()
    .references(() => session.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  epoch: integer("epoch").notNull(),
  verifiedAt: bigint("verified_at", { mode: "number" }).notNull(),
});
export const trustedDevice = pgTable("trusted_device", {
  hash: text("hash").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  epoch: integer("epoch").notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
});
export const registrationEvent = pgTable("registration_event", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export const throttle = pgTable("throttle", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
});
