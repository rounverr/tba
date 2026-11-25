import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, twoFactor } from "better-auth/plugins";
import { authDatabase, isPostgreSQL } from "./database/persistence";
import * as schema from "./database/schema";
import type { RuntimeEnv } from "./types";
import { sendMail } from "./services/mail";
import { otpMail } from "./services/auth-mail";
import { defaultLanguage, type Language } from "../lib/i18n/config";
import { isLocalUrl } from "./policy";
import { withEmailChange, type EmailChange } from "./email-change";
import { withSessionAccess, type SessionAccess } from "./session-access";
export function createAuth(
  env: RuntimeEnv,
  registration = false,
  change?: EmailChange,
  access?: SessionAccess,
  language: Language = defaultLanguage,
) {
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32)
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  return betterAuth({
    appName: env.APP_NAME,
    baseURL: env.APP_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    database: (options: BetterAuthOptions) => {
      const adapter = drizzleAdapter(authDatabase(env.DB), {
        provider: isPostgreSQL(env.DB) ? "pg" : "sqlite",
        schema: isPostgreSQL(env.DB) ? env.DB.authSchema : schema,
        transaction: false,
      })(options);
      if (change) return withEmailChange(adapter, env, change);
      return access ? withSessionAccess(adapter, env, access) : adapter;
    },
    emailAndPassword: { enabled: false },
    trustedOrigins: [env.APP_URL],
    logger: { disabled: true },
    user: {
      additionalFields: {
        status: { type: "string", defaultValue: "pending", input: false },
        roleId: { type: "string", required: false, input: false },
        mfaEpoch: { type: "number", defaultValue: 0, input: false },
      },
    },
    session: {
      expiresIn: 28800,
      updateAge: 1800,
      freshAge: 300,
      cookieCache: { enabled: false },
    },
    advanced: {
      useSecureCookies: !isLocalUrl(env.APP_URL),
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    account: {
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },
    socialProviders:
      env.GOOGLE_ENABLED === "true" &&
      env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              disableSignUp: true,
              mapProfileToUser: async (profile) => {
                if (!profile.email_verified)
                  throw new Error("Verified Google email required");
                return { emailVerified: true };
              },
            },
          }
        : {},
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
    plugins: [
      emailOTP({
        otpLength: 6,
        changeEmail: { enabled: true },
        expiresIn: 300,
        allowedAttempts: 5,
        disableSignUp: !registration,
        storeOTP: "hashed",
        sendVerificationOTP: async ({ email, otp, type }) => {
          const message = otpMail(language, type, otp, env.APP_NAME);
          return sendMail(
            env,
            email,
            message.subject,
            message.text,
            message.html,
          );
        },
      }),
      twoFactor({
        issuer: env.APP_NAME,
        allowPasswordless: true,
        skipVerificationOnEnable: false,
        trustDeviceMaxAge: 2592000,
        backupCodeOptions: {
          amount: 10,
          length: 10,
          storeBackupCodes: "encrypted",
        },
      }),
    ],
  });
}
