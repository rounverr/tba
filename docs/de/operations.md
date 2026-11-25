# <picture><img src="../assets/icons/settings.svg" width="28" height="28" alt=""></picture> Konfiguration und Operationen

<p align="center"><a href="../en/operations.md" lang="en">English</a> | <a href="../es/operations.md" lang="es">Español</a> | <a href="../pt/operations.md" lang="pt">Português</a> | <strong>Deutsch</strong> | <a href="../fr/operations.md" lang="fr">Français</a> | <a href="../it/operations.md" lang="it">Italiano</a> | <a href="../zh/operations.md" lang="zh">简体中文</a> | <a href="../ja/operations.md" lang="ja">日本語</a> | <a href="../hi/operations.md" lang="hi">हिन्दी</a> | <a href="../ar/operations.md" lang="ar">العربية</a></p>

[Technische Dokumentation](README.md) | [Projektübersicht](../README.de.md)

TBA verwendet standardmäßig Cloudflare Workers mit D1. Dieselbe Oberfläche und Hono-API laufen mit SQLite oder PostgreSQL auch unter Node.js. [Datenbank-Engines](database-engines.md)

## Initialisierung

Englisch ist die Basissprache des Codes und des Setup-Assistenten. Alle zehn Übersetzungen und lokalen Schriften sind enthalten. `npm run setup -- --languages en,pt` aktiviert nur Englisch und Portugiesisch, ohne zusätzliche Pakete oder das Löschen anderer Übersetzungen. Ohne `--languages` bleibt die Auswahl erhalten; ohne vorhandene Liste gelten alle zehn. Englisch bleibt als Übersetzungsfallback aktiv. `--locale en` legt die Anwendungssprache als Standard fest; jede aktivierte Sprache ist zulässig. Vorrang haben gespeicherte Präferenz, unterstützte Browsersprache und konfigurierter Standard. Sprachwechsel laden keine Seite neu und bewahren Formulare; Arabisch behält RTL.

`npm run setup -- --interactive` | `--name` | `--id` | `--domain` | `--database` | `--account` | `--mail local|resend|cloudflare` | `--google true|false` | `--mfa true|false` | `--trust true|false` | `--r2 true|false` | `--theme light|dark`.

Das Skript generiert `.dev.vars` mit zufälligem Geheimnis, wenn es nicht existiert. Es schreibt keine Anmeldeinformationen in versionierte Dateien und erstellt keine Administratoren oder Remote-Ressourcen. Es ändert die technische Identität, bevor es ein abgeleitetes Element bereitstellt.

## D1, Drizzle und Migrationen

`src/server/database/schema.ts` ist das Drizzle-Schema. `drizzle/0001_initial.sql` enthält das Basis-Schema und `0002_defaults_and_guards.sql` lädt Rollen, geschlossene Registrierung und Trigger. `drizzle/generated` bewahrt den Drizzle-Snapshot für zukünftige Vergleiche; Wrangler führt nur die SQL-Befehle im Root-Verzeichnis von `drizzle` aus. `drizzle/0003_session_authorization.sql` wird mit den übrigen Migrationen angewendet. Bestehende Sitzungen erhalten ihren Snapshot beim nächsten Vorgang mit Berechtigungsprüfung.

`db:generate` erzeugt Kandidaten in `drizzle/generated`. Überprüfe jeden Kandidaten und kopiere ihn mit der nächsten Nummer im Root-Verzeichnis; füge Trigger oder Daten in einer separaten Migration hinzu, wenn erforderlich. Bearbeite niemals eine bereits angewendete Migration. Überprüfe mögliche Konflikte, bevor du eine bestehende D1 verwendest, und erstelle ein Backup, bevor du Remote-Änderungen vornimmst. Die Vorlage führt keine Remote-SQL-Befehle während der Installation oder des Build-Vorgangs aus.

> [!IMPORTANT]
> Die Skripte `db:create`, `db:link`, `db:migrate:remote` und `deploy` erfordern ein explizites Konto und `--confirm`; ohne Bestätigung werden die Erstellungs- und Schreiboperationen angehalten. `db:create` überprüft bestehende Namen und ruft die tatsächliche UUID ab. `db:link` listet die Datenbanken des Kontos auf und zeigt ihr Schema an, bevor es den Binding speichert, ohne es zu ändern. Wenn eine Operation fehlschlägt, wird kein vermuteter Binding geschrieben. Kein Skript löscht Datenbanken.

Verwende `--config wrangler.<environment>.jsonc` oder `--config wrangler.<other-environment>.jsonc` für separate Ziele. Kopiere die Konfiguration und weise einen unterschiedlichen Namen, URL, Account_ID und Database_ID für jedes Umfeld zu. Variablen und Bindings sollten nicht versehentlich geteilt werden. Es gibt keine vorab erstellten Remote-Umgebungen in TBA.

## Geheimnisse und E-Mail

Setup unterstützt `--mail local`, `--mail resend` und `--mail cloudflare`. Lokal werden eine lokale `APP_URL` und `npm run mail:dev` verwendet. Resend benötigt `RESEND_API_KEY` und `MAIL_FROM`. Cloudflare nutzt den bestehenden Adapter und benötigt ein `send_email`-Binding namens `EMAIL`, einen erlaubten `MAIL_FROM` und eine eingerichtete Versanddomain. Setup prüft lokal, ohne Ressourcen anzulegen oder entfernte Domains zu prüfen. Fehlendes kann später ergänzt werden: interaktiv wird nach Fortsetzung gefragt, nicht interaktiv mit einer Aufgabenliste fortgefahren. Binding, Absender und Zugangsdaten werden nicht erfunden; bis zur Konfiguration erfolgt kein Versand. Geheimnisse gehören nicht in Git. Wavicc bleibt die bevorzugte künftige Integration mit `WAVICC_API_KEY` als Platzhalter. Siehe [Mail-Setup](setup-mail.md).

Wavicc ist die bevorzugte künftige Integration ohne Adapter oder verifizierten API-Vertrag. `WAVICC_API_KEY` und `CUSTOM_MAIL_API_KEY` aktivieren nichts. Verwenden Sie nicht `MAIL_PROVIDER=wavicc`. Andere Dienste benötigen einen getesteten Adapter gemäß veröffentlichtem Vertrag unter Erhalt von HTML/Text und Authentifizierung; Endpunkte werden hier nicht vorausgesetzt.

Prüfen Sie jede Nachricht mit isolierten Konten: Sprache, Mobilansicht, Ablauf, Versandfehler und Erfolg nach bestätigten Änderungen. Keine Codes, Inhalte, Tokens oder Zugangsdaten protokollieren. Siehe [Betrieb](operations.md) und [Validierung](validation.md).

## Google und Turnstile

Google erfordert `GOOGLE_ENABLED="true"`, `GOOGLE_CLIENT_ID` und `GOOGLE_CLIENT_SECRET` mit exaktem Callback `/api/auth/callback/google`. Es gibt keine Standardwerte. Verwenden Sie ein zuvor autorisiertes Konto und überprüfen Sie MFA, Ablehnung gesperrter Benutzer und verifizierte E-Mail-Adresse, bevor Sie veröffentlichen.

Turnstile ist optional. Wenn Sie `TURNSTILE_SITE_KEY` definieren, definieren Sie auch `TURNSTILE_SECRET_KEY`. Die Registrierung zeigt das Widget und der Backend validiert Token, Hostname und Aktion `register` in Siteverify; es reicht nicht aus, das Widget in React aufzulösen. Remote-Widgets werden nicht von TBA erstellt. Wenn Sie es nicht konfigurieren, bleiben die D1-Einschränkungen für E-Mail, IP und Verifizierung aktiv. Bewerten Sie die Aktivierung, bevor Sie die Registrierung für die Öffentlichkeit öffnen.

R2 ist deaktiviert und es werden keine Buckets deklariert. Fügen Sie es nur hinzu, wenn das Derivat Dateien benötigt, mit expliziter Autorisierung für die Bereitstellung und regenerierte Typen.

## Erster Administrator

`npm run admin:bootstrap -- --email admin@example.test` verwendet D1 lokal standardmäßig. Die E-Mail-Adresse wird nicht als verifiziert markiert und muss mit OTP bestätigt werden. Es wird kein weiterer Administrator hinzugefügt, wenn bereits ein aktiver Administrator vorhanden ist.

Der Remote-Modus erfordert `--remote --account ACCOUNT_ID --confirm` und überprüft, dass die Konfiguration eine reale D1 und das gleiche Konto enthält. Schließen Sie keine echten E-Mail-Adressen in die versionierte SQL ein. Wenn Sie den Zugriff auf den einzigen Administrator verlieren, folgen Sie einem eigenen Betriebsverfahren; es gibt keine Backdoor oder automatische Wiederherstellung von Privilegien.

## Manuelle Bereitstellung mit D1

1. Konfigurieren Sie die Identität des Derivats und das korrekte Konto.
2. Erstellen oder binden Sie eine D1 nach Autorisierung. Überprüfen und wenden Sie SQL explizit an.
3. Konfigurieren Sie HTTPS, exakten Ursprung und externe E-Mail; optional Google und Turnstile.
4. Führen Sie `types:worker`, `check`, `test`, `build`, `worker:check` aus.
5. Führen Sie `npm run deploy -- --account ACCOUNT_ID --confirm` mit der ausgewählten Datei aus.
6. Führen Sie Remote-Bootstrap und einen Test mit isolierten Benutzern aus.
7. Überprüfen Sie Ereignisse, MFA, Wiederherstellung, Rollen und E-Mail-Fluss, bevor Sie reale Benutzer zulassen.

Die Konfiguration umfasst Logs und Traces von Workern. Vermeiden Sie das Hinzufügen von Logging für Körper/Cookies. Das Team führt manuelle Validierungen und Veröffentlichungen durch. GitHub Actions und Workers Builds sind keine Voraussetzungen für die Veröffentlichung und sollten nicht als Bedingung für die Veröffentlichung konfiguriert werden. Führen Sie lokale Überprüfungen vor jedem Remote-Wechsel mit bestätigtem Konto und Ziel aus.

## Aktualisierungen und häufige Probleme

- Ursprungsfehler: `APP_URL` muss mit dem Ursprung des Browsers übereinstimmen, ohne abschließendes Slash. Verwenden Sie den lokalen Worker für den vollständigen Test.
- Keine OTP-Ankunft: Überprüfen Sie den lokalen Posteingang oder den Absender/Zugangsdaten des Anbieters. Die allgemeine Antwort bestätigt nicht, dass das Konto existiert.
- Zugriff verweigert: Bestätigen Sie den aktiven Status, die verifizierte E-Mail-Adresse, die Rolle und die vollständige MFA im Backend.
- Abgelehnter sensibler Wechsel: Melden Sie sich erneut an; die kürzliche Überprüfung dauert fünf Minuten.
- Nicht existierende D1: Wenden Sie lokale Migrationen an oder überprüfen Sie die Remote-Bindung und das Konto; füllen Sie keine erfundenen IDs aus.
- Kernaktualisierung: Vergleichen Sie Commits, überprüfen Sie `CHANGELOG`, aktualisieren Sie Abhängigkeiten bewusst und wenden Sie überprüfte Migrationen in einer Testumgebung an. Das GitHub-Template propagiert keine Änderungen an die Derivate.
