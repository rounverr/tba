# <picture><img src="../assets/icons/mail.svg" width="28" height="28" alt=""></picture> メールの設定

<p align="center"><a href="../en/setup-mail.md" lang="en">English</a> | <a href="../es/setup-mail.md" lang="es">Español</a> | <a href="../pt/setup-mail.md" lang="pt">Português</a> | <a href="../de/setup-mail.md" lang="de">Deutsch</a> | <a href="../fr/setup-mail.md" lang="fr">Français</a> | <a href="../it/setup-mail.md" lang="it">Italiano</a> | <a href="../zh/setup-mail.md" lang="zh">简体中文</a> | <strong>日本語</strong> | <a href="../hi/setup-mail.md" lang="hi">हिन्दी</a> | <a href="../ar/setup-mail.md" lang="ar">العربية</a></p>

[技術ドキュメント](README.md) | [プロジェクト概要](../README.ja.md)

> [!NOTE]
> Cloudflare Email Sending は Workers の `EMAIL` バインディングで動作します。Resend と開発用メールボックスは Workers と Node.js で使えます。Wavicc は将来の連携予定です。

セットアップは `--mail local`、`--mail resend`、`--mail cloudflare` に対応します。ローカルメールはローカルの `APP_URL` と `npm run mail:dev`、Resend は `RESEND_API_KEY` と `MAIL_FROM` を使います。Cloudflare は既存アダプターを使い、`EMAIL` という `send_email` バインディング、許可された `MAIL_FROM`、送信設定済みドメインが必要です。ローカル条件だけを検査し、リソース作成や遠隔ドメイン検証は行いません。後回しにでき、対話モードは続行を確認し、非対話モードは未設定項目を表示して続行します。バインディング・送信元・資格情報を生成せず、設定完了まで送信できません。秘密情報は Git 外に保存します。Wavicc は将来の優先連携で、`WAVICC_API_KEY` は予約用です。[メールセットアップ](setup-mail.md)を参照してください。

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
