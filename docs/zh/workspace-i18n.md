# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> 语言和面板选择器

<p align="center"><a href="../en/workspace-i18n.md" lang="en">English</a> | <a href="../es/workspace-i18n.md" lang="es">Español</a> | <a href="../pt/workspace-i18n.md" lang="pt">Português</a> | <a href="../de/workspace-i18n.md" lang="de">Deutsch</a> | <a href="../fr/workspace-i18n.md" lang="fr">Français</a> | <a href="../it/workspace-i18n.md" lang="it">Italiano</a> | <strong>简体中文</strong> | <a href="../ja/workspace-i18n.md" lang="ja">日本語</a> | <a href="../hi/workspace-i18n.md" lang="hi">हिन्दी</a> | <a href="../ar/workspace-i18n.md" lang="ar">العربية</a></p>

[技术文档](README.md) | [项目概览](../README.zh.md)

> [!TIP]
> 代码和 setup 助手以英语为基础。十种翻译和本地字体均已包含。使用 `npm run setup -- --languages en,pt` 仅启用英语和葡萄牙语，不安装额外包，也不删除其他翻译。省略 `--languages` 会保留已有选择；配置中尚无列表时启用全部十种。英语始终保留为翻译回退。`--locale en` 设置应用默认语言，也接受任意已启用语言。界面优先使用已存偏好，其次为支持的浏览器语言，最后使用配置默认值。切换语言不刷新页面或重置表单；阿拉伯语保持 RTL。

登录、公共页面、管理、对话框、验证和邮件支持 `en`、`es`、`pt`、`de`、`fr`、`it`、`zh`、`ja`、`hi`、`ar`。优先使用有效的已存偏好（`tba-language`），其次为 `navigator.languages`/`navigator.language` 中首个支持的语言，最后为英语。会规范化 `es-AR`、`pt-BR`、`en-GB` 等地区变体。

选择器是一个带有语言符号和箭头的 48 × 38 px 按钮。其菜单显示十个本地名称，简短代码和当前选项，带有主题颜色和表面。宽度和高度限制在可用空间内。重用 `ui/select.tsx`，保留隐藏的本地选择器用于序列化，并添加触发器内容，标题和可选维度。其他选择器保留其值和功能。

菜单支持箭头，开始/结束，按初始字母输入，Enter，Escape，Tab 和外部关闭。焦点返回到控件，当选择或使用 Escape 取消时。语言符号保持稳定，只有箭头旋转。尊重减少运动，键盘，屏幕阅读器，移动设备和 RTL。选择器仅出现在登录和应用程序标题中。对话框和表单继承此首选项，不包括自己的语言控件。

## 文本和数据

`AuthI18n` 重用现有的面板上下文。 `page=panel` 设置语言和方向，而 Admin 保留其每个视图的标题和现有的授权守卫。面板的初始输出保持空，直到授权。

`src/lib/i18n/panel/*.json` 集中面板的目录。 `panel.ts` 应用后备和参数； `panel-sources.json` 将现有的规范标签和服务器的公共消息与可翻译的键链接。 `use-panel.ts` 为组件提供格式。确认和下载的动态文本保存键和参数，因此即使在打开时也会更改语言。

`src/lib/i18n/config.ts` 定义语言和方向；`messages/*.json`、`panel/*.json` 保存字典；`catalog.ts`、`panel.ts` 和共享上下文管理键、参数和回退。十种语言须保持完整。未知错误显示已翻译的公共提示，不泄露内部信息。姓名、邮箱、自定义角色和代码保持原始数据。

`X-Auth-Language` 选择已启用的邮件语言，不影响权限。没有有效请求头或收件人偏好时，使用应用配置的默认语言（初始为英语）；保存但已停用的语言也回退到默认值。缺失翻译键仍回退英语。已验证登录/注册及面板选择将偏好存入现有 `verification` 元数据（`mail-language:<userId>`）；延迟通知使用收件人语言。切换界面不会重发代码或改变有效期、次数和验证规则。旧错误文本继续兼容识别。

语言选择器位于登录页和应用顶部，对话框继承语言而不另设选择器。React 即时更新文字，不刷新或导航，保留表单、会话和当前视图。在面板切换语言还会发送 `POST /api/private/profile/language`，为后续邮件记住收件人语言，不重新加载管理数据。存储被阻止时仍可在当前访问中翻译。

## RTL 和字体

阿拉伯语将面板的边栏和边距放在右侧，调整欢迎图像，箭头，控件，表格和对话框。电子邮件，密钥和代码保持 LTR。长按钮和安全行在小屏幕上调整。菜单使用十种语言的本地字体。CJK 子集还包括面板新目录中的字符，通过 `scripts/build-auth-fonts.py`。

## 文件和验证

语言测试使用 Better Auth 和 D1 本地或模拟 API。请参阅 [多语言访问实现](auth-i18n.md)。

英语作为回退始终包含在初始包中。其余登录和面板词典按模块动态导入并缓存在内存。键盘或指针聚焦某个选项时预加载该选项，打开菜单不会下载所有语言。词典完整就绪后才切换，保留表单、会话和导航；缓存切换无需网络，最后一次选择生效。首次加载失败显示英语，后续切换失败保留当前语言。邮件和构建元数据使用独立的完整服务端词典。参见[语言加载](language-loading.md)。
