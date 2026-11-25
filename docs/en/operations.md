# <picture><img src="../assets/icons/settings.svg" width="28" height="28" alt=""></picture> Configuration and Operations

<p align="center"><strong>English</strong> | <a href="../es/operations.md" lang="es">Español</a> | <a href="../pt/operations.md" lang="pt">Português</a> | <a href="../de/operations.md" lang="de">Deutsch</a> | <a href="../fr/operations.md" lang="fr">Français</a> | <a href="../it/operations.md" lang="it">Italiano</a> | <a href="../zh/operations.md" lang="zh">简体中文</a> | <a href="../ja/operations.md" lang="ja">日本語</a> | <a href="../hi/operations.md" lang="hi">हिन्दी</a> | <a href="../ar/operations.md" lang="ar">العربية</a></p>

[Technical documentation](README.md) | [Project overview](../../README.md)

TBA uses Cloudflare Workers with D1 by default. The same frontend and Hono API also run on Node.js with SQLite or PostgreSQL. [Database engines](database-engines.md)

Use `db:migrate:local`, `admin:bootstrap` and `npm start` in the selected installation. D1 and SQLite default to local storage. PostgreSQL requires `--target` for migrations and bootstrap. Keep a consistent backup before migrating. Restore SQLite with the application stopped and PostgreSQL with an authorized database owner. See the [engine guide](database-engines.md) for details.

## Initialization

English is the base language of the code and setup assistant. All ten translations and local fonts are included. Use `npm run setup -- --languages en,pt` to enable only English and Portuguese, without installing extra packages or deleting the other translations. Omitting `--languages` preserves the current selection, or enables all ten in a configuration without a language list. English always remains enabled as the translation fallback. `--locale en` sets the application default; any enabled language is accepted. The interface prioritizes the saved preference, then a supported browser language, then the configured default. Switching languages does not reload the page or reset forms; Arabic retains RTL.

`npm run setup -- --interactive` | `--name` | `--id` | `--domain` | `--database` | `--account` | `--mail local|resend|cloudflare` | `--google true|false` | `--mfa true|false` | `--trust true|false` | `--r2 true|false` | `--theme light|dark`.

The script generates `.dev.vars` with a random secret when it does not exist. It does not write credentials to versioned files or create administrators or remote resources. It modifies the technical identity before provisioning a derivative.

## D1, Drizzle, and Migrations

`src/server/database/schema.ts` is the Drizzle schema. `drizzle/0001_initial.sql` contains the base schema and `0002_defaults_and_guards.sql` loads roles, closed registration, and triggers. `drizzle/generated` preserves the Drizzle snapshot for future comparisons; Wrangler only executes the SQL in the root of `drizzle`. Apply `drizzle/0003_session_authorization.sql` with the other migrations. Existing sessions acquire their snapshot the next time authorization is needed.

`db:generate` produces candidates in `drizzle/generated`. Review each candidate and copy it with the next number to the root; add triggers or data in a separate migration when applicable. Never edit an already applied migration. Review possible conflicts before using an existing D1 and make a backup before remote changes. The template does not execute remote SQL during installation or build.

> [!IMPORTANT]
> The scripts `db:create`, `db:link`, `db:migrate:remote`, and `deploy` require an explicit account and `--confirm`; without confirmation, creation and writing operations are stopped. `db:create` checks existing names and retrieves the real UUID. `db:link` lists account bases and shows their schema before saving the binding, without modifying it. If an operation fails, a supposed binding is not written. No script deletes bases.

Use `--config wrangler.<environment>.jsonc` or `--config wrangler.<other-environment>.jsonc` for separate targets. Copy the configuration and assign a different real name, URL, account_id, and database_id for each environment. Variables and bindings should not be accidentally shared. There are no pre-created remote environments in TBA.

## Secrets and Mail

Setup supports `--mail local`, `--mail resend` and `--mail cloudflare`. Local mail uses a local `APP_URL` and `npm run mail:dev`. Resend needs `RESEND_API_KEY` and `MAIL_FROM`. Cloudflare reuses the existing adapter and needs a `send_email` binding named `EMAIL`, an allowed `MAIL_FROM` and an onboarded sending domain. Setup checks local requirements without provisioning or verifying a remote domain. Missing configuration can be completed later: interactive setup asks whether to continue; noninteractive setup continues with a pending checklist. It does not invent a binding, sender or credential, and email cannot be delivered until configured. Keep secrets outside Git. Wavicc remains the preferred future integration and `WAVICC_API_KEY` a placeholder. See [mail setup](setup-mail.md).

Wavicc is the preferred future integration: there is no adapter or verified API contract. `WAVICC_API_KEY` and `CUSTOM_MAIL_API_KEY` placeholders do not enable a provider. Do not set `MAIL_PROVIDER=wavicc`. For another service, implement and test a transport against its published contract while preserving HTML/text and authentication behavior; no vendor endpoint is assumed here.

Verify every message with isolated accounts and the chosen provider: language, mobile layout, expiry, failed delivery and safety after committed changes. Do not log codes, message bodies, tokens or credentials. See [operations](operations.md) and [validation](validation.md).

## Google and Turnstile

Google requires `GOOGLE_ENABLED="true"`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` with exact callback `/api/auth/callback/google`. There are no default values. Use a previously authorized active account and verify MFA, rejection of suspended users and verified email before publishing.

Turnstile is optional. If you define `TURNSTILE_SITE_KEY`, also define `TURNSTILE_SECRET_KEY`. The record shows the widget and the backend validates token, hostname and action `register` in Siteverify; it is not enough to resolve the widget in React. Remote widgets are not created from TBA. If you do not configure it, the D1 limits by email, IP and verification remain active. Evaluate enabling it before opening a registration to the public.

R2 is turned off and buckets are not declared. Only add it if the derivative needs files, with explicit authorization to provision and regenerated types.

## Initial Administrator

`npm run admin:bootstrap -- --email admin@example.test` uses local D1 by default. The email is not marked as verified and must be confirmed with OTP. No other administrator is added if there is already an active one.

Remote mode requires `--remote --account ACCOUNT_ID --confirm` and checks that the configuration has a real D1 and the same account. Do not include real emails in versioned SQL. If you lose access to the only administrator, follow your own operational procedure; there is no backdoor or automatic privilege reset.

## Manual D1 deployment

1. Configure the derivative identity and correct account.
2. Create or link a D1 after authorization. Review and apply SQL explicitly.
3. Configure HTTPS, exact origin and external email; optionally Google and Turnstile.
4. Run `types:worker`, `check`, `test`, `build`, `worker:check`.
5. Run `npm run deploy -- --account ACCOUNT_ID --confirm` with the selected file.
6. Run remote bootstrap and a test with isolated users.
7. Verify events, MFA, recovery, roles and email flow before admitting real users.

The configuration includes Logs and Traces of Workers. Avoid adding logging of bodies/cookies. The team maintains validations and manual publications. GitHub Actions and Workers Builds are not requirements for deployment and should not be configured as a publication condition. Run local checks pertinent to any remote change, with the confirmed account and destination.

## Updates and Frequent Issues

- Origin error: `APP_URL` must match the browser origin, without a final bar. Use the local Worker for the complete test.
- OTP not arriving: review local mailbox or sender/credentials of the provider. The generic response does not confirm that the account exists.
- Access denied: confirm active status, verified email, role and complete MFA in the backend.
- Sensitive change rejected: log in again; the recent check lasts five minutes.
- Non-existent D1: apply local migrations or verify remote binding and account; do not fill in invented IDs.
- Core update: compare commits, review `CHANGELOG`, update dependencies deliberately and apply reviewed migrations in a test environment. GitHub Template does not propagate changes to derivatives.
