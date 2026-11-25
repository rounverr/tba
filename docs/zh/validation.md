# <picture><img src="../assets/icons/check.svg" width="28" height="28" alt=""></picture> 验证清单

<p align="center"><a href="../en/validation.md" lang="en">English</a> | <a href="../es/validation.md" lang="es">Español</a> | <a href="../pt/validation.md" lang="pt">Português</a> | <a href="../de/validation.md" lang="de">Deutsch</a> | <a href="../fr/validation.md" lang="fr">Français</a> | <a href="../it/validation.md" lang="it">Italiano</a> | <strong>简体中文</strong> | <a href="../ja/validation.md" lang="ja">日本語</a> | <a href="../hi/validation.md" lang="hi">हिन्दी</a> | <a href="../ar/validation.md" lang="ar">العربية</a></p>

[技术文档](README.md) | [项目概览](../README.zh.md)

按照[数据库引擎指南](database-engines.md)，在隔离环境中分别运行 D1、SQLite 与 PostgreSQL 测试。

1. 使用 `npm ci` 安装依赖。
2. 使用 `npm run check` 检查前端和后端类型。
3. 使用 `npm test` 执行单元测试和集成测试。
4. 使用 `npm run build` 构建生产资源。
5. 使用 `npm run worker:check` 验证 Worker 打包。
6. 手动测试邮件 OTP、可选 Google 登录、MFA 启用和恢复、可信设备、会话撤销、用户角色和权限、注册模式以及拒绝未授权访问。
7. 检查登录页和管理面板的十种语言，包括阿拉伯语 RTL。确认切换语言不会刷新页面或重置表单。
8. 检查桌面和移动端布局、键盘导航、屏幕阅读器及安全响应头。
9. 在任何明确批准的发布前检查密钥、迁移、环境专属设置、文档链接及选定文件差异。发布采用手动方式，不强制要求 CI 或 Workers Builds。

应对实际的可复用包执行清单，而非只验证包含扩展的开发副本。


`tests/browser/*.mjs` 是可选手动测试，不属于 `npm test`。需提供 Playwright（`PLAYWRIGHT_MODULE`）、Chromium（`BROWSER_EXECUTABLE`）和带 404 回退的本地构建站点（`AUTH_TEST_URL`）。登录及面板测试使用全部十种语言；`enabled-languages.mjs` 需要单独以 `--languages en,pt --locale en` 构建的测试项目。运行 `mail-preview.mjs` 前，以 `MAIL_PREVIEW_DIR` 运行 `tests/mail-template.test.ts` 生成 HTML。请使用固定的 `dist` 副本。使用 `node-panel.mjs` 在真实本地服务器上验证 OTP 与 HTTP 请求。其他界面测试可模拟 API。

对构建后的网站运行 `node tests/browser/panel-idle.mjs`，检查基本列表闲置十分钟和 BFCache 恢复后的重新验证。

英语作为回退始终包含在初始包中。其余登录和面板词典按模块动态导入并缓存在内存。键盘或指针聚焦某个选项时预加载该选项，打开菜单不会下载所有语言。词典完整就绪后才切换，保留表单、会话和导航；缓存切换无需网络，最后一次选择生效。首次加载失败显示英语，后续切换失败保留当前语言。邮件和构建元数据使用独立的完整服务端词典。参见[语言加载](language-loading.md)。

> [!NOTE]
> 仍需验证 Windows 安装和目录联接、Google OAuth 外部回调、Resend 实际投递以及独立渗透测试。
