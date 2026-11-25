import legacyLabels from "../lib/i18n/legacy-labels.json";
import { Hono } from "hono";
import { routePath } from "hono/route";
import { HTTPException } from "hono/http-exception";
import { MfaEnrollmentConfirmationRequired } from "./mfa-enrollment";
import { registerAccess } from "./routes/access";
import { registerMiddleware } from "./routes/middleware";
import { registerPrivateContext } from "./routes/private-context";
import { registerProfile } from "./routes/profile";
import { registerRegistrations } from "./routes/registrations";
import { registerReports } from "./routes/reports";
import { registerRoles } from "./routes/roles";
import { registerSecurity } from "./routes/security";
import { registerSettings } from "./routes/settings";
import { registerUsers } from "./routes/users";
import { AuthorizationChanged, RecentAuthRequired } from "./security";
import type { Actor, RuntimeEnv } from "./types";
const api = new Hono<{ Bindings: RuntimeEnv; Variables: { actor: Actor } }>();
registerMiddleware(api);
registerAccess(api);
registerPrivateContext(api);
registerProfile(api);
registerSecurity(api);
registerUsers(api);
registerRoles(api);
registerRegistrations(api);
registerSettings(api);
registerReports(api);
api.all("/api/*", () => {
  throw new HTTPException(404);
});
api.all("*", () => {
  throw new HTTPException(404);
});
api.onError((err, c) => {
  if (err instanceof HTTPException)
    return c.json(
      {
        message: err.message || legacyLabels.theOperationCouldNotBeCompleted,
        ...(err instanceof AuthorizationChanged
          ? { code: "authorization_changed" }
          : err instanceof MfaEnrollmentConfirmationRequired
            ? { code: "MFA_ENROLL_CONFIRMATION_REQUIRED" }
            : err instanceof RecentAuthRequired
              ? { code: "RECENT_AUTH_REQUIRED" }
              : {}),
      },
      err.status,
    );
  console.error("api_unexpected_error", c.req.method, routePath(c));
  return c.json(
    {
      message:
        "The sign-in service is unavailable. Please try again shortly or contact your administrator.",
    },
    503,
  );
});
export default api;
