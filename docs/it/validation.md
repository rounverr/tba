# <picture><img src="../assets/icons/check.svg" width="28" height="28" alt=""></picture> Lista di convalida

<p align="center"><a href="../en/validation.md" lang="en">English</a> | <a href="../es/validation.md" lang="es">Español</a> | <a href="../pt/validation.md" lang="pt">Português</a> | <a href="../de/validation.md" lang="de">Deutsch</a> | <a href="../fr/validation.md" lang="fr">Français</a> | <strong>Italiano</strong> | <a href="../zh/validation.md" lang="zh">简体中文</a> | <a href="../ja/validation.md" lang="ja">日本語</a> | <a href="../hi/validation.md" lang="hi">हिन्दी</a> | <a href="../ar/validation.md" lang="ar">العربية</a></p>

[Documentazione tecnica](README.md) | [Panoramica del progetto](../README.it.md)

Esegui le suite di D1, SQLite e PostgreSQL in installazioni isolate secondo la [guida dei motori](database-engines.md).

1. Installare le dipendenze con `npm ci`.
2. Controllare i tipi frontend e backend con `npm run check`.
3. Eseguire test unitari e di integrazione con `npm test`.
4. Compilare le risorse di produzione con `npm run build`.
5. Verificare il pacchetto Worker con `npm run worker:check`.
6. Provare manualmente OTP via email, accesso Google facoltativo, attivazione e recupero MFA, dispositivi attendibili, revoca delle sessioni, ruoli e permessi, modalità di registrazione e blocco degli accessi non autorizzati.
7. Verificare login e pannello amministrativo nelle dieci lingue, incluso l'arabo RTL. Confermare che il cambio di lingua non ricarichi la pagina né azzeri i moduli.
8. Controllare layout desktop e mobile, navigazione da tastiera, lettori di schermo e intestazioni di sicurezza.
9. Prima di ogni promozione espressamente autorizzata, verificare segreti, migrazioni, configurazioni dell'ambiente, link della documentazione e differenze dei file selezionati. La pubblicazione è manuale; CI e Workers Builds non sono obbligatori.

Eseguire la lista sul pacchetto riutilizzabile reale, non solo su una copia con estensioni. Verificare elenchi base, audit e dashboard senza ricerca/filtri/ordinamento avanzati né import XLSX. Con sessione autorizzata, le rotte escluse `/api/private/export/*` devono rispondere 404. Conservare il `.txt` di recupero MFA. 


Gli script `tests/browser/*.mjs` sono controlli manuali facoltativi, esclusi da `npm test`. Fornire Playwright (`PLAYWRIGHT_MODULE`), Chromium (`BROWSER_EXECUTABLE`) e un sito locale compilato (`AUTH_TEST_URL`) con fallback 404. Accesso/pannello usano dieci lingue; `enabled-languages.mjs` richiede una fixture separata con `--languages en,pt --locale en`. Generare gli HTML con `MAIL_PREVIEW_DIR` e `tests/mail-template.test.ts` prima di `mail-preview.mjs`. Usare una copia fissa di `dist`. Usa `node-panel.mjs` per verificare OTP e richieste HTTP su un server locale reale. Gli altri test dell’interfaccia possono simulare l’API.

Esegui `node tests/browser/panel-idle.mjs` sul sito compilato per misurare dieci minuti di inattività degli elenchi di base e verificare la riconvalida del BFCache.

L’inglese resta incluso come fallback. Gli altri cataloghi di accesso e pannello usano import dinamici e cache in memoria per modulo. Il focus di tastiera o puntatore precarica solo l’opzione indicata; aprire il menu non scarica tutte le lingue. Il cambio attende i cataloghi completi e conserva moduli, sessione e navigazione. La cache evita la rete; prevale l’ultima scelta. Un errore iniziale mostra l’inglese, un errore successivo mantiene la lingua attuale. Email e metadati del build usano cataloghi completi solo sul server. Vedi il [caricamento delle lingue](language-loading.md).

> [!NOTE]
> Restano da verificare l’installazione e le directory junction su Windows, il callback esterno di Google OAuth, l’invio reale tramite Resend e un test di penetrazione indipendente.
