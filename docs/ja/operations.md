# <picture><img src="../assets/icons/settings.svg" width="28" height="28" alt=""></picture> 設定と運用

<p align="center"><a href="../en/operations.md" lang="en">English</a> | <a href="../es/operations.md" lang="es">Español</a> | <a href="../pt/operations.md" lang="pt">Português</a> | <a href="../de/operations.md" lang="de">Deutsch</a> | <a href="../fr/operations.md" lang="fr">Français</a> | <a href="../it/operations.md" lang="it">Italiano</a> | <a href="../zh/operations.md" lang="zh">简体中文</a> | <strong>日本語</strong> | <a href="../hi/operations.md" lang="hi">हिन्दी</a> | <a href="../ar/operations.md" lang="ar">العربية</a></p>

[技術ドキュメント](README.md) | [プロジェクト概要](../README.ja.md)

TBA の既定構成は Cloudflare Workers と D1 です。同じ画面と Hono API は Node.js 上で SQLite または PostgreSQL と組み合わせて動作します。 [データベースエンジン](database-engines.md)

コードと setup アシスタントは英語を基準とします。10言語の翻訳とローカルフォントを同梱しています。`npm run setup -- --languages en,pt` は英語とポルトガル語のみを有効化し、追加パッケージのインストールや他の翻訳の削除は行いません。`--languages` を省略すると現在の選択を維持し、一覧がない設定では全10言語が有効です。英語は翻訳フォールバックとして常に有効です。`--locale en` で既定言語を指定でき、有効な言語を選べます。保存設定、対応ブラウザー言語、設定した既定値の順に解決します。言語変更でページやフォームは再読み込みせず、アラビア語の RTL も保持します。

`npm run setup -- --interactive` | `--name` | `--id` | `--domain` | `--database` | `--account` | `--mail local|resend|cloudflare` | `--google true|false` | `--mfa true|false` | `--trust true|false` | `--r2 true|false` | `--theme light|dark`.

セットアップは `.dev.vars` がなければランダムなシークレットを生成します。資格情報は Git の管理対象外に保存します。セットアップは管理者の作成やリモートリソースの作成を行いません。

## データベースとマイグレーション

D1 と SQLite は `drizzle/` の 0001 から 0003 までの SQL を使います。PostgreSQL の履歴は `drizzle/postgresql/` にあります。0003 適用後、既存のセッションは次回の権限確認時に認可スナップショットを取得します。[エンジンごとのコマンド](database-engines.md)を参照してください。

`npm run db:generate` は Drizzle の変更候補を `drizzle/generated` に出力します。適用する SQL を確認してから次の番号で追加してください。適用済みのファイルは変更せず、移行前にバックアップを取ります。

> [!IMPORTANT]
> Cloudflare の `db:create`、`db:link`、`db:migrate:remote`、`deploy` は、対象アカウントの `--account` と明示的な `--confirm` が必要です。`db:link` は対象のスキーマを表示し、確認後にバインディングを保存します。環境ごとに `--config wrangler.<environment>.jsonc` で、別の名前、公開 URL、アカウント ID とデータベース ID を持つ設定を指定します。

## シークレットとメール

セットアップは `--mail local`、`--mail resend`、`--mail cloudflare` に対応します。ローカルメールはローカルの `APP_URL` と `npm run mail:dev`、Resend は `RESEND_API_KEY` と `MAIL_FROM` を使います。Cloudflare は既存アダプターを使い、`EMAIL` という `send_email` バインディング、許可された `MAIL_FROM`、送信設定済みドメインが必要です。ローカル条件だけを検査し、リソース作成や遠隔ドメイン検証は行いません。後回しにでき、対話モードは続行を確認し、非対話モードは未設定項目を表示して続行します。バインディング・送信元・資格情報を生成せず、設定完了まで送信できません。秘密情報は Git 外に保存します。Wavicc は将来の優先連携で、`WAVICC_API_KEY` は予約用です。[メールセットアップ](setup-mail.md)を参照してください。

Wavicc は将来の優先連携先で、アダプターも確認済み API 仕様もありません。`WAVICC_API_KEY` と `CUSTOM_MAIL_API_KEY` は有効化する設定ではありません。`MAIL_PROVIDER=wavicc` を使用しないでください。他社サービスは公開仕様に従って実装・試験し、HTML/テキストと認証を保持します。エンドポイントをここで仮定しません。

隔離したアカウントで言語、モバイル表示、期限、送信失敗、確定済み変更後の応答を確認してください。コード、本文、トークン、資格情報をログに残さないでください。[運用](operations.md)と[検証](validation.md)を参照してください。

## GoogleとTurnstile

Googleは、`GOOGLE_ENABLED="true"`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`を、正確なコールバック`/api/auth/callback/google`とともに必要とします。デフォルト値はありません。事前に承認されたアクティブなアカウントを使用し、MFA、停止されたユーザーの拒否、確認されたメールを公開する前に検証します。

Turnstileはオプションです。`TURNSTILE_SITE_KEY`を定義する場合、`TURNSTILE_SECRET_KEY`も定義する必要があります。登録ではウィジェットが表示され、バックエンドではトークン、ホスト名、およびアクション`register`がSiteverifyで検証されます。Reactでウィジェットを解決するだけでは不十分です。TBAからリモートウィジェットは作成されません。設定しない場合、メール、IP、および検証によるD1の制限が有効なままになります。公開前に有効化することを評価してください。

R2はオフになっており、バケットは宣言されません。ファイルが必要な場合にのみ追加し、プロビジョニングと再生成されたタイプの明示的な承認が必要です。

## 初期管理者

`npm run admin:bootstrap -- --email admin@example.test`は、デフォルトでローカルのD1を使用します。メールは確認済みとしてマークされず、OTPで確認する必要があります。既にアクティブな管理者がいる場合、別の管理者は追加されません。

リモートモードでは`--remote --account ACCOUNT_ID --confirm`が必要であり、設定に実際のD1と同じアカウントがあることを確認します。SQLのバージョン管理には実際のメールアドレスを含めないでください。唯一の管理者へのアクセスを失った場合、独自の運用手順に従ってください。バックドアや自動的な権限の復元はありません。

## D1 の手動デプロイ

1. 派生のIDと正しいアカウントを設定します。
2. 承認後にD1を作成またはリンクします。SQLを明示的に確認して適用します。
3. HTTPS、正確なオリジン、および外部メールを設定します。GoogleとTurnstileはオプションです。
4. `types:worker`、`check`、`test`、`build`、`worker:check`を実行します。
5. 選択したファイルで`npm run deploy -- --account ACCOUNT_ID --confirm`を実行します。
6. リモートブートストラップと分離されたユーザーでのテストを実行します。
7. ユーザーを実際に受け入れる前に、イベント、MFA、回復、ロール、およびメールのフローを確認します。

設定には、ログとワーカーのトレースが含まれます。ボディ/クッキーのログを追加しないでください。チームは手動での検証と公開を維持します。GitHub ActionsとWorkers Buildsはデプロイの要件ではなく、公開の条件として設定しないでください。変更をリモートに適用する前に、ローカルで関連するチェックを実行し、アカウントと目的地を確認します。

## 更新と一般的な問題

- 起源のエラー: `APP_URL`は、末尾のスラッシュなしでブラウザーの起源と一致する必要があります。完全なテストにはローカルワーカーを使用します。
- OTPが届かない: ローカルメールボックスまたはプロバイダーの送信者/資格情報を確認します。一般的なレスポンスではアカウントの存在が確認されません。
- アクセスが拒否される: バックエンドでアクティブな状態、確認されたメール、ロール、およびMFAを完了したことを確認します。
- 感度の高い変更が拒否される: 再度ログインします。最近のチェックは5分間続きます。
- D1が存在しない: ローカルマイグレーションを適用するか、リモートバインディングとアカウントを確認します。発明されたIDを埋め込まないでください。
- コアの更新: コミットを比較し、`CHANGELOG`を確認し、依存関係を意図的に更新し、テスト環境で検証したマイグレーションを適用します。GitHubテンプレートは変更を派生に伝播しません。
