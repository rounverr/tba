import { HTTPException } from "hono/http-exception";
import legacy from "../lib/i18n/legacy-labels.json";
import { command, many, one, type Persistence } from "./database/persistence";

const pageSize = 20;
export type ListKind = "users" | "audit" | "registrations";
export async function readBasicList(
  db: Persistence,
  kind: ListKind,
  params: URLSearchParams,
) {
  const raw = params.get("page") || "1";
  const page = Number(raw);
  if (
    !/^[1-9]\d{0,5}$/.test(raw) ||
    !Number.isSafeInteger(page) ||
    page > 100000
  )
    throw new HTTPException(400, { message: "The requested page is invalid." });
  const roleName =
    "CASE WHEN role.id='viewer' AND role.name=? THEN ? ELSE role.name END";
  const resourceRole =
    "CASE WHEN roles.id='viewer' AND roles.name=? THEN ? ELSE roles.name END";
  const queries = {
    users: {
      select: `u.id,u.name,u.email,u.status,u.role_id AS "roleId",
        CASE WHEN u.two_factor_enabled IS NULL THEN NULL
          WHEN u.two_factor_enabled THEN 1 ELSE 0 END AS mfa,
        u.last_access AS "lastAccess",${roleName} AS role`,
      from: '"user" u LEFT JOIN role ON role.id=u.role_id',
      order: "u.rowid DESC",
    },
    audit: {
      select: `a.id,a.actor,a.action,a.resource,a.result,a.created_at,
        u.email,u.name AS actor_name,target.email AS resource_email,
        target.name AS resource_name,${resourceRole} AS resource_role_name`,
      from: `audit a LEFT JOIN "user" u ON u.id=a.actor
        LEFT JOIN "user" target ON target.id=a.resource AND a.action!='role.updated'
        LEFT JOIN role roles ON roles.id=a.resource AND a.action='role.updated'`,
      order: "a.created_at DESC,a.rowid DESC",
    },
    registrations: {
      select: `r.id,r.user_id,r.status,r.created_at,r.resolved_at,r.resolved_by,
        r.role_id,u.email,u.name,${roleName} AS role,resolver.email AS "resolvedBy"`,
      from: `registration r JOIN "user" u ON u.id=r.user_id
        LEFT JOIN role ON role.id=r.role_id
        LEFT JOIN "user" resolver ON resolver.id=r.resolved_by`,
      order: "r.rowid DESC",
    },
  };
  const query = queries[kind];
  const { results } = await many(
    db,
    command(
      `SELECT ${query.select} FROM ${query.from} ORDER BY ${query.order} LIMIT ? OFFSET ?`,
      legacy.historicalViewerName,
      legacy.viewer,
      pageSize + 1,
      (page - 1) * pageSize,
    ),
  );
  const total =
    params.get("summary") === "1"
      ? await one<{ total: number }>(
          db,
          command(`SELECT count(*) AS total FROM ${query.from}`),
        )
      : null;
  const hasMore = results.length > pageSize;
  return {
    rows: results.slice(0, pageSize),
    page,
    pageSize,
    hasMore,
    nextCursor: hasMore ? String(page + 1) : null,
    ...(total ? { total: Number(total.total) } : {}),
  };
}
