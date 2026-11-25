# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> Carregamento de idiomas

<p align="center"><a href="../en/language-loading.md" lang="en">English</a> | <a href="../es/language-loading.md" lang="es">Español</a> | <strong>Português</strong> | <a href="../de/language-loading.md" lang="de">Deutsch</a> | <a href="../fr/language-loading.md" lang="fr">Français</a> | <a href="../it/language-loading.md" lang="it">Italiano</a> | <a href="../zh/language-loading.md" lang="zh">简体中文</a> | <a href="../ja/language-loading.md" lang="ja">日本語</a> | <a href="../hi/language-loading.md" lang="hi">हिन्दी</a> | <a href="../ar/language-loading.md" lang="ar">العربية</a></p>

[Documentação técnica](README.md) | [Visão geral do projeto](../README.pt.md)

> [!NOTE]
> O inglês permanece incluído como fallback. Os outros catálogos de login e painel usam imports dinâmicos e cache em memória por módulo. O foco do teclado ou ponteiro antecipa apenas a opção indicada; abrir o menu não baixa todos os idiomas. A troca ocorre quando os catálogos estão prontos, preservando formulários, sessão e navegação. Idiomas em cache não exigem rede; vale a última escolha. Falhas iniciais mostram inglês; falhas na troca mantêm o idioma atual. E-mails e metadados do build usam catálogos completos apenas no servidor. Consulte a [carga de idiomas](language-loading.md).

O documento começa a carregar o idioma detectado enquanto React carrega, compartilhando o cache com o provider para evitar uma segunda espera na inicialização.

`src/lib/i18n/bootstrap.ts` | `src/lib/i18n/catalog.ts` | `panel.ts` | `language-cache.ts` | `catalog.server.ts` | `src/components/AuthI18n.tsx`

`tests/browser/lazy-languages.mjs` | `PLAYWRIGHT_MODULE` | `BROWSER_EXECUTABLE` | `AUTH_TEST_URL`

```bash
npm run check
npm test
npm run build
npm run worker:check
```
