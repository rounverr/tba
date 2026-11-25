# <picture><img src="../assets/icons/mail.svg" width="28" height="28" alt=""></picture> Configurazione della posta

<p align="center"><a href="../en/setup-mail.md" lang="en">English</a> | <a href="../es/setup-mail.md" lang="es">Español</a> | <a href="../pt/setup-mail.md" lang="pt">Português</a> | <a href="../de/setup-mail.md" lang="de">Deutsch</a> | <a href="../fr/setup-mail.md" lang="fr">Français</a> | <strong>Italiano</strong> | <a href="../zh/setup-mail.md" lang="zh">简体中文</a> | <a href="../ja/setup-mail.md" lang="ja">日本語</a> | <a href="../hi/setup-mail.md" lang="hi">हिन्दी</a> | <a href="../ar/setup-mail.md" lang="ar">العربية</a></p>

[Documentazione tecnica](README.md) | [Panoramica del progetto](../README.it.md)

> [!NOTE]
> Cloudflare Email Sending funziona su Workers con il binding `EMAIL`. Resend e la casella locale funzionano su Workers e Node.js. Wavicc è un’integrazione prevista.

Il setup accetta `--mail local`, `--mail resend` e `--mail cloudflare`. La posta locale usa `APP_URL` locale e `npm run mail:dev`. Resend richiede `RESEND_API_KEY` e `MAIL_FROM`. Cloudflare riutilizza l’adattatore esistente e richiede un binding `send_email` chiamato `EMAIL`, `MAIL_FROM` consentito e dominio abilitato all’invio. Il setup verifica localmente senza creare risorse né verificare domini remoti. Si può configurare dopo: il modo interattivo chiede se proseguire, quello non interattivo continua con le attività pendenti. Non inventa binding, mittenti o credenziali; l’invio richiede la configurazione. I segreti restano fuori da Git. Wavicc resta l’integrazione futura preferita con `WAVICC_API_KEY` come placeholder. Vedi il [setup email](setup-mail.md).

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
