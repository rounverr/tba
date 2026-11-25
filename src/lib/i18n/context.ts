import { createContext } from "react";
import type { Language } from "./config";
import type { MessageKey } from "./catalog";
export type I18n = {
  language: Language;
  setLanguage: (language: Language) => void;
  preloadLanguage?: (language: Language) => void;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
};
export const I18nContext = createContext<I18n | null>(null);
