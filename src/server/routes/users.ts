import { findRole } from "../database/records";
import { execute, command, one, atomic } from "../database/persistence";
import { mailLanguageIdentifier } from "../services/email/language";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { type ApiRouter, body, emailSchema } from "../http";
import { logEvent, requirePermission } from "../security";
import { readBasicList } from "../basic-lists";
export function registerUsers(api: ApiRouter) {
  api.get("/api/private/users", async (c) => {
    requirePermission(c.get("actor"), "users.read");
    return c.json(
      await readBasicList(c.env.DB, "users", new URL(c.req.url).searchParams),
    );
  });
  api.post("/api/private/users", async (c) => {
    const a = c.get("actor");
    requirePermission(a, "users.create");
    if (!a.isAdmin) throw new HTTPException(403);
    const b = await body(
      c,
      z.object({
        email: emailSchema,
        name: z.string().min(1).max(80),
        roleId: z.string(),
      }),
    );
    const r = await findRole(c.env.DB, b.roleId);
    if (!r) throw new HTTPException(400);
    const id = crypto.randomUUID();
    await execute(
      c.env.DB,
      command(
        "INSERT INTO \"user\"(id,name,email,email_verified,created_at,updated_at,status,role_id) VALUES(?,?,?,FALSE,?,?,'active',?)",
        id,
        b.name,
        b.email,
        Date.now(),
        Date.now(),
        r.id,
      ),
    );
    await logEvent(c.env, a.id, "user.created", id);
    return c.json({ ok: true });
  });
  api.post("/api/private/users/:id", async (c) => {
    const a = c.get("actor");
    requirePermission(a, "users.edit");
    if (!a.isAdmin) throw new HTTPException(403);
    const id = c.req.param("id");
    const b = await body(
      c,
      z.object({
        status: z.enum(["active", "suspended", "disabled"]),
        roleId: z.string(),
      }),
    );
    if (id === a.id)
      throw new HTTPException(403, {
        message: "You cannot change your own privileges.",
      });
    if (b.status !== "active") requirePermission(a, "users.deactivate");
    if (
      b.status === "active" &&
      (await one(
        c.env.DB,
        command(
          "SELECT id FROM registration WHERE user_id=? AND status='pending'",
          id,
        ),
      ))
    )
      throw new HTTPException(400, {
        message: "Approve access from Requests to keep an audit trail.",
      });
    // SQLite trigger protects the final active administrator, even under concurrent changes.
    const r = await findRole(c.env.DB, b.roleId);
    if (!r) throw new HTTPException(400);
    await atomic(c.env.DB, [
      command(
        'UPDATE "user" SET status=?,role_id=?,updated_at=? WHERE id=?',
        b.status,
        b.roleId,
        Date.now(),
        id,
      ),
      command("DELETE FROM session WHERE user_id=?", id),
      command("DELETE FROM trusted_device WHERE user_id=?", id),
    ]);
    await logEvent(c.env, a.id, "user.updated", id);
    return c.json({ ok: true });
  });
  api.post("/api/private/users/:id/delete", async (c) => {
    const a = c.get("actor");
    requirePermission(a, "users.edit");
    requirePermission(a, "users.deactivate");
    const id = c.req.param("id");
    if (!a.isAdmin || id === a.id) throw new HTTPException(403);
    const target = await one<{ email: string }>(
      c.env.DB,
      command('SELECT email FROM "user" WHERE id=?', id),
    );
    if (!target) throw new HTTPException(404);
    await atomic(c.env.DB, [
      command(
        "DELETE FROM verification WHERE identifier=?",
        mailLanguageIdentifier(id),
      ),
      command("DELETE FROM registration_event WHERE user_id=?", id),
      command("DELETE FROM registration WHERE user_id=?", id),
      command('DELETE FROM "user" WHERE id=?', id),
      command(
        "INSERT INTO audit(id,actor,action,resource,result,created_at) VALUES(?,?,?,?,?,?)",
        crypto.randomUUID(),
        a.id,
        "user.deleted",
        target.email,
        "success",
        Date.now(),
      ),
    ]);
    return c.json({ ok: true });
  });
  api.post("/api/private/users/:id/revoke", async (c) => {
    const a = c.get("actor");
    requirePermission(a, "users.edit");
    await atomic(c.env.DB, [
      command("DELETE FROM session WHERE user_id=?", c.req.param("id")),
      command("DELETE FROM trusted_device WHERE user_id=?", c.req.param("id")),
    ]);
    await logEvent(c.env, a.id, "sessions.revoked", c.req.param("id"));
    return c.json({ ok: true });
  });
}
