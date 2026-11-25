import { loadAuthLanguage } from "./catalog";
import {
  defaultLanguage,
  enabledLanguageCodes,
  languageStorageKey,
  resolveLanguage,
  type Language,
} from "./config";

// Start the detected catalog alongside React rather than after hydration.
// The provider shares these promises and remains responsible for committing UI state.
let saved: string | null = null;
try {
  saved = localStorage.getItem(languageStorageKey);
} catch {}
const language = resolveLanguage(
  saved,
  [...(navigator.languages || []), navigator.language],
  enabledLanguageCodes,
  defaultLanguage,
) as Language;
void loadAuthLanguage(language).catch(() => {});
if (document.documentElement.dataset.i18nScope === "panel")
  void import("./panel")
    .then((module) => module.loadPanelLanguage(language))
    .catch(() => {});
