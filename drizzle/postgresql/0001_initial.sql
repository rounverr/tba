CREATE TABLE "role" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"permissions" jsonb NOT NULL
);

CREATE TABLE "user" (
  rowid bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"two_factor_enabled" boolean DEFAULT false,
	"status" text DEFAULT 'pending' NOT NULL,
	"role_id" text,
	"mfa_epoch" integer DEFAULT 0 NOT NULL,
	"last_access" bigint,
	FOREIGN KEY ("role_id") REFERENCES "role"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" bigint NOT NULL,
	"token" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" bigint,
	"refresh_token_expires_at" bigint,
	"scope" text,
	"password" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE "assurance" (
	"session_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"epoch" integer NOT NULL,
	"verified_at" bigint NOT NULL,
	FOREIGN KEY ("session_id") REFERENCES "session"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE "audit" (
  rowid bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
	"id" text PRIMARY KEY NOT NULL,
	"actor" text,
	"action" text NOT NULL,
	"resource" text,
	"result" text NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL
);

CREATE TABLE "registration" (
  rowid bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" bigint NOT NULL,
	"resolved_at" bigint,
	"resolved_by" text,
	"role_id" text,
	FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "registration_event" (
	"user_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"updated_at" bigint NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"mode" text DEFAULT 'closed' NOT NULL,
	"public_role_id" text,
	"updated_at" bigint,
	"updated_by" text,
	FOREIGN KEY ("public_role_id") REFERENCES "role"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "throttle" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" bigint NOT NULL
);

CREATE TABLE "trusted_device" (
	"hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"epoch" integer NOT NULL,
	"expires_at" bigint NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	"verified" boolean DEFAULT false,
	"failed_verification_count" integer DEFAULT 0,
	"locked_until" bigint,
	FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);

CREATE INDEX "account_user_idx" ON "account" ("user_id");

CREATE INDEX "audit_date_idx" ON "audit" ("created_at");

CREATE UNIQUE INDEX "rate_limit_key_unique" ON "rate_limit" ("key");

CREATE UNIQUE INDEX "registration_user_id_unique" ON "registration" ("user_id");

CREATE UNIQUE INDEX "session_token_unique" ON "session" ("token");

CREATE INDEX "session_user_idx" ON "session" ("user_id");

CREATE UNIQUE INDEX "two_factor_user_idx" ON "two_factor" ("user_id");

CREATE UNIQUE INDEX "user_email_unique" ON "user" ("email");

CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");
