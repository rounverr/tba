# <picture><img src="../assets/icons/database.svg" width="28" height="28" alt=""></picture> Datenbank-Engines

<p align="center"><a href="../en/database-engines.md" lang="en">English</a> | <a href="../es/database-engines.md" lang="es">Español</a> | <a href="../pt/database-engines.md" lang="pt">Português</a> | <strong>Deutsch</strong> | <a href="../fr/database-engines.md" lang="fr">Français</a> | <a href="../it/database-engines.md" lang="it">Italiano</a> | <a href="../zh/database-engines.md" lang="zh">简体中文</a> | <a href="../ja/database-engines.md" lang="ja">日本語</a> | <a href="../hi/database-engines.md" lang="hi">हिन्दी</a> | <a href="../ar/database-engines.md" lang="ar">العربية</a></p>

[Technische Dokumentation](README.md) | [Projektübersicht](../README.de.md)

> [!NOTE]
> Verwenden Sie Cloudflare Workers für D1 und Node.js 24+ für SQLite oder PostgreSQL. Legen Sie für jede Installation eine eigene Quellkopie an. Installieren Sie mit `npm ci` und wählen Sie die Datenbank über `npm run setup -- --interactive`. D1 bleibt die Voreinstellung. Speichern Sie `DATABASE_URL` und `BETTER_AUTH_SECRET` in `.dev.vars` oder in der Umgebung. Führen Sie Build, Migration und Bootstrap gemäß der [Befehlstabelle](../en/database-engines.md) aus und starten Sie mit `npm start`. PostgreSQL verlangt `--target`. Sichern Sie Daten vor Migrationen und verwenden Sie unter Node das lokale Postfach oder Resend. [D1-Betrieb](operations.md) | [E-Mail](setup-mail.md)

D1 und SQLite wenden SQL-Dateien 0001 bis 0003 aus `drizzle/` an. PostgreSQL nutzt eigene nummerierte Dateien aus `drizzle/postgresql/`. Jede Installation führt ihre eigene Historie.

`better-sqlite3` ist optional und nur für SQLite erforderlich. Die SQLite-Datei liegt außerhalb von `dist`. PostgreSQL prüft bei TLS Zertifikat und Hostnamen. Für entfernte Ziele gilt `--target host:port/datenbank`.

Die Migrationen 0001 bis 0003 benötigen mindestens PostgreSQL-11-Syntax. Die Integrationstests liefen mit 17.12 und 18.7. Für Neuinstallationen empfiehlt sich der aktuelle Patch einer gewarteten Version, vorzugsweise PostgreSQL 18.

Offen bleiben die Installation und Verzeichnisverknüpfungen unter Windows, der externe Google-OAuth-Callback, der reale Resend-Versand und ein unabhängiger Penetrationstest.
