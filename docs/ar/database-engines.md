# <picture><img src="../assets/icons/database.svg" width="28" height="28" alt=""></picture> محركات قواعد البيانات

<p align="center"><a href="../en/database-engines.md" lang="en">English</a> | <a href="../es/database-engines.md" lang="es">Español</a> | <a href="../pt/database-engines.md" lang="pt">Português</a> | <a href="../de/database-engines.md" lang="de">Deutsch</a> | <a href="../fr/database-engines.md" lang="fr">Français</a> | <a href="../it/database-engines.md" lang="it">Italiano</a> | <a href="../zh/database-engines.md" lang="zh">简体中文</a> | <a href="../ja/database-engines.md" lang="ja">日本語</a> | <a href="../hi/database-engines.md" lang="hi">हिन्दी</a> | <strong>العربية</strong></p>

[التوثيق التقني](README.md) | [نظرة عامة على المشروع](../README.ar.md)

> [!NOTE]
> استخدم Cloudflare Workers مع D1 وNode.js 24 أو أحدث مع SQLite وPostgreSQL. جهّز نسخة مستقلة من المصدر لكل تثبيت. شغّل `npm ci` واختر المحرك عبر `npm run setup -- --interactive`. المحرك الافتراضي هو D1. احفظ `DATABASE_URL` و`BETTER_AUTH_SECRET` في `.dev.vars` أو متغيرات البيئة. اتبع [جدول الأوامر](../en/database-engines.md) للبناء والترحيل وتهيئة المسؤول الأول، ثم شغّل `npm start`. يتطلب PostgreSQL الخيار `--target`. احفظ نسخة احتياطية قبل الترحيل. يدعم Node البريد المحلي وResend. [تشغيل D1](operations.md) | [البريد](setup-mail.md)

يطبّق D1 وSQLite ملفات SQL من 0001 إلى 0003 في `drizzle/`، ويستخدم PostgreSQL ملفاته المرقّمة الخاصة في `drizzle/postgresql/`. يحتفظ كل تثبيت بسجل ترحيل مستقل.

`better-sqlite3` تبعية اختيارية يحتاجها SQLite وحده. يجب حفظ ملف SQLite خارج `dist`. يتحقق PostgreSQL من الشهادة واسم المضيف عبر TLS. للهدف البعيد استخدم `--target host:port/database`.

تتطلب الترحيلات 0001 إلى 0003 صياغة SQL من PostgreSQL 11 على الأقل. تحققت اختبارات التكامل من 17.12 و18.7. للتثبيت الجديد استخدم إصدارًا ما زال مدعومًا، ويُفضّل أحدث تحديث لـ PostgreSQL 18.

ما زال التحقق من التثبيت ووصلات الأدلة على Windows، واستدعاء Google OAuth الخارجي، والتسليم الفعلي عبر Resend، واختبار الاختراق المستقل معلقًا.
