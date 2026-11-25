import type { PanelMessage } from "../../lib/i18n/panel";
export type Row = Record<string, string | number | boolean | null | string[]>;
export type Session = {
  user: { id: string; name: string; email: string };
  mfaRequired: boolean;
  permissions: string[];
  isAdmin: boolean;
  mfaEnabled: boolean;
};
export type Role = {
  id: string;
  name: string;
  isAdmin: boolean;
  isPublic: boolean;
  permissions: string[];
};
export type ViewData = Record<string, unknown> & {
  _roles?: { rows: Role[]; permissions: string[] };
};

export type Profile = {
  name: string;
  email: string;
  mfaEnabled: boolean;
  mfaAvailable: boolean;
};
export type PanelAction = (
  path: string,
  body: unknown,
  success?: string,
) => Promise<boolean>;
export type Confirmation = {
  title: PanelMessage;
  description: PanelMessage;
  details?: PanelMessage;
  label: PanelMessage;
  run: () => Promise<unknown>;
};
