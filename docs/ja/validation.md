# <picture><img src="../assets/icons/check.svg" width="28" height="28" alt=""></picture> 検証チェックリスト

<p align="center"><a href="../en/validation.md" lang="en">English</a> | <a href="../es/validation.md" lang="es">Español</a> | <a href="../pt/validation.md" lang="pt">Português</a> | <a href="../de/validation.md" lang="de">Deutsch</a> | <a href="../fr/validation.md" lang="fr">Français</a> | <a href="../it/validation.md" lang="it">Italiano</a> | <a href="../zh/validation.md" lang="zh">简体中文</a> | <strong>日本語</strong> | <a href="../hi/validation.md" lang="hi">हिन्दी</a> | <a href="../ar/validation.md" lang="ar">العربية</a></p>

[技術ドキュメント](README.md) | [プロジェクト概要](../README.ja.md)

[エンジンガイド](database-engines.md)に従い、D1、SQLite、PostgreSQL を個別の環境でテストします。

1. `npm ci` で依存関係をインストールします。
2. `npm run check` でフロントエンドとバックエンドの型を確認します。
3. `npm test` で単体テストと統合テストを実行します。
4. `npm run build` で本番用アセットをビルドします。
5. `npm run worker:check` で Worker のパッケージを検証します。
6. メール OTP、任意の Google ログイン、MFA の設定と復旧、信頼済みデバイス、セッション失効、ロールと権限、登録モード、不正アクセスの拒否を手動で確認します。
7. ログインと管理画面を十言語で確認し、アラビア語の RTL にも対応していることを検証します。言語変更でページが再読み込みされず、フォームがリセットされないことを確認します。
8. デスクトップとモバイルのレイアウト、キーボード操作、スクリーンリーダー、セキュリティヘッダーを確認します。
9. 明示的に許可された反映の前に、秘密情報、マイグレーション、環境固有設定、文書リンク、選択したファイル差分を確認します。公開は手動で行い、CI や Workers Builds を必須としません。

拡張入りの開発コピーだけでなく、実際の再利用パッケージで検証してください。基本一覧、監査、ダッシュボードが高度な検索・絞り込み・並べ替えや XLSX の import なしで動作することを確認します。


`tests/browser/*.mjs` は任意の手動テストで、`npm test` には含まれません。Playwright（`PLAYWRIGHT_MODULE`）、Chromium（`BROWSER_EXECUTABLE`）、404 フォールバック付きローカルビルド（`AUTH_TEST_URL`）が必要です。ログインと管理画面は十言語、`enabled-languages.mjs` は `--languages en,pt --locale en` の別ビルドを使います。メール HTML は `MAIL_PREVIEW_DIR` と `tests/mail-template.test.ts` で先に生成します。固定した `dist` のコピーを使ってください。`node-panel.mjs` は実際のローカルサーバーで OTP と HTTP リクエストを検証します。ほかの画面テストは API を模擬できます。

ビルド済みサイトで `node tests/browser/panel-idle.mjs` を実行し、基本一覧での10分間のアイドル状態と BFCache 復元時の再検証を確認します。

英語はフォールバックとして初期バンドルに含まれます。他のログイン・管理画面カタログは動的インポートとモジュール別メモリーキャッシュを使います。キーボードやポインターのフォーカスで該当オプションのみ先読みし、メニューを開くだけでは全言語を読み込みません。カタログが揃ってから切り替え、フォーム・セッション・画面遷移状態を保持します。キャッシュ済みの変更は通信不要で最後の選択が優先されます。初回失敗は英語、切り替え失敗は現在の言語を表示します。メールとビルド用メタデータは完全なサーバー専用辞書を使います。[言語読み込み](language-loading.md)を参照してください。

> [!NOTE]
> Windows のインストールとジャンクション、外部 Google OAuth コールバック、Resend の実配信、独立した侵入テストは未検証です。
