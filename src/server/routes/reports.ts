import { type ApiRouter } from "../http";
import { requirePermission } from "../security";
import { deliverRegistrationEvent } from "../services/registration-hook";
import { readBasicList } from "../basic-lists";
export function registerReports(api: ApiRouter) {
  api.get("/api/private/audit", async (c) => {
    requirePermission(c.get("actor"), "audit.read");
    return c.json(
      await readBasicList(c.env.DB, "audit", new URL(c.req.url).searchParams),
    );
  });
  api.post("/api/private/hooks/:id/retry", async (c) => {
    requirePermission(c.get("actor"), "settings.manage");
    await deliverRegistrationEvent(c.env, c.req.param("id"));
    return c.json({ ok: true });
  });
  api.get("/api/private/example", (c) => {
    requirePermission(c.get("actor"), "app.read");
    return c.json({
      message: "Example module protected by role-based permissions.",
    });
  });
}
