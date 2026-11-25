import {
  Check,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { roleLabel } from "../../lib/i18n/panel";
import { usePanelI18n } from "../../lib/i18n/use-panel";
import { permissionLabels } from "../../lib/presentation";
import { Button } from "../ui/button";
import Select from "../ui/select";
import type { PanelAction, Role } from "./types";
export default function SettingsView({
  mode,
  setMode,
  publicRole,
  setPublicRole,
  registrationRoles,
  confirmed,
  setConfirmed,
  busy,
  action,
}: {
  mode: string;
  setMode: React.Dispatch<React.SetStateAction<string>>;
  publicRole: string;
  setPublicRole: React.Dispatch<React.SetStateAction<string>>;
  registrationRoles: Role[];
  confirmed: boolean;
  setConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
  busy: boolean;
  action: PanelAction;
}) {
  const { p, language } = usePanelI18n();
  const selectedRole = registrationRoles.find((role) => role.id === publicRole);
  return (
    <form
      className="panel settings-panel"
      onSubmit={(e) => {
        e.preventDefault();
        action("/private/settings", {
          mode,
          publicRoleId:
            (mode === "open" ? selectedRole?.id : publicRole) || null,
          confirmed,
        });
      }}
    >
      <h2>{p("howNewUsersJoin")}</h2>
      <p>{p("changesApplyToNewRegistrationsExistingAccounts")}</p>
      <div className="mode-options">
        {[
          [
            "closed",
            p("registrationClosed"),
            p("onlyAdministratorsCanCreateUsers"),
            LockKeyhole,
          ],
          [
            "approval",
            p("approvalRequired"),
            p("eachRequestRequiresReviewAndAnExplicit"),
            Users,
          ],
          [
            "open",
            p("registrationOpen"),
            p("registrationOpenDescription"),
            UserRound,
          ],
        ].map(([v, title, desc, Icon]) => {
          const I = Icon as typeof Users;
          return (
            <label
              className={`mode-option ${mode === v ? "selected" : ""}`}
              key={String(v)}
            >
              <input
                type="radio"
                name="mode"
                value={String(v)}
                checked={mode === v}
                disabled={busy}
                onChange={() => {
                  setMode(String(v));
                  setConfirmed(false);
                }}
              />
              <I size={20} />
              <span>
                <strong>{String(title)}</strong>
                <small>{String(desc)}</small>
              </span>
              {mode === v && <Check size={16} />}
            </label>
          );
        })}
      </div>
      {mode === "open" && (
        <div className="open-registration">
          <div className="registration-role-card">
            <div className="registration-role-heading">
              <ShieldCheck size={19} aria-hidden="true" />
              <label className="field-label" htmlFor="registration-role">
                {p("initialRegistrationRole")}
              </label>
            </div>
            <p id="registration-role-hint">
              {p("initialRegistrationRoleHint")}
            </p>
            <Select
              id="registration-role"
              name="publicRoleId"
              aria-label={p("initialRegistrationRole")}
              aria-describedby="registration-role-hint"
              required
              value={selectedRole?.id || ""}
              disabled={busy || !registrationRoles.length}
              onChange={(event) => {
                setPublicRole(event.target.value);
                setConfirmed(false);
              }}
            >
              <option value="" disabled>
                {p("selectARole")}
              </option>
              {registrationRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {roleLabel(language, role.id, role.name)}
                </option>
              ))}
            </Select>
            <p className="registration-role-note">
              {p(
                registrationRoles.length
                  ? "registrationRoleHint"
                  : "noRegistrationRoles",
              )}
            </p>
            {selectedRole && (
              <div className="registration-role-access">
                <span>{p("registrationRoleAccess")}</span>
                <div className="permission-tags">
                  {selectedRole.isAdmin ? (
                    <span>{p("fullAdministrativeControl")}</span>
                  ) : selectedRole.permissions.length ? (
                    selectedRole.permissions.map((permission) => (
                      <span key={permission}>
                        {p(
                          permissionLabels[permission] ||
                            "applicationPermission",
                        )}
                      </span>
                    ))
                  ) : (
                    <span>{p("noPermissionsAssigned")}</span>
                  )}
                </div>
              </div>
            )}
          </div>
          <p>{p("registrationOpenNotice")}</p>
          <label className="check-label">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy || !selectedRole}
              onChange={(e) => setConfirmed(e.target.checked)}
              required
            />
            {p("confirmOpenRegistrationWithRole", {
              role: selectedRole
                ? roleLabel(language, selectedRole.id, selectedRole.name)
                : p("selectARole"),
            })}
          </label>
        </div>
      )}
      <Button
        type="submit"
        disabled={busy || (mode === "open" && !selectedRole)}
      >
        {p("saveConfiguration")}
        <Check size={15} />
      </Button>
    </form>
  );
}
