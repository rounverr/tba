# <picture><img src="../assets/icons/users.svg" width="28" height="28" alt=""></picture> Registrierung, Genehmigungen und Erweiterungen

<p align="center"><a href="../en/registration.md" lang="en">English</a> | <a href="../es/registration.md" lang="es">Español</a> | <a href="../pt/registration.md" lang="pt">Português</a> | <strong>Deutsch</strong> | <a href="../fr/registration.md" lang="fr">Français</a> | <a href="../it/registration.md" lang="it">Italiano</a> | <a href="../zh/registration.md" lang="zh">简体中文</a> | <a href="../ja/registration.md" lang="ja">日本語</a> | <a href="../hi/registration.md" lang="hi">हिन्दी</a> | <a href="../ar/registration.md" lang="ar">العربية</a></p>

[Technische Dokumentation](README.md) | [Projektübersicht](../README.de.md)

> [!NOTE]
> Die anfängliche Modalität ist `closed`. Es wird kein öffentlicher Registrierungslink angezeigt und die API lehnt Registrierungsanfragen ab. Administratoren können Konten erstellen, die dann ihre E-Mail-Adresse bei der Anmeldung verifizieren.

In `approval` fordert die Person ein OTP an und bestätigt ihre E-Mail-Adresse. TBA erstellt ein Konto im Wartezustand ohne Rolle und eine eindeutige Anfrage, widerruft jede vorläufige Sitzung und benachrichtigt die Administratoren über den E-Mail-Adapter. Die Genehmigung erfordert die Auswahl einer expliziten Rolle; die Ablehnung ermöglicht keinen Zugriff. Beide Aktionen werden protokolliert. Bei der Genehmigung wird der Benutzer benachrichtigt.

In `open` wird die E-Mail-Adresse vor der Aktivierung des Kontos verifiziert. Ein Administrator wählt die anfängliche Rolle aus dem Bereich "Zugriff und Registrierung" zwischen **allen konfigurierten Rollen** aus, einschließlich benutzerdefinierter Rollen, Editor und Administrator. Die Wahl wird in `settings.public_role_id` gespeichert, ohne dass sich das Schema ändert. Der Server überprüft, ob die Rolle existiert und ob der Administrator die offene Registrierung explizit bestätigt. Der besuchende Benutzer, der sich registriert, wählt niemals eine effektive Rolle aus und sendet sie nicht: Die auf dem Server konfigurierte Rolle wird angewendet, wenn die E-Mail-Verifizierung abgeschlossen ist.

Der Selektor erscheint nur, wenn die offene Registrierung ausgewählt wird. Er verwendet das Menü der App, zeigt die Berechtigungen der Rolle an (oder die vollständige administrative Kontrolle), behält die Auswahl bei der Sprachänderung bei und erfordert eine erneute Bestätigung, wenn die Rolle geändert wird. Wenn es keine Rollen gibt oder die konfigurierte Rolle nicht mehr verfügbar ist, erklärt es die Situation und verhindert die Speicherung einer leeren Auswahl. Die Texte sind in zehn Sprachen übersetzt.

Die Änderungen betreffen nur neue Registrierungen. Vorherige Konten und Anfragen behalten ihren Status und ihre Rolle. Eine vorherige ausstehende Anfrage wird niemals genehmigt, weil sich die Modalität ändert. Jede Fertigstellung überprüft erneut die Modalität und die aktuelle Rolle; wenn es keine gültige Rolle gibt, wird das Konto nicht aktiviert. Es werden E-Mail-OTP, Sendelimits, Versuche, Konfigurationsberechtigungen und Protokollierung beibehalten.

Die öffentliche Rollenmarke mit grundlegendem Zugriff (`isPublic`) behält ihre Mindestberechtigungsvalidierung im Rolleneditor bei, beschränkt jedoch den anfänglichen Rollenselektor nicht mehr. Die Auswahl einer Verwaltungsrolle oder einer Administratorrolle gewährt den neuen Konten denselben Umfang; die Ansicht zeigt diesen Umfang an und schließt ihn in die Bestätigung ein.

Die private Konfigurationsabfrage liefert die Rollen in derselben Antwort: Eine einzelne HTTP-Anfrage, ohne zusätzliche Abfragen beim Sprachwechsel oder Öffnen des Selektors. Sie fügt eine D1-Rollenlektüre zu den beiden vorhandenen Lektüren dieser Ansicht hinzu. Die anderen Ansichten behalten ihr Abfragebudget bei.

## Erweiterung

`src/server/services/registration-hook.ts` expose `onUserRegistered(user, context)`. Der Kern erstellt keine CRM-, CMS- oder anderen Geschäftsprofile. Die Funktion erhält nur die Identität und einen stabilen Schlüssel `registration:<userId>`; sie erhält keine änderbaren Berechtigungen.

Die Tabelle `registration_event` verhindert doppelte, abgeschlossene Lieferungen und fordert die Ausführung durch eine bedingte Aktualisierung an. Eine fehlgeschlagene Lieferung bleibt ausstehend und eine blockierte Lieferung kann nach fünf Minuten wieder aufgenommen werden. Ein Administrator kann die Lieferung erneut versuchen, indem er `POST /api/private/hooks/:userId/retry` verwendet.

Die Semantik ist **mindestens einmal**: Ein Prozess könnte beenden, nachdem er eine Wirkung erzeugt hat, bevor er das Ereignis als abgeschlossen markiert. Der Verbraucher muss seine Schreibvorgänge idempotent mit `context.idempotencyKey` machen, beispielsweise durch einen UNIQUE-Index. Wir versprechen keine externen Wirkungen genau einmal. Fehler im Erweiterungspunkt gewähren keine zusätzlichen Berechtigungen und blockieren die Persistenz der verifizierten Identität nicht.

Um ein CMS zu erweitern, erstellen Sie eine eigene Profiltabelle mit `user_id UNIQUE`, fügen Sie sie mit `ON CONFLICT DO NOTHING` ein und behalten Sie die Kontrolle über die Berechtigungen außerhalb des Callbacks. Das Beispiel wird nicht automatisch ausgeführt und gehört nicht zum TBA-Kern.
