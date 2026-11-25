import { findRole } from "../database/records";
import { one, command, atomic, isPostgreSQL } from "../database/persistence";
import { notificationMail } from "../services/auth-mail";
import { recipientLanguage } from "../services/email/language";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { type ApiRouter, body } from "../http";
import { logEvent, requirePermission } from "../security";
import { sendMail } from "../services/mail";
import { deliverRegistrationEvent } from "../services/registration-hook";
import { readBasicList } from "../basic-lists";
export function registerRegistrations(api: ApiRouter) {
  api.get("/api/private/registrations", async (c) => {
    requirePermission(c.get("actor"), "users.read");
    return c.json(
      await readBasicList(
        c.env.DB,
        "registrations",
        new URL(c.req.url).searchParams,
      ),
    );
  });
  api.post("/api/private/registrations/:id", async (c) => {
    const a = c.get("actor");
    requirePermission(a, "users.create");
    if (!a.isAdmin) throw new HTTPException(403);
    const b = await body(
      c,
      z.object({
        decision: z.enum(["approved", "rejected"]),
        roleId: z.string().optional(),
      }),
    );
    const req = await one<{ user_id: string }>(
      c.env.DB,
      command(
        "SELECT * FROM registration WHERE id=? AND status='pending'",
        c.req.param("id"),
      ),
    );
    if (!req) throw new HTTPException(409);
    if (
      b.decision === "approved" &&
      (!b.roleId || !(await findRole(c.env.DB, b.roleId)))
    )
      throw new HTTPException(400, {
        message: "Select a role explicitly.",
      });
    const statements: import("../database/persistence").SqlCommand[] = [];
    if (isPostgreSQL(c.env.DB))
      statements.push(
        command(
          "SELECT id FROM registration WHERE id=? FOR UPDATE",
          c.req.param("id"),
        ),
      );
    if (b.decision === "approved")
      statements.push(
        command(
          "UPDATE \"user\" SET status='active',role_id=? WHERE id=? AND status='pending' AND email_verified=TRUE AND EXISTS(SELECT 1 FROM registration WHERE id=? AND user_id=\"user\".id AND status='pending')",
          b.roleId!,
          req.user_id,
          c.req.param("id"),
        ),
      );
    statements.push(
      command(
        "UPDATE registration SET status=?,role_id=?,resolved_by=?,resolved_at=? WHERE id=? AND status='pending' AND (?='rejected' OR EXISTS(SELECT 1 FROM \"user\" WHERE id=registration.user_id AND status='active' AND role_id=? AND email_verified=TRUE)) RETURNING user_id",
        b.decision,
        b.roleId || null,
        a.id,
        Date.now(),
        c.req.param("id"),
        b.decision,
        b.roleId || null,
      ),
    );
    const results = await atomic(c.env.DB, statements);
    const claim = results.at(-1)?.results[0];
    if (!claim) throw new HTTPException(409);
    if (b.decision === "approved") {
      await deliverRegistrationEvent(c.env, req.user_id);
      const u = await one<{ email: string }>(
        c.env.DB,
        command('SELECT email FROM "user" WHERE id=?', req.user_id),
      );
      if (u)
        c.executionCtx.waitUntil(
          (async () => {
            const mail = notificationMail(
              await recipientLanguage(c.env, req.user_id),
              "approved",
              c.env.APP_NAME,
              c.env.APP_URL,
            );
            await sendMail(c.env, u.email, mail.subject, mail.text, mail.html);
          })().catch(() => {}),
        );
    }
    await logEvent(c.env, a.id, `registration.${b.decision}`, req.user_id);
    return c.json({ ok: true });
  });
}
