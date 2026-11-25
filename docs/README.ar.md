<div align="center">

<a href="https://rounver.com" target="_blank" rel="noopener noreferrer"><img src="assets/rounver-logo.svg" width="236" alt="Rounver Corp." /></a>

<img src="../public/favicon.svg" width="74" height="74" alt="TBA" />

# TBA | Template Basic Authenticator

**Astro | React | Hono | Better Auth | D1 | SQLite | PostgreSQL**

![Status](https://img.shields.io/badge/status-template-475569?style=flat-square)
![Languages](https://img.shields.io/badge/languages-10-4F46E5?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-2563EB?style=flat-square)

<p align="center"><a href="../README.md" lang="en">English</a> | <a href="README.es.md" lang="es">Español</a> | <a href="README.pt.md" lang="pt">Português</a> | <a href="README.de.md" lang="de">Deutsch</a> | <a href="README.fr.md" lang="fr">Français</a> | <a href="README.it.md" lang="it">Italiano</a> | <a href="README.zh.md" lang="zh">简体中文</a> | <a href="README.ja.md" lang="ja">日本語</a> | <a href="README.hi.md" lang="hi">हिन्दी</a> | <strong>العربية</strong></p>

<p align="center" dir="rtl">
  <strong>المؤلف:</strong> <span dir="ltr">Sil R. Galeano</span> | <span dir="ltr">Copyright © 2026 Rounver Corp.</span> |
  <a href="ar/README.md">التوثيق التقني</a>
</p>

</div>

---

يستخدم TBA افتراضيًا Cloudflare Workers مع D1. تعمل الواجهة نفسها وواجهة Hono API أيضًا على Node.js مع SQLite أو PostgreSQL. [محركات قواعد البيانات](ar/database-engines.md)

**مصادقة جاهزة دون إعادة بناء الأساس.**

**TBA (Template Basic Authenticator)** قالب معياري قابل لإعادة الاستخدام للمصادقة والإدارة طورته **Rounver Corp.** يتيح لتطبيقات الويب المستقلة البدء بأساس جاهز للهوية والصلاحيات وإدارة المستخدمين دون إعادة تطويره لكل مشروع.

> [!NOTE]
> يتضمن هذا الفرع المكونات الأساسية القابلة لإعادة الاستخدام. لا يتضمن محركات الجداول المتقدمة وتصدير XLSX؛ راجع [نطاق القالب](ar/template-scope.md).

![تسجيل الدخول إلى TBA ومحدد اللغة](assets/TBA_Login_1.png)

![لوحة إدارة TBA](assets/TBA_Login_2.png)

![إعدادات الوصول والتسجيل في TBA](assets/TBA_Login_3.png)

## <picture><img src="assets/icons/layers.svg" width="24" height="24" alt=""></picture> الوظائف الأساسية

| الهوية والوصول | الأساس التقني |
| :--- | :--- |
| رمز OTP من ستة أرقام عبر البريد دون كلمة مرور، صالح لخمس دقائق ويستخدم مرة واحدة | Astro 7 وReact 19 وTypeScript الصارم وTailwind CSS 4 |
| Google OAuth اختياري ومعطل افتراضيًا | Hono على Cloudflare Workers أو Node.js |
| مصادقة TOTP متعددة العوامل اختيارية، ورموز استرداد للاستخدام مرة واحدة، وأجهزة موثوقة قابلة للإلغاء لمدة 30 يومًا | Better Auth وDrizzle ORM وCloudflare D1 |
| أدوار وصلاحيات تتحقق على الخادم، وإدارة مستخدمين، وإلغاء جلسات | لكل تطبيق مستخدموه وقاعدة بياناته وأسراره ونشره المستقل |
| تسجيل مغلق أو بموافقة أو مفتوح؛ سجل تدقيق وملفات شخصية | واجهة متجاوبة، وضعان فاتح وداكن، وعشر لغات |
| لوحة إدارة ونقاط توسعة مستقلة | تقديم الملفات الثابتة مباشرة؛ واجهات API الخاصة ضمن `/api/` |

## <picture><img src="assets/icons/layers.svg" width="24" height="24" alt=""></picture> البنية - ملفات ثابتة وخصوصية منذ التصميم

```mermaid
flowchart LR
    U["المتصفح - Astro + React"] --> A["ملفات ثابتة"]
    U --> H["Hono API - /api/*"]
    H --> G["جلسة - MFA - RBAC"]
    G --> B["Better Auth"]
    G --> P["طبقة الحفظ / Drizzle"]
    B --> P
    B --> M["خدمة إرسال البريد"]
    P --> D[("D1 - Cloudflare Workers")]
    P --> S[("SQLite - Node.js")]
    P --> N[("PostgreSQL - Node.js")]
    classDef app fill:#eef2ff,stroke:#6366f1,color:#312e81;
    classDef data fill:#f0fdf4,stroke:#16a34a,color:#14532d;
    class A,H,G,B,P app;
    class D,S,N,M data;
```

ينشئ Astro صفحات ثابتة لا تحتوي على بيانات حسابات خاصة، وتقدم Cloudflare الملفات الموجودة مباشرة. **كل طلب API خاص** يمر عبر Hono وفحوصات الخادم لحالة الحساب والجلسة وتأكيد البريد وMFA وصلاحيات الدور. إخفاء عنصر من الواجهة لا يغني عن التفويض.

## <picture><img src="assets/icons/shield.svg" width="24" height="24" alt=""></picture> تسلسل المصادقة والتفويض

```mermaid
flowchart TD
    START(["حساب موجود"]) --> OTP["OTP بالبريد - 6 أرقام - 5 دقائق"]
    START --> GOOGLE["Google OAuth اختياري"]
    GOOGLE --> CHECK
    OTP --> CHECK{"حساب نشط وبريد مؤكد؟"}
    CHECK -- "لا" --> DENY(["الوصول مرفوض"])
    CHECK -- "نعم" --> MFA{"هل MFA مطلوبة؟"}
    MFA -- "لا" --> PERM{"هل توجد صلاحية لهذا المورد؟"}
    MFA -- "نعم" --> TRUST{"جهاز موثوق صالح أو تحدي TOTP/الاسترداد"}
    TRUST -- "اجتاز" --> PERM
    TRUST -- "فشل" --> DENY
    PERM -- "مسموح" --> GRANT(["عرض مصرح به"])
    PERM -- "لا" --> DENY
    classDef gate fill:#eef2ff,stroke:#6366f1,color:#312e81;
    classDef granted fill:#dcfce7,stroke:#16a34a,color:#14532d;
    classDef denied fill:#fee2e2,stroke:#dc2626,color:#7f1d1d;
    class CHECK,MFA,TRUST,PERM gate;
    class GRANT granted;
    class DENY denied;
```

يتطلب تسجيل الدخول بالبريد العامل الأول دائمًا. قد يعفي الجهاز الموثوق من إعادة تحدي العامل الثاني عند استيفاء الشروط، لكنه لا يحل محل التحقق من البريد. Google OAuth اختياري ويخضع لقواعد الحساب وMFA نفسها. في التسجيل المفتوح يمنح الخادم الدور الذي حدده المسؤول بعد تأكيد البريد، ولا يختار المستخدم صلاحياته.

## <picture><img src="assets/icons/terminal.svg" width="24" height="24" alt=""></picture> التشغيل محليًا

**المتطلبات:** Node.js 24 أو أحدث، وnpm، وGit. تستخدم الأوامر التالية D1 والبريد **محليًا** ولا تنشئ بنية تحتية بعيدة.

نفذ الأوامر التالية من مجلد المشروع:

```bash
git clone https://github.com/rounverr/tba.git
cd tba
npm ci
npm run setup -- --name "My application" --id my-application
npm run db:migrate:local
npm run admin:bootstrap -- --email admin@example.test --name "Initial Admin"
npm run build
npm run mail:dev
```

في **نافذة طرفية ثانية** شغّل Worker المحلي الكامل:

```bash
npm run dev:worker
```

افتح **http://localhost:8787**. صندوق بريد التطوير على **http://127.0.0.1:8025**؛ لا تغادر الرسائل الجهاز وتُمسح الذاكرة عند إعادة التشغيل. يجب على المسؤول الأول أيضًا تأكيد بريده باستخدام OTP. استخدم `npm run dev` لتعديل الواجهة سريعًا و`dev:worker` بعد البناء لاختبار المصادقة الكاملة.

<details>
<summary><strong>مرجع الأوامر</strong></summary>

| الأمر | الغرض |
| :--- | :--- |
| `npm run check` | فحوصات Astro وTypeScript |
| `npm test` | اختبارات آلية محلية |
| `npm run build` | بناء الواجهة الأمامية |
| `npm run worker:check` | فحص Worker دون نشر |
| `npm run setup` | إعداد تطبيق مستقل |
| `npm run db:create` / `npm run db:link` | عمليات D1 البعيدة تتطلب حسابًا وتأكيدًا صريحين |
| `npm run deploy` | نشر يدوي إلى الحساب المحدد |

</details>

## <picture><img src="assets/icons/mail.svg" width="24" height="24" alt=""></picture> البريد الإلكتروني للمعاملات - اختر مزودك

يستخدم TBA **وسيلة إرسال بريد قابلة للتغيير**. تنشئ المصادقة رموز OTP وإشعارات الأمان بشكل مستقل عن الشركة التي تسلم الرسائل.

| الخيار | الحالة الحالية |
| :--- | :--- |
| Wavicc | **التكامل المستقبلي المفضل لدى Rounver**؛ لم يُنفذ محول API بعد |
| Cloudflare Email Sending (على Worker فقط) | **منفذ** باستخدام الربط الأصلي `EMAIL` |
| Resend | **منفذ**؛ `--mail resend` و`RESEND_API_KEY` و`MAIL_FROM` موثق |
| صندوق البريد المحلي | **منفذ** للتطوير دون تسليم خارجي |
| خدمات البريد الأخرى للمعاملات | نفّذ محوّلًا للخدمة المختارة واختبره. |

يدعم الإعداد `--mail local` و`--mail resend` و`--mail cloudflare`. يستخدم البريد المحلي `APP_URL` محليًا و`npm run mail:dev`، ويحتاج Resend إلى `RESEND_API_KEY` و`MAIL_FROM`. يعيد Cloudflare استخدام المحول الحالي ويتطلب ربط `send_email` باسم `EMAIL` و`MAIL_FROM` مسموحًا ونطاق إرسال مجهزًا. يتحقق الإعداد محليًا دون إنشاء موارد أو التحقق من نطاق بعيد. يمكن تأجيل الإعداد: يسأل الوضع التفاعلي عن المتابعة، ويتابع غير التفاعلي بقائمة مهام معلقة. لا يخترع ربطًا أو مرسلًا أو بيانات اعتماد؛ لا يعمل الإرسال حتى اكتمال الإعداد. احفظ الأسرار خارج Git. يبقى Wavicc التكامل المستقبلي المفضل و`WAVICC_API_KEY` حقلًا محجوزًا. راجع [إعداد البريد](ar/setup-mail.md).

## <picture><img src="assets/icons/globe.svg" width="24" height="24" alt=""></picture> اللغات وإمكانية الوصول

| اللغة | الرمز | الاتجاه |
| :--- | :---: | :---: |
| English | en | LTR |
| Español | es | LTR |
| Português | pt | LTR |
| Deutsch | de | LTR |
| Français | fr | LTR |
| Italiano | it | LTR |
| 简体中文 | zh | LTR |
| 日本語 | ja | LTR |
| हिन्दी | hi | LTR |
| العربية | ar | RTL |

الإنجليزية لغة أساس الشيفرة ومساعد setup. تأتي الترجمات العشر والخطوط المحلية ضمن الحزمة. يفعّل `npm run setup -- --languages en,pt` الإنجليزية والبرتغالية فقط دون تثبيت حزم إضافية أو حذف الترجمات الأخرى. يحفظ حذف الخيار `--languages` الاختيار الحالي، أو يفعّل العشر إن لم توجد قائمة. تبقى الإنجليزية مفعلة كمرجع احتياطي للترجمات. يحدد `--locale en` لغة التطبيق الافتراضية ويقبل أي لغة مفعلة. الأولوية للتفضيل المحفوظ ثم لغة المتصفح المدعومة ثم الافتراضية المحددة. لا يعيد تغيير اللغة تحميل الصفحة أو ضبط النماذج؛ وتبقى العربية RTL.

تبقى الإنجليزية ضمن الحزمة الأولية كلغة بديلة. تستخدم بقية قواميس الدخول واللوحة استيرادًا ديناميكيًا وذاكرة تخزين لكل وحدة. يبدأ تركيز لوحة المفاتيح أو المؤشر تحميل الخيار المقصود فقط؛ فتح القائمة لا ينزل جميع اللغات. يطبق التغيير بعد اكتمال القواميس مع الحفاظ على النماذج والجلسة والتنقل. لا تحتاج الخيارات المخزنة إلى الشبكة، ويسود آخر اختيار. يظهر فشل البداية الإنجليزية، ويحافظ فشل التغيير على اللغة الحالية. تستخدم الرسائل وبيانات البناء قواميس كاملة خاصة بالخادم. راجع [تحميل اللغات](ar/language-loading.md).

يبدأ المستند تحميل اللغة المكتشفة أثناء تحميل React ويشارك الذاكرة مع المزوّد لتجنب انتظار ثانٍ عند البدء.

## <picture><img src="assets/icons/settings.svg" width="24" height="24" alt=""></picture> إنشاء مشروع مستقل

أنشئ مستودعًا منفصلًا من القالب ثم هيئه لتطبيقك. لا تتشارك المشاريع المشتقة المستخدمين أو ملفات تعريف الارتباط أو قواعد الهوية أو الأسرار.

```mermaid
flowchart LR
    CORE["مكونات TBA الأساسية المراجعة"] --> REPO["مستودع التطبيق المستقل"]
    REPO --> ID["اسم وشعار وتصميم خاص"]
    ID --> RES["قاعدة بيانات وأسرار وبريد مستقلة"]
    RES --> QA["فحوصات واختبارات وبناء يدوي"]
    QA --> DEP["نشر مصرح به"]
    classDef tile fill:#f8fafc,stroke:#64748b,color:#0f172a,stroke-width:1.5px;
    class CORE,REPO,ID,RES,QA,DEP tile;
```

استخدم `src/config/app.json` لتحديد الهوية والمظهر والموضوع الافتراضي. تحقق من حساب Cloudflare وربط D1 قبل أي تغيير بعيد. **يجري الفريق الاختبارات والنشر يدويًا**؛ GitHub Actions وWorkers Builds ليسا شرطين للنشر. نسخ GitHub Template لا تتلقى تحديثات المستودع الأصلي تلقائيًا.

## <picture><img src="assets/icons/book.svg" width="24" height="24" alt=""></picture> التوثيق التقني

[البنية](ar/architecture.md) | [الأمان وMFA والصلاحيات](ar/security.md) | [التسجيل ونقاط التوسعة](ar/registration.md) | [البريد للمعاملات](ar/mail-providers.md) | [العمليات وD1](ar/operations.md) | [لغات الدخول](ar/auth-i18n.md) | [لغات لوحة الإدارة](ar/workspace-i18n.md) | [التحقق](ar/validation.md) | [فهرس التوثيق](ar/README.md)

## <picture><img src="assets/icons/scale.svg" width="24" height="24" alt=""></picture> الترخيص والعلامة التجارية والصيانة

تسري **رخصة MIT** على البرنامج الأصلي الذي تملك Rounver حقوقه، مع بقاء تراخيص مكونات الجهات الأخرى والخطوط سارية. **اسم Rounver وشعار الشركة محفوظان** ولا يشملهما منح MIT. تتولى Rounver وحدها صيانة المستودع الأصلي ولا تقبل مساهمات خارجية، مع بقاء حق إنشاء نسخ مستقلة وتعديلها وإعادة توزيعها وفق MIT. راجع [LICENSE](../LICENSE) و[TRADEMARKS.md](../TRADEMARKS.md) و[CONTRIBUTING.md](../CONTRIBUTING.md).

</div>

---

<div align="center">

**Rounver Corp.** | Reusable software | Independent projects | Rounver-maintained upstream

</div>

[تراخيص الجهات الخارجية](licenses/README.md#ar)
