# <picture><img src="../assets/icons/mail.svg" width="28" height="28" alt=""></picture> 邮件配置

<p align="center"><a href="../en/setup-mail.md" lang="en">English</a> | <a href="../es/setup-mail.md" lang="es">Español</a> | <a href="../pt/setup-mail.md" lang="pt">Português</a> | <a href="../de/setup-mail.md" lang="de">Deutsch</a> | <a href="../fr/setup-mail.md" lang="fr">Français</a> | <a href="../it/setup-mail.md" lang="it">Italiano</a> | <strong>简体中文</strong> | <a href="../ja/setup-mail.md" lang="ja">日本語</a> | <a href="../hi/setup-mail.md" lang="hi">हिन्दी</a> | <a href="../ar/setup-mail.md" lang="ar">العربية</a></p>

[技术文档](README.md) | [项目概览](../README.zh.md)

> [!NOTE]
> Cloudflare Email Sending 在 Workers 上使用 `EMAIL` 绑定。Resend 和本地邮箱支持 Workers 与 Node.js。Wavicc 是未来集成。

初始化工具支持 `--mail local`、`--mail resend` 和 `--mail cloudflare`。本地邮件使用本地 `APP_URL` 和 `npm run mail:dev`；Resend 需要 `RESEND_API_KEY` 与 `MAIL_FROM`。Cloudflare 复用现有适配器，需要名为 `EMAIL` 的 `send_email` 绑定、允许的 `MAIL_FROM` 以及已启用发送的域名。工具只检查本地条件，不创建资源或验证远程域名。可稍后配置：交互模式询问是否继续，非交互模式列出待办后继续。不编造绑定、发件人或密钥，配置完成前无法发送邮件。密钥不得进入 Git。Wavicc 保留为首选未来集成，`WAVICC_API_KEY` 仅作占位。参见[邮件初始化](setup-mail.md)。

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
