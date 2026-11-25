# <picture><img src="../assets/icons/mail.svg" width="28" height="28" alt=""></picture> Configuração de e-mail

<p align="center"><a href="../en/setup-mail.md" lang="en">English</a> | <a href="../es/setup-mail.md" lang="es">Español</a> | <strong>Português</strong> | <a href="../de/setup-mail.md" lang="de">Deutsch</a> | <a href="../fr/setup-mail.md" lang="fr">Français</a> | <a href="../it/setup-mail.md" lang="it">Italiano</a> | <a href="../zh/setup-mail.md" lang="zh">简体中文</a> | <a href="../ja/setup-mail.md" lang="ja">日本語</a> | <a href="../hi/setup-mail.md" lang="hi">हिन्दी</a> | <a href="../ar/setup-mail.md" lang="ar">العربية</a></p>

[Documentação técnica](README.md) | [Visão geral do projeto](../README.pt.md)

> [!NOTE]
> Cloudflare Email Sending funciona em Workers com o binding `EMAIL`. Resend e a caixa local funcionam em Workers e Node.js. Wavicc é uma integração futura.

O setup aceita `--mail local`, `--mail resend` e `--mail cloudflare`. E-mail local usa `APP_URL` local e `npm run mail:dev`. Resend exige `RESEND_API_KEY` e `MAIL_FROM`. Cloudflare reutiliza o adaptador existente e exige binding `send_email` chamado `EMAIL`, `MAIL_FROM` permitido e domínio habilitado para envio. O setup verifica requisitos locais sem criar recursos nem verificar domínios remotos. É possível configurar depois: o modo interativo pergunta se deseja continuar; o não interativo continua com pendências. Não inventa bindings, remetentes ou credenciais; o envio depende da configuração. Segredos ficam fora do Git. Wavicc permanece a integração futura preferida, com `WAVICC_API_KEY` como placeholder. Consulte o [setup de e-mail](setup-mail.md).

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
