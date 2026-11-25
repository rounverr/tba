# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> 语言加载

<p align="center"><a href="../en/language-loading.md" lang="en">English</a> | <a href="../es/language-loading.md" lang="es">Español</a> | <a href="../pt/language-loading.md" lang="pt">Português</a> | <a href="../de/language-loading.md" lang="de">Deutsch</a> | <a href="../fr/language-loading.md" lang="fr">Français</a> | <a href="../it/language-loading.md" lang="it">Italiano</a> | <strong>简体中文</strong> | <a href="../ja/language-loading.md" lang="ja">日本語</a> | <a href="../hi/language-loading.md" lang="hi">हिन्दी</a> | <a href="../ar/language-loading.md" lang="ar">العربية</a></p>

[技术文档](README.md) | [项目概览](../README.zh.md)

> [!NOTE]
> 英语作为回退始终包含在初始包中。其余登录和面板词典按模块动态导入并缓存在内存。键盘或指针聚焦某个选项时预加载该选项，打开菜单不会下载所有语言。词典完整就绪后才切换，保留表单、会话和导航；缓存切换无需网络，最后一次选择生效。首次加载失败显示英语，后续切换失败保留当前语言。邮件和构建元数据使用独立的完整服务端词典。参见[语言加载](language-loading.md)。

文档在 React 加载期间就开始加载检测到的语言，并与上下文共享缓存，避免启动时再次等待。

`src/lib/i18n/bootstrap.ts` | `src/lib/i18n/catalog.ts` | `panel.ts` | `language-cache.ts` | `catalog.server.ts` | `src/components/AuthI18n.tsx`

`tests/browser/lazy-languages.mjs` | `PLAYWRIGHT_MODULE` | `BROWSER_EXECUTABLE` | `AUTH_TEST_URL`

```bash
npm run check
npm test
npm run build
npm run worker:check
```
