# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> تحميل اللغات

<p align="center"><a href="../en/language-loading.md" lang="en">English</a> | <a href="../es/language-loading.md" lang="es">Español</a> | <a href="../pt/language-loading.md" lang="pt">Português</a> | <a href="../de/language-loading.md" lang="de">Deutsch</a> | <a href="../fr/language-loading.md" lang="fr">Français</a> | <a href="../it/language-loading.md" lang="it">Italiano</a> | <a href="../zh/language-loading.md" lang="zh">简体中文</a> | <a href="../ja/language-loading.md" lang="ja">日本語</a> | <a href="../hi/language-loading.md" lang="hi">हिन्दी</a> | <strong>العربية</strong></p>

[التوثيق التقني](README.md) | [نظرة عامة على المشروع](../README.ar.md)

> [!NOTE]
> تبقى الإنجليزية ضمن الحزمة الأولية كلغة بديلة. تستخدم بقية قواميس الدخول واللوحة استيرادًا ديناميكيًا وذاكرة تخزين لكل وحدة. يبدأ تركيز لوحة المفاتيح أو المؤشر تحميل الخيار المقصود فقط؛ فتح القائمة لا ينزل جميع اللغات. يطبق التغيير بعد اكتمال القواميس مع الحفاظ على النماذج والجلسة والتنقل. لا تحتاج الخيارات المخزنة إلى الشبكة، ويسود آخر اختيار. يظهر فشل البداية الإنجليزية، ويحافظ فشل التغيير على اللغة الحالية. تستخدم الرسائل وبيانات البناء قواميس كاملة خاصة بالخادم. راجع [تحميل اللغات](language-loading.md).

يبدأ المستند تحميل اللغة المكتشفة أثناء تحميل React ويشارك الذاكرة مع المزوّد لتجنب انتظار ثانٍ عند البدء.

`src/lib/i18n/bootstrap.ts` | `src/lib/i18n/catalog.ts` | `panel.ts` | `language-cache.ts` | `catalog.server.ts` | `src/components/AuthI18n.tsx`

`tests/browser/lazy-languages.mjs` | `PLAYWRIGHT_MODULE` | `BROWSER_EXECUTABLE` | `AUTH_TEST_URL`

```bash
npm run check
npm test
npm run build
npm run worker:check
```
