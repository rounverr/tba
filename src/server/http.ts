import { listRoles, readSettings } from "./database/records";
import legacyLabels from "../lib/i18n/legacy-labels.json";
import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { createAuth } from "./auth";
import { type AppContext } from "./security";
import type { Actor, RuntimeEnv } from "./types";
export type ApiRouter = Hono<{
  Bindings: RuntimeEnv;
  Variables: { actor: Actor };
}>;
export const emailSchema = z
  .email()
  .max(254)
  .transform((v) => v.trim().toLowerCase());
export const accessSchema = z.object({
  email: emailSchema,
  intent: z.enum(["login", "register"]).default("login"),
  captchaToken: z.string().max(2048).optional(),
});
export const challengeSchema = z.object({
  code: z.string().min(6).max(32),
  method: z.enum(["totp", "recovery"]).default("totp"),
  trustDevice: z.boolean().default(false),
});
export async function body<T extends z.ZodType>(
  c: AppContext,
  schema: T,
): Promise<z.infer<T>> {
  const parsed = schema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success)
    throw new HTTPException(400, {
      message: "Check the information you entered.",
    });
  return parsed.data;
}
export async function config(c: AppContext) {
  return readSettings(c.env.DB);
}
export function authCookies(c: AppContext, response: Response) {
  for (const cookie of response.headers.getSetCookie())
    c.header("Set-Cookie", cookie, { append: true });
}
export function updatedHeaders(c: AppContext, response: Response) {
  const headers = new Headers(c.req.raw.headers);
  const cookies = new Map(
    (headers.get("cookie") || "")
      .split(";")
      .filter(Boolean)
      .map((v) => {
        const i = v.indexOf("=");
        return [v.slice(0, i).trim(), v.slice(i + 1)];
      }),
  );
  for (const raw of response.headers.getSetCookie()) {
    const pair = raw.split(";")[0];
    const i = pair.indexOf("=");
    cookies.set(pair.slice(0, i), pair.slice(i + 1));
  }
  headers.set(
    "cookie",
    Array.from(cookies, ([k, v]) => `${k}=${v}`).join("; "),
  );
  return headers;
}
export async function assertAuthResponse(response: Response) {
  if (response.status >= 500) throw new Error("Authentication service failed");
  if (!response.ok)
    throw new HTTPException(400, {
      message: "The code is invalid or has expired. Please try again.",
    });
}
export async function secondFactor(
  c: AppContext,
  code: string,
  method: "totp" | "recovery",
) {
  const auth = createAuth(c.env);
  const response =
    method === "totp"
      ? await auth.api.verifyTOTP({
          headers: c.req.raw.headers,
          body: { code },
          asResponse: true,
        })
      : await auth.api.verifyBackupCode({
          headers: c.req.raw.headers,
          body: { code, disableSession: true },
          asResponse: true,
        });
  await assertAuthResponse(response);
  authCookies(c, response);
  return response;
}
export function sessionContext(actor: Actor, mfaRequired = false) {
  return {
    user: { id: actor.id, name: actor.name, email: actor.email },
    mfaRequired,
    permissions: actor.permissions,
    isAdmin: actor.isAdmin,
    mfaEnabled: actor.twoFactorEnabled,
  };
}
export async function roleRows(c: AppContext) {
  return (await listRoles(c.env.DB)).map((r) => ({
    ...r,
    name:
      r.id === "viewer" && r.name === legacyLabels.historicalViewerName
        ? legacyLabels.viewer
        : r.name,
  }));
}
