# <picture><img src="../assets/icons/layers.svg" width="28" height="28" alt=""></picture> نطاق القالب

<p align="center"><a href="../en/template-scope.md" lang="en">English</a> | <a href="../es/template-scope.md" lang="es">Español</a> | <a href="../pt/template-scope.md" lang="pt">Português</a> | <a href="../de/template-scope.md" lang="de">Deutsch</a> | <a href="../fr/template-scope.md" lang="fr">Français</a> | <a href="../it/template-scope.md" lang="it">Italiano</a> | <a href="../zh/template-scope.md" lang="zh">简体中文</a> | <a href="../ja/template-scope.md" lang="ja">日本語</a> | <a href="../hi/template-scope.md" lang="hi">हिन्दी</a> | <strong>العربية</strong></p>

[التوثيق التقني](README.md) | [نظرة عامة على المشروع](../README.ar.md)

يستخدم TBA افتراضيًا Cloudflare Workers مع D1. تعمل الواجهة نفسها وواجهة Hono API أيضًا على Node.js مع SQLite أو PostgreSQL. [محركات قواعد البيانات](database-engines.md)

يشمل القالب الأساسي OTP بالبريد، ودخول Google الاختياري، وMFA عبر TOTP والاسترداد، والأجهزة الموثوقة، والجلسات، والأدوار والصلاحيات، والملف الشخصي، وتغيير البريد، وإدارة الحسابات الأساسية، وطلبات التسجيل، والتدقيق، ولوحة المعلومات. يدعم الدخول والإدارة عشر لغات ومظهرين فاتحًا وداكنًا.

> [!NOTE]
> تبقى القوائم الأساسية والتنقل المحدود بين الصفحات، وجداول قاعدة البيانات والقيود والترحيلات العامة اللازمة للهوية والتدقيق ولوحة المعلومات. لا يتضمن التوزيع الأساسي محركات البحث والتصفية والفرز والترقيم المتقدم، ولا تصدير Excel/XLSX. يمكن لكل مشروع إضافتها وفق بياناته وصلاحياته. يبقى تنزيل رموز استرداد MFA محليًا بصيغة `.txt` ضمن أمان الحساب.

لكل تطبيق Worker وقاعدة بيانات ومستخدمون وأسرار ونطاقات وبريد مستقل. لا تُنشأ ملفات تجارية أو مؤسسات أو فوترة أو بيانات عملاء تلقائيًا. استخدم خطاف التسجيل لتوسعات المشروع. تخضع إعادة الاستخدام إلى [رخصة MIT](../../LICENSE) مع حفظ الإشعارات و[رخص الخطوط](../licenses/README.md#ar). العلامات المؤسسية منظمة بشكل منفصل في [TRADEMARKS](../../TRADEMARKS.md).
