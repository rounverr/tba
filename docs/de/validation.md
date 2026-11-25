# <picture><img src="../assets/icons/check.svg" width="28" height="28" alt=""></picture> Prüfliste

<p align="center"><a href="../en/validation.md" lang="en">English</a> | <a href="../es/validation.md" lang="es">Español</a> | <a href="../pt/validation.md" lang="pt">Português</a> | <strong>Deutsch</strong> | <a href="../fr/validation.md" lang="fr">Français</a> | <a href="../it/validation.md" lang="it">Italiano</a> | <a href="../zh/validation.md" lang="zh">简体中文</a> | <a href="../ja/validation.md" lang="ja">日本語</a> | <a href="../hi/validation.md" lang="hi">हिन्दी</a> | <a href="../ar/validation.md" lang="ar">العربية</a></p>

[Technische Dokumentation](README.md) | [Projektübersicht](../README.de.md)

Führen Sie die Tests für D1, SQLite und PostgreSQL in getrennten Installationen gemäß der [Datenbankanleitung](database-engines.md) aus.

1. Abhängigkeiten mit `npm ci` installieren.
2. Frontend- und Backend-Typen mit `npm run check` prüfen.
3. Unit- und Integrationstests mit `npm test` ausführen.
4. Produktionsressourcen mit `npm run build` erstellen.
5. Worker-Paket mit `npm run worker:check` prüfen.
6. E-Mail-OTP, optionales Google-Login, Einrichtung und Wiederherstellung von MFA, vertrauenswürdige Geräte, Sitzungswiderruf, Rollen und Berechtigungen, Registrierungsmodi und die Ablehnung unberechtigter Zugriffe manuell testen.
7. Login und Adminbereich in allen zehn Sprachen einschließlich Arabisch mit RTL prüfen. Sicherstellen, dass ein Sprachwechsel weder die Seite neu lädt noch Formulare zurücksetzt.
8. Desktop- und Mobilansicht, Tastaturbedienung, Screenreader und Sicherheits-Header prüfen.
9. Vor jeder ausdrücklich genehmigten Übernahme Geheimnisse, Migrationen, Umgebungseinstellungen, Dokumentationslinks und ausgewählte Dateiänderungen prüfen. Die Veröffentlichung erfolgt manuell; CI und Workers Builds sind nicht erforderlich.

Prüfen Sie das tatsächliche wiederverwendbare Paket, nicht nur eine Entwicklungskopie mit Erweiterungen. Grundlisten, Audit und Dashboard müssen ohne erweiterte Such-/Filter-/Sortiersteuerung und XLSX-Imports funktionieren. Mit autorisierter Sitzung müssen ausgeschlossene `/api/private/export/*`-Routen 404 liefern. Der MFA-Wiederherstellungsdownload `.txt` bleibt erhalten. 


Die Skripte `tests/browser/*.mjs` sind optionale manuelle Prüfungen außerhalb von `npm test`. Playwright (`PLAYWRIGHT_MODULE`), Chromium (`BROWSER_EXECUTABLE`) und eine lokal gebaute Website (`AUTH_TEST_URL`) mit 404-Fallback sind erforderlich. Login/Panel verwenden zehn Sprachen; `enabled-languages.mjs` benötigt eine separate Fixture mit `--languages en,pt --locale en`. HTML-Mail-Fixtures zuerst mit `MAIL_PREVIEW_DIR` und `tests/mail-template.test.ts` erzeugen. Eine feste Kopie von `dist` verwenden. Prüfen Sie OTP und HTTP-Anfragen mit `node-panel.mjs` an einem echten lokalen Server. Andere Oberflächentests können die API simulieren.

Mit `node tests/browser/panel-idle.mjs` lassen sich zehn Minuten Inaktivität in den Basislisten und die erneute Prüfung nach BFCache messen.

Englisch bleibt als Fallback enthalten. Weitere Login- und Panelkataloge werden dynamisch importiert und pro Modul im Speicher gehalten. Tastatur- oder Zeigerfokus lädt nur die betreffende Option vor; das Menü lädt nicht alle Sprachen. Der Wechsel erfolgt erst mit vollständigen Katalogen und erhält Formulare, Sitzung und Navigation. Zwischengespeicherte Wechsel benötigen kein Netz; die letzte Auswahl gilt. Ein anfänglicher Ladefehler zeigt Englisch, ein späterer Fehler erhält die aktuelle Sprache. E-Mails und Build-Metadaten verwenden vollständige Serverkataloge. Siehe [Sprachladen](language-loading.md).

> [!NOTE]
> Offen bleiben die Installation und Verzeichnisverknüpfungen unter Windows, der externe Google-OAuth-Callback, der reale Resend-Versand und ein unabhängiger Penetrationstest.
