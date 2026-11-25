# <picture><img src="../assets/icons/database.svg" width="28" height="28" alt=""></picture> データベースエンジン

<p align="center"><a href="../en/database-engines.md" lang="en">English</a> | <a href="../es/database-engines.md" lang="es">Español</a> | <a href="../pt/database-engines.md" lang="pt">Português</a> | <a href="../de/database-engines.md" lang="de">Deutsch</a> | <a href="../fr/database-engines.md" lang="fr">Français</a> | <a href="../it/database-engines.md" lang="it">Italiano</a> | <a href="../zh/database-engines.md" lang="zh">简体中文</a> | <strong>日本語</strong> | <a href="../hi/database-engines.md" lang="hi">हिन्दी</a> | <a href="../ar/database-engines.md" lang="ar">العربية</a></p>

[技術ドキュメント](README.md) | [プロジェクト概要](../README.ja.md)

> [!NOTE]
> D1 は Cloudflare Workers、SQLite と PostgreSQL は Node.js 24 以降で動作します。インストールごとにソースを別に用意します。`npm ci` と `npm run setup -- --interactive` を実行してエンジンを選びます。既定値は D1 です。`DATABASE_URL` と `BETTER_AUTH_SECRET` は `.dev.vars` または環境変数に保存します。[コマンド表](../en/database-engines.md)に従ってビルド、マイグレーション、管理者の初期化を行い、`npm start` で起動します。PostgreSQL には `--target` が必要です。移行前にバックアップし、Node ではローカルメールまたは Resend を使います。[D1 の運用](operations.md) | [メール設定](setup-mail.md)

D1 と SQLite は `drizzle/` の 0001 から 0003 までの SQL を適用します。PostgreSQL は `drizzle/postgresql/` の独立した番号付きファイルを使います。履歴はインストールごとに保持します。

`better-sqlite3` は SQLite のみに必要なオプション依存関係です。SQLite のファイルは `dist` の外に置きます。PostgreSQL は TLS で証明書とホスト名を検証します。リモート接続では `--target ホスト:ポート/データベース` を指定します。

0001 から 0003 までのマイグレーションでは、SQL 構文として PostgreSQL 11 以上が必要です。統合テストでは 17.12 と 18.7 を確認しました。新規インストールにはサポート中のバージョン、特に PostgreSQL 18 の最新パッチを推奨します。

Windows のインストールとジャンクション、外部 Google OAuth コールバック、Resend の実配信、独立した侵入テストは未検証です。
