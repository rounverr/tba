import type { LucideIcon } from "lucide-react";
import {
  ChevronsLeft,
  ChevronsRight,
  LockKeyhole,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import app from "../../config/app.json";
import { usePanelI18n } from "../../lib/i18n/use-panel";
import { LanguageSelector } from "../AuthI18n";
import Brand from "../Brand";
import ThemeToggle from "../ThemeToggle";
import type { Session } from "./types";
export function AdminSidebar({
  mobile,
  collapsed,
  routeView,
  links,
  can,
  toggleSidebar,
  onSignOut,
}: {
  mobile: boolean;
  collapsed: boolean;
  routeView: string;
  links: {
    path: string;
    label: string;
    icon: LucideIcon;
    permission: string;
  }[];
  can: (permission: string) => boolean | undefined;
  toggleSidebar: () => void;
  onSignOut: () => Promise<void>;
}) {
  const { p, t } = usePanelI18n();
  return (
    <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
      <Brand
        homeLabel={t("brandHome", { app: app.name })}
        showOrganization={false}
      />
      <button
        type="button"
        className="sidebar-toggle icon-button"
        onClick={toggleSidebar}
        aria-label={collapsed ? p("expandMenu") : p("collapseMenu")}
        aria-expanded={!collapsed}
        title={collapsed ? p("expandMenu") : p("collapseMenu")}
      >
        {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
      </button>
      <div className="sidebar-section-label">{p("workspace")}</div>
      <nav>
        {links
          .filter((l) => can(l.permission))
          .map((l) => (
            <a
              className={`nav-link ${routeView === l.path ? "selected" : ""}`}
              href={`/admin${l.path}`}
              key={l.path}
              title={l.label}
              aria-label={l.label}
            >
              <l.icon size={17} />
              <span className="nav-label">{l.label}</span>
            </a>
          ))}
      </nav>
      <div className="sidebar-section-label">{p("yourAccount")}</div>
      <nav>
        <a
          className={`nav-link ${routeView === "/profile" ? "selected" : ""}`}
          href="/admin/profile"
          title={p("myProfile")}
          aria-label={p("myProfile")}
        >
          <UserRound size={17} />
          <span className="nav-label">{p("myProfile")}</span>
        </a>
        <a
          className={`nav-link ${routeView === "/security" ? "selected" : ""}`}
          href="/admin/security"
          title={p("security")}
          aria-label={p("security")}
        >
          <LockKeyhole size={17} />
          <span className="nav-label">{p("security")}</span>
        </a>
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-security">
          <ShieldCheck size={19} />
          <div>
            {p("aSecureSpace")}
            <span>{p("builtOnTrust")}</span>
          </div>
        </div>
        <button
          className="nav-link"
          title={p("signOut")}
          aria-label={p("signOut")}
          onClick={onSignOut}
        >
          <LogOut size={16} />
          <span className="nav-label">{p("signOut")}</span>
        </button>
      </div>
    </aside>
  );
}
export function AdminHeader({
  refreshing,
  routeView,
  view,
  titles,
  mobile,
  setMobile,
  s,
}: {
  refreshing: boolean;
  routeView: string;
  view: string;
  titles: Record<string, string>;
  mobile: boolean;
  setMobile: React.Dispatch<React.SetStateAction<boolean>>;
  s: Session;
}) {
  const { p, t } = usePanelI18n();
  return (
    <header
      className={`dashboard-header ${refreshing && routeView !== view ? "navigation-pending" : ""}`}
    >
      {refreshing && routeView !== view && (
        <span className="sr-only" role="status">
          {p("openingPage", { page: titles[routeView] })}
        </span>
      )}
      <button
        className="icon-button mobile-menu"
        aria-label={p("openMenu")}
        onClick={() => setMobile(!mobile)}
      >
        <Menu size={20} />
      </button>
      <span className="breadcrumb">
        {p("yourSpace")}
        <span>/</span> {titles[view]}
      </span>
      <div className="dashboard-header-right">
        <LanguageSelector />
        <ThemeToggle
          labels={{ light: t("themeLight"), dark: t("themeDark") }}
        />
        <a
          className="user-avatar"
          href="/admin/profile"
          aria-label={p("myProfile")}
        >
          {s?.user.name.slice(0, 1).toUpperCase() || "T"}
        </a>
      </div>
    </header>
  );
}
