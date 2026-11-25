# <picture><img src="../assets/icons/mail.svg" width="28" height="28" alt=""></picture> E-Mail-Einrichtung

<p align="center"><a href="../en/setup-mail.md" lang="en">English</a> | <a href="../es/setup-mail.md" lang="es">Español</a> | <a href="../pt/setup-mail.md" lang="pt">Português</a> | <strong>Deutsch</strong> | <a href="../fr/setup-mail.md" lang="fr">Français</a> | <a href="../it/setup-mail.md" lang="it">Italiano</a> | <a href="../zh/setup-mail.md" lang="zh">简体中文</a> | <a href="../ja/setup-mail.md" lang="ja">日本語</a> | <a href="../hi/setup-mail.md" lang="hi">हिन्दी</a> | <a href="../ar/setup-mail.md" lang="ar">العربية</a></p>

[Technische Dokumentation](README.md) | [Projektübersicht](../README.de.md)

> [!NOTE]
> Cloudflare Email Sending läuft auf Workers mit dem Binding `EMAIL`. Resend und das lokale Entwicklungs-Postfach laufen auf Workers und Node.js. Wavicc ist geplant.

Setup unterstützt `--mail local`, `--mail resend` und `--mail cloudflare`. Lokal werden eine lokale `APP_URL` und `npm run mail:dev` verwendet. Resend benötigt `RESEND_API_KEY` und `MAIL_FROM`. Cloudflare nutzt den bestehenden Adapter und benötigt ein `send_email`-Binding namens `EMAIL`, einen erlaubten `MAIL_FROM` und eine eingerichtete Versanddomain. Setup prüft lokal, ohne Ressourcen anzulegen oder entfernte Domains zu prüfen. Fehlendes kann später ergänzt werden: interaktiv wird nach Fortsetzung gefragt, nicht interaktiv mit einer Aufgabenliste fortgefahren. Binding, Absender und Zugangsdaten werden nicht erfunden; bis zur Konfiguration erfolgt kein Versand. Geheimnisse gehören nicht in Git. Wavicc bleibt die bevorzugte künftige Integration mit `WAVICC_API_KEY` als Platzhalter. Siehe [Mail-Setup](setup-mail.md).

```bash
npm run setup -- --mail local
npm run setup -- --mail resend
npm run setup -- --mail cloudflare
```

```jsonc
// Merge into the existing configuration; preserve its other bindings and vars.
{
  "send_email": [{ "name": "EMAIL" }],
  "vars": { "MAIL_FROM": "sender@example.com" }
}
```
