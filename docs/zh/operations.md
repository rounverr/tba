# <picture><img src="../assets/icons/settings.svg" width="28" height="28" alt=""></picture> 配置和操作

<p align="center"><a href="../en/operations.md" lang="en">English</a> | <a href="../es/operations.md" lang="es">Español</a> | <a href="../pt/operations.md" lang="pt">Português</a> | <a href="../de/operations.md" lang="de">Deutsch</a> | <a href="../fr/operations.md" lang="fr">Français</a> | <a href="../it/operations.md" lang="it">Italiano</a> | <strong>简体中文</strong> | <a href="../ja/operations.md" lang="ja">日本語</a> | <a href="../hi/operations.md" lang="hi">हिन्दी</a> | <a href="../ar/operations.md" lang="ar">العربية</a></p>

[技术文档](README.md) | [项目概览](../README.zh.md)

TBA 默认在 Cloudflare Workers 上使用 D1。同一界面和 Hono API 也可在 Node.js 上搭配 SQLite 或 PostgreSQL 运行。 [数据库引擎](database-engines.md)

## 初始化

代码和 setup 助手以英语为基础。十种翻译和本地字体均已包含。使用 `npm run setup -- --languages en,pt` 仅启用英语和葡萄牙语，不安装额外包，也不删除其他翻译。省略 `--languages` 会保留已有选择；配置中尚无列表时启用全部十种。英语始终保留为翻译回退。`--locale en` 设置应用默认语言，也接受任意已启用语言。界面优先使用已存偏好，其次为支持的浏览器语言，最后使用配置默认值。切换语言不刷新页面或重置表单；阿拉伯语保持 RTL。

`npm run setup -- --interactive` | `--name` | `--id` | `--domain` | `--database` | `--account` | `--mail local|resend|cloudflare` | `--google true|false` | `--mfa true|false` | `--trust true|false` | `--r2 true|false` | `--theme light|dark`.

脚本在不存在时生成 `.dev.vars`，带有随机秘密。它不将凭据写入版本控制文件，也不创建管理员或远程资源。在提供派生资源之前，修改技术身份。

## D1、Drizzle 和迁移

`src/server/database/schema.ts` 是 Drizzle 的模式。`drizzle/0001_initial.sql` 包含基本模式，`0002_defaults_and_guards.sql` 加载角色、注册关闭和触发器。`drizzle/generated` 保留 Drizzle 的快照以便于将来的比较；Wrangler 只在 `drizzle` 的根目录下执行 SQL。 将 `drizzle/0003_session_authorization.sql` 与其他迁移一起应用。已有会话在下次检查权限时生成快照。

`db:generate` 在 `drizzle/generated` 中生成候选项。检查每个候选项，并将其复制到根目录下，附加上下一个编号；在单独的迁移中添加触发器或数据，当适当时。永远不要编辑已经应用的迁移。检查可能的冲突，然后再使用现有的 D1，并在进行远程更改之前进行备份。模板在安装或构建期间不执行远程 SQL。

> [!IMPORTANT]
> 脚本 `db:create`、`db:link`、`db:migrate:remote` 和 `deploy` 需要明确的账户和 `--confirm`；如果没有确认，创建和写入操作将被停止。`db:create` 检查现有的名称并检索实际的 UUID。`db:link` 枚举账户的数据库，并在保存绑定之前显示其模式，而不修改它。如果操作失败，则不写入假定的绑定。没有脚本会删除数据库。

使用 `--config wrangler.<environment>.jsonc` 或 `--config wrangler.<other-environment>.jsonc` 来实现单独的目标。复制配置并为每个环境分配不同的名称、URL、account_id 和 database_id。变量和绑定不应意外地被共享。TBA 中没有预先创建的远程环境。

## 秘密和邮件

初始化工具支持 `--mail local`、`--mail resend` 和 `--mail cloudflare`。本地邮件使用本地 `APP_URL` 和 `npm run mail:dev`；Resend 需要 `RESEND_API_KEY` 与 `MAIL_FROM`。Cloudflare 复用现有适配器，需要名为 `EMAIL` 的 `send_email` 绑定、允许的 `MAIL_FROM` 以及已启用发送的域名。工具只检查本地条件，不创建资源或验证远程域名。可稍后配置：交互模式询问是否继续，非交互模式列出待办后继续。不编造绑定、发件人或密钥，配置完成前无法发送邮件。密钥不得进入 Git。Wavicc 保留为首选未来集成，`WAVICC_API_KEY` 仅作占位。参见[邮件初始化](setup-mail.md)。

Wavicc 是首选的未来集成，目前无适配器及已核实 API 契约。`WAVICC_API_KEY`、`CUSTOM_MAIL_API_KEY` 占位符不会启用服务。不要设置 `MAIL_PROVIDER=wavicc`。其他服务须按公开契约实现并测试适配器，保留 HTML/文本和认证行为；此处不假设供应商端点。

使用隔离账户验证每种邮件的语言、移动显示、过期、投递错误及已提交变更的成功响应。不要记录代码、邮件内容、令牌或凭据。见[运维](operations.md)和[验证](validation.md)。

## Google 和 Turnstile

Google 需要 `GOOGLE_ENABLED="true"`、`GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`，并且 callback 必须是 `/api/auth/callback/google`。没有默认值。使用之前已授权的活跃账户，并在发布前验证 MFA、拒绝被挂起的用户和已验证的电子邮件。

Turnstile 是可选的。如果定义 `TURNSTILE_SITE_KEY`，也必须定义 `TURNSTILE_SECRET_KEY`。注册显示 widget，后端验证 Siteverify 中的 token、hostname 和 `register` 动作；仅在 React 中解决 widget 不足以。从 TBA 中不创建远程 widget。如果不配置 Turnstile，电子邮件、IP 和验证的 D1 限制仍然有效。在向公众开放注册之前，评估是否启用它。

R2 已关闭，不声明 bucket。仅当派生需要文件时，才添加它，并且需要显式授权来配置和重新生成类型。

## 初始管理员

`npm run admin:bootstrap -- --email admin@example.test` 默认使用本地 D1。电子邮件不会被标记为已验证，需要使用 OTP 确认。 如果已经有一个活跃的管理员，则不会添加其他管理员。

远程模式需要 `--remote --account ACCOUNT_ID --confirm`，并验证配置是否具有真实的 D1 和相同的账户。不要在版本控制的 SQL 中包含真实的电子邮件地址。如果您失去了对唯一管理员的访问权限，请遵循自己的操作程序；没有后门或自动重置权限。

## D1 手动部署

1. 配置派生的身份和正确的账户。
2. 创建或链接一个 D1，需要授权。检查并显式应用 SQL。
3. 配置 HTTPS、确切的来源和外部电子邮件；可选地配置 Google 和 Turnstile。
4. 执行 `types:worker`、`check`、`test`、`build` 和 `worker:check`。
5. 使用选定的文件执行 `npm run deploy -- --account ACCOUNT_ID --confirm`。
6. 执行远程引导和使用隔离用户的测试。
7. 在允许真实用户之前，验证事件、MFA、恢复、角色和电子邮件流程。

配置包括日志和 Workers 跟踪。避免添加日志记录的主体/cookie。团队维护手动验证和发布。GitHub Actions 和 Workers Builds 不是部署的要求，不应配置为发布条件。在进行任何远程更改之前，使用确认的账户和目标在本地执行相关检查。

## 更新和常见问题

- 源错误：`APP_URL` 必须与浏览器的源匹配，不带有尾部斜杠。使用本地 Worker 进行完整的测试。
- OTP 未到达：检查本地邮件箱或提供商的发件人/凭据。通用响应不确认账户是否存在。
- 访问被拒绝：确认活跃状态、已验证的电子邮件、角色和后端的 MFA 完成。
- 敏感更改被拒绝：重新登录；最近的检查持续五分钟。
- D1 不存在：应用本地迁移或检查远程绑定和账户；不要填充虚构的 ID。
- 核心更新：比较提交，检查 `CHANGELOG`，故意更新依赖项，并在分段中应用已审查的迁移。GitHub 模板不会将更改传播到派生。
