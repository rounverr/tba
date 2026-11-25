# <picture><img src="../assets/icons/users.svg" width="28" height="28" alt=""></picture> 注册、审批和扩展

<p align="center"><a href="../en/registration.md" lang="en">English</a> | <a href="../es/registration.md" lang="es">Español</a> | <a href="../pt/registration.md" lang="pt">Português</a> | <a href="../de/registration.md" lang="de">Deutsch</a> | <a href="../fr/registration.md" lang="fr">Français</a> | <a href="../it/registration.md" lang="it">Italiano</a> | <strong>简体中文</strong> | <a href="../ja/registration.md" lang="ja">日本語</a> | <a href="../hi/registration.md" lang="hi">हिन्दी</a> | <a href="../ar/registration.md" lang="ar">العربية</a></p>

[技术文档](README.md) | [项目概览](../README.zh.md)

> [!NOTE]
> 初始模式是 `closed`。没有显示公共注册链接，API 拒绝注册请求。管理员可以创建账户，用户在登录时验证电子邮件。

在 `approval` 中，用户请求 OTP 并确认电子邮件。TBA 创建一个待处理的账户和一个唯一的请求，撤销任何临时会话，并通过电子邮件适配器通知管理员。审批需要选择一个明确的角色；拒绝不会启用访问。两种操作都会被记录。审批后会通知用户。

在 `open` 中，电子邮件在激活账户之前被验证。管理员从访问和注册中选择初始角色，包括 **所有配置的角色**，包括自定义角色、编辑器和管理员。选择被保存在 `settings.public_role_id` 中，没有模式更改。服务器检查角色是否存在，并且管理员明确确认开放注册。注册的访客永远不会选择或发送有效的角色：在完成电子邮件验证时，服务器配置的角色被应用。

选择器仅在选择开放注册时出现。它重用应用程序菜单，显示角色权限（或完整的管理控制），在更改语言时保留选择，并在更改角色时要求重新确认。如果没有角色或配置的角色不再可用，它会解释情况并避免保存空选择。文本被翻译成十种语言。

更改仅影响新注册。以前的账户和请求保留其状态和角色。以前的待处理请求永远不会因为模式更改而被批准。每次完成都会重新查询当前模式和角色；如果没有有效的角色，账户将不会被启用。电子邮件 OTP、发送限制、尝试次数、配置权限和审计将被保留。

具有基本访问权限的公共角色标签 (`isPublic`) 保留其在角色编辑器中的最小权限验证，但不再限制初始角色选择器。选择管理角色或管理员角色将为新账户赋予相同的范围；视图显示该范围并将其包含在确认中。

私有配置查询以相同的响应交付角色：单个 HTTP 请求，无需在更改语言或打开选择器时进行额外的查询。它在现有的两次视图读取中添加了一次 角色目录读取。其他视图保留其查询预算。

## 扩展

`src/server/services/registration-hook.ts` 公开 `onUserRegistered(user, context)`。核心不创建 CRM、CMS 或其他业务的配置文件。函数仅接收身份和稳定的密钥 `registration:<userId>`；不接收可变的权限。

`registration_event` 表避免了完成的重复交付，并通过条件更新来索取执行。失败的交付保持待处理状态，卡住的交付可以在五分钟后重新开始。管理员可以通过 `POST /api/private/hooks/:userId/retry` 重新尝试。

语义是 **至少一次**：一个过程可能在产生效果之后结束，并在标记事件为完成之前。消费者必须使用 `context.idempotencyKey`（例如，通过唯一索引）使其写入操作幂等。我们不保证外部效果恰好发生一次。扩展点的错误不会授予额外的权限，也不会阻塞已验证的身份的持久性。

要扩展 CMS，请使用 `user_id UNIQUE` 创建自己的配置文件表，使用 `ON CONFLICT DO NOTHING` 插入，并在回调之外保留权限控制。示例不会自动执行，也不属于 TBA 核心。
