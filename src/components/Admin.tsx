const field = (f: FormData, k: string) => String(f.get(k) || "");
import { Check, LoaderCircle, LockKeyhole, Plus } from "lucide-react";
import app from "../config/app.json";
import legacyLabels from "../lib/i18n/legacy-labels.json";
import { api } from "../lib/utils";
import { AdminHeader, AdminSidebar } from "./admin/AdminChrome";
import AdminDialogs from "./admin/AdminDialogs";
import BasicListViews from "./admin/BasicListViews";
import DashboardView from "./admin/DashboardView";
import EmailChangeComplete from "./admin/EmailChangeComplete";
import ProfileView from "./admin/ProfileView";
import RolesView from "./admin/RolesView";
import SecurityView from "./admin/SecurityView";
import SettingsView from "./admin/SettingsView";
import type { Row } from "./admin/types";
import { useAdminController } from "./admin/useAdminController";
import { AuthI18n } from "./AuthI18n";
import { Button } from "./ui/button";
export default function Admin({ view = "" }: { view?: string }) {
  return (
    <AuthI18n page="panel">
      <AdminPanel view={view} />
    </AuthI18n>
  );
}
function AdminPanel({ view: initialView = "" }: { view?: string }) {
  const controller = useAdminController(initialView);
  const {
    p,
    language,
    errorText,
    links,
    view,
    routeView,
    contentAllowed,
    redirecting,
    setRedirecting,
    panelElement,
    s,
    roles,
    error,
    setError,
    notice,
    setNotice,
    loading,
    busy,
    tableSummary,
    refreshing,
    stats,
    profile,
    mode,
    setMode,
    publicRole,
    setPublicRole,
    registrationRoles,
    confirmed,
    setConfirmed,
    modal,
    setModal,
    collapsed,
    setNewEmail,
    setEmailCode,
    emailStep,
    setEmailStep,
    setRoleId,
    reauthRequired,
    setSelected,
    setRolePermissions,
    codes,
    setCodes,
    mobile,
    setMobile,
    titles,
    navigate,
    toggleSidebar,
    clearCaches,
    discardPrivateState,
    handleError,
    closeModal,
    isTable,
    load,
    action,
    can,
    startMfa,
    formSubmit,
  } = controller;
  if (!redirecting && modal === "email" && emailStep === "done")
    return <EmailChangeComplete onClose={closeModal} />;
  // Both prerendering and the initial client render stay empty until the private
  // response has authorized this view. Keep the previous authorized view during
  // normal internal navigation, without exposing the panel on a fresh visit.
  if (redirecting || !s || !contentAllowed) {
    if (redirecting || !error || loading) return null;
    return (
      <main className="access-status" data-app-root>
        <p role="alert">{errorText(error)}</p>
        <div className="access-status-actions">
          <Button variant="outline" onClick={() => load(true)}>
            {p("tryAgain")}
          </Button>
          <a className="text-link" href="/login/">
            {p("goToSignIn")}
          </a>
        </div>
      </main>
    );
  }
  return (
    <div
      ref={panelElement}
      data-app-root
      onInvalidCapture={(event) => {
        event.preventDefault();
        setError(legacyLabels.checkTheInformationYouEntered);
        (event.target as HTMLElement).focus();
      }}
      className={`dashboard-shell ${collapsed ? "sidebar-collapsed" : ""}`}
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        const anchor = (event.target as Element).closest<HTMLAnchorElement>(
          "a[href]",
        );
        if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
        const url = new URL(anchor.href);
        if (
          url.origin !== location.origin ||
          url.search ||
          url.hash ||
          !/^\/admin(?:\/|$)/.test(url.pathname)
        )
          return;
        const next = url.pathname.replace(/^\/admin/, "").replace(/\/$/, "");
        if (!Object.hasOwn(titles, next)) return;
        event.preventDefault();
        if (busy || next === routeView) return;
        history.pushState(null, "", `/admin${next}/`);
        navigate(next);
      }}
    >
      <AdminSidebar
        mobile={mobile}
        collapsed={collapsed}
        routeView={routeView}
        links={links}
        can={can}
        toggleSidebar={toggleSidebar}
        onSignOut={async () => {
          try {
            clearCaches();
            await api("/auth/sign-out", {});
            discardPrivateState();
            setRedirecting(true);
            location.replace("/login/");
          } catch (e) {
            handleError(e);
          }
        }}
      />
      <div className="dashboard-main">
        <AdminHeader
          refreshing={refreshing}
          routeView={routeView}
          view={view}
          titles={titles}
          mobile={mobile}
          setMobile={setMobile}
          s={s}
        />
        <main
          className="dashboard-content"
          aria-busy={refreshing}
          inert={routeView !== view}
        >
          <div className="page-heading">
            <div className="page-heading-copy">
              <div className="eyebrow">
                {app.name} /{" "}
                {view === "/security" ? p("yourPeaceOfMind") : p("yourSpace40")}
              </div>
              <div className="page-title-row">
                <h1>
                  {view === ""
                    ? p("greeting", {
                        name: s?.user.name.split(" ")[0] || p("welcome"),
                      })
                    : titles[view]}
                </h1>
              </div>
              <p>
                {view === ""
                  ? p("everythingIsReadyForYourNextBig")
                  : view === "/users"
                    ? p("thePeopleWhoBringYourApplicationTo")
                    : view === "/security"
                      ? p("youControlAccessToYourAccount")
                      : view === "/settings"
                        ? p("chooseHowNewPeopleJoinYourApplication")
                        : view === "/roles"
                          ? p("theRightAccessForEachPerson")
                          : view === "/registrations"
                            ? p("reviewWhoWantsToJoinYourSpace")
                            : view === "/audit"
                              ? p("everyImportantChangeInOnePlace")
                              : p("makeThisSpaceFeelLikeYourOwn")}
              </p>
            </div>
            {isTable && tableSummary && (
              <span className="record-count" aria-live="polite">
                <strong>{tableSummary.total.toLocaleString(language)}</strong>{" "}
                {tableSummary.total === 1 ? p("record") : p("records341")}
              </span>
            )}
            {view === "/users" && can("users.create") && (
              <Button onClick={() => setModal("user")}>
                <Plus size={16} />
                {p("createUser")}
              </Button>
            )}
            {view === "/roles" && can("roles.manage") && (
              <Button
                onClick={() => {
                  setSelected(null);
                  setRoleId(`rol-${crypto.randomUUID()}`);
                  setRolePermissions([]);
                  setModal("role");
                }}
              >
                <Plus size={16} />
                {p("createRole")}
              </Button>
            )}
          </div>
          {error && (
            <div className="form-error" role="alert">
              {errorText(error)}
              {(!s || reauthRequired) && (
                <a
                  className="text-link"
                  href={
                    reauthRequired
                      ? view === "/profile"
                        ? "/login/?reauth=profile"
                        : "/login/?reauth=1"
                      : "/login/"
                  }
                >
                  {" "}
                  {p("confirmYourIdentityAndReturn")}
                </a>
              )}
            </div>
          )}
          {notice && (
            <div className="notice-banner" role="status">
              <Check size={16} />
              {p(notice)}
            </div>
          )}
          {loading ? (
            <div className="loading-state" role="status">
              <LoaderCircle size={22} className="spin" />
              {p("loadingYourSpace")}
            </div>
          ) : (
            s &&
            contentAllowed && (
              <>
                {view === "" && <DashboardView s={s} stats={stats} />}
                <BasicListViews controller={controller} />

                {view === "/roles" && (
                  <RolesView
                    roles={roles}
                    canManage={can("roles.manage")}
                    onEdit={(r) => {
                      setSelected(r as unknown as Row);
                      setRoleId(r.id);
                      setRolePermissions(r.permissions);
                      setModal("role");
                    }}
                  />
                )}

                {view === "/settings" && (
                  <SettingsView
                    mode={mode}
                    setMode={setMode}
                    publicRole={publicRole}
                    setPublicRole={setPublicRole}
                    registrationRoles={registrationRoles}
                    confirmed={confirmed}
                    setConfirmed={setConfirmed}
                    busy={busy}
                    action={action}
                  />
                )}
                {view === "/profile" && profile && (
                  <ProfileView
                    profile={profile}
                    busy={busy}
                    onSubmit={(e) =>
                      formSubmit(e, (f) =>
                        action("/private/profile", { name: field(f, "name") }),
                      )
                    }
                    onChangeEmail={() => {
                      setNewEmail("");
                      setEmailCode("");
                      setEmailStep("request");
                      setError("");
                      setNotice("");
                      setModal("email");
                    }}
                  />
                )}
                {view === "/security" && profile && (
                  <SecurityView
                    profile={profile}
                    busy={busy}
                    codes={codes}
                    setCodes={setCodes}
                    setModal={setModal}
                    startMfa={startMfa}
                    setNotice={setNotice}
                    setError={setError}
                  />
                )}
              </>
            )
          )}
        </main>
        <footer className="dashboard-footer">
          © {new Date().getFullYear()} {app.organization}
          <span>
            <LockKeyhole size={12} />
            {p("privateSpace")}
          </span>
        </footer>
      </div>
      <AdminDialogs controller={controller} />
    </div>
  );
}
