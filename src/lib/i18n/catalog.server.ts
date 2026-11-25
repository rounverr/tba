import en from "./messages/en.json";
import es from "./messages/es.json";
import pt from "./messages/pt.json";
import de from "./messages/de.json";
import fr from "./messages/fr.json";
import it from "./messages/it.json";
import zh from "./messages/zh.json";
import ja from "./messages/ja.json";
import hi from "./messages/hi.json";
import ar from "./messages/ar.json";
import type { Language } from "./config";
export type MessageKey = keyof typeof en;
export const messages: Record<Language, Record<MessageKey, string>> = {
  en,
  es,
  pt,
  de,
  fr,
  it,
  zh,
  ja,
  hi,
  ar,
};
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
