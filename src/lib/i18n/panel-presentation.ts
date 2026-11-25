import {
  auditAuthor,
  auditResource,
  auditResourceLabels,
} from "../presentation";
import type { Language } from "./config";
import { panelText, roleLabel } from "./panel";
export function panelAuditAuthor(
  language: Language,
  row: Record<string, unknown>,
) {
  const author = auditAuthor(row);
  return {
    name: String(row.actor_name || "").trim()
      ? author.name
      : panelText(language, author.name),
    email: String(row.email || "").trim()
      ? author.email
      : panelText(language, author.email),
  };
}
export function panelAuditResource(
  language: Language,
  row: Record<string, unknown>,
) {
  if (row.action === "role.updated") {
    const name = auditResource(row);
    return row.resource_role_name
      ? roleLabel(language, row.resource, name)
      : panelText(language, name);
  }
  if (row.action === "user.deleted")
    return `${panelText(language, auditResourceLabels["user.deleted"])}: ${String(row.resource || "")}`;
  const label = auditResourceLabels[String(row.action)];
  if (label) {
    const account = row.resource_name || row.resource_email;
    const managed = /^(user\.|registration\.|sessions\.)/.test(
      String(row.action),
    );
    return managed && account && row.actor !== row.resource
      ? `${panelText(language, label)}: ${account}`
      : panelText(language, label);
  }
  return row.action !== "settings.registration" && row.resource_email
    ? String(row.resource_email)
    : panelText(language, auditResource(row));
}
