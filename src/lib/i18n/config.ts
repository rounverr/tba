import registry from "../../config/languages.json";
import app from "../../config/app.json";
export type Language = keyof typeof registry;
export const languages = Object.entries(registry).map(([code, item]) => ({
  code: code as Language,
  name: item.name,
  dir: item.dir as "ltr" | "rtl",
}));
export const languageCodes = languages.map((language) => language.code);
export function configuredLanguageCodes(value: unknown): Language[] {
  return languageCodes.filter(
    (code) => code === "en" || !Array.isArray(value) || value.includes(code),
  );
}
export const enabledLanguageCodes = configuredLanguageCodes(app.languages);
export const enabledLanguages = languages.filter((item) =>
  enabledLanguageCodes.includes(item.code),
);
export const defaultLanguage: Language = enabledLanguageCodes.includes(
  app.locale as Language,
)
  ? (app.locale as Language)
  : "en";
export const languageStorageKey = "tba-language";
// Self-contained so the same resolver can run synchronously in the document head.
export function resolveLanguage(
  saved: string | null,
  preferred: readonly string[],
  supported: readonly string[],
  fallback = "en",
): string {
  const match = (value: string) => {
    const code = value.trim().toLowerCase().replace(/_/g, "-").split("-")[0];
    return supported.includes(code) ? code : undefined;
  };
  if (saved) {
    const selected = match(saved);
    if (selected) return selected;
  }
  for (const candidate of preferred) {
    const selected = match(candidate);
    if (selected) return selected;
  }
  return supported.includes(fallback) ? fallback : "en";
}
export const languageDirection = (code: Language) =>
  code === "ar" ? "rtl" : "ltr";
export type AuthPage = "login" | "complete" | "denied" | "notFound";
