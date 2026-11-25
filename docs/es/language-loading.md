# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> Carga de idiomas

<p align="center"><a href="../en/language-loading.md" lang="en">English</a> | <strong>Español</strong> | <a href="../pt/language-loading.md" lang="pt">Português</a> | <a href="../de/language-loading.md" lang="de">Deutsch</a> | <a href="../fr/language-loading.md" lang="fr">Français</a> | <a href="../it/language-loading.md" lang="it">Italiano</a> | <a href="../zh/language-loading.md" lang="zh">简体中文</a> | <a href="../ja/language-loading.md" lang="ja">日本語</a> | <a href="../hi/language-loading.md" lang="hi">हिन्दी</a> | <a href="../ar/language-loading.md" lang="ar">العربية</a></p>

[Documentación técnica](README.md) | [Presentación del proyecto](../README.es.md)

> [!NOTE]
> El inglés permanece incluido como respaldo. Los demás catálogos de acceso y panel usan importaciones dinámicas y caché en memoria por módulo. El foco de teclado o puntero sobre una opción anticipa su carga; abrir el menú no descarga todos los idiomas. El cambio se aplica cuando sus catálogos están listos y conserva formularios, sesión y navegación. Los cambios en caché no requieren red; prevalece la última selección. Ante un fallo inicial se muestra inglés; durante un cambio se mantiene el idioma actual. El correo y los metadatos del build usan catálogos completos solo en servidor. Consulta la [carga de idiomas](language-loading.md).

El documento inicia la carga del idioma detectado mientras carga React y comparte la caché con el proveedor para evitar una segunda espera al iniciar.

`src/lib/i18n/bootstrap.ts` | `src/lib/i18n/catalog.ts` | `panel.ts` | `language-cache.ts` | `catalog.server.ts` | `src/components/AuthI18n.tsx`

`tests/browser/lazy-languages.mjs` | `PLAYWRIGHT_MODULE` | `BROWSER_EXECUTABLE` | `AUTH_TEST_URL`

```bash
npm run check
npm test
npm run build
npm run worker:check
```
