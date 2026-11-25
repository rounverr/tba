import { api } from "../lib/utils";
import {
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  enabledLanguages as languages,
  enabledLanguageCodes as languageCodes,
  defaultLanguage,
  languageDirection,
  languageStorageKey,
  resolveLanguage,
  type Language,
  type AuthPage,
} from "../lib/i18n/config";
import { translate, pageTitleKey, loadAuthLanguage } from "../lib/i18n/catalog";
import { Languages } from "lucide-react";
import app from "../config/app.json";
import Select from "./ui/select";
import { I18nContext as Context } from "../lib/i18n/context";
export function AuthI18n({
  children,
  page = "login",
}: {
  children: ReactNode;
  page?: AuthPage | "panel";
}) {
  const [language, update] = useState<Language>("en"),
    [ready, setReady] = useState(false);
  const generation = useRef(0);
  const prepared = useRef(new Set<Language>(["en"]));
  async function prepare(next: Language) {
    await Promise.all([
      loadAuthLanguage(next),
      page === "panel"
        ? import("../lib/i18n/panel").then((module) =>
            module.loadPanelLanguage(next),
          )
        : Promise.resolve(),
    ]);
    prepared.current.add(next);
  }
  useLayoutEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(languageStorageKey);
    } catch {}
    const next = resolveLanguage(
      saved,
      [...(navigator.languages || []), navigator.language],
      languageCodes,
      defaultLanguage,
    ) as Language;
    const id = ++generation.current;
    const show = (value: Language) => {
      if (generation.current !== id) return;
      update(value);
      setReady(true);
    };
    if (prepared.current.has(next)) show(next);
    else
      void prepare(next).then(
        () => show(next),
        () => show("en"),
      );
    return () => {
      ++generation.current;
    };
  }, []);
  useLayoutEffect(() => {
    if (!ready) return;
    const html = document.documentElement;
    html.lang = language;
    html.dir = languageDirection(language);
    html.dataset.authLocale = language;
    if (page !== "panel") {
      document.title = `${translate(language, pageTitleKey[page])} · ${app.name}`;
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute(
          "content",
          `${app.name} · ${translate(language, "metaDescription")}`,
        );
    }
    delete html.dataset.authPending;
  }, [language, ready, page]);
  function setLanguage(next: Language) {
    if (!languageCodes.includes(next)) return;
    const id = ++generation.current;
    const commit = () => {
      if (generation.current !== id) return;
      try {
        localStorage.setItem(languageStorageKey, next);
      } catch {}
      update(next);
      if (page === "panel" && next !== language)
        void api(
          "/private/profile/language",
          { language: next },
          undefined,
          next,
        ).catch(() => {});
    };
    // Commit only complete catalogs. Pending or failed imports leave the current
    // interface and every form mounted, and stale selections cannot win a race.
    if (prepared.current.has(next)) commit();
    else void prepare(next).then(commit, () => {});
  }
  function preloadLanguage(next: Language) {
    if (languageCodes.includes(next) && !prepared.current.has(next))
      void prepare(next).catch(() => {});
  }
  return (
    <Context.Provider
      value={{
        language,
        setLanguage,
        preloadLanguage,
        t: (key, values) => translate(language, key, values),
      }}
    >
      {page === "panel" && !ready ? null : children}
    </Context.Provider>
  );
}
export function useAuthI18n() {
  const context = useContext(Context);
  if (!context) throw new Error("AuthI18n provider is required");
  return context;
}
export function LanguageSelector() {
  const { language, setLanguage, preloadLanguage, t } = useAuthI18n();
  const current = languages.find((item) => item.code === language)!;
  return (
    <Select
      className="language-select"
      aria-label={`${t("languageLabel")}: ${current.name}`}
      title={`${t("languageLabel")}: ${current.name}`}
      triggerContent={<Languages size={19} aria-hidden="true" />}
      popupHeading={
        <>
          <span>{t("languageLabel")}</span>
          <bdi lang={language} dir={current.dir}>
            {current.name}
          </bdi>
        </>
      }
      onOptionIntent={(value) => preloadLanguage?.(value as Language)}
      popupWidth={250}
      popupMaxHeight={500}
      value={language}
      onChange={(event) => setLanguage(event.target.value as Language)}
    >
      {languages.map((item) => (
        <option
          key={item.code}
          value={item.code}
          lang={item.code}
          dir={item.dir}
        >
          {item.name}
        </option>
      ))}
    </Select>
  );
}
