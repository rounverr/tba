# <picture><img src="../assets/icons/layers.svg" width="28" height="28" alt=""></picture> Umfang der Vorlage

<p align="center"><a href="../en/template-scope.md" lang="en">English</a> | <a href="../es/template-scope.md" lang="es">Español</a> | <a href="../pt/template-scope.md" lang="pt">Português</a> | <strong>Deutsch</strong> | <a href="../fr/template-scope.md" lang="fr">Français</a> | <a href="../it/template-scope.md" lang="it">Italiano</a> | <a href="../zh/template-scope.md" lang="zh">简体中文</a> | <a href="../ja/template-scope.md" lang="ja">日本語</a> | <a href="../hi/template-scope.md" lang="hi">हिन्दी</a> | <a href="../ar/template-scope.md" lang="ar">العربية</a></p>

[Technische Dokumentation](README.md) | [Projektübersicht](../README.de.md)

TBA verwendet standardmäßig Cloudflare Workers mit D1. Dieselbe Oberfläche und Hono-API laufen mit SQLite oder PostgreSQL auch unter Node.js. [Datenbank-Engines](database-engines.md)

Die Basisvorlage enthält E-Mail-OTP, optionales Google-Login, TOTP-MFA und Wiederherstellung, vertrauenswürdige Geräte, Sitzungen, Rollen und Berechtigungen, Profile, E-Mail-Wechsel, grundlegende Kontoverwaltung, Registrierungsanfragen, Auditprotokoll und Dashboard. Login und Verwaltung unterstützen zehn Sprachen sowie helle und dunkle Designs.

> [!NOTE]
> Grundlegende Listen mit begrenzter Seitennavigation sowie erforderliche Datenbanktabellen, Regeln und allgemeine Migrationen bleiben enthalten. Erweiterte Suche, Filter, Sortier- und Seitennavigationsmodule sowie Excel/XLSX-Export gehören nicht zur Basis. Jedes Projekt kann diese passend zu seinen Daten und Berechtigungen ergänzen. Der lokale `.txt`-Download der MFA-Wiederherstellungscodes bleibt eine Sicherheitsfunktion.

Jede Anwendung besitzt eigene Worker, Datenbank, Benutzer, Geheimnisse, Domains und E-Mail-Konfiguration. Geschäftsprofile, Organisationen, Abrechnung oder Mandantendaten werden nicht automatisch angelegt. Der Registrierungshook dient projektspezifischen Erweiterungen. Es gelten die [MIT-Lizenz](../../LICENSE), erforderliche Hinweise und [Schriftlizenzen](../licenses/README.md#de). Unternehmensmarken sind separat in [TRADEMARKS](../../TRADEMARKS.md) geregelt.
