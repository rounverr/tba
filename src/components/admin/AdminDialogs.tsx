import { Check, LockKeyhole, ShieldCheck, Trash2, X } from "lucide-react";
import { normalizeOtpDigits } from "../../lib/i18n/errors";
import legacyLabels from "../../lib/i18n/legacy-labels.json";
import { roleLabel } from "../../lib/i18n/panel";
import { permissionLabels } from "../../lib/presentation";
import { api, ApiError } from "../../lib/utils";
import Modal from "../Modal";
import { Button } from "../ui/button";
import Select from "../ui/select";
import MfaSetupForm from "./MfaSetupForm";
import type { AdminController } from "./useAdminController";
const field = (f: FormData, k: string) => String(f.get(k) || "");
export default function AdminDialogs({
  controller,
}: {
  controller: AdminController;
}) {
  const {
    p,
    t,
    language,
    errorText,
    labels,
    rolesFreshUntil,
    hasContent,
    s,
    setS,
    setData,
    roles,
    setRoles,
    error,
    setError,
    notice,
    setNotice,
    busy,
    setBusy,
    setTableSummary,
    profile,
    setProfile,
    modal,
    setModal,
    newEmail,
    setNewEmail,
    emailCode,
    setEmailCode,
    emailMfaCode,
    setEmailMfaCode,
    emailMfaMethod,
    setEmailMfaMethod,
    emailNeedsMfa,
    setEmailNeedsMfa,
    emailStep,
    setEmailStep,
    roleId,
    selected,
    permissionList,
    rolePermissions,
    setRolePermissions,
    enroll,
    setEnroll,
    qr,
    setQr,
    enrollmentCode,
    setEnrollmentCode,
    setCodes,
    confirmation,
    setConfirmation,
    clearCaches,
    handleError,
    closeModal,
    load,
    action,
    startMfa,
    formSubmit,
  } = controller;
  if (!s) return null;
  return (
    <>
      {modal && (
        <Modal onClose={closeModal} labelledBy="modal-title">
          <section
            className={`modal admin-modal ${modal === "email" ? "email-change-modal" : ""} ${modal === "mfa" ? "mfa-setup-modal" : ""}`}
          >
            <button
              className="modal-close icon-button"
              aria-label={p("close")}
              disabled={busy}
              onClick={closeModal}
            >
              <X size={19} />
            </button>
            <h2 id="modal-title">
              {modal === "user"
                ? p("oneMorePerson")
                : modal === "edit"
                  ? p("manageAccess")
                  : modal === "role"
                    ? p("aRoleThatFits")
                    : modal === "email"
                      ? p("changeYourEmail")
                      : modal === "mfaEmail"
                        ? t("otpTitle")
                        : modal === "mfa"
                          ? p("connectYourAuthenticator")
                          : modal === "backup"
                            ? p("regenerateCodes")
                            : modal === "revoke"
                              ? p("revokeTrustedDevices")
                              : p("disableSecondFactor")}
            </h2>
            {(modal === "user" || modal === "edit") && (
              <form
                onSubmit={(e) =>
                  formSubmit(e, async (f) => {
                    if (modal === "edit") {
                      const changes = {
                        status: field(f, "status"),
                        roleId: field(f, "roleId"),
                      };
                      const name =
                        roles.find((role) => role.id === changes.roleId)
                          ?.name || p("selectedRole");
                      setConfirmation({
                        title: "confirmAccessChange",
                        description: {
                          key: "updateEmailAccess",
                          values: { email: String(selected?.email) },
                        },
                        details: {
                          key: "accessChangeDetails",
                          values: {
                            role: name,
                            roleId: changes.roleId,
                            status: changes.status,
                          },
                        },
                        label: "saveAndCloseSessions",
                        run: () =>
                          action(`/private/users/${selected?.id}`, changes),
                      });
                      return;
                    }
                    await action(
                      modal === "user"
                        ? "/private/users"
                        : `/private/users/${selected?.id}`,
                      modal === "user"
                        ? {
                            name: field(f, "name"),
                            email: field(f, "email"),
                            roleId: field(f, "roleId"),
                          }
                        : {
                            status: field(f, "status"),
                            roleId: field(f, "roleId"),
                          },
                    );
                  })
                }
              >
                {modal === "user" ? (
                  <>
                    <label className="field-label">
                      {p("name")}
                      <input
                        className="text-input"
                        name="name"
                        required
                        maxLength={80}
                      />
                    </label>
                    <label className="field-label">
                      {p("email")}
                      <input
                        className="text-input"
                        name="email"
                        type="email"
                        dir="ltr"
                        required
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <p>{selected?.email}</p>
                    <label className="field-label">
                      {p("status")}
                      <Select
                        aria-label={p("accountStatus")}
                        name="status"
                        defaultValue={String(selected?.status)}
                        disabled={busy}
                        onAction={() =>
                          setConfirmation({
                            title: "confirmDeleteUser",
                            description: {
                              key: "deleteUserWarning",
                              values: { email: String(selected?.email) },
                            },
                            label: "deleteUser",
                            run: () =>
                              action(
                                `/private/users/${selected?.id}/delete`,
                                {},
                                "userDeleted",
                              ),
                          })
                        }
                      >
                        {["active", "suspended", "disabled"].map((v) => (
                          <option value={v} key={v}>
                            {labels[v]}
                          </option>
                        ))}
                        <option value="delete" data-action>
                          <Trash2 size={16} aria-hidden="true" />
                          {p("deleteUser")}
                        </option>
                      </Select>
                    </label>
                  </>
                )}
                <label className="field-label">
                  {p("role")}
                  <Select
                    aria-label={p("role")}
                    name="roleId"
                    required
                    defaultValue={String(selected?.roleId || "")}
                  >
                    <option value="" disabled>
                      {p("selectARole")}
                    </option>
                    {roles.map((r) => (
                      <option value={r.id} key={r.id}>
                        {roleLabel(language, r.id, r.name)}
                      </option>
                    ))}
                  </Select>
                </label>
                <Button type="submit" disabled={busy}>
                  {p("save")}
                  <Check size={16} />
                </Button>
                {modal === "edit" && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setConfirmation({
                        title: "closeTheirSessions",
                        description: {
                          key: "closeEmailSessions",
                          values: { email: String(selected?.email) },
                        },
                        details: "theirRoleAndAccountStatusWillBe",
                        label: "closeSessions",
                        run: () =>
                          action(`/private/users/${selected?.id}/revoke`, {}),
                      });
                    }}
                  >
                    {p("revokeSessions")}
                  </Button>
                )}
              </form>
            )}
            {modal === "role" && (
              <form
                onSubmit={(e) =>
                  formSubmit(e, (f) =>
                    action("/private/roles", {
                      id: field(f, "id"),
                      name: field(f, "name"),
                      permissions: rolePermissions,
                      isPublic: f.has("isPublic"),
                    }),
                  )
                }
              >
                <input type="hidden" name="id" value={roleId} />
                <label className="field-label">
                  {p("name")}
                  <input
                    className="text-input"
                    name="name"
                    required
                    defaultValue={String(selected?.name || "")}
                  />
                </label>
                <div className="permission-checks">
                  {permissionList.map((permission) => (
                    <label className="check-label" key={permission}>
                      <input
                        type="checkbox"
                        checked={rolePermissions.includes(permission)}
                        onChange={(e) =>
                          setRolePermissions(
                            e.target.checked
                              ? [...rolePermissions, permission]
                              : rolePermissions.filter((v) => v !== permission),
                          )
                        }
                      />
                      {p(
                        permissionLabels[permission] ||
                          legacyLabels.applicationPermission,
                      ) || p("applicationPermission")}
                    </label>
                  ))}
                </div>
                <label className="check-label">
                  <input
                    type="checkbox"
                    name="isPublic"
                    defaultChecked={!!selected?.isPublic}
                  />
                  {p("basicPublicRole")}
                </label>
                <Button type="submit" disabled={busy}>
                  {p("saveRole")}
                  <Check size={16} />
                </Button>
              </form>
            )}
            {modal === "email" && (
              <form
                className="email-change-form"
                onSubmit={(event) =>
                  formSubmit(event, async () => {
                    if (emailStep === "verify" && emailNeedsMfa) {
                      setError("");
                      setEmailStep("mfa");
                      return;
                    }
                    setBusy(true);
                    setError("");
                    try {
                      if (emailStep === "request") {
                        const result = await api<{ mfaRequired: boolean }>(
                          "/private/profile/email/request",
                          { newEmail: newEmail.trim() },
                        );
                        setEmailNeedsMfa(result.mfaRequired);
                        setEmailStep("verify");
                        setEmailCode("");
                        setEmailMfaCode("");
                        setEmailMfaMethod("totp");
                      } else {
                        await api("/private/profile/email/confirm", {
                          newEmail: newEmail.trim(),
                          code: emailCode,
                          ...(emailNeedsMfa
                            ? {
                                mfaCode: emailMfaCode,
                                method: emailMfaMethod,
                              }
                            : {}),
                        });
                        clearCaches();
                        hasContent.current = false;
                        setEmailStep("done");
                        setEmailCode("");
                        setEmailMfaCode("");
                        setNewEmail("");
                        setS(null);
                        setData([]);
                        setTableSummary(null);
                        setRoles([]);
                        setProfile(undefined);
                      }
                    } catch (error) {
                      if (
                        error instanceof ApiError &&
                        error.code === "MFA_CONFIRMATION_REQUIRED"
                      ) {
                        setEmailNeedsMfa(true);
                        setEmailStep("mfa");
                      }
                      handleError(error);
                    } finally {
                      setBusy(false);
                    }
                  })
                }
              >
                <span className="email-step-label">
                  {emailStep === "request"
                    ? p("01NewAddress")
                    : emailStep === "verify"
                      ? p("emailStepVerify")
                      : p("emailStepConfirm")}
                </span>
                {emailStep === "request" ? (
                  <>
                    <p className="email-intro">{p("weWillSendACodeToThe")}</p>
                    <label className="field-label" htmlFor="new-email">
                      {p("newEmailAddress")}
                    </label>
                    <input
                      id="new-email"
                      type="email"
                      dir="ltr"
                      autoComplete="email"
                      className="text-input"
                      required
                      maxLength={254}
                      value={newEmail}
                      onChange={(event) => setNewEmail(event.target.value)}
                      disabled={busy}
                    />
                    <p className="email-hint">
                      {p("forSecurityYouMustHaveSignedIn")}
                      {profile?.mfaEnabled
                        ? " " + p("weWillAlsoAskForASecond")
                        : ""}
                    </p>
                  </>
                ) : emailStep === "verify" ? (
                  <>
                    <p className="email-intro">{p("enterTheCodeWeSentTo")}</p>
                    <div className="email-destination">{newEmail}</div>
                    <label className="field-label" htmlFor="new-email-code">
                      {p("newEmailCode")}
                    </label>
                    <input
                      id="new-email-code"
                      className="code-input mfa-activation-code"
                      dir="ltr"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={emailCode}
                      onChange={(event) =>
                        setEmailCode(normalizeOtpDigits(event.target.value))
                      }
                      disabled={busy}
                    />
                    <p className="email-hint">
                      {p("theCodeExpiresInFiveMinutesIf")}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="email-intro">
                      {p("confirmThisChangeWithANewSecond")}
                    </p>
                    <Select
                      aria-label={p("confirmationMethod")}
                      value={emailMfaMethod}
                      onChange={(event) => {
                        setEmailMfaMethod(
                          event.target.value as "totp" | "recovery",
                        );
                        setEmailMfaCode("");
                        setError("");
                      }}
                      disabled={busy}
                    >
                      <option value="totp">{p("authenticatorCode")}</option>
                      <option value="recovery">{p("recoveryCode")}</option>
                    </Select>
                    <label className="field-label" htmlFor="email-mfa-code">
                      {emailMfaMethod === "totp"
                        ? p("authenticatorCode")
                        : p("recoveryCode")}
                    </label>
                    <input
                      id="email-mfa-code"
                      className={
                        emailMfaMethod === "totp"
                          ? "code-input mfa-activation-code"
                          : "text-input"
                      }
                      inputMode={emailMfaMethod === "totp" ? "numeric" : "text"}
                      autoComplete="one-time-code"
                      required
                      pattern={
                        emailMfaMethod === "totp" ? "[0-9]{6}" : undefined
                      }
                      maxLength={emailMfaMethod === "totp" ? 6 : 32}
                      value={emailMfaCode}
                      onChange={(event) =>
                        setEmailMfaCode(
                          emailMfaMethod === "totp"
                            ? normalizeOtpDigits(event.target.value)
                            : event.target.value,
                        )
                      }
                      disabled={busy}
                    />
                  </>
                )}
                {emailStep !== "request" && (
                  <div className="email-change-summary">
                    <LockKeyhole size={18} />
                    <p>{p("confirmingWillCloseYourSessionsYourRole")}</p>
                  </div>
                )}
                <Button type="submit" disabled={busy}>
                  {busy
                    ? p("confirming")
                    : emailStep === "request"
                      ? p("sendCodeToTheNewAddress")
                      : emailStep === "verify" && emailNeedsMfa
                        ? p("continueWithSecondFactor")
                        : p("verifyAndChangeEmail")}
                </Button>
                {emailStep === "mfa" && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setEmailStep("verify");
                      setEmailMfaCode("");
                      setError("");
                    }}
                  >
                    {p("backToEmailCode")}
                  </Button>
                )}
              </form>
            )}
            {modal === "mfaEmail" && (
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    await api("/private/security/enroll/email/confirm", {
                      code: enrollmentCode,
                    });
                    setEnrollmentCode("");
                    await startMfa();
                  } catch (error) {
                    handleError(error);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <p>{p("confirmMfaByEmail")}</p>
                <p>
                  <bdi dir="ltr">{s.user.email}</bdi>
                </p>
                <label className="field-label" htmlFor="enrollment-email-code">
                  {t("otpLabel")}
                </label>
                <input
                  id="enrollment-email-code"
                  className="code-input"
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={enrollmentCode}
                  onChange={(event) =>
                    setEnrollmentCode(normalizeOtpDigits(event.target.value))
                  }
                  disabled={busy}
                />
                <Button type="submit" disabled={busy}>
                  {busy ? t("loading") : t("verifyContinue")}
                </Button>
              </form>
            )}
            {modal === "mfa" && enroll && (
              <MfaSetupForm
                enroll={enroll}
                qr={qr}
                busy={busy}
                setError={setError}
                onSubmit={(e) =>
                  formSubmit(e, async (f) => {
                    const ok = await action(
                      "/private/security/confirm",
                      { code: field(f, "code") },
                      "twoStepVerificationEnabled",
                    );
                    if (ok) {
                      setCodes(enroll.backupCodes);
                      setEnroll(undefined);
                      setQr("");
                    }
                  })
                }
              />
            )}
            {(modal === "disable" ||
              modal === "backup" ||
              modal === "revoke") && (
              <form
                onSubmit={(e) =>
                  formSubmit(e, async (f) => {
                    const disabling = modal === "disable";
                    const revoking = modal === "revoke";
                    const verification = {
                      code: field(f, "code"),
                      method: field(f, "method"),
                    };
                    setConfirmation({
                      title: revoking
                        ? "revokeTrustedDevices"
                        : disabling
                          ? "disableTwoStepVerification"
                          : "renewRecoveryCodes",
                      description: revoking
                        ? "trustWillBeRemovedFromAllYour"
                        : disabling
                          ? "yourAccountWillNoLongerAskFor"
                          : "yourCurrentRecoveryCodesWillStopWorking",
                      details: revoking
                        ? "weWillAskForYourSecondFactor"
                        : disabling
                          ? "allTrustedDevicesWillAlsoBeRevoked"
                          : "weWillCreateANewListShown",
                      label: revoking
                        ? "revokeTrust"
                        : disabling
                          ? "disableSecondFactor"
                          : "generateNewCodes",
                      run: async () => {
                        setBusy(true);
                        setError("");
                        try {
                          const d = await api<{ backupCodes?: string[] }>(
                            revoking
                              ? "/private/security/revoke-trust"
                              : disabling
                                ? "/private/security/disable"
                                : "/private/security/backup-codes",
                            verification,
                          );
                          if (disabling) setCodes([]);
                          else if (d.backupCodes) setCodes(d.backupCodes);
                          clearCaches();
                          rolesFreshUntil.current = 0;
                          setModal(null);
                          setNotice("securityUpdated");
                          await load(true);
                        } catch (e) {
                          handleError(e);
                        } finally {
                          setBusy(false);
                        }
                      },
                    });
                  })
                }
              >
                <p>
                  {p(
                    modal === "revoke"
                      ? "confirmThisChangeWithANewSecond"
                      : "forSecurityYouNeedARecentSign",
                  )}
                </p>
                <Select name="method" aria-label={p("verificationMethod")}>
                  <option value="totp">{p("authenticatorCode")}</option>
                  <option value="recovery">{p("recoveryCode")}</option>
                </Select>
                <label className="field-label spaced-label">
                  {p("code")}
                  <input
                    className="text-input"
                    name="code"
                    required
                    autoComplete="one-time-code"
                  />
                </label>
                <Button type="submit" disabled={busy}>
                  {p("confirm")}
                  <Check size={16} />
                </Button>
              </form>
            )}
            {notice && (
              <div className="form-notice" role="status">
                {p(notice)}
              </div>
            )}
            {error && (
              <div className="form-error" role="alert">
                {errorText(error)}
              </div>
            )}
          </section>
        </Modal>
      )}
      {confirmation && (
        <Modal
          labelledBy="confirmation-title"
          onClose={() => {
            if (!busy) setConfirmation(null);
          }}
        >
          <section className="modal confirmation-modal">
            <div className="confirmation-icon">
              <ShieldCheck size={25} />
            </div>
            <h2 id="confirmation-title">{p(confirmation.title)}</h2>
            <p>{p(confirmation.description)}</p>
            {confirmation.details && (
              <div className="confirmation-details">
                {p(confirmation.details)}
              </div>
            )}
            <div className="confirmation-actions">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmation(null)}
              >
                {p("back")}
              </Button>
              <Button
                disabled={busy}
                onClick={async () => {
                  await confirmation.run();
                  setConfirmation(null);
                }}
              >
                {busy ? p("confirming") : p(confirmation.label)}
              </Button>
            </div>
          </section>
        </Modal>
      )}
    </>
  );
}
