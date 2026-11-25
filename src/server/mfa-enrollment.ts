import {
  one,
  command,
  atomic,
  execute,
  isPostgreSQL,
} from "./database/persistence";
import { HTTPException } from "hono/http-exception";
import { hashToken, throttleRequest, type AppContext } from "./security";
import { sendMail } from "./services/mail";
import { otpMail, mailLanguage } from "./services/auth-mail";
const approved = '{"approved":true}';
const identifier = (c: AppContext) => `mfa-enroll:${c.get("actor").sessionId}`;
export class MfaEnrollmentConfirmationRequired extends HTTPException {
  constructor() {
    super(403, { message: "Confirm your identity to continue." });
  }
}
export async function requireEnrollmentConfirmation(c: AppContext) {
  if (Date.now() - c.get("actor").sessionCreatedAt <= 300000) return;
  const grant = await one(
    c.env.DB,
    command(
      "SELECT id FROM verification WHERE identifier=? AND value=? AND expires_at>?",
      identifier(c),
      approved,
      Date.now(),
    ),
  );
  if (!grant) throw new MfaEnrollmentConfirmationRequired();
}
export async function sendEnrollmentCode(c: AppContext) {
  const a = c.get("actor");
  if (c.env.MFA_ENABLED !== "true" || a.twoFactorEnabled)
    throw new HTTPException(400);
  await throttleRequest(c, `mfa-enroll:send:${a.id}`, 1, 60);
  const bytes = new Uint32Array(1);
  do {
    crypto.getRandomValues(bytes);
  } while (bytes[0] >= 4294000000);
  const code = String(bytes[0] % 1000000).padStart(6, "0"),
    now = Date.now();
  const hash = await hashToken(
    `${c.env.BETTER_AUTH_SECRET}\0${identifier(c)}\0${code}`,
  );
  await atomic(c.env.DB, [
    command("DELETE FROM verification WHERE identifier=?", identifier(c)),
    command(
      "INSERT INTO verification(id,identifier,value,expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?)",
      crypto.randomUUID(),
      identifier(c),
      JSON.stringify({ hash, attempts: 0 }),
      now + 300000,
      now,
      now,
    ),
  ]);
  const mail = otpMail(
    mailLanguage(c.req.header("X-Auth-Language")),
    "mfa-enroll",
    code,
    c.env.APP_NAME,
  );
  await sendMail(c.env, a.email, mail.subject, mail.text, mail.html);
  return c.json({ ok: true });
}
export async function confirmEnrollmentCode(c: AppContext, code: string) {
  const a = c.get("actor");
  if (c.env.MFA_ENABLED !== "true" || a.twoFactorEnabled)
    throw new HTTPException(400);
  await throttleRequest(c, `mfa-enroll:verify:${a.sessionId}`, 5, 300);
  const row = await one<{ id: string; value: string }>(
    c.env.DB,
    command(
      isPostgreSQL(c.env.DB)
        ? "UPDATE verification SET value=jsonb_set(value::jsonb,'{attempts}',to_jsonb((value::jsonb->>'attempts')::integer+1))::text WHERE identifier=? AND expires_at>? AND (value::jsonb->>'attempts')::integer<5 RETURNING id,value"
        : "UPDATE verification SET value=json_set(value,'$.attempts',json_extract(value,'$.attempts')+1) WHERE identifier=? AND expires_at>? AND json_extract(value,'$.attempts')<5 RETURNING id,value",
      identifier(c),
      Date.now(),
    ),
  );
  const hash = await hashToken(
    `${c.env.BETTER_AUTH_SECRET}\0${identifier(c)}\0${code}`,
  );
  if (!row || JSON.parse(row.value).hash !== hash)
    throw new HTTPException(400, {
      message: "The code is invalid or has expired. Please try again.",
    });
  const result = await execute(
    c.env.DB,
    command(
      "UPDATE verification SET value=?,expires_at=? WHERE id=? AND value=?",
      approved,
      Date.now() + 300000,
      row.id,
      row.value,
    ),
  );
  if (!result)
    throw new HTTPException(400, {
      message: "The code is invalid or has expired. Please try again.",
    });
  return c.json({ ok: true });
}
export async function clearEnrollmentConfirmation(c: AppContext) {
  await execute(
    c.env.DB,
    command("DELETE FROM verification WHERE identifier=?", identifier(c)),
  );
}
