# <picture><img src="../assets/icons/mail.svg" width="28" height="28" alt=""></picture> Email setup

<p align="center"><strong>English</strong> | <a href="../es/setup-mail.md" lang="es">Español</a> | <a href="../pt/setup-mail.md" lang="pt">Português</a> | <a href="../de/setup-mail.md" lang="de">Deutsch</a> | <a href="../fr/setup-mail.md" lang="fr">Français</a> | <a href="../it/setup-mail.md" lang="it">Italiano</a> | <a href="../zh/setup-mail.md" lang="zh">简体中文</a> | <a href="../ja/setup-mail.md" lang="ja">日本語</a> | <a href="../hi/setup-mail.md" lang="hi">हिन्दी</a> | <a href="../ar/setup-mail.md" lang="ar">العربية</a></p>

[Technical documentation](README.md) | [Project overview](../../README.md)

> [!NOTE]
> Cloudflare Email Sending runs on Workers with the `EMAIL` binding. Resend and local development mail run on Workers and Node.js. Wavicc remains a planned integration.

Setup supports `--mail local`, `--mail resend` and `--mail cloudflare`. Local mail uses a local `APP_URL` and `npm run mail:dev`. Resend needs `RESEND_API_KEY` and `MAIL_FROM`. Cloudflare reuses the existing adapter and needs a `send_email` binding named `EMAIL`, an allowed `MAIL_FROM` and an onboarded sending domain. Setup checks local requirements without provisioning or verifying a remote domain. Missing configuration can be completed later: interactive setup asks whether to continue; noninteractive setup continues with a pending checklist. It does not invent a binding, sender or credential, and email cannot be delivered until configured. Keep secrets outside Git. Wavicc remains the preferred future integration and `WAVICC_API_KEY` a placeholder. See [mail setup](setup-mail.md).

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
