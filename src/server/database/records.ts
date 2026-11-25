import { command, many, one, type Persistence } from "./persistence";

type RoleRow = {
  id: string;
  name: string;
  isAdmin: boolean | number;
  isPublic: boolean | number;
  permissions: string[] | string;
};
const fields =
  'id,name,is_admin AS "isAdmin",is_public AS "isPublic",permissions';
function role(row: RoleRow) {
  return {
    ...row,
    isAdmin: !!row.isAdmin,
    isPublic: !!row.isPublic,
    permissions:
      typeof row.permissions === "string"
        ? (JSON.parse(row.permissions) as string[])
        : row.permissions,
  };
}
export async function findRole(db: Persistence, id: string) {
  const row = await one<RoleRow>(
    db,
    command(`SELECT ${fields} FROM role WHERE id=?`, id),
  );
  return row && role(row);
}
export async function listRoles(db: Persistence) {
  const { results } = await many<RoleRow>(
    db,
    command(`SELECT ${fields} FROM role`),
  );
  return results.map(role);
}

export async function readSettings(db: Persistence) {
  return (await one<{
    id: number;
    mode: string;
    publicRoleId: string | null;
    updatedAt: number | null;
    updatedBy: string | null;
  }>(
    db,
    command(
      'SELECT id,mode,public_role_id AS "publicRoleId",updated_at AS "updatedAt",updated_by AS "updatedBy" FROM "settings" LIMIT 1',
    ),
  ))!;
}
