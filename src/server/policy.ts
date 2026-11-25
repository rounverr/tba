export const permissions = [
  "app.read",
  "users.read",
  "users.create",
  "users.edit",
  "users.deactivate",
  "roles.manage",
  "settings.manage",
  "audit.read",
] as const;
export function isSafePublicRole(
  role:
    | { isAdmin: boolean; isPublic: boolean; permissions: string[] }
    | null
    | undefined,
) {
  return (
    !!role &&
    role.isPublic &&
    !role.isAdmin &&
    role.permissions.every((p) => p === "app.read")
  );
}
export function canAccess(
  status: string,
  emailVerified: boolean,
  mfaEnabled: boolean,
  assured: boolean,
) {
  return status === "active" && emailVerified && (!mfaEnabled || assured);
}
export function isLocalUrl(value: string) {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(value).hostname,
    );
  } catch {
    return false;
  }
}
