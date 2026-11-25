# <picture><img src="../assets/icons/database.svg" width="28" height="28" alt=""></picture> 数据库引擎

<p align="center"><a href="../en/database-engines.md" lang="en">English</a> | <a href="../es/database-engines.md" lang="es">Español</a> | <a href="../pt/database-engines.md" lang="pt">Português</a> | <a href="../de/database-engines.md" lang="de">Deutsch</a> | <a href="../fr/database-engines.md" lang="fr">Français</a> | <a href="../it/database-engines.md" lang="it">Italiano</a> | <strong>简体中文</strong> | <a href="../ja/database-engines.md" lang="ja">日本語</a> | <a href="../hi/database-engines.md" lang="hi">हिन्दी</a> | <a href="../ar/database-engines.md" lang="ar">العربية</a></p>

[技术文档](README.md) | [项目概览](../README.zh.md)

> [!NOTE]
> D1 运行在 Cloudflare Workers 上，SQLite 和 PostgreSQL 运行在 Node.js 24+ 上。每个安装使用独立的源码副本。执行 `npm ci` 和 `npm run setup -- --interactive` 选择数据库，默认为 D1。将 `DATABASE_URL` 和 `BETTER_AUTH_SECRET` 放入 `.dev.vars` 或环境变量。参照[命令表](../en/database-engines.md)构建、运行迁移并初始化管理员，然后执行 `npm start`。PostgreSQL 要求指定 `--target`。迁移前请备份。Node 支持本地邮箱和 Resend。 [D1 运维](operations.md) | [邮件配置](setup-mail.md)

D1 和 SQLite 应用 `drizzle/` 下 0001 至 0003 的 SQL 文件。PostgreSQL 应用 `drizzle/postgresql/` 中独立编号的文件。每套安装保存自己的迁移历史。

`better-sqlite3` 是仅 SQLite 需要的可选依赖。SQLite 文件须位于 `dist` 之外。PostgreSQL 使用 TLS 时验证证书和主机名。远程目标需指定 `--target 主机:端口/数据库`。

0001 至 0003 迁移所需的最低 SQL 语法版本是 PostgreSQL 11。集成测试已验证 17.12 和 18.7。新安装应使用仍在维护的版本，优先使用 PostgreSQL 18 的最新补丁版。

仍需验证 Windows 安装和目录联接、Google OAuth 外部回调、Resend 实际投递以及独立渗透测试。
