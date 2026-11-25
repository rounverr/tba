import { command, execute } from "../database/persistence";
import { findRole } from "../database/records";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { type ApiRouter, body, config, roleRows } from "../http";
import { logEvent, requirePermission } from "../security";
export function registerSettings(api: ApiRouter) {
  api.get("/api/private/settings", async (c) => {
    requirePermission(c.get("actor"), "settings.manage");
    return c.json({
      ...(await config(c)),
      registrationRoles: await roleRows(c),
    });
  });
  api.post("/api/private/settings", async (c) => {
    const a = c.get("actor");
    requirePermission(a, "settings.manage");
    if (!a.isAdmin) throw new HTTPException(403);
    const b = await body(
      c,
      z.object({
        mode: z.enum(["closed", "approval", "open"]),
        publicRoleId: z.string().nullable(),
        confirmed: z.boolean().default(false),
      }),
    );
    if (b.mode === "open") {
      const r = b.publicRoleId
        ? await findRole(c.env.DB, b.publicRoleId)
        : null;
      if (!r || !b.confirmed)
        throw new HTTPException(400, {
          message:
            "Select a valid role and confirm that you want to enable open registration.",
        });
    }
    await execute(
      c.env.DB,
      command(
        "UPDATE settings SET mode=?,public_role_id=?,updated_at=?,updated_by=? WHERE id=1",
        b.mode,
        b.publicRoleId,
        Date.now(),
        a.id,
      ),
    );
    await logEvent(c.env, a.id, "settings.registration", b.mode);
    return c.json({ ok: true });
  });
}
