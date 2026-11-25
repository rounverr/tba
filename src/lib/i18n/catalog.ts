import en from "./messages/en.json";
import type { Language } from "./config";
import { createLanguageCache } from "./language-cache";
export type MessageKey = keyof typeof en;
const cache = createLanguageCache(en, {
  es: () => import("./messages/es.json"),
  pt: () => import("./messages/pt.json"),
  de: () => import("./messages/de.json"),
  fr: () => import("./messages/fr.json"),
  it: () => import("./messages/it.json"),
  zh: () => import("./messages/zh.json"),
  ja: () => import("./messages/ja.json"),
  hi: () => import("./messages/hi.json"),
  ar: () => import("./messages/ar.json"),
});
export const messages = cache.catalogs;
export const loadAuthLanguage = cache.load;
export const hasAuthLanguage = cache.has;
export function translate(
  language: Language,
  key: MessageKey,
  values: Record<string, string | number> = {},
) {
  const source = messages[language]?.[key] || en[key] || en.errorUnknown;
  return source.replace(/\{(\w+)\}/g, (_, name: string) =>
    String(values[name] ?? ""),
  );
}
export const pageTitleKey = {
  login: "pageTitle",
  complete: "completeTitle",
  denied: "deniedTitle",
  notFound: "notFoundTitle",
} as const;
