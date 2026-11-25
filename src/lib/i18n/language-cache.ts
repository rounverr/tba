import type { Language } from "./config";

// One cache per catalog namespace. Failed requests can be retried; concurrent
// requests share the same import and English is always available synchronously.
export function createLanguageCache<Catalog>(
  english: Catalog,
  loaders: Record<Exclude<Language, "en">, () => Promise<{ default: Catalog }>>,
) {
  const catalogs: Partial<Record<Language, Catalog>> & { en: Catalog } = {
    en: english,
  };
  const pending = new Map<Language, Promise<Catalog>>();
  function load(language: Language): Promise<Catalog> {
    const cached = catalogs[language];
    if (cached) return Promise.resolve(cached);
    const existing = pending.get(language);
    if (existing) return existing;
    const request = loaders[language as Exclude<Language, "en">]()
      .then((module) => {
        catalogs[language] = module.default;
        return module.default;
      })
      .finally(() => {
        pending.delete(language);
      });
    pending.set(language, request);
    return request;
  }
  return { catalogs, load, has: (language: Language) => !!catalogs[language] };
}
