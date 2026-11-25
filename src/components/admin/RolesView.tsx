import { ArrowRight, ShieldCheck } from "lucide-react";
import legacyLabels from "../../lib/i18n/legacy-labels.json";
import { roleLabel } from "../../lib/i18n/panel";
import { usePanelI18n } from "../../lib/i18n/use-panel";
import { permissionLabels } from "../../lib/presentation";
import { Button } from "../ui/button";
import type { Role } from "./types";
export default function RolesView({
  roles,
  canManage,
  onEdit,
}: {
  roles: Role[];
  canManage: boolean | undefined;
  onEdit: (r: Role) => void;
}) {
  const { p, language } = usePanelI18n();
  return (
    <>
      <div className="roles-grid">
        {roles.map((r) => (
          <section className="panel role-card" key={r.id}>
            <div className="role-card-top">
              <span className="role-icon">
                <ShieldCheck size={20} />
              </span>
              {r.isPublic && (
                <span className="status-badge active">{p("public")}</span>
              )}
            </div>
            <h2>{roleLabel(language, r.id, r.name)}</h2>
            <p>
              {r.isAdmin
                ? p("fullAdministrativeControl")
                : p("permissionCount", {
                    count: r.permissions.length,
                    permissions:
                      r.permissions.length === 1
                        ? p("permissionAssigned")
                        : p("permissionsAssigned"),
                  })}
            </p>
            <div className="permission-tags">
              {(r.isAdmin ? [p("administrativeAccess")] : r.permissions).map(
                (permission) => (
                  <span key={permission}>
                    {p(
                      permissionLabels[permission] ||
                        legacyLabels.applicationPermission,
                    ) ||
                      (r.isAdmin
                        ? p("administrativeAccess")
                        : p("applicationPermission"))}
                  </span>
                ),
              )}
            </div>
            {canManage && !r.isAdmin && (
              <Button variant="outline" size="sm" onClick={() => onEdit(r)}>
                {p("editPermissions")}
                <ArrowRight className="directional-icon" size={14} />
              </Button>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
