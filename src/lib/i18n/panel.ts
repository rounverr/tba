import { createLanguageCache } from "./language-cache";
import legacyLabels from "./legacy-labels.json";
import en from "./panel/en.json";
import sources from "./panel-sources.json";
import type { Language } from "./config";
import { translate } from "./catalog";
export type PanelKey = keyof typeof en;
export type PanelValues = Record<string, string | number>;
export type PanelMessage = string | { key: PanelKey; values: PanelValues };
const cache = createLanguageCache(en, {
  es: () => import("./panel/es.json"),
  pt: () => import("./panel/pt.json"),
  de: () => import("./panel/de.json"),
  fr: () => import("./panel/fr.json"),
  it: () => import("./panel/it.json"),
  zh: () => import("./panel/zh.json"),
  ja: () => import("./panel/ja.json"),
  hi: () => import("./panel/hi.json"),
  ar: () => import("./panel/ar.json"),
});
export const panelMessages = cache.catalogs;
export const loadPanelLanguage = cache.load;
export const hasPanelLanguage = cache.has;
export const panelSourceKeys: Record<string, PanelKey> = sources as Record<
  string,
  PanelKey
>;
export function roleLabel(language: Language, id: unknown, name: unknown) {
  const value = String(name || "");
  const defaults: Record<string, string[]> = {
    administrator: [legacyLabels.administrator, "Administrator"],
    editor: [legacyLabels.editor],
    viewer: [legacyLabels.historicalViewerName, legacyLabels.viewer, "Viewer"],
  };
  if (!defaults[String(id)]?.includes(value)) return value;
  return panelText(
    language,
    String(id) === "viewer"
      ? legacyLabels.viewer
      : String(id) === "administrator"
        ? legacyLabels.administrator
        : legacyLabels.editor,
  );
}
export function panelText(
  language: Language,
  message: PanelMessage,
  input: PanelValues = {},
) {
  const text = typeof message === "string" ? message : message.key;
  const key = (
    Object.hasOwn(en, text)
      ? text
      : Object.hasOwn(panelSourceKeys, text)
        ? panelSourceKeys[text]
        : undefined
  ) as PanelKey | undefined;
  const values = {
    ...input,
    ...(typeof message === "string" ? {} : message.values),
  };
  if (values.roleId && values.role)
    values.role = roleLabel(language, values.roleId, values.role);
  if (values.status) {
    const labels: Record<string, string> = {
      active: legacyLabels.active,
      pending: legacyLabels.pending,
      suspended: legacyLabels.suspended,
      disabled: legacyLabels.disabled,
      approved: legacyLabels.approved,
      rejected: legacyLabels.rejected,
    };
    values.status = labels[values.status]
      ? panelText(language, labels[values.status])
      : values.status;
  }
  if (values.count !== undefined && values.records === undefined)
    values.records = panelText(
      language,
      Number(values.count) === 1
        ? legacyLabels.record
        : legacyLabels.records341,
    );
  const source = key ? panelMessages[language]?.[key] || en[key] : text;
  return source.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = values[name];
    return typeof value === "number"
      ? new Intl.NumberFormat(language).format(value)
      : String(value ?? "");
  });
}
export function panelErrorText(language: Language, text: string) {
  return Object.hasOwn(panelSourceKeys, text) || Object.hasOwn(en, text)
    ? panelText(language, text)
    : translate(language, "errorUnknown");
}
