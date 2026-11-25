import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { type ApiRouter } from "../http";
import { isLocalUrl } from "../policy";
export function registerMiddleware(api: ApiRouter) {
  api.use(
    "*",
    secureHeaders({
      referrerPolicy: "strict-origin-when-cross-origin",
      xFrameOptions: "DENY",
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://challenges.cloudflare.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: ["https://challenges.cloudflare.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    }),
  );
  api.use("/api/*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    if (!isLocalUrl(c.env.APP_URL) && new URL(c.req.url).protocol !== "https:")
      throw new HTTPException(400, { message: "HTTPS es obligatorio." });
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
      if (c.req.header("origin") !== c.env.APP_URL)
        throw new HTTPException(403, { message: "Unauthorized origin." });
      if (!(c.req.header("content-type") || "").startsWith("application/json"))
        throw new HTTPException(415, { message: "Unsupported format." });
      if (Number(c.req.header("content-length") || 0) > 16384)
        throw new HTTPException(413, {
          message: "Request too large.",
        });
    }
    await next();
  });
  api.use(
    "/api/*",
    bodyLimit({
      maxSize: 16384,
      onError: (c) => c.json({ message: "Request too large." }, 413),
    }),
  );
}
