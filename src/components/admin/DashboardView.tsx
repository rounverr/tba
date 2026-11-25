import {
  ArrowUpRight,
  Inbox,
  ScrollText,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import app from "../../config/app.json";
import { usePanelI18n } from "../../lib/i18n/use-panel";
import type { Session } from "./types";
export default function DashboardView({
  s,
  stats,
}: {
  s: Session;
  stats: Record<string, number | null>;
}) {
  const { p, language } = usePanelI18n();
  return (
    <>
      <div className="welcome-card">
        <div>
          <span className="eyebrow">{p("oneSignInManyPossibilities")}</span>
          <h2>
            {p("whatMatters")}
            <br />
            {p("startsWithYou")}
          </h2>
          <p>{p("yourAccountSecurityAndTeamAllConnected")}</p>
          <a href="/admin/security" className="button button-outline">
            {p("reviewMySecurity")}
            <ArrowUpRight className="directional-icon" size={16} />
          </a>
        </div>
        <img src={app.heroImage} alt="" />
      </div>
      {s.isAdmin && (
        <div className="stats-grid">
          {[
            [p("activeUsers"), stats.users, Users],
            [p("pendingRequests"), stats.pending, Inbox],
            [p("eventsInTheLast24Hours"), stats.events, ScrollText],
          ].map(([label, value, Icon], i) => {
            const I = Icon as typeof Users;
            return (
              <a
                href={
                  ["/admin/users", "/admin/registrations", "/admin/audit"][i]
                }
                className="stat-card"
                key={String(label)}
              >
                <div>
                  <span>{String(label)}</span>
                  <I size={18} />
                </div>
                <strong>
                  {typeof value === "number"
                    ? value.toLocaleString(language)
                    : "-"}
                </strong>
                <small>
                  {p("viewDetails")}
                  <ArrowUpRight className="directional-icon" size={12} />
                </small>
              </a>
            );
          })}
        </div>
      )}
      <div className="two-columns">
        <a className="panel quick-card" href="/admin/profile">
          <UserRound size={23} />
          <div>
            <h3>{p("yourProfileYourWay")}</h3>
            <p>{p("keepYourInformationUpToDate")}</p>
          </div>
          <ArrowUpRight className="directional-icon" size={17} />
        </a>
        <a className="panel quick-card" href="/admin/security">
          <ShieldCheck size={23} />
          <div>
            <h3>
              {s.mfaEnabled
                ? p("yourSecondFactorIsActive")
                : p("makeYourAccountMoreSecure")}
            </h3>
            <p>
              {s.mfaEnabled
                ? p("yourAccessHasAnExtraLayerOf")
                : p("enableTwoStepVerification")}
            </p>
          </div>
          <ArrowUpRight className="directional-icon" size={17} />
        </a>
      </div>
    </>
  );
}
