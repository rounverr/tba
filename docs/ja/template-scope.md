# <picture><img src="../assets/icons/layers.svg" width="28" height="28" alt=""></picture> テンプレートの範囲

<p align="center"><a href="../en/template-scope.md" lang="en">English</a> | <a href="../es/template-scope.md" lang="es">Español</a> | <a href="../pt/template-scope.md" lang="pt">Português</a> | <a href="../de/template-scope.md" lang="de">Deutsch</a> | <a href="../fr/template-scope.md" lang="fr">Français</a> | <a href="../it/template-scope.md" lang="it">Italiano</a> | <a href="../zh/template-scope.md" lang="zh">简体中文</a> | <strong>日本語</strong> | <a href="../hi/template-scope.md" lang="hi">हिन्दी</a> | <a href="../ar/template-scope.md" lang="ar">العربية</a></p>

[技術ドキュメント](README.md) | [プロジェクト概要](../README.ja.md)

TBA の既定構成は Cloudflare Workers と D1 です。同じ画面と Hono API は Node.js 上で SQLite または PostgreSQL と組み合わせて動作します。 [データベースエンジン](database-engines.md)

基本テンプレートにはメール OTP、任意の Google ログイン、TOTP MFA と復旧、信頼済み端末、セッション、ロールと権限、プロフィール、メール変更、基本アカウント管理、登録申請、監査、ダッシュボードが含まれます。ログインと管理画面は10言語および明暗テーマに対応します。

> [!NOTE]
> 基本一覧と範囲を制限したページ移動、認証・監査・ダッシュボードに必要な データベーステーブル、制約、汎用マイグレーションは保持します。高度な検索、絞り込み、並べ替え、ページング機構および Excel/XLSX 出力は基本配布に含みません。各プロジェクトのデータと権限に合わせて追加できます。MFA 復旧コードのローカル `.txt` ダウンロードはセキュリティ機能として残ります。

アプリごとに Worker、DB、ユーザー、秘密情報、ドメイン、メールを設定します。業務プロフィール、組織、課金、テナントデータは自動作成しません。登録フックで固有処理を拡張できます。再利用には [MIT ライセンス](../../LICENSE)、必要な告知および[フォントライセンス](../licenses/README.md#ja)が適用されます。企業商標は [TRADEMARKS](../../TRADEMARKS.md) を参照してください。
