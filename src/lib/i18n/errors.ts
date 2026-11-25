import type { MessageKey } from "./catalog";
// Presentation-only mapping. The server remains responsible for every decision.
import legacyErrors from "./auth-error-sources.json";
import { messages } from "./catalog";
const serverMessages = Object.fromEntries([
  ...Object.entries(legacyErrors),
  ...Object.values(legacyErrors).map((key) => [
    messages.en[key as MessageKey],
    key,
  ]),
]) as Record<string, MessageKey>;

export function authErrorKey(error: unknown): MessageKey {
  const e = error as { message?: string; code?: string; status?: number };
  if (e?.code === "ACCESS_NOT_ENABLED") return "errorAccessNotEnabled";
  if (e?.code === "MFA_REQUIRED") return "errorMfaRequired";
  if (e?.message && Object.hasOwn(serverMessages, e.message))
    return serverMessages[e.message];
  if (e?.status === 429) return "errorTooMany";
  if (e?.status && e.status >= 500) return "errorUnavailable";
  if (e?.status === 401) return "errorSession";
  if (error instanceof TypeError) return "errorNetwork";
  return "errorUnknown";
}
export function normalizeOtpDigits(value: string) {
  return value
    .replace(/[٠-٩۰-۹०-९０-９]/g, (char) => {
      const code = char.charCodeAt(0);
      const start =
        code >= 0xff10
          ? 0xff10
          : code >= 0x966
            ? 0x966
            : code >= 0x6f0
              ? 0x6f0
              : 0x660;
      return String(code - start);
    })
    .replace(/\D/g, "")
    .slice(0, 6);
}
