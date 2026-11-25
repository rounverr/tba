import legacyLabels from "./i18n/legacy-labels.json";
import english from "./i18n/panel/en.json";
export const permissionLabels: Record<string, string> = {
  "app.read": legacyLabels.accessTheApplication,
  "users.read": legacyLabels.viewUsersAndRequests,
  "users.create": legacyLabels.createUsers,
  "users.edit": legacyLabels.editUsers,
  "users.deactivate": legacyLabels.suspendUsers,
  "roles.manage": legacyLabels.manageRolesAndPermissions,
  "settings.manage": legacyLabels.configureAccessAndRegistration,
  "audit.read": legacyLabels.viewActivity,
};
export const auditActivities: Record<string, string> = {
  login: legacyLabels.signInAttempt,
  "login.first_factor": legacyLabels.emailVerifiedForSignIn,
  logout: legacyLabels.signedOut,
  "mfa.enabled": legacyLabels.twoStepVerificationEnabled242,
  "mfa.disabled": legacyLabels.twoStepVerificationDisabled,
  "mfa.verify": legacyLabels.secondFactorVerification,
  "mfa.recovery": legacyLabels.signedInWithARecoveryCode,
  "mfa.backup_codes.regenerated": legacyLabels.recoveryCodesRenewed,
  "mfa.trust.revoked": legacyLabels.trustedDevicesRevoked,
  "profile.email.changed": legacyLabels.signInEmailUpdated,
  "profile.update": legacyLabels.profileUpdated,
  "user.created": legacyLabels.userCreated,
  "user.updated": legacyLabels.userUpdated,
  "user.deleted": legacyLabels.userDeleted,
  "sessions.revoked": legacyLabels.userSessionsRevoked,
  "role.updated": legacyLabels.roleUpdated,
  "registration.request": legacyLabels.accessRequestReceived,
  "registration.open": legacyLabels.registrationCompleted,
  "registration.approved": legacyLabels.accessRequestApproved,
  "registration.rejected": legacyLabels.accessRequestRejected,
  "settings.registration": legacyLabels.registrationModeUpdated,
  "mail.delivery": legacyLabels.emailDelivery,
};
export const activityLabel = (action: string) =>
  auditActivities[action] || legacyLabels.activityRecorded;
export function auditAuthor(row: Record<string, unknown>) {
  const email = String(row.email || "").trim();
  const name = String(row.actor_name || "").trim();
  return {
    name:
      name ||
      (email
        ? legacyLabels.noName
        : row.actor
          ? legacyLabels.userUnavailable
          : legacyLabels.system),
    email:
      email ||
      (row.actor ? legacyLabels.emailUnavailable : legacyLabels.system),
  };
}
export const auditResourceLabels: Record<string, string> = {
  login: legacyLabels.signIn,
  "login.first_factor": legacyLabels.signIn,
  logout: legacyLabels.accessSession,
  "mfa.enabled": legacyLabels.secondFactor,
  "mfa.disabled": legacyLabels.secondFactor,
  "mfa.verify": legacyLabels.secondFactor,
  "mfa.recovery": legacyLabels.recoveryCodes,
  "mfa.backup_codes.regenerated": legacyLabels.recoveryCodes,
  "mfa.trust.revoked": legacyLabels.trustedDevices,
  "profile.email.changed": legacyLabels.signInEmail,
  "profile.update": legacyLabels.accountProfile,
  "user.created": legacyLabels.userAccount,
  "user.updated": legacyLabels.userAccount,
  "user.deleted": legacyLabels.userAccount,
  "sessions.revoked": legacyLabels.accountSessions,
  "registration.request": legacyLabels.accessRequest,
  "registration.open": legacyLabels.userAccount,
  "registration.approved": legacyLabels.accessRequest,
  "registration.rejected": legacyLabels.accessRequest,
  "mail.delivery": legacyLabels.emailDelivery274,
};
export function auditResource(row: Record<string, unknown>) {
  if (row.action === "settings.registration")
    return (
      (
        {
          closed: legacyLabels.registrationClosed,
          approval: legacyLabels.registrationWithApproval,
          open: legacyLabels.registrationOpen,
        } as Record<string, string>
      )[String(row.resource)] || legacyLabels.registrationSettings
    );
  if (row.action === "role.updated")
    return row.resource === "viewer" &&
      row.resource_role_name === legacyLabels.historicalViewerName
      ? legacyLabels.viewer
      : String(row.resource_role_name || legacyLabels.roleUnavailable);
  if (row.action === "user.deleted")
    return `${auditResourceLabels["user.deleted"]}: ${String(row.resource || "")}`;
  const label = auditResourceLabels[String(row.action)];
  const account = row.resource_name || row.resource_email;
  if (label) {
    const managed = /^(user\.|registration\.|sessions\.)/.test(
      String(row.action),
    );
    return managed && account && row.actor !== row.resource
      ? `${label}: ${account}`
      : label;
  }
  return String(
    row.resource_email ||
      (row.resource
        ? legacyLabels.accountUnavailable
        : legacyLabels.noAssociatedResource),
  );
}
export function manualMfaKey(uri: string) {
  try {
    const url = new URL(uri);
    return url.protocol === "otpauth:" && url.hostname === "totp"
      ? url.searchParams.get("secret") || ""
      : "";
  } catch {
    return "";
  }
}
export function recoveryText(appName: string, codes: string[]) {
  return `${appName} - ${english.recoveryCodes}\n\n${english.recoveryFileHint}\n\n${codes.join("\n")}\n`;
}
