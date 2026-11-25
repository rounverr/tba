# <picture><img src="../assets/icons/database.svg" width="28" height="28" alt=""></picture> डेटाबेस इंजन

<p align="center"><a href="../en/database-engines.md" lang="en">English</a> | <a href="../es/database-engines.md" lang="es">Español</a> | <a href="../pt/database-engines.md" lang="pt">Português</a> | <a href="../de/database-engines.md" lang="de">Deutsch</a> | <a href="../fr/database-engines.md" lang="fr">Français</a> | <a href="../it/database-engines.md" lang="it">Italiano</a> | <a href="../zh/database-engines.md" lang="zh">简体中文</a> | <a href="../ja/database-engines.md" lang="ja">日本語</a> | <strong>हिन्दी</strong> | <a href="../ar/database-engines.md" lang="ar">العربية</a></p>

[तकनीकी दस्तावेज़](README.md) | [परियोजना का परिचय](../README.hi.md)

> [!NOTE]
> D1 के लिए Cloudflare Workers और SQLite या PostgreSQL के लिए Node.js 24+ का उपयोग करें। हर इंस्टॉलेशन के लिए स्रोत की अलग प्रति रखें। `npm ci` चलाएँ और `npm run setup -- --interactive` से इंजन चुनें। डिफ़ॉल्ट D1 है। `DATABASE_URL` और `BETTER_AUTH_SECRET` को `.dev.vars` या पर्यावरण में रखें। [कमांड तालिका](../en/database-engines.md) के अनुसार बिल्ड, माइग्रेशन और पहले व्यवस्थापक का सेटअप करें, फिर `npm start` चलाएँ। PostgreSQL के लिए `--target` ज़रूरी है। माइग्रेशन से पहले बैकअप लें। Node में स्थानीय मेल या Resend का उपयोग करें। [D1 संचालन](operations.md) | [मेल](setup-mail.md)

D1 और SQLite `drizzle/` से 0001 से 0003 तक की SQL फ़ाइलें लागू करते हैं। PostgreSQL `drizzle/postgresql/` वाली अलग क्रमांकित फ़ाइलें इस्तेमाल करता है। हर स्थापना का इतिहास अलग है।

`better-sqlite3` केवल SQLite के लिए आवश्यक वैकल्पिक निर्भरता है। SQLite फ़ाइल `dist` से बाहर रखें। PostgreSQL TLS पर प्रमाणपत्र और होस्टनाम जाँचता है। दूरस्थ लक्ष्य के लिए `--target host:port/database` दें।

माइग्रेशन 0001 से 0003 के SQL के लिए कम से कम PostgreSQL 11 का सिंटैक्स चाहिए। इंटीग्रेशन परीक्षण 17.12 और 18.7 पर हुए। नई स्थापना के लिए रखरखाव वाला संस्करण चुनें, अधिमानतः PostgreSQL 18 का नवीनतम पैच।

Windows की स्थापना और डायरेक्टरी जंक्शन, बाहरी Google OAuth कॉलबैक, वास्तविक Resend डिलीवरी और स्वतंत्र पेनेट्रेशन परीक्षण अभी लंबित हैं।
