# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> Zugangs-Sprachen

<p align="center"><a href="../en/auth-i18n.md" lang="en">English</a> | <a href="../es/auth-i18n.md" lang="es">Español</a> | <a href="../pt/auth-i18n.md" lang="pt">Português</a> | <strong>Deutsch</strong> | <a href="../fr/auth-i18n.md" lang="fr">Français</a> | <a href="../it/auth-i18n.md" lang="it">Italiano</a> | <a href="../zh/auth-i18n.md" lang="zh">简体中文</a> | <a href="../ja/auth-i18n.md" lang="ja">日本語</a> | <a href="../hi/auth-i18n.md" lang="hi">हिन्दी</a> | <a href="../ar/auth-i18n.md" lang="ar">العربية</a></p>

[Technische Dokumentation](README.md) | [Projektübersicht](../README.de.md)

> [!TIP]
> Englisch ist die Basissprache des Codes und des Setup-Assistenten. Alle zehn Übersetzungen und lokalen Schriften sind enthalten. `npm run setup -- --languages en,pt` aktiviert nur Englisch und Portugiesisch, ohne zusätzliche Pakete oder das Löschen anderer Übersetzungen. Ohne `--languages` bleibt die Auswahl erhalten; ohne vorhandene Liste gelten alle zehn. Englisch bleibt als Übersetzungsfallback aktiv. `--locale en` legt die Anwendungssprache als Standard fest; jede aktivierte Sprache ist zulässig. Vorrang haben gespeicherte Präferenz, unterstützte Browsersprache und konfigurierter Standard. Sprachwechsel laden keine Seite neu und bewahren Formulare; Arabisch behält RTL.

Der Zugang unterstützt Englisch (`en`), Spanisch (`es`), Portugiesisch (`pt`), Deutsch (`de`), Französisch (`fr`), Italienisch (`it`), Vereinfachtes Chinesisch (`zh`), Japanisch (`ja`), Hindi (`hi`) und Arabisch (`ar`). Englisch ist die Fallback-Sprache.

## Audit und Umfang

Die Anwendung verwendet Astro-Static mit React-Inseln und passwortloser Authentifizierung über Better Auth. Es gab keine i18n-Schicht. Die Texte befanden sich in Login, auf öffentlichen Seiten und in Servernachrichten. Der React-Zustand, die aktuellen Komponenten und die bestehenden Routen werden wiederverwendet, ohne npm-Pakete hinzuzufügen.

Es werden Anmeldung, offene oder genehmigte Registrierung, E-Mail-Überprüfung, OTP, MFA, Wiederherstellungscode, Hilfe, Re-Authentifizierungsbenachrichtigungen, Fehler, Validierungen, Ladevorgang, Google-Rückkehr, Zugriff verweigert und nicht existierende Seite übersetzt. Die OTP-Zugangs-E-Mails werden in der gewählten Sprache gesendet. Es gibt keine Passwort-, Wiederherstellungs- oder Zurücksetzungs-Bildschirme: Dieser Mechanismus wird nicht hinzugefügt. Die spätere Erweiterung umfasst auch das Administrations-Panel und seine Einstellungen; siehe [Sprachauswahl und -panel](workspace-i18n.md).

## Auflösung und erste Ladevorgang

`src/lib/i18n/config.ts` zentralisiert die zehn Sprachen, die natürlichen Namen, die Richtung und den Schlüssel `tba-language`. Die Priorität ist die gültige Vorliebe von `localStorage`, die erste kompatible Sprache von `navigator.languages`, `navigator.language` und schließlich Englisch. Großbuchstaben, Bindestriche und regionale Varianten wie `es-AR`, `pt-BR` oder `en-GB` werden normalisiert.

`Base.astro` führt den gleichen Resolver synchron im Head aus. Es konfiguriert `lang`, `dir` und den Titel, bevor der Inhalt angezeigt wird. Das statische HTML verwendet Englisch, um mit der ersten Hydratation zu übereinstimmen; `data-auth-pending` versteckt die Insel, bis `AuthI18n` die Übersetzung über `useLayoutEffect` anwendet. So wird kein Aufblitzen einer anderen Sprache sichtbar. Der Zugriff auf den gesperrten Speicher wird erfasst und der Browser oder der Besucherzustand wird verwendet.

Der kompakte Selektor verwendet einen Button mit dem Sprachsymbol und einem eigenen Menü. Er hat einen übersetzten zugänglichen Namen und Optionen mit natürlichen Namen, `lang` und `dir`. Der ausgeblendete native Selektor bewahrt die Serialisierung. Die Änderung aktualisiert den React-Kontext und persistiert die Vorliebe. Es wird nicht neu geladen, navigiert oder die API abgefragt. Das Formular wird nicht neu aufgebaut: Es bewahrt die E-Mail, den Code, die Registrierungsabsicht, den Schritt, das Gerätevertrauen, die Wartezeit für die erneute Sendung, Fehler und den laufenden Vorgang. Fehler speichern Schlüssel, sodass sie auch die Sprache ändern, während sie sichtbar sind. Die gewählte Sprache persistiert zwischen den Besuchen; die Felder und Codes werden nicht im Speicher gespeichert.

## Kataloge, Fehler und E-Mails

`src/lib/i18n/messages/*.json` enthält 112 Schlüssel pro Sprache. `catalog.ts` typisiert die Schlüssel, interpoliert Parameter und löst fehlende Englisch-Schlüssel auf. Ein unbekannter Schlüssel zeigt einen übersetzten öffentlichen Fehler an, nie den internen Schlüssel. Marken, eingegebene E-Mails, Codes und Organisationsnamen sind Daten, keine Übersetzungen.

`errors.ts` transformiert die vorhandenen öffentlichen Nachrichten und die bekannten API-Codes in Präsentationsschlüssel. Unbekannte Fehler geben keine Serverdetails preis. Die Felder bewahren die Servervalidierung und -beschränkungen; es werden lokale, übersetzte Validierungen anstelle von Sprachabhängigkeiten des installierten Browsers angezeigt. Arabische, persische, Devanagari- und Vollbreiten-OTP-Ziffern werden auf die gleichen sechs ASCII-Ziffern normalisiert. Die Wiederherstellungscode werden unverändert beibehalten.

`X-Auth-Language` wählt eine aktivierte E-Mail-Sprache, niemals Berechtigungen. Ohne gültigen Header oder Empfängerpräferenz gilt der konfigurierte Standard (anfangs Englisch). Deaktivierte gespeicherte Sprachen fallen ebenfalls darauf zurück. Fehlende Schlüssel verwenden Englisch. Bestätigter Zugang/Registrierung und die Panelauswahl speichern die Präferenz in `verification` (`mail-language:<userId>`); spätere Mitteilungen verwenden die Empfängersprache. Sprachwechsel versenden keine Codes erneut und ändern weder Ablauf noch Versuche oder Prüfung. Frühere Fehlertexte bleiben kompatibel.

Turnstile erhält die ausgewählte Sprache, mit `zh-CN` für vereinfachtes Chinesisch. Sein Widget wird neu erstellt, wenn es geändert wird, um seine Oberfläche zu aktualisieren. Dies invalidiert den vorherigen CAPTCHA-Test und erfordert den Test des aktualisierten Widgets; es behält die anderen Formulardaten und Serversteuerungen bei.

## Design, RTL und Schriftarten

Arabisch konfiguriert `dir=rtl`, invertiert die Navigationspfeile und passt das Bildpanel, den Hilfeschluss und die Ausrichtungen an. E-Mails und Codes verwenden LTR und bidirektionale Isolierung. Die Kopfzeilen unterstützen mehrere Zeilen, lange Texte werden angepasst und die Labels hängen nicht von festen Breiten ab. Die Identität, das Thema und die bestehende Mobile-Anpassung werden beibehalten.

Die WOFF2-Schriftarten werden von `public/fonts` ausgeliefert, mit der bestehenden Richtlinie `font-src 'self'`. Inter wird für lateinische Sprachen weiterhin verwendet. Die Familien TBA Arabic und TBA Devanagari behalten die Glyphe der ursprünglichen Noto-Schriftarten bei. TBA Chinese und TBA Japanese enthalten die Zeichen aus den chinesischen, japanischen und englischen Katalogen und den Selektornamen. Die Erweiterung umfasst auch die Katalogpanele; die Systemschriftarten decken andere eingeführte Datensatzzeichen ab. Es werden nur die Schriftarten heruntergeladen, die der Browser benötigt. Es gibt keine Anfragen an Schriftartenanbieter.

Die Schriftarten stammen von Noto Sans Arabic, Noto Sans Devanagari und Noto Sans CJK, mit der Lizenz [SIL OFL 1.1](../licenses/noto-fonts.txt). Die modifizierten Familien wurden umbenannt. Um sie nach dem Hinzufügen von Zeichen zu den CJK-Katalogen neu zu generieren, muss `/usr/bin/python3 scripts/build-auth-fonts.py /usr/share/fonts` in einer Wartungsumgebung mit Noto, fontTools und Brotli ausgeführt werden. Es ist ein optionales Tool: Der Build und die Anwendung erfordern keine Python- oder neuen Abhängigkeiten. Die Weiterverteilung behält die Lizenz im Repository bei.

## Implementierungsdateien

- Konfiguration, Auflösung, Kataloge und Fehler: `src/lib/i18n/config.ts`, `catalog.ts`, `errors.ts` und die zehn JSON-Dateien von `messages/`.
- Oberfläche: `AuthI18n.tsx`, `AuthPublic.tsx`, `Login.tsx`, `Brand.tsx`, `ThemeToggle.tsx` und `Turnstile.tsx` in `src/components/`.
- Laden und öffentliche Routen: `src/layouts/Base.astro`, `src/pages/index.astro`, `login.astro`, `login/complete.astro`, `denied.astro` und `404.astro`.
- Stile und Schriftarten: `src/styles/global.css`, `public/fonts/`, `scripts/build-auth-fonts.py` und `docs/licenses/noto-fonts.txt`.
- Präsentation von Anfragen und E-Mails: `src/lib/utils.ts`, `src/server/auth.ts`, `src/server/index.ts` und `src/server/services/auth-mail.ts`.
- Tests: `tests/auth-i18n.test.ts`, `tests/auth.test.ts` und `tests/browser/auth-i18n.mjs`. Dokumentation: diese Datei, `docs/validation.md`, `README.md` und `CHANGELOG.md`.

## Validierung

`tests/auth-i18n.test.ts` überprüft die zehn Kataloge, Parameter, Varianten, Priorität, Head-Auflösung, Fallback, Richtung, Fehler, Normalisierung und E-Mail-Texte. Die Integration in `tests/auth.test.ts` liefert OTP in zehn Sprachen mit Better Auth und D1-Lokalisierung und überprüft die eindeutige Verwendung. Es werden keine echten E-Mails gesendet.

`tests/browser/auth-i18n.mjs` verwendet einen bereits verfügbaren Playwright und simulierte APIs. Es wird gegen den lokal servierten Build ausgeführt:

```sh
AUTH_TEST_URL=http://127.0.0.1:4321 \
PLAYWRIGHT_MODULE=/ruta/a/playwright/index.js \
node tests/browser/auth-i18n.mjs
```

Es umfasst die Erkennung vor der Hydratisierung, das Fehlen von Blinken, die Persistenz, die sofortige Änderung ohne Navigation oder Anfragen, die Beibehaltung des Formulars und die laufende Ladung, zehn Sprachen für Einloggung/Registrierung/OTP/MFA/Wiederherstellung, Fehler, Hilfe, öffentliche Seiten, gesperrten Speicher, CAPTCHA, Re-Authentifizierungsbenachrichtigungen und Breiten von 320, 390, 768 und 1440 px. Die zusätzliche visuelle Überprüfung überprüft echte Schriftarten und Desktop/Mobile für Arabisch, Hindi, Chinesisch, Japanisch, Deutsch und Französisch.

Englisch bleibt als Fallback enthalten. Weitere Login- und Panelkataloge werden dynamisch importiert und pro Modul im Speicher gehalten. Tastatur- oder Zeigerfokus lädt nur die betreffende Option vor; das Menü lädt nicht alle Sprachen. Der Wechsel erfolgt erst mit vollständigen Katalogen und erhält Formulare, Sitzung und Navigation. Zwischengespeicherte Wechsel benötigen kein Netz; die letzte Auswahl gilt. Ein anfänglicher Ladefehler zeigt Englisch, ein späterer Fehler erhält die aktuelle Sprache. E-Mails und Build-Metadaten verwenden vollständige Serverkataloge. Siehe [Sprachladen](language-loading.md).
