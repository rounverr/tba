# <picture><img src="../assets/icons/mail.svg" width="28" height="28" alt=""></picture> Configuración de correo

<p align="center"><a href="../en/setup-mail.md" lang="en">English</a> | <strong>Español</strong> | <a href="../pt/setup-mail.md" lang="pt">Português</a> | <a href="../de/setup-mail.md" lang="de">Deutsch</a> | <a href="../fr/setup-mail.md" lang="fr">Français</a> | <a href="../it/setup-mail.md" lang="it">Italiano</a> | <a href="../zh/setup-mail.md" lang="zh">简体中文</a> | <a href="../ja/setup-mail.md" lang="ja">日本語</a> | <a href="../hi/setup-mail.md" lang="hi">हिन्दी</a> | <a href="../ar/setup-mail.md" lang="ar">العربية</a></p>

[Documentación técnica](README.md) | [Presentación del proyecto](../README.es.md)

> [!NOTE]
> Cloudflare Email Sending funciona en Workers con el binding `EMAIL`. Resend y el buzón de desarrollo funcionan en Workers y Node.js. Wavicc es una integración prevista.

El setup admite `--mail local`, `--mail resend` y `--mail cloudflare`. El correo local usa un `APP_URL` local y `npm run mail:dev`. Resend requiere `RESEND_API_KEY` y `MAIL_FROM`. Cloudflare reutiliza el adaptador existente y requiere un binding `send_email` llamado `EMAIL`, un `MAIL_FROM` permitido y un dominio habilitado para enviar. El setup comprueba requisitos locales sin crear recursos ni verificar dominios remotos. Se puede configurar después: el modo interactivo pregunta si deseas continuar y el no interactivo continúa con una lista de pendientes. No inventa bindings, remitentes ni credenciales; el correo no podrá enviarse hasta configurarlo. Guarda los secretos fuera de Git. Wavicc sigue como integración futura preferida y `WAVICC_API_KEY` como placeholder. Consulta el [setup de correo](setup-mail.md).

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
