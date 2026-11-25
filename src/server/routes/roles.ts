import { command, execute, isPostgreSQL } from "../database/persistence";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { type ApiRouter, body, roleRows } from "../http";
import { isSafePublicRole, permissions } from "../policy";
import { logEvent, requirePermission } from "../security";
export function registerRoles(api: ApiRouter) {
  api.get("/api/private/roles", async (c) => {
    requirePermission(c.get("actor"), "users.read");
    return c.json({
      rows: await roleRows(c),
      permissions,
    });
  });
  api.post("/api/private/roles", async (c) => {
    const a = c.get("actor");
    requirePermission(a, "roles.manage");
    if (!a.isAdmin) throw new HTTPException(403);
    const b = await body(
      c,
      z.object({
        id: z.string().regex(/^[a-z][a-z0-9-]{1,40}$/),
        name: z.string().min(1).max(50),
        permissions: z.array(z.enum(permissions)),
        isPublic: z.boolean(),
      }),
    );
    if (b.id === "administrator") throw new HTTPException(403);
    if (b.isPublic && !isSafePublicRole({ ...b, isAdmin: false }))
      throw new HTTPException(400);
    await execute(
      c.env.DB,
      command(
        "INSERT INTO role(id,name,is_admin,is_public,permissions) VALUES(?,?,FALSE,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,is_public=excluded.is_public,permissions=excluded.permissions",
        b.id,
        b.name,
        isPostgreSQL(c.env.DB) ? b.isPublic : Number(b.isPublic),
        JSON.stringify(b.permissions),
      ),
    );
    await logEvent(c.env, a.id, "role.updated", b.id);
    return c.json({ ok: true });
  });
}
