# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> Sprache und Panel-Selektor

<p align="center"><a href="../en/workspace-i18n.md" lang="en">English</a> | <a href="../es/workspace-i18n.md" lang="es">Español</a> | <a href="../pt/workspace-i18n.md" lang="pt">Português</a> | <strong>Deutsch</strong> | <a href="../fr/workspace-i18n.md" lang="fr">Français</a> | <a href="../it/workspace-i18n.md" lang="it">Italiano</a> | <a href="../zh/workspace-i18n.md" lang="zh">简体中文</a> | <a href="../ja/workspace-i18n.md" lang="ja">日本語</a> | <a href="../hi/workspace-i18n.md" lang="hi">हिन्दी</a> | <a href="../ar/workspace-i18n.md" lang="ar">العربية</a></p>

[Technische Dokumentation](README.md) | [Projektübersicht](../README.de.md)

> [!TIP]
> Englisch ist die Basissprache des Codes und des Setup-Assistenten. Alle zehn Übersetzungen und lokalen Schriften sind enthalten. `npm run setup -- --languages en,pt` aktiviert nur Englisch und Portugiesisch, ohne zusätzliche Pakete oder das Löschen anderer Übersetzungen. Ohne `--languages` bleibt die Auswahl erhalten; ohne vorhandene Liste gelten alle zehn. Englisch bleibt als Übersetzungsfallback aktiv. `--locale en` legt die Anwendungssprache als Standard fest; jede aktivierte Sprache ist zulässig. Vorrang haben gespeicherte Präferenz, unterstützte Browsersprache und konfigurierter Standard. Sprachwechsel laden keine Seite neu und bewahren Formulare; Arabisch behält RTL.

Login, öffentliche Seiten, Verwaltung, Dialoge, Validierungen und E-Mails unterstützen `en`, `es`, `pt`, `de`, `fr`, `it`, `zh`, `ja`, `hi` und `ar`. Vorrang haben die gespeicherte gültige Präferenz (`tba-language`), die erste unterstützte Sprache aus `navigator.languages`/`navigator.language`, dann Englisch. Regionale Varianten wie `es-AR`, `pt-BR` und `en-GB` werden normalisiert.

Der Selektor ist ein 48 × 38 px großes Button-Symbol mit Sprachsymbol und Pfeil. Sein Menü zeigt die zehn natürlichen Namen, kurzen Codes und die aktuelle Option, mit Farben und Oberflächen des Themas. Die Breite und Höhe sind auf den verfügbaren Platz begrenzt. Es wird `ui/select.tsx` wiederverwendet, wobei der native Select-Button versteckt bleibt, um Serialisierung zu ermöglichen, und optionalen Inhalt, Header und Dimensionen hinzufügt. Die anderen Select-Buttons behalten ihre Werte und Funktionalität.

Das Menü unterstützt Pfeiltasten, Home/End, Schreiben durch Initialen, Enter, Escape, Tab und externes Schließen. Der Fokus kehrt zum Steuerelement zurück, wenn man auswählt oder mit Escape abbricht. Das Sprachsymbol bleibt stabil und nur der Pfeil dreht sich. Es werden reduzierte Bewegung, Tastatur, Screen-Reader, Mobile-Geräte und RTL respektiert. Der Selektor erscheint nur im Login und im Header der App. Die Dialoge und Formulare erben diese Präferenz und enthalten keine eigenen Sprachsteuerungen.

## Texte und Daten

`AuthI18n` wiederverwendet den bestehenden Kontext für das Panel. `page=panel` konfiguriert Sprache und Richtung, während Admin seine Titel pro Ansicht und den bestehenden Autorisierungswächter beibehält. Die anfängliche Ausgabe des Panels bleibt leer, bis die Autorisierung erteilt wird.

`src/lib/i18n/panel/*.json` zentralisiert die Kataloge des Panels. `panel.ts` wendet Fallback und Parameter an; `panel-sources.json` verbindet die bestehenden kanonischen Etiketten und öffentlichen Servernachrichten mit übersetzbaren Schlüsseln. `use-panel.ts` bietet das Format für Komponenten. Die dynamischen Texte für Bestätigung und Download speichern Schlüssel und Parameter, sodass sie die Sprache ändern, auch wenn sie geöffnet sind.

`src/lib/i18n/config.ts` definiert Sprachen und Richtung. `messages/*.json` und `panel/*.json` enthalten öffentliche und administrative Kataloge; `catalog.ts`, `panel.ts` und der Kontext liefern Schlüssel, Parameter und Fallback. Alle zehn Kataloge müssen vollständig bleiben. Unbekannte Fehler erhalten einen übersetzten öffentlichen Text. Namen, Adressen, eigene Rollennamen und Codes werden nicht übersetzt.

`X-Auth-Language` wählt eine aktivierte E-Mail-Sprache, niemals Berechtigungen. Ohne gültigen Header oder Empfängerpräferenz gilt der konfigurierte Standard (anfangs Englisch). Deaktivierte gespeicherte Sprachen fallen ebenfalls darauf zurück. Fehlende Schlüssel verwenden Englisch. Bestätigter Zugang/Registrierung und die Panelauswahl speichern die Präferenz in `verification` (`mail-language:<userId>`); spätere Mitteilungen verwenden die Empfängersprache. Sprachwechsel versenden keine Codes erneut und ändern weder Ablauf noch Versuche oder Prüfung. Frühere Fehlertexte bleiben kompatibel.

Die Sprachauswahl befindet sich beim Login und im Anwendungskopf. Dialoge übernehmen die Sprache ohne eigene Auswahl. React aktualisiert Texte ohne Neuladen oder Navigation und bewahrt Formulare, Sitzung und Ansicht. Ein Wechsel im Panel sendet zusätzlich `POST /api/private/profile/language` für spätere E-Mails, ohne Verwaltungsdaten neu zu laden. Gesperrter Browserspeicher verhindert die Übersetzung der aktuellen Sitzung nicht.

## RTL und Schriftarten

Arabisch platziert die Seitenleiste und die Ränder des Panels auf der rechten Seite, passt das Willkommensbild, Pfeile, Steuerungen, Tabellen und Dialoge an. E-Mails, Schlüssel und Codes behalten LTR. Die langen Schaltflächen und die Sicherheitszeilen werden auf kleinen Bildschirmen angepasst. Die Menüs verwenden die lokalen Schriftarten der zehn Sprachen. Die CJK-Teilmengen enthalten auch die Zeichen der neuen Kataloge des Panels, über `scripts/build-auth-fonts.py`.

## Dateien und Überprüfung

Die Sprachtests verwenden Better Auth und D1-Lokale oder simulierte APIs. Siehe [Implementierung des multilingualen Zugriffs](auth-i18n.md).

Englisch bleibt als Fallback enthalten. Weitere Login- und Panelkataloge werden dynamisch importiert und pro Modul im Speicher gehalten. Tastatur- oder Zeigerfokus lädt nur die betreffende Option vor; das Menü lädt nicht alle Sprachen. Der Wechsel erfolgt erst mit vollständigen Katalogen und erhält Formulare, Sitzung und Navigation. Zwischengespeicherte Wechsel benötigen kein Netz; die letzte Auswahl gilt. Ein anfänglicher Ladefehler zeigt Englisch, ein späterer Fehler erhält die aktuelle Sprache. E-Mails und Build-Metadaten verwenden vollständige Serverkataloge. Siehe [Sprachladen](language-loading.md).
