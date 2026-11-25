import {
  Inbox,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import app from "../../config/app.json";
import { type PanelMessage } from "../../lib/i18n/panel";
import { usePanelI18n } from "../../lib/i18n/use-panel";
import { api, ApiError } from "../../lib/utils";
import { ViewCache } from "../../lib/view-cache";
import { emptyTableFilters, type TableFilters } from "./list-state";
import type { Confirmation, Role, Row, Session, ViewData } from "./types";
import { usePanelHistory } from "./usePanelHistory";
export function useAdminController(initialView: string) {
  const { p, t, language, errorText } = usePanelI18n();
  const links = [
    {
      path: "",
      label: p("overview"),
      icon: LayoutDashboard,
      permission: "app.read",
    },
    {
      path: "/users",
      label: p("users"),
      icon: Users,
      permission: "users.read",
    },
    {
      path: "/registrations",
      label: p("requests"),
      icon: Inbox,
      permission: "users.read",
    },
    {
      path: "/roles",
      label: p("rolesAndPermissions"),
      icon: ShieldCheck,
      permission: "users.read",
    },
    {
      path: "/audit",
      label: p("auditLog"),
      icon: ScrollText,
      permission: "audit.read",
    },
    {
      path: "/settings",
      label: p("accessAndRegistration"),
      icon: Settings,
      permission: "settings.manage",
    },
  ];
  let dateFormatter: Intl.DateTimeFormat | undefined;
  const date = (v: unknown) => {
    if (!v) return p("noDate");
    // Reuse within this render, while retaining the browser's current time zone.
    dateFormatter ??= new Intl.DateTimeFormat(language, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    return dateFormatter.format(new Date(Number(v)));
  };
  const labels: Record<string, string> = {
    active: p("active"),
    pending: p("pending"),
    suspended: p("suspended"),
    disabled: p("disabled"),
    approved: p("approved"),
    rejected: p("rejected"),
    closed: p("closed"),
    approval: p("approvalRequired"),
    open: p("open"),
  };

  const [view, setView] = useState(initialView);
  const [routeView, setRouteView] = useState(initialView);
  const [contentAllowed, setContentAllowed] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const panelElement = useRef<HTMLDivElement>(null);
  const cache = useRef(new ViewCache<ViewData>());
  const rolesFreshUntil = useRef(0);
  const hasContent = useRef(false);
  const accessSignature = useRef("");
  const sessionRefresh = useRef<Promise<void> | null>(null);
  const sessionGeneration = useRef(0);
  const lastAuthorizationRefresh = useRef<Session | null>(null);

  const [s, setS] = useState<Session | null>(null);
  const [data, setData] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<PanelMessage>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const navigationState = useRef({ view, busy });
  navigationState.current = { view: routeView, busy };
  const [filters, setFilters] = useState<TableFilters>(emptyTableFilters);

  const summaries = useRef(
    new ViewCache<{ total: number; pageSize: number }>(),
  );
  const [tableSummary, setTableSummary] = useState<{
    total: number;
    pageSize: number;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const request = useRef<AbortController | null>(null);
  const requestId = useRef(0);

  const [stats, setStats] = useState<Record<string, number | null>>({});
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    mfaEnabled: boolean;
    mfaAvailable: boolean;
  }>();
  const [mode, setMode] = useState("closed");
  const [publicRole, setPublicRole] = useState("");
  const [registrationRoles, setRegistrationRoles] = useState<Role[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [modal, setModal] = useState<
    | "user"
    | "role"
    | "edit"
    | "mfa"
    | "mfaEmail"
    | "disable"
    | "backup"
    | "revoke"
    | "email"
    | null
  >(null);
  const [collapsed, setCollapsed] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailMfaCode, setEmailMfaCode] = useState("");
  const [emailMfaMethod, setEmailMfaMethod] = useState<"totp" | "recovery">(
    "totp",
  );
  const [emailNeedsMfa, setEmailNeedsMfa] = useState(false);
  const [emailStep, setEmailStep] = useState<
    "request" | "verify" | "mfa" | "done"
  >("request");
  const [roleId, setRoleId] = useState("");
  const [reauthRequired, setReauthRequired] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [permissionList, setPermissionList] = useState<string[]>([]);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [enroll, setEnroll] = useState<{
    totpURI: string;
    backupCodes: string[];
  }>();
  const [qr, setQr] = useState("");
  const [enrollmentCode, setEnrollmentCode] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [mobile, setMobile] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const titles: Record<string, string> = {
    "": p("overview"),
    "/users": p("users"),
    "/roles": p("rolesAndPermissions"),
    "/registrations": p("accessRequests"),
    "/audit": p("auditLog"),
    "/settings": p("accessAndRegistration"),
    "/profile": p("myProfile"),
    "/security": p("security"),
  };
  function navigate(next: string) {
    request.current?.abort();
    ++requestId.current;
    setRouteView(next);
    setFilters(emptyTableFilters);

    setNextCursor(null);
    setError("");
    setNotice("");
    setReauthRequired(false);
    setModal(null);
    setConfirmation(null);
    setEnroll(undefined);
    setQr("");
    setCodes([]);
    setNewEmail("");
    setEmailCode("");
    setEmailMfaCode("");
    setMobile(false);
    window.scrollTo({ top: 0 });
  }
  usePanelHistory(navigationState, navigate, titles);
  useEffect(() => {
    document.title = `${titles[view]} · ${app.name}`;
  }, [view, language]);
  useEffect(() => {
    setCollapsed(localStorage.getItem("tba-sidebar-collapsed") === "true");
  }, []);
  function toggleSidebar() {
    setCollapsed((value) => {
      localStorage.setItem("tba-sidebar-collapsed", String(!value));
      return !value;
    });
  }
  function clearCaches() {
    cache.current.clear();
    summaries.current.clear();
  }
  function discardPrivateState() {
    request.current?.abort();
    request.current = null;
    ++requestId.current;
    clearCaches();
    rolesFreshUntil.current = 0;
    accessSignature.current = "";
    ++sessionGeneration.current;
    sessionRefresh.current = null;
    lastAuthorizationRefresh.current = null;

    hasContent.current = false;
    setS(null);
    setData([]);
    setTableSummary(null);
    setNextCursor(null);
    setStats({});
    setProfile(undefined);
    setRoles([]);
    setPermissionList([]);
    setRolePermissions([]);
    setRegistrationRoles([]);
    setCodes([]);
    setSelected(null);
    setModal(null);
    setConfirmation(null);
    setEnroll(undefined);
    setQr("");
    setNewEmail("");
    setEmailCode("");
    setEmailMfaCode("");
    setEnrollmentCode("");
    setContentAllowed(false);
    setRedirecting(false);
    setLoading(false);
    setRefreshing(false);
    setBusy(false);
  }
  function handleError(error: unknown) {
    setError((error as Error).message);
    if (error instanceof ApiError && [401, 403].includes(error.status)) {
      clearCaches();
      rolesFreshUntil.current = 0;
      if (error.status === 401 || error.code === "MFA_REQUIRED") {
        discardPrivateState();
        setRedirecting(true);
        location.replace(error.status === 401 ? "/login/" : "/login/?mfa=1");
        return;
      }
    }
    if (error instanceof ApiError && error.code === "RECENT_AUTH_REQUIRED") {
      setReauthRequired(true);
      setModal(null);
      setEnroll(undefined);
      setQr("");
      setNewEmail("");
      setEmailCode("");
      setEmailMfaCode("");
    }
  }
  function closeModal() {
    if (busy) return;
    if (modal === "email" && emailStep === "done") {
      location.assign("/login/");
      return;
    }
    setModal(null);
    setEnroll(undefined);
    setEnrollmentCode("");
    setQr("");
    setEmailCode("");
    setEmailMfaCode("");
    setEmailMfaMethod("totp");
    setNewEmail("");
  }
  const isTable = ["/users", "/audit", "/registrations"].includes(view);

  function endpoint(target: string) {
    if (["/users", "/audit", "/registrations"].includes(target))
      return `/private${target}?page=${filters.page}`;
    return target === ""
      ? "/private/dashboard"
      : ["/profile", "/security"].includes(target)
        ? "/private/profile"
        : `/private${target}`;
  }
  function display(target: string, result: ViewData, expiresAt: number) {
    setView(target);
    setContentAllowed(true);
    setRedirecting(false);
    hasContent.current = true;
    const table = ["/users", "/audit", "/registrations"].includes(target);
    setData(table ? (result.rows as Row[]) : []);
    setTableSummary(
      table && typeof result.total === "number"
        ? { total: result.total, pageSize: Number(result.pageSize) || 20 }
        : null,
    );
    setCurrentPage(table ? Number(result.page) || Number(filters.page) : 1);
    setNextCursor(
      table && result.hasMore ? (result.nextCursor as string) : null,
    );
    setStats(target === "" ? (result as Record<string, number | null>) : {});
    setProfile(
      ["/profile", "/security"].includes(target)
        ? {
            name: String(result.name),
            email: String(result.email),
            mfaEnabled: result.mfaEnabled === true,
            mfaAvailable: result.mfaAvailable === true,
          }
        : undefined,
    );
    if (target === "/settings") {
      setMode(result.mode as string);
      setPublicRole((result.publicRoleId as string) || "");
      setRegistrationRoles((result.registrationRoles as Role[]) || []);
      setConfirmed(false);
    }
    const metadata =
      target === "/roles"
        ? (result as unknown as { rows: Role[]; permissions: string[] })
        : result._roles;
    if (metadata) {
      setRoles(metadata.rows);
      setPermissionList(metadata.permissions);
      rolesFreshUntil.current = expiresAt;
    }
  }
  function applyContext(context: Session, invalidateViews = false) {
    const signature = JSON.stringify(context);
    const changed =
      !!accessSignature.current && accessSignature.current !== signature;
    if (changed || invalidateViews) {
      clearCaches();
      rolesFreshUntil.current = 0;
      setRoles([]);
      setPermissionList([]);
    }
    accessSignature.current = signature;
    setS(context);
    return { signature, changed };
  }
  function refreshAuthorization() {
    if (sessionRefresh.current) return sessionRefresh.current;
    const generation = sessionGeneration.current;
    if (request.current) {
      request.current.abort();
      request.current = null;
      ++requestId.current;
      setRefreshing(false);
    }
    const refresh = api<Session>("/session")
      .then((context) => {
        if (generation !== sessionGeneration.current)
          throw new DOMException("Session context was cleared", "AbortError");
        if (s?.user.id !== context.user.id)
          throw new ApiError("Sign in to continue.", 401);
        if (context.mfaRequired)
          throw new ApiError(
            "Complete two-step verification.",
            403,
            "MFA_REQUIRED",
          );
        applyContext(context, true);
        lastAuthorizationRefresh.current = context;
      })
      .finally(() => {
        if (sessionRefresh.current === refresh) sessionRefresh.current = null;
      });
    sessionRefresh.current = refresh;
    return refresh;
  }
  async function authorizedAction(path: string, body: unknown) {
    const generation = sessionGeneration.current;
    const previousRefresh = lastAuthorizationRefresh.current;
    const actorId = s?.user.id;
    const attempt = () => api(path, body, undefined, undefined, true);
    try {
      return await attempt();
    } catch (error) {
      if (!(
        error instanceof ApiError &&
        error.status === 409 &&
        error.code === "authorization_changed"
      ))
        throw error;
      if (generation !== sessionGeneration.current)
        throw new DOMException("Session context was cleared", "AbortError");
      if (previousRefresh === lastAuthorizationRefresh.current)
        await refreshAuthorization();
      if (
        generation !== sessionGeneration.current ||
        actorId !== lastAuthorizationRefresh.current?.user.id
      )
        throw new DOMException("Session context was cleared", "AbortError");
      return attempt();
    }
  }
  async function load(force = false) {
    const target = routeView;
    const id = ++requestId.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError("");
    if (!hasContent.current) setLoading(true);
    else setRefreshing(true);
    try {
      if (sessionRefresh.current) await sessionRefresh.current;
      if (controller.signal.aborted) return;
      const key = endpoint(target);
      const table = ["/users", "/audit", "/registrations"].includes(target);
      const summaryParams = new URLSearchParams(key.split("?")[1] || "");
      summaryParams.delete("cursor");
      summaryParams.delete("page");
      const summaryKey = key.split("?")[0] + "?" + summaryParams;
      const summary = force ? undefined : summaries.current.get(summaryKey);
      const cached = force ? undefined : cache.current.get(key);
      if (cached && (!table || summary || cached.value.total === undefined)) {
        display(
          target,
          { ...cached.value, ...summary?.value },
          cached.expiresAt,
        );
        return;
      }
      const params = new URLSearchParams(key.split("?")[1] || "");
      params.set("context", "1");
      if (table && !summary) params.set("summary", "1");
      if (force) params.delete("cursor");
      if (
        ["/users", "/registrations"].includes(target) &&
        rolesFreshUntil.current <= Date.now()
      )
        params.set("includeRoles", "1");
      const { _context: context, ...result } = await api<
        ViewData & { _context: Session }
      >(`${key.split("?")[0]}?${params}`, undefined, controller.signal);
      if (id !== requestId.current) return;
      if (!context) throw new Error(p("weCouldNotLoadYourAccessInformation"));
      const { signature, changed: contextChanged } = applyContext(context);
      if (table) {
        if (typeof result.total === "number")
          summaries.current.set(
            summaryKey,
            { total: result.total, pageSize: Number(result.pageSize) },
            signature,
          );
        else if (summary && !contextChanged)
          Object.assign(result, summary.value);
      }
      cache.current.set(key, result, signature);
      if (result._roles)
        cache.current.set("/private/roles", result._roles, signature);
      display(target, result, Date.now() + 30000);
    } catch (error) {
      if (controller.signal.aborted || id !== requestId.current) return;
      clearCaches();
      hasContent.current = false;
      setView(target);
      setContentAllowed(false);
      setData([]);
      setTableSummary(null);
      setNextCursor(null);
      setStats({});
      setProfile(undefined);
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        setS(null);
        setRoles([]);
        rolesFreshUntil.current = 0;
      }
      handleError(error);
    } finally {
      if (id === requestId.current) {
        request.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }
  useEffect(() => {
    load();
    return () => request.current?.abort();
  }, [routeView, filters]);
  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      discardPrivateState();
      load(true);
    };
    const hideForHistory = (event: PageTransitionEvent) => {
      if (!event.persisted) return;

      clearCaches();
      const panel = panelElement.current;
      if (panel) {
        panel.style.visibility = "hidden";
        panel
          .querySelectorAll<HTMLDialogElement>("dialog[open]")
          .forEach((dialog) => dialog.close());
      }
    };
    window.addEventListener("pageshow", restore);
    window.addEventListener("pagehide", hideForHistory);
    return () => {
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("pagehide", hideForHistory);
    };
  }, [routeView, filters]);
  useEffect(() => {
    if (s && contentAllowed && !redirecting)
      panelElement.current?.style.removeProperty("visibility");
  }, [s, contentAllowed, redirecting]);

  async function action(path: string, body: unknown, success = "changesSaved") {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await authorizedAction(path, body);
      clearCaches();
      rolesFreshUntil.current = 0;
      setModal(null);
      setNotice(success);
      await load(true);
      return true;
    } catch (e) {
      if (
        path === "/private/security/confirm" &&
        e instanceof ApiError &&
        e.code === "MFA_ENROLL_CONFIRMATION_REQUIRED"
      )
        await startMfa();
      else handleError(e);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const can = (permission: string) =>
    s?.isAdmin || s?.permissions.includes(permission);
  async function startMfa() {
    setBusy(true);
    setError("");
    setCodes([]);
    setReauthRequired(false);
    try {
      // A failed renderer download must not start an enrollment on the server.
      const { default: QRCode } = await import("qrcode");
      const d = await api<{ totpURI: string; backupCodes: string[] }>(
        "/private/security/enroll",
        {},
      );
      setEnroll(d);
      setQr(await QRCode.toDataURL(d.totpURI, { width: 220, margin: 1 }));
      setModal("mfa");
    } catch (e) {
      if (
        e instanceof ApiError &&
        e.code === "MFA_ENROLL_CONFIRMATION_REQUIRED"
      ) {
        try {
          await api("/private/security/enroll/email", {}, undefined, language);
          setEnrollmentCode("");
          setModal("mfaEmail");
        } catch (error) {
          handleError(error);
        }
      } else handleError(e);
    } finally {
      setBusy(false);
    }
  }
  async function formSubmit(
    e: SubmitEvent<HTMLFormElement>,
    fn: (f: FormData) => Promise<unknown>,
  ) {
    e.preventDefault();
    await fn(new FormData(e.currentTarget));
  }
  // The confirmed email change revokes sessions. Preserve its public receipt
  // outside the protected panel so the user can continue with the new address.

  return {
    p,
    t,
    language,
    errorText,
    links,
    dateFormatter,
    date,
    labels,
    view,
    setView,
    routeView,
    setRouteView,
    contentAllowed,
    setContentAllowed,
    redirecting,
    setRedirecting,
    panelElement,
    cache,
    rolesFreshUntil,
    hasContent,
    accessSignature,
    s,
    setS,
    data,
    setData,
    roles,
    setRoles,
    error,
    setError,
    notice,
    setNotice,
    loading,
    setLoading,
    busy,
    setBusy,
    navigationState,
    filters,
    setFilters,
    summaries,
    tableSummary,
    setTableSummary,
    currentPage,
    setCurrentPage,
    nextCursor,
    setNextCursor,
    refreshing,
    setRefreshing,
    request,
    requestId,
    stats,
    setStats,
    profile,
    setProfile,
    mode,
    setMode,
    publicRole,
    setPublicRole,
    registrationRoles,
    setRegistrationRoles,
    confirmed,
    setConfirmed,
    modal,
    setModal,
    collapsed,
    setCollapsed,
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
    setRoleId,
    reauthRequired,
    setReauthRequired,
    selected,
    setSelected,
    permissionList,
    setPermissionList,
    rolePermissions,
    setRolePermissions,
    enroll,
    setEnroll,
    qr,
    setQr,
    enrollmentCode,
    setEnrollmentCode,
    codes,
    setCodes,
    mobile,
    setMobile,
    confirmation,
    setConfirmation,
    titles,
    navigate,
    toggleSidebar,
    clearCaches,
    discardPrivateState,
    handleError,
    closeModal,
    isTable,
    endpoint,
    display,
    load,
    action,
    can,
    startMfa,
    formSubmit,
  };
}
export type AdminController = ReturnType<typeof useAdminController>;
