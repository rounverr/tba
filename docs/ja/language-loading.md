# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> 言語の読み込み

<p align="center"><a href="../en/language-loading.md" lang="en">English</a> | <a href="../es/language-loading.md" lang="es">Español</a> | <a href="../pt/language-loading.md" lang="pt">Português</a> | <a href="../de/language-loading.md" lang="de">Deutsch</a> | <a href="../fr/language-loading.md" lang="fr">Français</a> | <a href="../it/language-loading.md" lang="it">Italiano</a> | <a href="../zh/language-loading.md" lang="zh">简体中文</a> | <strong>日本語</strong> | <a href="../hi/language-loading.md" lang="hi">हिन्दी</a> | <a href="../ar/language-loading.md" lang="ar">العربية</a></p>

[技術ドキュメント](README.md) | [プロジェクト概要](../README.ja.md)

> [!NOTE]
> 英語はフォールバックとして初期バンドルに含まれます。他のログイン・管理画面カタログは動的インポートとモジュール別メモリーキャッシュを使います。キーボードやポインターのフォーカスで該当オプションのみ先読みし、メニューを開くだけでは全言語を読み込みません。カタログが揃ってから切り替え、フォーム・セッション・画面遷移状態を保持します。キャッシュ済みの変更は通信不要で最後の選択が優先されます。初回失敗は英語、切り替え失敗は現在の言語を表示します。メールとビルド用メタデータは完全なサーバー専用辞書を使います。[言語読み込み](language-loading.md)を参照してください。

文書は React の読み込み中に検出言語の読み込みを開始し、プロバイダーとキャッシュを共有して起動時の二重待ちを避けます。

`src/lib/i18n/bootstrap.ts` | `src/lib/i18n/catalog.ts` | `panel.ts` | `language-cache.ts` | `catalog.server.ts` | `src/components/AuthI18n.tsx`

`tests/browser/lazy-languages.mjs` | `PLAYWRIGHT_MODULE` | `BROWSER_EXECUTABLE` | `AUTH_TEST_URL`

```bash
npm run check
npm test
npm run build
npm run worker:check
```
