# <picture><img src="../assets/icons/check.svg" width="28" height="28" alt=""></picture> Validation checklist

<p align="center"><strong>English</strong> | <a href="../es/validation.md" lang="es">Español</a> | <a href="../pt/validation.md" lang="pt">Português</a> | <a href="../de/validation.md" lang="de">Deutsch</a> | <a href="../fr/validation.md" lang="fr">Français</a> | <a href="../it/validation.md" lang="it">Italiano</a> | <a href="../zh/validation.md" lang="zh">简体中文</a> | <a href="../ja/validation.md" lang="ja">日本語</a> | <a href="../hi/validation.md" lang="hi">हिन्दी</a> | <a href="../ar/validation.md" lang="ar">العربية</a></p>

[Technical documentation](README.md) | [Project overview](../../README.md)

Check the [engine setup](database-engines.md). Use separate copies for D1, SQLite, PostgreSQL 17 and PostgreSQL 18. Run `npm ls`, `npm audit`, `npm audit --omit=dev` and the engine suites. Run `test:integration:postgresql` with `TBA_TEST_DATABASE_URL` pointing to an isolated loopback database. Run `test:integration:sqlite` for SQLite. Scan the source tree and build artifacts with Gitleaks or an equivalent scanner.

For real OTP and HTTP counting, start the local runtime and mailbox, then run `node tests/browser/node-panel.mjs` with `AUTH_TEST_URL` and the synthetic administrator in `TBA_TEST_EMAIL`. The default idle interval is 601 seconds. Use `TBA_CHROMIUM_CDP` with an isolated headed Chromium session to verify real window transitions. The other browser scripts can use mocked data.

1. Install dependencies with `npm ci`.
2. Run the frontend and backend type checks with `npm run check`.
3. Run unit and integration tests with `npm test`.
4. Build production assets with `npm run build`.
5. Validate Worker packaging with `npm run worker:check`.
6. Manually test email OTP, optional Google login, MFA enrollment and recovery, trusted devices, session revocation, user roles and permissions, registration modes and denial of unauthorized access.
7. Verify login and the admin panel in all ten languages, including Arabic RTL. Confirm that changing language does not reload the page or reset forms.
8. Check desktop and mobile layout, keyboard navigation, screen reader behavior and security headers.
9. Before any explicitly authorized promotion, review secrets, migration requirements, environment-specific settings, documentation links and the selected file diff. Publication is manual; CI and Workers Builds are not mandatory.

Run this checklist on the actual reusable package, not only a development checkout with extensions. Verify basic lists, audit and dashboard without advanced search/filter/sort controls or XLSX imports. With an authorized session, excluded `/api/private/export/*` routes must return 404. Preserve the MFA recovery `.txt` download. 


Browser scripts in `tests/browser/*.mjs` are optional manual checks and are not run by `npm test`. Supply an existing Playwright installation (`PLAYWRIGHT_MODULE`), a Chromium executable (`BROWSER_EXECUTABLE`) and a local built site (`AUTH_TEST_URL`) with a 404-page fallback. Auth/panel checks use all ten enabled languages. `enabled-languages.mjs` requires a separate fixture built after `npm run setup -- --languages en,pt --locale en`. For `mail-preview.mjs`, generate HTML fixtures first with `MAIL_PREVIEW_DIR` when running `tests/mail-template.test.ts`. Use a fixed copy of `dist`: asset tests rebuild it. Run the integration suites for authentication and storage on each engine.

Run `node tests/browser/panel-idle.mjs` against the built site to measure ten minutes of idle basic pagination and check BFCache revalidation.

English stays bundled as the fallback. Other access and panel catalogs use dynamic imports and an in-memory cache per namespace. Pointer or keyboard focus on a language option starts loading that option; opening the menu does not fetch all languages. A change commits only when its catalogs are ready, keeping forms, session and navigation mounted. Cached changes need no network; the last selection wins. An initial loading failure reveals English; a failure during a change preserves the current language. Transactional email and build-time metadata use complete server-only catalogs, independent of the browser cache. See [language loading](language-loading.md).

> [!NOTE]
> Windows installation and junctions, the external Google OAuth callback, live Resend delivery and an independent penetration test still require validation.
