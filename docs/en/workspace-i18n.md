# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> Language and Panel Selector

<p align="center"><strong>English</strong> | <a href="../es/workspace-i18n.md" lang="es">Español</a> | <a href="../pt/workspace-i18n.md" lang="pt">Português</a> | <a href="../de/workspace-i18n.md" lang="de">Deutsch</a> | <a href="../fr/workspace-i18n.md" lang="fr">Français</a> | <a href="../it/workspace-i18n.md" lang="it">Italiano</a> | <a href="../zh/workspace-i18n.md" lang="zh">简体中文</a> | <a href="../ja/workspace-i18n.md" lang="ja">日本語</a> | <a href="../hi/workspace-i18n.md" lang="hi">हिन्दी</a> | <a href="../ar/workspace-i18n.md" lang="ar">العربية</a></p>

[Technical documentation](README.md) | [Project overview](../../README.md)

> [!TIP]
> English is the base language of the code and setup assistant. All ten translations and local fonts are included. Use `npm run setup -- --languages en,pt` to enable only English and Portuguese, without installing extra packages or deleting the other translations. Omitting `--languages` preserves the current selection, or enables all ten in a configuration without a language list. English always remains enabled as the translation fallback. `--locale en` sets the application default; any enabled language is accepted. The interface prioritizes the saved preference, then a supported browser language, then the configured default. Switching languages does not reload the page or reset forms; Arabic retains RTL.

Login, public pages, administration, dialogs, validations and transactional mail support `en`, `es`, `pt`, `de`, `fr`, `it`, `zh`, `ja`, `hi` and `ar`. Priority is a valid saved preference (`tba-language`), the first supported browser language from `navigator.languages`/`navigator.language`, then English. Regional variants such as `es-AR`, `pt-BR` and `en-GB` are normalized.

The selector is a 48 × 38 px button with the language symbol and an arrow. Its menu displays the ten native names, short codes, and the current option marked, with theme colors and surfaces. The width and height are limited to the available space. `ui/select.tsx` is reused, preserving the native hidden select for serialization and adding trigger content, header, and optional dimensions. The other selects preserve their values and functionality.

The menu supports arrows, Home/End, initial writing, Enter, Escape, Tab, and outer closure. Focus returns to the control when choosing or canceling with Escape. The language glyph remains stable and only the arrow rotates. Reduced movement, keyboard, screen reader, mobile, and RTL are respected. The selector appears only in Login and in the app header. Dialogs and forms inherit that preference and do not include their own language controls.

## Texts and Data

`AuthI18n` reuses the existing context for the panel. `page=panel` sets the language and direction, while Admin preserves its titles per view and the existing authorization guard. The panel's initial output remains empty until authorized.

`src/lib/i18n/panel/*.json` centralizes the panel catalogs. `panel.ts` applies fallback and parameters; `panel-sources.json` links the existing canonical labels and public server messages with translatable keys. `use-panel.ts` provides the format to components. Dynamic confirmation and download texts keep keys and parameters, so they change language even when open.

`src/lib/i18n/config.ts` centralizes supported languages and direction. `messages/*.json` and `panel/*.json` contain the public and administrative catalogs; `catalog.ts`, `panel.ts` and the shared context provide keys, parameters and fallback. Keep keys consistent in all ten catalogs. Unknown errors use a translated public message rather than internal details. User names, addresses, custom role names and codes are data and are not translated.

`X-Auth-Language` selects an enabled language for email presentation, never permissions. Without a valid header or recipient preference, mail uses the configured application default (English initially). A saved preference for a disabled language also falls back to that default. English remains the fallback for missing translation keys. Verified access/registration and explicit panel selection remember the recipient preference in existing `verification` metadata (`mail-language:<userId>`); deferred notices use the recipient’s language. Changing the interface language does not resend codes or change their expiry, attempts or verification. Legacy error texts remain recognized for compatibility.

The language selector appears in Login and the application header. Dialogs inherit that selection and do not have separate selectors. React updates visible text without a reload or navigation, preserving forms, session and current view. A selection in the panel also sends `POST /api/private/profile/language` to remember the recipient language for later mail; it does not reload administrative data. Blocked browser storage does not prevent translation for the current visit.

## RTL and Fonts

Arabic places the sidebar and panel margins to the right, adapts the welcome image, arrows, controls, tables, and dialogs. Emails, keys, and codes preserve LTR. Long buttons and security rows adjust on small screens. Menus use the local fonts of the ten languages. CJK subsets also incorporate the characters of the new panel catalogs, via `scripts/build-auth-fonts.py`.

## Files and Verification

Language tests use Better Auth and D1 locales or simulated APIs. See [multilingual access implementation](auth-i18n.md).

English stays bundled as the fallback. Other access and panel catalogs use dynamic imports and an in-memory cache per namespace. Pointer or keyboard focus on a language option starts loading that option; opening the menu does not fetch all languages. A change commits only when its catalogs are ready, keeping forms, session and navigation mounted. Cached changes need no network; the last selection wins. An initial loading failure reveals English; a failure during a change preserves the current language. Transactional email and build-time metadata use complete server-only catalogs, independent of the browser cache. See [language loading](language-loading.md).
