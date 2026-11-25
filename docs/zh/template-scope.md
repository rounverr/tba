# <picture><img src="../assets/icons/layers.svg" width="28" height="28" alt=""></picture> 模板范围

<p align="center"><a href="../en/template-scope.md" lang="en">English</a> | <a href="../es/template-scope.md" lang="es">Español</a> | <a href="../pt/template-scope.md" lang="pt">Português</a> | <a href="../de/template-scope.md" lang="de">Deutsch</a> | <a href="../fr/template-scope.md" lang="fr">Français</a> | <a href="../it/template-scope.md" lang="it">Italiano</a> | <strong>简体中文</strong> | <a href="../ja/template-scope.md" lang="ja">日本語</a> | <a href="../hi/template-scope.md" lang="hi">हिन्दी</a> | <a href="../ar/template-scope.md" lang="ar">العربية</a></p>

[技术文档](README.md) | [项目概览](../README.zh.md)

TBA 默认在 Cloudflare Workers 上使用 D1。同一界面和 Hono API 也可在 Node.js 上搭配 SQLite 或 PostgreSQL 运行。 [数据库引擎](database-engines.md)

基础模板包括邮件 OTP、可选 Google 登录、TOTP 多因素认证及恢复、可信设备、会话、角色与权限、个人资料、邮箱变更、基础账户管理、注册申请、审计和仪表板。登录与管理界面支持十种语言及明暗主题。

> [!NOTE]
> 保留基础列表、有限的分页浏览，以及身份认证、审计和仪表板所需的 数据库表、约束和通用迁移。高级搜索、筛选、排序与分页引擎及 Excel/XLSX 导出不属于基础发行版，各项目可按自身数据和权限需求实现。MFA 恢复代码的本地 `.txt` 下载仍属于账户安全功能。

每个应用独立配置 Worker、数据库、用户、密钥、域名和邮件服务。默认不创建业务资料、组织、计费或租户数据。使用注册钩子扩展项目业务。复用遵循 [MIT 许可证](../../LICENSE)，并保留必要声明和[字体许可证](../licenses/README.md#zh)。企业商标另见 [TRADEMARKS](../../TRADEMARKS.md)。
