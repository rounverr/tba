# <picture><img src="../assets/icons/mail.svg" width="28" height="28" alt=""></picture> ईमेल सेटअप

<p align="center"><a href="../en/setup-mail.md" lang="en">English</a> | <a href="../es/setup-mail.md" lang="es">Español</a> | <a href="../pt/setup-mail.md" lang="pt">Português</a> | <a href="../de/setup-mail.md" lang="de">Deutsch</a> | <a href="../fr/setup-mail.md" lang="fr">Français</a> | <a href="../it/setup-mail.md" lang="it">Italiano</a> | <a href="../zh/setup-mail.md" lang="zh">简体中文</a> | <a href="../ja/setup-mail.md" lang="ja">日本語</a> | <strong>हिन्दी</strong> | <a href="../ar/setup-mail.md" lang="ar">العربية</a></p>

[तकनीकी दस्तावेज़](README.md) | [परियोजना का परिचय](../README.hi.md)

> [!NOTE]
> Cloudflare Email Sending Workers के `EMAIL` बाइंडिंग पर चलता है। Resend और स्थानीय डेवलपमेंट मेल Workers और Node.js पर चलते हैं। Wavicc भविष्य का एकीकरण है।

सेटअप `--mail local`, `--mail resend` और `--mail cloudflare` स्वीकार करता है। स्थानीय ईमेल में local `APP_URL` और `npm run mail:dev`; Resend में `RESEND_API_KEY` और `MAIL_FROM` चाहिए। Cloudflare मौजूदा adapter इस्तेमाल करता है और `EMAIL` नाम का `send_email` binding, अनुमत `MAIL_FROM` तथा सक्षम sending domain चाहता है। सेटअप केवल स्थानीय जाँच करता है, संसाधन बनाता या remote domain जाँचता नहीं। कॉन्फ़िगरेशन बाद में हो सकती है: interactive मोड जारी रखने का विकल्प देता है, noninteractive मोड लंबित सूची दिखाकर आगे बढ़ता है। binding, sender या credentials गढ़े नहीं जाते; कॉन्फ़िगरेशन पूरी होने पर ही भेजना संभव है। secrets Git से बाहर रखें। Wavicc पसंदीदा भावी एकीकरण और `WAVICC_API_KEY` placeholder है। [ईमेल सेटअप](setup-mail.md) देखें।

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
