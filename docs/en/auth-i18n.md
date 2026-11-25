# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> Public Access Languages

<p align="center"><strong>English</strong> | <a href="../es/auth-i18n.md" lang="es">Español</a> | <a href="../pt/auth-i18n.md" lang="pt">Português</a> | <a href="../de/auth-i18n.md" lang="de">Deutsch</a> | <a href="../fr/auth-i18n.md" lang="fr">Français</a> | <a href="../it/auth-i18n.md" lang="it">Italiano</a> | <a href="../zh/auth-i18n.md" lang="zh">简体中文</a> | <a href="../ja/auth-i18n.md" lang="ja">日本語</a> | <a href="../hi/auth-i18n.md" lang="hi">हिन्दी</a> | <a href="../ar/auth-i18n.md" lang="ar">العربية</a></p>

[Technical documentation](README.md) | [Project overview](../../README.md)

> [!TIP]
> English is the base language of the code and setup assistant. All ten translations and local fonts are included. Use `npm run setup -- --languages en,pt` to enable only English and Portuguese, without installing extra packages or deleting the other translations. Omitting `--languages` preserves the current selection, or enables all ten in a configuration without a language list. English always remains enabled as the translation fallback. `--locale en` sets the application default; any enabled language is accepted. The interface prioritizes the saved preference, then a supported browser language, then the configured default. Switching languages does not reload the page or reset forms; Arabic retains RTL.

Public access supports English (`en`), Spanish (`es`), Portuguese (`pt`), German (`de`), French (`fr`), Italian (`it`), Simplified Chinese (`zh`), Japanese (`ja`), Hindi (`hi`), and Arabic (`ar`). English is the fallback.

## Audit and Scope

The application uses static Astro with React islands and passwordless authentication via Better Auth. There was no i18n layer. Texts were in Login, public pages, and server messages. React state, current components, and existing routes are reused, without adding npm packages.

Login, open or approval-based registration, email verification, OTP, MFA, recovery codes, help, reauthentication notices, errors, validations, loading, Google return, access denied, and non-existent page are translated. Access OTP emails are sent in the chosen language. There are no password, recovery, or password reset screens: that mechanism is not added. Later expansion also includes the admin panel and its settings; see [multilingual selector and panel](workspace-i18n.md).

## Resolution and Initial Load

`src/lib/i18n/config.ts` centralizes the ten languages, native names, direction, and `tba-language` key. Priority is valid `localStorage` preference, first compatible language of `navigator.languages`, `navigator.language`, and finally English. Uppercase, hyphens, and regional variants are normalized, such as `es-AR`, `pt-BR`, or `en-GB`.

`Base.astro` runs the same resolver synchronously in the head. It configures `lang`, `dir`, and title before showing content. Static HTML uses English to match the first hydration; `data-auth-pending` hides the island until `AuthI18n` applies the translation using `useLayoutEffect`. This way, no flash of another language is seen. Blocked storage accesses are caught, and the browser or visit state is used.

The compact selector uses a button with the language symbol and its own menu. It has an accessible translated name and options with native names, `lang`, and `dir`. The hidden native select preserves serialization. Changing it updates the React context and persists the preference. It does not reload, navigate, or query the API. The form is not remounted: it preserves email, code, registration intent, step, device trust, re-send wait, errors, and ongoing operation. Errors keep keys, so they also change language while visible. The chosen language persists between visits; fields and codes are not stored in storage.

## Catalogs, Errors, and Emails

`src/lib/i18n/messages/*.json` contains 112 keys per language. `catalog.ts` types keys, interpolates parameters, and resolves missing ones to English. An unknown key shows a translated public error, never the internal key. Brands, entered emails, codes, and organization names are data, not translations.

`errors.ts` transforms existing public messages and known API codes into presentation keys. Unknown errors do not expose server details. Fields keep server constraints and validation; translated local validations are presented instead of native messages dependent on the language installed in the browser. Arabic, Persian, Devanagari, and full-width OTP digits are normalized to the same six ASCII digits. Recovery codes are kept intact.

`X-Auth-Language` selects an enabled language for email presentation, never permissions. Without a valid header or recipient preference, mail uses the configured application default (English initially). A saved preference for a disabled language also falls back to that default. English remains the fallback for missing translation keys. Verified access/registration and explicit panel selection remember the recipient preference in existing `verification` metadata (`mail-language:<userId>`); deferred notices use the recipient’s language. Changing the interface language does not resend codes or change their expiry, attempts or verification. Legacy error texts remain recognized for compatibility.

Turnstile receives the selected language, with `zh-CN` for simplified Chinese. Its widget is recreated when changed to update its interface. This invalidates the previous CAPTCHA test and requires the test of the updated widget; it preserves the other form data and server controls.

## Design, RTL, and fonts

Arabic sets `dir=rtl`, reverses navigation arrows, and adjusts the image panel, help closure, and alignments. Emails and codes use LTR and bidirectional isolation. Headers support multiple lines, long texts are adjusted, and labels do not depend on fixed widths. The existing identity, theme, and mobile adaptation are maintained.

WOFF2 fonts are served from `public/fonts`, with the existing `font-src 'self'` policy. Inter continues for Latin languages. The TBA Arabic and TBA Devanagari families preserve the glyphs of the original Noto fonts. TBA Chinese and TBA Japanese include characters from the Chinese, Japanese, and English catalogs and selector names. The extension also includes the panel catalogs; system fonts cover other introduced data characters. Only the fonts that the browser needs are downloaded. There are no requests to font providers.

The fonts come from Noto Sans Arabic, Noto Sans Devanagari, and Noto Sans CJK, with a [SIL OFL 1.1](../licenses/noto-fonts.txt) license. The modified families were renamed. To regenerate them after adding characters to the CJK catalogs, run `/usr/bin/python3 scripts/build-auth-fonts.py /usr/share/fonts` in a maintenance environment with Noto, fontTools, and Brotli. It is an optional tool: the build and application do not require Python or new dependencies. Redistribution preserves the license in the repository.

## Implementation files

- Configuration, resolver, catalogs, and errors: `src/lib/i18n/config.ts`, `catalog.ts`, `errors.ts`, and the ten JSON files of `messages/`.
- Interface: `AuthI18n.tsx`, `AuthPublic.tsx`, `Login.tsx`, `Brand.tsx`, `ThemeToggle.tsx`, and `Turnstile.tsx` in `src/components/`.
- Loading and public routes: `src/layouts/Base.astro`, `src/pages/index.astro`, `login.astro`, `login/complete.astro`, `denied.astro`, and `404.astro`.
- Styles and fonts: `src/styles/global.css`, `public/fonts/`, `scripts/build-auth-fonts.py`, and `docs/licenses/noto-fonts.txt`.
- Presentation of requests and emails: `src/lib/utils.ts`, `src/server/auth.ts`, `src/server/index.ts`, and `src/server/services/auth-mail.ts`.
- Tests: `tests/auth-i18n.test.ts`, `tests/auth.test.ts`, and `tests/browser/auth-i18n.mjs`. Documentation: this file, `docs/validation.md`, `README.md`, and `CHANGELOG.md`.

## Validation

`tests/auth-i18n.test.ts` checks the ten catalogs, parameters, variants, priority, head resolver, fallback, direction, errors, normalization, and email texts. The integration in `tests/auth.test.ts` delivers OTP in ten languages with Better Auth and D1 locales, and checks single use. It does not send real emails.

`tests/browser/auth-i18n.mjs` uses an already available Playwright and simulated APIs. It runs against the build served locally:

```sh
AUTH_TEST_URL=http://127.0.0.1:4321 \
PLAYWRIGHT_MODULE=/ruta/a/playwright/index.js \
node tests/browser/auth-i18n.mjs
```

It includes detection before hydration, absence of flicker, persistence, immediate change without navigation or requests, preservation of the form and ongoing loading, ten languages of entry/registration/OTP/MFA/recovery, errors, help, public pages, blocked storage, CAPTCHA, reauthentication warnings, and widths of 320, 390, 768, and 1440 px. The additional visual check verifies real fonts and desktop/mobile for Arabic, Hindi, Chinese, Japanese, German, and French.

English stays bundled as the fallback. Other access and panel catalogs use dynamic imports and an in-memory cache per namespace. Pointer or keyboard focus on a language option starts loading that option; opening the menu does not fetch all languages. A change commits only when its catalogs are ready, keeping forms, session and navigation mounted. Cached changes need no network; the last selection wins. An initial loading failure reveals English; a failure during a change preserves the current language. Transactional email and build-time metadata use complete server-only catalogs, independent of the browser cache. See [language loading](language-loading.md).
