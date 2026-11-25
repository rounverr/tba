import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import app from "../config/app.json";
import type { AuthPage } from "../lib/i18n/config";
import { AuthI18n,LanguageSelector,useAuthI18n } from "./AuthI18n";
import Brand from "./Brand";
import ThemeToggle from "./ThemeToggle";
export default function AuthPublic({
  page,
}: {
  page: Exclude<AuthPage, "login">;
}) {
  return (
    <AuthI18n page={page}>
      <PublicContent page={page} />
    </AuthI18n>
  );
}
function PublicContent({ page }: { page: Exclude<AuthPage, "login"> }) {
  const { t } = useAuthI18n();
  useEffect(() => {
    if (page !== "complete") return;
    fetch("/api/session", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = (await response.json()) as { mfaRequired: boolean };
        location.replace(data.mfaRequired ? "/login?mfa=1" : "/admin");
      })
      .catch(() => location.replace("/login?error=access"));
  }, [page]);
  return (
    <div className="auth-public" data-auth-root>
      <header className="auth-header">
        <Brand
          homeLabel={t("brandHome", { app: app.name })}
          organizationLabel={t("brandBy", { organization: app.organization })}
        />
        <div className="header-actions">
          <LanguageSelector />
          <ThemeToggle
            labels={{ light: t("themeLight"), dark: t("themeDark") }}
          />
        </div>
      </header>
      {page === "complete" ? (
        <main className="loading-state" role="status">
          <LoaderCircle size={20} className="spin" />
          {t("completeLoading")}
        </main>
      ) : (
        <main className="error-page">
          <span className="eyebrow">
            {t(page === "denied" ? "deniedKicker" : "notFoundKicker")}
          </span>
          <h1>{t(page === "denied" ? "deniedHeading" : "notFoundHeading")}</h1>
          <p>
            {t(page === "denied" ? "deniedDescription" : "notFoundDescription")}
          </p>
          <a href="/login" className="button button-primary">
            {t("back")}
          </a>
        </main>
      )}
    </div>
  );
}
