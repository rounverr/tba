# <picture><img src="../assets/icons/layers.svg" width="28" height="28" alt=""></picture> Template scope

<p align="center"><strong>English</strong> | <a href="../es/template-scope.md" lang="es">Español</a> | <a href="../pt/template-scope.md" lang="pt">Português</a> | <a href="../de/template-scope.md" lang="de">Deutsch</a> | <a href="../fr/template-scope.md" lang="fr">Français</a> | <a href="../it/template-scope.md" lang="it">Italiano</a> | <a href="../zh/template-scope.md" lang="zh">简体中文</a> | <a href="../ja/template-scope.md" lang="ja">日本語</a> | <a href="../hi/template-scope.md" lang="hi">हिन्दी</a> | <a href="../ar/template-scope.md" lang="ar">العربية</a></p>

[Technical documentation](README.md) | [Project overview](../../README.md)

TBA uses Cloudflare Workers with D1 by default. The same frontend and Hono API also run on Node.js with SQLite or PostgreSQL. [Database engines](database-engines.md)

The base template includes email OTP, optional Google login, TOTP MFA and recovery, trusted devices, sessions, roles and permissions, profiles, email changes, basic account management, registration requests, audit records and a dashboard. Login and administration support ten languages and light/dark themes.

> [!NOTE]
> Basic management lists and bounded page navigation are included, as are the database tables, constraints and generic migrations required for identity, audit and dashboard. Advanced search, filters, sorting engines, advanced pagination and Excel/XLSX export are outside the base distribution. Each project may add them for its own data model and permissions. The local `.txt` download of MFA recovery codes remains part of account security.

Each application owns its Worker, database, users, secrets, domains and mail configuration. No business profiles, organizations, billing or tenant data are created by default. Reuse the registration hook for project-specific integration. Software reuse follows the [MIT license](../../LICENSE); preserve applicable notices and [font licenses](../licenses/README.md#en). Corporate trademarks are covered separately by [TRADEMARKS](../../TRADEMARKS.md).
