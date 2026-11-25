import { Inbox, ShieldCheck } from "lucide-react";
import { roleLabel } from "../../lib/i18n/panel";
import {
  panelAuditAuthor,
  panelAuditResource,
} from "../../lib/i18n/panel-presentation";
import { activityLabel } from "../../lib/presentation";
import { Button } from "../ui/button";
import Select from "../ui/select";
import type { AdminController } from "./useAdminController";
const field = (f: FormData, k: string) => String(f.get(k) || "");
export default function BasicListViews({
  controller,
}: {
  controller: AdminController;
}) {
  const {
    p,
    language,
    date,
    labels,
    view,
    s,
    data,
    roles,
    busy,
    setFilters,
    currentPage,
    nextCursor,
    refreshing,
    setModal,
    setSelected,
    setConfirmation,
    action,
    can,
    formSubmit,
  } = controller;
  if (!s) return null;
  function tableHeadings() {
    const fields =
      view === "/users"
        ? [p("person"), p("role"), p("status"), "MFA", p("lastSignIn")]
        : view === "/audit"
          ? [
              p("name"),
              p("author"),
              p("activity"),
              p("resource"),
              p("result"),
              p("date"),
            ]
          : [p("email"), p("date"), p("status"), p("resolution")];
    return fields.map((label) => <th key={label}>{label}</th>);
  }

  function tablePagination() {
    return (
      <div className="table-pagination">
        <Button
          variant="outline"
          disabled={currentPage <= 1 || refreshing || busy}
          onClick={() =>
            setFilters({ page: String(currentPage - 1), cursor: "" })
          }
        >
          {p("previous")}
        </Button>
        <span>{p("pageNumber", { page: currentPage })}</span>
        <Button
          variant="outline"
          disabled={!nextCursor || refreshing || busy}
          onClick={() =>
            setFilters({ page: String(currentPage + 1), cursor: "" })
          }
        >
          {p("next")}
        </Button>
      </div>
    );
  }
  return (
    <>
      {view === "/users" && (
        <section className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {tableHeadings()}
                  <th>
                    <span className="sr-only">{p("actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={String(u.id)}>
                    <td>
                      <div className="table-person">
                        <span className="small-avatar">
                          {String(u.name).slice(0, 1)}
                        </span>
                        <span>
                          <strong>{u.name}</strong>
                          <small>{u.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      {u.role
                        ? roleLabel(language, u.roleId, u.role)
                        : p("noRole")}
                    </td>
                    <td>
                      <span className={`status-badge ${u.status}`}>
                        {labels[String(u.status)]}
                      </span>
                    </td>
                    <td>
                      {u.mfa ? (
                        <ShieldCheck size={15} className="primary-text" />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="muted">{date(u.lastAccess)}</td>
                    <td>
                      {can("users.edit") && u.id !== s.user.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelected(u);
                            setModal("edit");
                          }}
                        >
                          {p("manage")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.length && <Empty text={p("noUsersMatchTheseFilters")} />}
          {tablePagination()}
        </section>
      )}
      {view === "/registrations" && (
        <section className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {tableHeadings()}
                  <th>{p("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={String(r.id)}>
                    <td>{r.email}</td>
                    <td>{date(r.created_at)}</td>
                    <td>
                      <span className={`status-badge ${r.status}`}>
                        {labels[String(r.status)]}
                      </span>
                    </td>
                    <td>{date(r.resolved_at)}</td>
                    <td>
                      {r.status === "pending" && can("users.create") && (
                        <form
                          className="inline-form"
                          onSubmit={(e) =>
                            formSubmit(e, async (f) => {
                              const roleId = field(f, "roleId");
                              const roleName =
                                roles.find((role) => role.id === roleId)
                                  ?.name || p("selectedRole");
                              setConfirmation({
                                title: "approveAccessRequest",
                                description: {
                                  key: "approveEmail",
                                  values: {
                                    email: String(r.email),
                                  },
                                },
                                details: {
                                  key: "assignedRoleDetails",
                                  values: {
                                    role: roleName,
                                    roleId,
                                  },
                                },
                                label: "approveAccess",
                                run: () =>
                                  action(`/private/registrations/${r.id}`, {
                                    decision: "approved",
                                    roleId,
                                  }),
                              });
                            })
                          }
                        >
                          <Select
                            name="roleId"
                            aria-label={p("roleForApproval")}
                            required
                            defaultValue=""
                          >
                            <option value="" disabled>
                              {p("assignRole")}
                            </option>
                            {roles.map((role) => (
                              <option value={role.id} key={role.id}>
                                {roleLabel(language, role.id, role.name)}
                              </option>
                            ))}
                          </Select>
                          <Button size="sm" type="submit" disabled={busy}>
                            {p("approve")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setConfirmation({
                                title: "rejectAccessRequest",
                                description: {
                                  key: "rejectEmail",
                                  values: {
                                    email: String(r.email),
                                  },
                                },
                                details: "accessWillNotBeEnabledThisDecision",
                                label: "rejectRequest",
                                run: () =>
                                  action(`/private/registrations/${r.id}`, {
                                    decision: "rejected",
                                  }),
                              });
                            }}
                          >
                            {p("reject")}
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.length && (
            <Empty text={p("noAccessRequestsYetNewRequestsWill")} />
          )}
          {tablePagination()}
        </section>
      )}
      {view === "/audit" && (
        <section className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>{tableHeadings()}</tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={String(r.id)}>
                    <td>
                      <strong>{panelAuditAuthor(language, r).name}</strong>
                    </td>
                    <td>{panelAuditAuthor(language, r).email}</td>
                    <td>{p(activityLabel(String(r.action)))}</td>
                    <td className="audit-resource-cell">
                      {panelAuditResource(language, r)}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${r.result === "success" ? "active" : "suspended"}`}
                      >
                        {r.result === "success" ? p("successful") : p("failed")}
                      </span>
                    </td>
                    <td className="muted">{date(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.length && <Empty text={p("noEventsToShowYet")} />}
          {tablePagination()}
        </section>
      )}
    </>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <Inbox size={30} />
      <p>{text}</p>
    </div>
  );
}
