# <picture><img src="../assets/icons/layers.svg" width="28" height="28" alt=""></picture> टेम्पलेट का दायरा

<p align="center"><a href="../en/template-scope.md" lang="en">English</a> | <a href="../es/template-scope.md" lang="es">Español</a> | <a href="../pt/template-scope.md" lang="pt">Português</a> | <a href="../de/template-scope.md" lang="de">Deutsch</a> | <a href="../fr/template-scope.md" lang="fr">Français</a> | <a href="../it/template-scope.md" lang="it">Italiano</a> | <a href="../zh/template-scope.md" lang="zh">简体中文</a> | <a href="../ja/template-scope.md" lang="ja">日本語</a> | <strong>हिन्दी</strong> | <a href="../ar/template-scope.md" lang="ar">العربية</a></p>

[तकनीकी दस्तावेज़](README.md) | [परियोजना का परिचय](../README.hi.md)

TBA का डिफ़ॉल्ट विन्यास Cloudflare Workers और D1 है। यही इंटरफ़ेस और Hono API Node.js पर SQLite या PostgreSQL के साथ चलते हैं। [डेटाबेस इंजन](database-engines.md)

मूल टेम्पलेट में ईमेल OTP, वैकल्पिक Google लॉगिन, TOTP MFA और रिकवरी, विश्वसनीय डिवाइस, सत्र, भूमिकाएँ और अनुमतियाँ, प्रोफ़ाइल, ईमेल बदलना, बुनियादी खाता प्रबंधन, पंजीकरण अनुरोध, ऑडिट और डैशबोर्ड शामिल हैं। लॉगिन और प्रशासन दस भाषाएँ तथा हल्की/गहरी थीम देते हैं।

> [!NOTE]
> बुनियादी सूचियाँ, सीमित पृष्ठ नेविगेशन और पहचान, ऑडिट तथा डैशबोर्ड की आवश्यक डेटाबेस तालिकाएँ, बाधाएँ और सामान्य माइग्रेशन शामिल रहते हैं। उन्नत खोज, फ़िल्टर, क्रम और पृष्ठांकन इंजन तथा Excel/XLSX निर्यात मूल वितरण में शामिल नहीं हैं। हर परियोजना अपने डेटा और अनुमतियों के अनुसार इन्हें जोड़ सकती है। MFA रिकवरी कोड का स्थानीय `.txt` डाउनलोड खाता सुरक्षा का हिस्सा बना रहता है।

हर ऐप का अपना Worker, डेटाबेस, उपयोगकर्ता, सीक्रेट, डोमेन और ईमेल विन्यास होता है। व्यावसायिक प्रोफ़ाइल, संगठन, बिलिंग या ग्राहक डेटा स्वतः नहीं बनते। परियोजना के विस्तार के लिए पंजीकरण हुक उपयोग करें। पुनः उपयोग पर [MIT लाइसेंस](../../LICENSE), आवश्यक सूचनाएँ और [फ़ॉन्ट लाइसेंस](../licenses/README.md#hi) लागू हैं। कॉर्पोरेट ट्रेडमार्क के लिए [TRADEMARKS](../../TRADEMARKS.md) देखें।
