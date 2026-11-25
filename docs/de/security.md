# <picture><img src="../assets/icons/shield.svg" width="28" height="28" alt=""></picture> Authentifizierung und Sicherheit

<p align="center"><a href="../en/security.md" lang="en">English</a> | <a href="../es/security.md" lang="es">Español</a> | <a href="../pt/security.md" lang="pt">Português</a> | <strong>Deutsch</strong> | <a href="../fr/security.md" lang="fr">Français</a> | <a href="../it/security.md" lang="it">Italiano</a> | <a href="../zh/security.md" lang="zh">简体中文</a> | <a href="../ja/security.md" lang="ja">日本語</a> | <a href="../hi/security.md" lang="hi">हिन्दी</a> | <a href="../ar/security.md" lang="ar">العربية</a></p>

[Technische Dokumentation](README.md) | [Projektübersicht](../README.de.md)

## SQL-Sicherheit

> [!IMPORTANT]
> Binden Sie externe und gespeicherte Werte über Treiberparameter oder Drizzle-Prädikate. Identifikatoren, Filter und Sortierung stammen aus serverseitigen Listen. Begrenzen Sie die Rechte des Laufzeitkontos und schützen Sie Fehler und Zugangsdaten. [SQL](../en/security.md#sql-security-en) | [PostgreSQL](../en/security.md#postgresql-runtime-privileges)

Die Datenbank speichert Ratenlimits und die versionierte Sitzungsautorisierung in allen drei Datenbank-Engines.

## E-Mail-OTP

Der Eintrag informiert 403 mit `ACCESS_NOT_ENABLED`, wenn die E-Mail-Adresse nicht zu einem aktivierten Konto gehört und weder OTP sendet noch Benutzer erstellt. Die Schnittstelle behält das Formular bei und zeigt eine Warnung an, um die Adresse zu überprüfen oder den Zugriff anzufordern. Dieselbe Nachricht wird für nicht existierende, ausstehende, gesperrte oder deaktivierte Konten verwendet, ohne ihren genauen Status preiszugeben. Diese Richtlinie, die zur Orientierung der Person angefordert wurde, ermöglicht es, aktivierte Konten von denen zu unterscheiden, die keinen Zugriff haben; sie ersetzt die vorherige einheitliche Antwort des Login-Systems. Die IP- und E-Mail-Beschränkungen bleiben bestehen. Die Registrierung behält ihre einheitliche Antwort und ihre Modalkontrollen bei. Der berechtigte Versand wird durch `waitUntil` abgeschlossen. Der Adapter verwendet den in `MAIL_PROVIDER` konfigurierten Anbieter: Cloudflare Email Sending auf Workers, Resend oder das lokale Entwicklungs-Postfach. Die Auswahl wird in `services/mail.ts` implementiert.

Der Code hat sechs Ziffern, läuft nach fünf Minuten ab und Better Auth speichert ihn mit Hash. Es sind maximal fünf Versuche pro OTP, zehn Überprüfungen pro E-Mail alle 15 Minuten und ein Versand pro E-Mail pro Minute zulässig. Es gibt außerdem eine IP-Beschränkung von 20 Anfragen alle 15 Minuten und Beschränkungen des Authentifizierungsanbieters. Die Beschränkungen sind in D1 gespeichert, und die Drosselungsschlüssel werden mit SHA-256 gespeichert. OTP und Token werden nicht in den Protokollen gedruckt.

`/access/verify` unterscheidet explizit zwischen Login und Registrierung. Login verwendet `disableSignUp:true`, erfordert ein bereits existierendes aktives Konto und gewährt keinen Zugriff auf ausstehende oder gesperrte Konten. Ein verwendetes oder abgelaufenes OTP generiert keine Sitzung mehr.

## Google OAuth

Dies wird nur aktiviert, wenn `GOOGLE_ENABLED="true"` und beide Geheimnisse vorhanden sind. Es wird `email_verified` vom Google-Profil erfordert, und die Benutzererstellung über OAuth wird deaktiviert. Das Ergebnis wird der gleichen Barrieren für Status, Sitzung, Berechtigungen und MFA wie E-Mail-OTP unterzogen. Callback: `https://app.example.test/api/auth/callback/google`. Registriert diesen genauen URI in Google Cloud und konfiguriert die Zustimmungsbildschirm. Dieser Fluss erfordert eine reale externe Überprüfung nach der Konfiguration der Anmeldeinformationen.

## Sitzungen und Ursprung

Sitzungen dauern acht Stunden und werden in der Datenbank ohne Cookie-Cache geprüft. Die Sitzung speichert nach der erforderlichen MFA einen versionierten Berechtigungs-Snapshot in D1. Jeder geschützte Vorgang prüft Sitzung und Version. Gültige Snapshots ersparen das erneute Lesen der Rolle. Bei `409 authorization_changed` vor dem Schreibvorgang aktualisiert das Panel den Kontext und versucht den Vorgang einmal für denselben Benutzer erneut. Jede Mutation erfordert ein `Origin`, das `APP_URL` entspricht, JSON und einen Körper von bis zu 16 KiB. HTTPS-Anfragen sind außerhalb von localhost obligatorisch. Es gibt keine offene CORS und keine Token im localStorage; nur die visuellen Präferenzen für Thema und Menü werden dort gespeichert.

Das Gateway stellt nur die öffentlichen Handler von Better Auth für Google und Abmelden bereit. Die OTP-Methoden, Code-Inspektion, MFA und Registrierung können nicht von außerhalb der Serverrichtlinien aufgerufen werden. Die Antwortkörper von Better Auth, die Token enthalten, werden nicht an das Frontend geliefert: nur ihre Cookies und die streng notwendigen Daten werden propagiert.

Sicherheitsheader und CSP sind enthalten. Die CSP ermöglicht notwendige Inline-Skripte und -Stile für die Astro-Hydratation und visuelle Token; sie ermöglicht keine Objekte oder Frames von externen Sites von Turnstile. Wenn ein Ableger die Inline-Skripte entfernt, kann es sie mithilfe von Hashes/Nonces härten.

## Administratives Rendering vor der Autorisierung

Die acht administrativen Dokumente werden ohne visuelle Struktur des Panels generiert. Die anfängliche Ausgabe von React ist ebenfalls leer: weder Menü, Kopfzeile, Titel der Ansicht, Formulare, Sitzungshinweise noch Ladeindikatoren werden vor Erhalt einer privaten autorisierten Antwort montiert. Eine ausstehende Umleitung bewahrt diese leere Ausgabe. Das bestätigte Ergebnis einer E-Mail-Änderung wird als separates öffentliches Empfangsbekenntnis angezeigt, da diese Operation die Sitzungen schließt; das Panel wird nicht neu montiert. Es handelt sich um eine Korrektur der Präsentation des statischen Containers; die privaten Daten waren bereits durch die API geschützt. Es ersetzt keine Authentifizierung und fügt keine Lesevorgänge hinzu.

Die Ablehnungen 403 und Fehler 503 beim Laden einer Ansicht ohne bestätigten Zugriff zeigen nur eine öffentliche Nachricht und Wiederherstellungsoptionen an, ohne das Panel. Beim Speichern einer Seite im BFCache wird ihre Struktur synchron verborgen und Dialoge geschlossen, damit die Momentaufnahme während der Neuvallidierung nicht neu gezeichnet wird. Nur eine autorisierte Antwort zeigt sie erneut an.

## Rückkehr zur Anmeldung bei Sitzungsverlust

Ein 401 bei einer Lese- oder Aktion des Panels invalidiert seinen Präsentationscache, bricht ausstehende Lesevorgänge ab und löscht private Daten, QR-Codes, Samen und transitorische Codes, bevor die URL durch `/login/` ersetzt wird. Die erfolgreiche Abmeldung verwendet die gleiche Bereinigung und Navigation durch Ersetzen. Das erneute Öffnen eines administrativen Links mit geschlossener Sitzung folgt diesem Fluss automatisch.

Eine Wiederherstellung des Dokuments aus dem BFCache erfordert eine aktuelle Lesevorgang vom Server, auch wenn der vorherige visuelle Cache noch gültig war. Es wird der Indikator `persisted` von `pageshow` überprüft: normale Ladevorgänge und interne Navigation erhalten keine zusätzliche Anfrage. Ein 403 aufgrund fehlender Berechtigungen wird nicht in eine Abmeldung umgewandelt; der Code `MFA_REQUIRED` leitet zum MFA-Herausforderung und `RECENT_AUTH_REQUIRED` bewahrt seinen aktuellen Identitätsfluss. Ein Fehler 503 wird auch nicht als geschlossene Sitzung interpretiert. Die Ziele sind feste lokale Routen. Die APIs antworten weiterhin mit JSON 401/403, ohne HTTP-Umleitungen, die Clients brechen oder Fehler verstecken.

## Freiwilliges MFA

Profil → Sicherheit verwendet das offizielle Two-Factor-Plugin mit `allowPasswordless:true`. Es gibt keinen zweiten Faktor per E-Mail. Die Aktivierung akzeptiert eine Eingabe von weniger als fünf Minuten oder eine Bestätigung per E-Mail innerhalb der App, die an die aktuelle Sitzung gebunden ist. Es generiert ein verschlüsseltes Geheimnis und bestätigt ein TOTP, bevor es den zweiten Faktor aktiviert. Der QR-Code wird im Browser generiert, ohne das Geheimnis an Dritte zu senden. Der gleiche Konfigurationsschlüssel wird kopiert, wenn er gedrückt wird, und kann manuell als TOTP in der Authentifizierungs-App geladen werden. Die Schnittstelle entfernt den QR-Code und den Konfigurationsschlüssel aus ihrem Zustand, wenn der Dialog geschlossen oder die Aktivierung abgeschlossen wird.

Die Fünf-Minuten-Frist wird seit der Eingabe gezählt, die die Sitzung erstellt hat, und nicht seit der letzten Aktivität. Die allgemeine Sitzung dauert weiterhin acht Stunden. Außer der MFA-Registrierung, die die auf dem Bildschirm beschriebene Bestätigung zulässt, wenn ein sensibler Vorgang diese Frist überschreitet, antwortet die API mit 403 und `RECENT_AUTH_REQUIRED`; die Schnittstelle erklärt die Ursache und bietet die Identitätsbestätigung in `/login/?reauth=1` an. Es wird ein neuer OTP und der zweite Faktor angefordert, wenn entsprechend, und es kehrt zu `/admin/security/` zurück. Für Profiländerungen wird `/login/?reauth=profile` verwendet und es kehrt zu `/admin/profile/` zurück. Die Ziele werden aus einer festen Liste ausgewählt: es akzeptiert keine externen Rückkehr-URLs und entfernt nicht die Überprüfung des aktuellen ersten Faktors. Der sensible Vorgang wird nicht automatisch beim Rückkehr ausführt.

Das Plugin intercepta nicht automatisch alle passwortlosen Methoden in der installierten Version. TBA conserva eine Tabelle `assurance`, die mit der Sitzung, dem Benutzer und seiner MFA-Version verknüpft ist. Jede private API lehnt eine Sitzung ab, die den zweiten Faktor nicht abgeschlossen hat. E-Mail-OTP und OAuth erzeugen zunächst eine Sitzung, die auf diese Barriere wartet. Das Ändern des Status in React oder das direkte Aufrufen einer API ermöglicht es nicht, diese zu umgehen.

Das Gateway fügt ein Budget von fünf Versuchen des zweiten Faktors pro Benutzer alle fünf Minuten hinzu, auch wenn Better Auth eine authentifizierte Sitzung des ersten Faktors erhält. Empfindliche Änderungen erfordern einen aktuellen ersten Faktor und eine neue TOTP-Bestätigung oder einen Wiederherstellungscode.

## Vertrauenswürdige Geräte

Die Widerrufung aus der Sicherheit wird innerhalb der App mit einem neuen TOTP oder Wiederherstellungscode und dem gleichen Limit von fünf Versuchen bestätigt. Es erfordert nicht, zum Login zurückzukehren, weil der Zugriff alt ist: es erfordert eine gültige Sitzung, abgeschlossenen MFA und eine neue Überprüfung des zweiten Faktors. Nach dem Entfernen aller vertrauenswürdigen Geräte und der Erhöhung der MFA-Version wird nur die Überprüfung der Sitzung, die den Code gerade bestätigt hat, zurückgesetzt. Die anderen Sitzungen müssen MFA erneut abschließen. MFA bleibt aktiv und ein neues vertrauenswürdiges Gerät wird nicht generiert. Die Deaktivierung von MFA und andere empfindliche Operationen behalten ihre Anforderungen bei.

Der offizielle Modus `trustDevice` des Plugins erfüllt nicht allein die Überprüfung aller passwortlosen Flows dieser Version. Deshalb wird ein zufälliger 256-Bit-Token mit Web Crypto generiert, der in einer HttpOnly-, Secure- und SameSite=Strict-Cookie gespeichert wird. In D1 wird nur der Hash des Tokens, des Benutzers, der MFA-Version und des absoluten Ablaufdatums von dreißig Tagen gespeichert. Es wird weder auf IP noch auf User-Agent vertraut.

Das Vertrauen wird nur nach der Überprüfung des zweiten Faktors und durch explizite Auswahl erstellt. Das Auswahlkästchen erscheint in den Schritten für E-Mail-OTP, Authenticator und Wiederherstellung und behält die Auswahl bei, wenn das Verfahren geändert oder die E-Mail erneut gesendet wird. Die Auswahl während des OTPs drückt nur eine Präferenz für den MFA-Schritt aus: es erstellt kein Vertrauen und beeinflusst keine Konten ohne MFA. Es ersetzt nie den ersten Faktor und wird nicht automatisch erneuert. Die Widerrufung des Vertrauens oder die Deaktivierung von MFA löscht die Token und erhöht die MFA-Version. Die Widerrufung von Sitzungen oder die Sperre eines Benutzers unterbricht den bestehenden Zugriff. Im localhost-Modus werden Secure und das Präfix `__Host-` weggelassen, um die HTTP-Entwicklung zu ermöglichen.

## Wiederherstellung

Beim Widerruf vertrauenswürdiger Geräte in HTTPS wird die Cookie mit den entsprechenden Sicherheitsattributen gelöscht. Die Deaktivierung von MFA widerruft das Vertrauen und die Sitzungen gemäß den in dieser Anleitung beschriebenen Regeln.

Die zehn Codes werden durch Better Auth verschlüsselt. Sie werden bei der Generierung angezeigt und jeder kann einmal verwendet werden, immer nach dem ersten Faktor. Die Regenerierung invalidiert die vorherigen. Die Benutzeroberfläche ermöglicht es, sie zu kopieren oder in einer Datei `.txt` zu speichern, die lokal durch Blob generiert wird. Die Datei enthält Hinweise zur privaten Speicherung und erinnert daran, dass die E-Mail immer noch erforderlich ist. Der Benutzer muss diese Datei selbst speichern; die Anwendung widerruft die temporäre URL und sendet sie an keinen Server. Die Benutzeroberfläche löscht sie aus dem Speicher, wenn die Anzeige geschlossen wird; sie werden nicht im Browser persistiert. Die Kamera-, SMS- und zweite E-Mail-Berechtigung sind nicht erforderlich.

## RBAC und Audit

Der Zugriff wird standardmäßig verweigert. Jede private Anfrage prüft die aktive Sitzung und die globale Autorisierungsversion. Die Berechtigungen stammen aus dem versionierten Sitzungs-Snapshot. Ist er veraltet, liest der Server die Rolle und erneuert den Snapshot. Administrative Änderungen prüfen die Berechtigung und den Administratorstatus. Der Sitzungswiderruf erfordert `users.edit`. Trigger schützen den letzten aktiven Administrator.

Die Überprüfung speichert den Akteur, die Aktion, die Ressource, das Ergebnis und das Datum. Sie speichert keine Anfrageinhalte, Geheimnisse, Codes oder Token. Die Aufbewahrungsfrist muss pro Anwendung definiert werden; ein Programm zur Sitzungslöschung, Überprüfung, Drosselung, abgelaufener Vertrauenswürdigkeit und Überprüfung mit einer expliziten Aufgabe entsprechend ihren Bedürfnissen. Die erste Version installiert keine Cronjobs oder zusätzliche Ressourcen.

## Darstellung von Berechtigungen und Aktivität

Kennungen für Berechtigungen und Ereignisse bleiben auf dem Server und in der Datenbank. Das Panel übersetzt die Bezeichnungen in die gewählte Sprache. Neue Rollen erhalten eindeutige Kennungen, bestehende behalten ihre Kennung.

Der Überprüfungs-Endpoint erfordert weiterhin `audit.read` und löst die E-Mail-Adresse des Benutzers oder den Namen der zugehörigen Rolle durch Lesejoins auf. Wenn die Ressource nicht mehr existiert, wird eine neutrale Bezeichnung angezeigt. Ressource beschreibt das betroffene Element (Sitzung, zweites Faktor, Wiederherstellung, Profil oder Vertrauenswürdigkeit), anstatt die E-Mail-Adresse des Akteurs zu wiederholen. Bei administrativen Aktionen wird der Name der anderen betroffenen Person oder ihre E-Mail-Adresse, wenn kein Name vorhanden ist, aufbewahrt; Rollen und Konfigurationen zeigen ihren lesbaren Namen. Die Namen werden durch die bestehenden Lesejoins aufgelöst, ohne die Ereignisse zu ändern. Die ursprünglichen Referenzen werden in D1 für die Nachverfolgbarkeit aufbewahrt; die Überprüfungsschnittstelle zeigt keine technischen Codes oder Identifikatoren in ausklappbaren Details an. Die Historie wird nicht geändert oder neu geschrieben.

Die Selektoren verwenden ein Combobox mit Optionen in einem Popover und behalten ein `select` natives, verstecktes Element, um Formulare zu serialisieren und zu validieren. Das Menü wird entsprechend dem verfügbaren Platz positioniert, ohne von dem Dialog abgeschnitten zu werden. Es ermöglicht Pfeiltasten, Pos1/Ende, Auswahl mit Enter, Escape und Tab; es schließt, wenn außerhalb geklickt, das Fenster vergrößert oder der Container verschoben wird. Pflichtfelder fokussieren den Selektor und zeigen eine Validierungsmeldung an. Es wurden keine Abhängigkeiten hinzugefügt. Die Autovervollständigung respektiert die Farben des hellen oder dunklen Themas.

## Änderung der Zugriffsemail

Das Profil bietet einen guidierten Workflow über das Email-OTP-Plugin von Better Auth: `POST /api/private/profile/email/request` sendet den Code an die neue Adresse und `POST /api/private/profile/email/confirm` überprüft und wendet die Änderung an. Beide erfordern eine aktive Sitzung, vollständige MFA, wenn zutreffend, und einen ersten Faktor von weniger als fünf Minuten. Die Bestätigung erfordert außerdem einen neuen Code von Authenticator oder Wiederherstellung, wenn das Konto MFA hat, auch mit einem vertrauenswürdigen Gerät. Die API informiert `mfaRequired` bei der Anfrage der E-Mail-Adresse und lehnt eine Bestätigung ohne zweiten Faktor mit `MFA_CONFIRMATION_REQUIRED` ab, bevor der E-Mail-OTP verbraucht wird. Die Kontrollen für Ursprung, JSON, Größe und Häufigkeit werden beibehalten. Die rohen Endpunkte des Plugins bleiben durch das Gateway blockiert.

Ein OTP mit Hash, fünf Minuten Gültigkeit und maximal fünf Versuchen wird verwendet, der an den Benutzer und die neue Adresse gebunden ist. Eine bereits verwendete Adresse erhält keinen Code und ersetzt keine andere Kontoverbindung. Die aktuelle Adresse bleibt gültig, bis die Überprüfung abgeschlossen ist. Keine E-Mail-Adresse wird manuell als verifiziert markiert: der offizielle Plugin-Vorgang tut dies nur nach der Überprüfung des OTP.

Better Auth prüft und verbraucht den E-Mail-Code. Die Persistenzschicht speichert die Benutzeränderung, die neue MFA-Version, den Widerruf von Geräten und Sitzungen sowie den Auditeintrag atomar. D1 nutzt einen Batch. SQLite und PostgreSQL verwenden Transaktionen. Bei einem Schreibfehler ist ein neuer Code erforderlich.

Sobald dieser Vorgang bestätigt wurde, wird ein späterer Fehler bei der Vorbereitung der Antwort von Better Auth nicht als fehlgeschlagene Änderung gemeldet. Es ist nicht notwendig, ein Ersatz-Cookie auszustellen, da die Sitzungen bereits widerrufen sind. Die Benachrichtigung an die vorherige Adresse wird außerhalb des Vorgangs über `waitUntil` gesendet; ihr Fehler wird separat protokolliert und beeinträchtigt den Erfolg der Änderung nicht. Die Fehlerdiagnosen protokollieren nur Phasen-, Methoden- und Routen-Labels, ohne E-Mail, OTP, MFA, Cookies oder Anforderungskörper. Die Person muss sich erneut anmelden mit der neuen E-Mail und ihrem MFA. Der Benutzer-Identifikator, die Rolle, der Status, das TOTP-Geheimnis und die verbleibenden Wiederherstellungs-Codes werden beibehalten. Wenn eines verwendet wird, um die Änderung zu bestätigen, wird es wie bei jeder Überprüfung verbraucht. Die Überwachung protokolliert das Ereignis und den Benutzer-Identifikator, ohne Codes oder Anforderungskörper. Es sind keine Migrationen oder neuen Tabellen erforderlich.

Grundlegende Benutzer-, Anfrage- und Auditlisten bleiben mit begrenzter Navigation und serverseitigen Berechtigungen erhalten. Erweiterte Tabellenmodule und Excel gehören nicht zur Basis. Projekte ergänzen sie bei Bedarf. Siehe [Umfang](template-scope.md).

<a id="email-verification-before-mfa-de"></a>

### E-Mail-Bestätigung zum Aktivieren von MFA ohne App-Verlassen

Wenn der Login fünf Minuten überschreitet, antworten `enroll` und `confirm` mit `MFA_ENROLL_CONFIRMATION_REQUIRED`. Die Schnittstelle sendet einen Code an die Adresse des authentifizierten Akteurs über `/api/private/security/enroll/email`, bestätigt ihn über `/api/private/security/enroll/email/confirm` und fährt mit dem QR-Code fort. Sie leitet nicht zum Login um, ändert keine Cookies, die Sitzungsalters oder deren Berechtigungen. Eine abgelaufene oder widerrufene Sitzung antwortet weiterhin mit 401.

Der sechsstellige kryptografische Code wird als Hash mit dem App-Geheimnis und der Sitzungs-Identifikator in der bestehenden Überprüfungstabelle gespeichert. Er läuft in fünf Minuten ab, erlaubt fünf Versuche und wird nur einmal durch bedingte Aktualisierung verbraucht. Die Sendung ist auf einen Code pro Benutzer pro Minute beschränkt. Die resultierende Autorisierung dauert fünf Minuten und dient ausschließlich dazu, die MFA-Erstellung in dieser Sitzung zu starten und zu bestätigen; sie ersetzt nicht das TOTP der Aktivierung, noch autorisiert sie Änderungen der E-Mail, Deaktivierung, Wiederherstellung oder Widerruf. Sie wird gelöscht, sobald die Erstellung abgeschlossen ist. Es werden keine Tabellen, Migrationen oder Dienste erstellt.
