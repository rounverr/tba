import { type ApiRouter, roleRows, sessionContext } from "../http";
import { permissions } from "../policy";
import { getActor, requirePermission } from "../security";
export function registerPrivateContext(api: ApiRouter) {
  api.use("/api/private/*", async (c, next) => {
    const wantsContext =
      c.req.method === "GET" && c.req.query("context") === "1";
    // These account routes only need the authenticated actor's own identity.
    const profileOnly =
      (c.req.path === "/api/private/profile" &&
        (c.req.method === "GET" || c.req.method === "POST")) ||
      (c.req.path === "/api/private/profile/language" &&
        c.req.method === "POST");
    const { mfaRequired } = await getActor(c, {
      allowPendingMfa: true,
      includeAuthorization: wantsContext || !profileOnly,
      rejectStaleAuthorization:
        c.req.method === "POST" &&
        c.req.header("X-TBA-Authorization-Refresh") === "1",
    });
    if (mfaRequired)
      return c.json(
        {
          message: "Complete two-step verification.",
          code: "MFA_REQUIRED",
        },
        403,
      );
    await next();
    if (
      !wantsContext ||
      !c.res.ok ||
      !c.res.headers.get("content-type")?.includes("application/json")
    )
      return;
    const payload = (await c.res.json()) as Record<string, unknown>;
    let metadata:
      { rows: unknown[]; permissions: typeof permissions } | undefined;
    if (
      c.req.query("includeRoles") === "1" &&
      ["/api/private/users", "/api/private/registrations"].includes(c.req.path)
    ) {
      requirePermission(c.get("actor"), "users.read");
      metadata = { rows: await roleRows(c), permissions };
    }
    c.res = new Response(
      JSON.stringify({
        ...payload,
        _context: sessionContext(c.get("actor")),
        ...(metadata ? { _roles: metadata } : {}),
      }),
      c.res,
    );
  });
}
