# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> भाषा लोडिंग

<p align="center"><a href="../en/language-loading.md" lang="en">English</a> | <a href="../es/language-loading.md" lang="es">Español</a> | <a href="../pt/language-loading.md" lang="pt">Português</a> | <a href="../de/language-loading.md" lang="de">Deutsch</a> | <a href="../fr/language-loading.md" lang="fr">Français</a> | <a href="../it/language-loading.md" lang="it">Italiano</a> | <a href="../zh/language-loading.md" lang="zh">简体中文</a> | <a href="../ja/language-loading.md" lang="ja">日本語</a> | <strong>हिन्दी</strong> | <a href="../ar/language-loading.md" lang="ar">العربية</a></p>

[तकनीकी दस्तावेज़](README.md) | [परियोजना का परिचय](../README.hi.md)

> [!NOTE]
> अंग्रेज़ी fallback के रूप में शुरुआती बंडल में रहती है। अन्य लॉगिन और पैनल कैटलॉग dynamic import और प्रति मॉड्यूल memory cache से लोड होते हैं। कीबोर्ड या पॉइंटर focus केवल संबंधित भाषा पहले लोड करता है; मेनू खोलने से सभी भाषाएँ डाउनलोड नहीं होतीं। पूरे कैटलॉग तैयार होने पर बदलाव होता है, जिससे फ़ॉर्म, सत्र और नेविगेशन सुरक्षित रहते हैं। cached बदलाव में नेटवर्क नहीं लगता; अंतिम चयन लागू होता है। शुरुआती विफलता में अंग्रेज़ी और बाद की विफलता में वर्तमान भाषा रहती है। ईमेल और build metadata पूरे server-only कैटलॉग इस्तेमाल करते हैं। [भाषा लोडिंग](language-loading.md) देखें।

दस्तावेज़ React लोड होते समय ही पहचानी गई भाषा लोड करना शुरू करता है और provider के साथ cache साझा करता है, जिससे शुरुआत में दोबारा इंतज़ार नहीं होता।

`src/lib/i18n/bootstrap.ts` | `src/lib/i18n/catalog.ts` | `panel.ts` | `language-cache.ts` | `catalog.server.ts` | `src/components/AuthI18n.tsx`

`tests/browser/lazy-languages.mjs` | `PLAYWRIGHT_MODULE` | `BROWSER_EXECUTABLE` | `AUTH_TEST_URL`

```bash
npm run check
npm test
npm run build
npm run worker:check
```
