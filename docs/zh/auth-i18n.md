# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> 公共访问语言

<p align="center"><a href="../en/auth-i18n.md" lang="en">English</a> | <a href="../es/auth-i18n.md" lang="es">Español</a> | <a href="../pt/auth-i18n.md" lang="pt">Português</a> | <a href="../de/auth-i18n.md" lang="de">Deutsch</a> | <a href="../fr/auth-i18n.md" lang="fr">Français</a> | <a href="../it/auth-i18n.md" lang="it">Italiano</a> | <strong>简体中文</strong> | <a href="../ja/auth-i18n.md" lang="ja">日本語</a> | <a href="../hi/auth-i18n.md" lang="hi">हिन्दी</a> | <a href="../ar/auth-i18n.md" lang="ar">العربية</a></p>

[技术文档](README.md) | [项目概览](../README.zh.md)

> [!TIP]
> 代码和 setup 助手以英语为基础。十种翻译和本地字体均已包含。使用 `npm run setup -- --languages en,pt` 仅启用英语和葡萄牙语，不安装额外包，也不删除其他翻译。省略 `--languages` 会保留已有选择；配置中尚无列表时启用全部十种。英语始终保留为翻译回退。`--locale en` 设置应用默认语言，也接受任意已启用语言。界面优先使用已存偏好，其次为支持的浏览器语言，最后使用配置默认值。切换语言不刷新页面或重置表单；阿拉伯语保持 RTL。

公共访问支持英语（`en`），西班牙语（`es`），葡萄牙语（`pt`），德语（`de`），法语（`fr`），意大利语（`it`），简体中文（`zh`），日语（`ja`），印地语（`hi`）和阿拉伯语（`ar`）。英语是后备语言。

## 审计和范围

应用程序使用Astro静态页面与React岛和Better Auth的无密码身份验证。没有i18n层。文本位于登录、公共页面和服务器消息中。重用React状态、当前组件和现有路由，不添加npm包。

翻译包括登录、注册（开放或需要批准）、电子邮件验证、OTP、MFA、恢复代码、帮助、重新身份验证通知、错误、验证、加载、Google返回、访问被拒绝和页面不存在。OTP访问电子邮件以选定的语言发送。没有密码、恢复或重置密码的屏幕：不添加此机制。后续扩展还包括管理面板及其设置；请参阅[多语言选择器和面板](workspace-i18n.md)。

## 解析和初始加载

`src/lib/i18n/config.ts`集中了十种语言、原生名称、方向和`tba-language`键。优先顺序是有效的`localStorage`首选项、`navigator.languages`的第一个兼容语言、`navigator.language`，最后是英语。规范化了大写字母、连字符和区域变体，例如`es-AR`、`pt-BR`或`en-GB`。

`Base.astro`在head中同步执行相同的解析器。配置`lang`、`dir`和标题，然后显示内容。静态HTML使用英语以匹配第一次水合；`data-auth-pending`隐藏岛屿，直到`AuthI18n`通过`useLayoutEffect`应用翻译。这样就不会看到其他语言的闪烁。捕获对存储的阻塞访问，并使用浏览器或访问状态。

紧凑的选择器使用带有语言符号的按钮和自己的菜单。它具有可访问的翻译名称和带有原生名称的选项、`lang`和`dir`。隐藏的原生选择器保留序列化。更改它会更新React上下文并持久化首选项。它不重新加载、导航或查询API。它不会重新挂载表单：保留电子邮件、代码、注册意图、步骤、设备信任、重发等待、错误和正在进行的操作。错误保留键，因此也会在可见时更改语言。所选语言在访问之间持久；字段和代码不存储在存储中。

## 目录、错误和电子邮件

`src/lib/i18n/messages/*.json`包含每种语言的112个键。`catalog.ts`键入键、插入参数并将缺失项解析为英语。未知键显示翻译的公共错误，从不显示内部键。标记、输入的电子邮件、代码和组织名称是数据，而不是翻译。

`errors.ts`将现有的公共消息和API的已知代码转换为表示键。未知错误不暴露服务器详细信息。字段保留服务器的约束和验证；显示翻译的本地验证，而不是依赖于浏览器语言的本机消息。OTP的阿拉伯数字、波斯数字、天城文数字和全宽数字被规范化为相同的六个ASCII数字。恢复代码保持不变。

`X-Auth-Language` 选择已启用的邮件语言，不影响权限。没有有效请求头或收件人偏好时，使用应用配置的默认语言（初始为英语）；保存但已停用的语言也回退到默认值。缺失翻译键仍回退英语。已验证登录/注册及面板选择将偏好存入现有 `verification` 元数据（`mail-language:<userId>`）；延迟通知使用收件人语言。切换界面不会重发代码或改变有效期、次数和验证规则。旧错误文本继续兼容识别。

Turnstile 接收选定的语言，使用 `zh-CN` 代表简体中文。其小部件在语言改变时会被重建，以更新其界面。这会使之前的 CAPTCHA 验证失效，并需要更新的小部件进行验证；同时保留表单的其他数据和服务器控制。

## 设计、RTL 和字体

阿拉伯语配置 `dir=rtl`，反转导航箭头，并调整图像面板、帮助关闭和对齐。邮件和代码使用 LTR 和双向隔离。标题支持多行，长文本会被调整，标签不依赖于固定宽度。保持现有的身份、主题和移动适配。

WOFF2 字体从 `public/fonts` 提供，使用现有的 `font-src 'self'` 政策。Inter 字体继续用于拉丁语系语言。TBA Arabic 和 TBA Devanagari 字体保留了原始 Noto 字体的字形。TBA Chinese 和 TBA Japanese 包括中文、日文和英文字符目录以及选择器名称。扩展还包括面板目录；系统字体覆盖其他引入的数据字符。仅下载浏览器需要的字体。不向字体提供商发出请求。

字体来自 Noto Sans Arabic、Noto Sans Devanagari 和 Noto Sans CJK，使用 [SIL OFL 1.1](../licenses/noto-fonts.txt) 许可。修改后的字体家族被重命名。为了在添加 CJK 目录字符后重新生成字体，在具有 Noto、fontTools 和 Brotli 的维护环境中运行 `/usr/bin/python3 scripts/build-auth-fonts.py /usr/share/fonts`。这是一个可选工具：构建和应用程序不需要 Python 或新的依赖项。重新分发保留存储库中的许可。

## 实现文件

- 配置、解析器、目录和错误：`src/lib/i18n/config.ts`、`catalog.ts`、`errors.ts` 和 `messages/` 的十个 JSON 文件。
- 接口：`AuthI18n.tsx`、`AuthPublic.tsx`、`Login.tsx`、`Brand.tsx`、`ThemeToggle.tsx` 和 `Turnstile.tsx` 在 `src/components/` 中。
- 加载和公共路由：`src/layouts/Base.astro`、`src/pages/index.astro`、`login.astro`、`login/complete.astro`、`denied.astro` 和 `404.astro`。
- 样式和字体：`src/styles/global.css`、`public/fonts/`、`scripts/build-auth-fonts.py` 和 `docs/licenses/noto-fonts.txt`。
- 请求和邮件呈现：`src/lib/utils.ts`、`src/server/auth.ts`、`src/server/index.ts` 和 `src/server/services/auth-mail.ts`。
- 测试：`tests/auth-i18n.test.ts`、`tests/auth.test.ts` 和 `tests/browser/auth-i18n.mjs`。文档：此文件、`docs/validation.md`、`README.md` 和 `CHANGELOG.md`。

## 验证

`tests/auth-i18n.test.ts` 验证十个目录、参数、变体、优先级、头解析器、回退、方向、错误、规范化和邮件文本。`tests/auth.test.ts` 中的集成使用 Better Auth 和 D1 本地化在十种语言中提供 OTP，并检查唯一使用。它不发送实际邮件。

`tests/browser/auth-i18n.mjs` 使用现有的 Playwright 和模拟 API。在本地服务的构建中运行：

```sh
AUTH_TEST_URL=http://127.0.0.1:4321 \
PLAYWRIGHT_MODULE=/ruta/a/playwright/index.js \
node tests/browser/auth-i18n.mjs
```

包括在水合之前的检测、无闪烁、持久性、无导航或请求的立即更改、保留表单和加载、十种语言的登录/注册/OTP/MFA/恢复、错误、帮助、公共页面、阻止存储、CAPTCHA、重新认证通知和 320、390、768 和 1440 px 的宽度。额外的视觉检查验证实际字体和阿拉伯语、印地语、中文、日文、德语和法语的桌面/移动布局。

英语作为回退始终包含在初始包中。其余登录和面板词典按模块动态导入并缓存在内存。键盘或指针聚焦某个选项时预加载该选项，打开菜单不会下载所有语言。词典完整就绪后才切换，保留表单、会话和导航；缓存切换无需网络，最后一次选择生效。首次加载失败显示英语，后续切换失败保留当前语言。邮件和构建元数据使用独立的完整服务端词典。参见[语言加载](language-loading.md)。
