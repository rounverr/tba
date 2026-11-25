# <picture><img src="../assets/icons/check.svg" width="28" height="28" alt=""></picture> जाँच सूची

<p align="center"><a href="../en/validation.md" lang="en">English</a> | <a href="../es/validation.md" lang="es">Español</a> | <a href="../pt/validation.md" lang="pt">Português</a> | <a href="../de/validation.md" lang="de">Deutsch</a> | <a href="../fr/validation.md" lang="fr">Français</a> | <a href="../it/validation.md" lang="it">Italiano</a> | <a href="../zh/validation.md" lang="zh">简体中文</a> | <a href="../ja/validation.md" lang="ja">日本語</a> | <strong>हिन्दी</strong> | <a href="../ar/validation.md" lang="ar">العربية</a></p>

[तकनीकी दस्तावेज़](README.md) | [परियोजना का परिचय](../README.hi.md)

[इंजन गाइड](database-engines.md) के अनुसार अलग इंस्टॉलेशन में D1, SQLite और PostgreSQL टेस्ट चलाएँ।

1. `npm ci` से निर्भरताएँ स्थापित करें।
2. `npm run check` से फ्रंटएंड और बैकएंड के प्रकार जाँचें।
3. `npm test` से यूनिट और इंटीग्रेशन परीक्षण चलाएँ।
4. `npm run build` से प्रोडक्शन संसाधन तैयार करें।
5. `npm run worker:check` से Worker पैकेज की जाँच करें।
6. ईमेल OTP, वैकल्पिक Google लॉगिन, MFA सक्रियण और रिकवरी, विश्वसनीय उपकरण, सत्र निरस्तीकरण, भूमिकाओं और अनुमतियों, पंजीकरण मोड और अनधिकृत प्रवेश अस्वीकार होने की मैन्युअल जाँच करें।
7. लॉगिन और प्रशासन पैनल की सभी दस भाषाएँ, अरबी RTL सहित, जाँचें। पुष्टि करें कि भाषा बदलने से पृष्ठ रीलोड या फ़ॉर्म रीसेट नहीं होते।
8. डेस्कटॉप और मोबाइल लेआउट, कीबोर्ड नेविगेशन, स्क्रीन रीडर और सुरक्षा हेडर जाँचें।
9. किसी स्पष्ट रूप से स्वीकृत प्रकाशन से पहले सीक्रेट, माइग्रेशन, वातावरण से जुड़ी सेटिंग, दस्तावेज़ लिंक और चुनी गई फ़ाइलों के अंतर जाँचें। प्रकाशन मैन्युअल है; CI और Workers Builds आवश्यक नहीं।

यह सूची वास्तविक पुनः उपयोग पैकेज पर चलाएँ, केवल विस्तार वाली विकास प्रति पर नहीं। बुनियादी सूची, ऑडिट और डैशबोर्ड बिना उन्नत खोज/फ़िल्टर/क्रम या XLSX imports के जाँचें। अधिकृत सत्र में हटे `/api/private/export/*` मार्ग 404 दें।


`tests/browser/*.mjs` वैकल्पिक मैनुअल जाँच हैं और `npm test` का हिस्सा नहीं हैं। Playwright (`PLAYWRIGHT_MODULE`), Chromium (`BROWSER_EXECUTABLE`) तथा 404 fallback वाली स्थानीय बिल्ड साइट (`AUTH_TEST_URL`) दें। लॉगिन/पैनल में दस भाषाएँ चालू हों; `enabled-languages.mjs` के लिए `--languages en,pt --locale en` वाली अलग fixture चाहिए। मेल HTML पहले `MAIL_PREVIEW_DIR` और `tests/mail-template.test.ts` से बनाएँ। `dist` की स्थिर प्रति इस्तेमाल करें। वास्तविक स्थानीय सर्वर पर OTP और HTTP अनुरोध जाँचने के लिए `node-panel.mjs` चलाएँ। अन्य इंटरफ़ेस टेस्ट API का अनुकरण कर सकते हैं।

बिल्ड किए गए साइट पर `node tests/browser/panel-idle.mjs` चलाकर मूल सूचियों की दस मिनट की निष्क्रियता और BFCache पुनः सत्यापन जाँचें।

अंग्रेज़ी fallback के रूप में शुरुआती बंडल में रहती है। अन्य लॉगिन और पैनल कैटलॉग dynamic import और प्रति मॉड्यूल memory cache से लोड होते हैं। कीबोर्ड या पॉइंटर focus केवल संबंधित भाषा पहले लोड करता है; मेनू खोलने से सभी भाषाएँ डाउनलोड नहीं होतीं। पूरे कैटलॉग तैयार होने पर बदलाव होता है, जिससे फ़ॉर्म, सत्र और नेविगेशन सुरक्षित रहते हैं। cached बदलाव में नेटवर्क नहीं लगता; अंतिम चयन लागू होता है। शुरुआती विफलता में अंग्रेज़ी और बाद की विफलता में वर्तमान भाषा रहती है। ईमेल और build metadata पूरे server-only कैटलॉग इस्तेमाल करते हैं। [भाषा लोडिंग](language-loading.md) देखें।

> [!NOTE]
> Windows की स्थापना और डायरेक्टरी जंक्शन, बाहरी Google OAuth कॉलबैक, वास्तविक Resend डिलीवरी और स्वतंत्र पेनेट्रेशन परीक्षण अभी लंबित हैं।
