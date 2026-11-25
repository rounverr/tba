import app from "../config/app.json";
export default function Brand({
  homeLabel,
  organizationLabel,
  showOrganization = false,
}: {
  homeLabel?: string;
  organizationLabel?: string;
  showOrganization?: boolean;
} = {}) {
  return (
    <a
      className="brand"
      href="/login"
      aria-label={homeLabel || `${app.name}, home`}
    >
      <img src={app.logo || "/favicon.svg"} alt="" width={40} height={40} />
      <span>
        {app.name}
        {showOrganization && (
          <span className="brand-sub">
            {organizationLabel || `by ${app.organization}`}
          </span>
        )}
      </span>
    </a>
  );
}
