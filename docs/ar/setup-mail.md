# <picture><img src="../assets/icons/mail.svg" width="28" height="28" alt=""></picture> إعداد البريد

<p align="center"><a href="../en/setup-mail.md" lang="en">English</a> | <a href="../es/setup-mail.md" lang="es">Español</a> | <a href="../pt/setup-mail.md" lang="pt">Português</a> | <a href="../de/setup-mail.md" lang="de">Deutsch</a> | <a href="../fr/setup-mail.md" lang="fr">Français</a> | <a href="../it/setup-mail.md" lang="it">Italiano</a> | <a href="../zh/setup-mail.md" lang="zh">简体中文</a> | <a href="../ja/setup-mail.md" lang="ja">日本語</a> | <a href="../hi/setup-mail.md" lang="hi">हिन्दी</a> | <strong>العربية</strong></p>

[التوثيق التقني](README.md) | [نظرة عامة على المشروع](../README.ar.md)

> [!NOTE]
> تعمل Cloudflare Email Sending على Workers عبر الربط `EMAIL`. يعمل Resend وصندوق بريد التطوير المحلي على Workers وNode.js. تكامل Wavicc مخطط له.

يدعم الإعداد `--mail local` و`--mail resend` و`--mail cloudflare`. يستخدم البريد المحلي `APP_URL` محليًا و`npm run mail:dev`، ويحتاج Resend إلى `RESEND_API_KEY` و`MAIL_FROM`. يعيد Cloudflare استخدام المحول الحالي ويتطلب ربط `send_email` باسم `EMAIL` و`MAIL_FROM` مسموحًا ونطاق إرسال مجهزًا. يتحقق الإعداد محليًا دون إنشاء موارد أو التحقق من نطاق بعيد. يمكن تأجيل الإعداد: يسأل الوضع التفاعلي عن المتابعة، ويتابع غير التفاعلي بقائمة مهام معلقة. لا يخترع ربطًا أو مرسلًا أو بيانات اعتماد؛ لا يعمل الإرسال حتى اكتمال الإعداد. احفظ الأسرار خارج Git. يبقى Wavicc التكامل المستقبلي المفضل و`WAVICC_API_KEY` حقلًا محجوزًا. راجع [إعداد البريد](setup-mail.md).

```bash
npm run setup -- --mail local
npm run setup -- --mail resend
npm run setup -- --mail cloudflare
```

```jsonc
// Merge into the existing configuration; preserve its other bindings and vars.
{
  "send_email": [{ "name": "EMAIL" }],
  "vars": { "MAIL_FROM": "sender@example.com" }
}
```
