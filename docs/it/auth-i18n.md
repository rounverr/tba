# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> Lingue dell'accesso pubblico

<p align="center"><a href="../en/auth-i18n.md" lang="en">English</a> | <a href="../es/auth-i18n.md" lang="es">Español</a> | <a href="../pt/auth-i18n.md" lang="pt">Português</a> | <a href="../de/auth-i18n.md" lang="de">Deutsch</a> | <a href="../fr/auth-i18n.md" lang="fr">Français</a> | <strong>Italiano</strong> | <a href="../zh/auth-i18n.md" lang="zh">简体中文</a> | <a href="../ja/auth-i18n.md" lang="ja">日本語</a> | <a href="../hi/auth-i18n.md" lang="hi">हिन्दी</a> | <a href="../ar/auth-i18n.md" lang="ar">العربية</a></p>

[Documentazione tecnica](README.md) | [Panoramica del progetto](../README.it.md)

> [!TIP]
> L’inglese è la lingua base del codice e dell’assistente setup. Sono incluse dieci traduzioni e font locali. `npm run setup -- --languages en,pt` abilita solo inglese e portoghese, senza installare pacchetti né cancellare altre traduzioni. Senza `--languages` si conserva la selezione attuale; senza elenco esistente vengono abilitate tutte e dieci. Inglese resta attivo come fallback delle traduzioni. `--locale en` imposta la lingua predefinita e accetta ogni lingua abilitata. La priorità è preferenza salvata, lingua compatibile del browser, poi predefinita configurata. Il cambio non ricarica né azzera moduli; arabo mantiene RTL.

L'accesso pubblico supporta inglese (`en`), spagnolo (`es`), portoghese (`pt`), tedesco (`de`), francese (`fr`), italiano (`it`), cinese semplificato (`zh`), giapponese (`ja`), hindi (`hi`) e arabo (`ar`). L'inglese è il fallback.

## Audit e ambito

L'applicazione utilizza Astro statico con isole React e autenticazione senza password mediante Better Auth. Non esisteva uno strato i18n. I testi erano in Login, le pagine pubbliche e i messaggi del server. Si riutilizzano lo stato React, i componenti attuali e le rotte esistenti, senza aggiungere pacchetti npm.

Si traducono accesso, registrazione aperta o con approvazione, verifica dell'e-mail, OTP, MFA, codici di recupero, aiuto, avvisi di reautenticazione, errori, validazioni, caricamento, ritorno di Google, accesso negato e pagina inesistente. Le e-mail OTP di accesso vengono inviate nel linguaggio scelto. Non esistono schermate di password, recupero o reimpostazione della password: non si aggiunge quel meccanismo. L'ampliamento successivo incorpora anche il pannello amministrativo e le sue impostazioni; vedere [selettore e pannello multilingue](workspace-i18n.md).

## Risoluzione e caricamento iniziale

`src/lib/i18n/config.ts` centralizza i dieci linguaggi, nomi nativi, direzione e chiave `tba-language`. La priorità è preferenza valida di `localStorage`, primo linguaggio compatibile di `navigator.languages`, `navigator.language` e, infine, inglese. Si normalizzano maiuscole, trattini e varianti regionali, come `es-AR`, `pt-BR` o `en-GB`.

`Base.astro` esegue lo stesso resolver sincronicamente nel head. Configura `lang`, `dir` e titolo prima di visualizzare il contenuto. L'HTML statico utilizza l'inglese per coincidere con la prima idratazione; `data-auth-pending` nasconde l'isola fino a quando `AuthI18n` applica la traduzione mediante `useLayoutEffect`. Così non si vede un lampo di un altro linguaggio. Gli accessi bloccati all'archiviazione vengono catturati e si utilizza il browser o lo stato della visita.

Il selettore compatto utilizza un pulsante con il simbolo del linguaggio e un menu proprio. Ha nome accessibile tradotto e opzioni con nomi nativi, `lang` e `dir`. Il select nativo nascosto conserva la serializzazione. Cambiarlo aggiorna il contesto React e persiste la preferenza. Non ricarica, naviga né consulta l'API. Non si risale il modulo: conserva e-mail, codice, intenzione di registrazione, passo, fiducia del dispositivo, attesa di reinvio, errori e operazione in corso. Gli errori conservano chiavi, quindi cambiano anche linguaggio mentre sono visibili. Il linguaggio scelto persiste tra le visite; i campi e i codici non vengono salvati nell'archiviazione.

## Cataloghi, errori e e-mail

`src/lib/i18n/messages/*.json` contiene 112 chiavi per linguaggio. `catalog.ts` tipa le chiavi, interpola parametri e risolve faltanti all'inglese. Una chiave sconosciuta mostra un errore pubblico tradotto, mai la chiave interna. Le marche, e-mail immesse, codici e nomi di organizzazione sono dati, non traduzioni.

`errors.ts` trasforma i messaggi pubblici esistenti e i codici noti dell'API in chiavi di presentazione. Gli errori sconosciuti non espongono dettagli del server. I campi conservano restrizioni e validazione del server; si presentano validazioni locali tradotte al posto di messaggi nativi dipendenti dal linguaggio installato nel browser. I cifri arabi, persiani, devanagari e di larghezza completa di OTP vengono normalizzati ai sei cifri ASCII. I codici di recupero vengono mantenuti intatti.

`X-Auth-Language` sceglie una lingua abilitata per le email, mai i permessi. Senza header o preferenza valida si usa il valore predefinito configurato (inizialmente inglese). Una preferenza disabilitata torna allo stesso valore. Inglese resta il fallback per chiavi mancanti. Accesso/registrazione verificato e selettore salvano la preferenza in `verification` (`mail-language:<userId>`); le notifiche successive usano la lingua del destinatario. Il cambio lingua non rinvia codici né modifica scadenze, tentativi o verifica. I vecchi errori restano riconosciuti.

Turnstile riceve la lingua selezionata, con `zh-CN` per cinese semplificato. Il suo widget si rigenera al cambio per aggiornare la sua interfaccia. Ciò invalida la prova CAPTCHA precedente e richiede la prova del widget aggiornato; conserva gli altri dati del modulo e i controlli del server.

## Progettazione, RTL e font

Arabo configura `dir=rtl`, inverte le frecce di navigazione e regola il pannello di immagine, la chiusura di aiuto e le allineazioni. E-mail e codici utilizzano LTR e isolamento bidirezionale. Le intestazioni ammettono più righe, i testi lunghi si adattano e le etichette non dipendono da larghezze fisse. Si mantiene l'identità, il tema e l'adattamento mobile esistente.

Le font WOFF2 vengono servite da `public/fonts`, con la politica `font-src 'self'` esistente. Inter continua per le lingue latine. Le famiglie TBA Arabic e TBA Devanagari conservano i glifi delle font Noto originali. TBA Chinese e TBA Japanese includono i caratteri dei cataloghi cinese, giapponese e inglese e i nomi del selettore. L'ampliamento include anche i cataloghi del pannello; le font del sistema coprono gli altri caratteri di dati introdotti. Vengono scaricate solo le font che il browser necessita. Non ci sono richieste a fornitori di font.

Le font provengono da Noto Sans Arabic, Noto Sans Devanagari e Noto Sans CJK, con licenza [SIL OFL 1.1](../licenses/noto-fonts.txt). Le famiglie modificate sono state rinominate. Per rigenerarle dopo aver aggiunto caratteri ai cataloghi CJK, eseguire `/usr/bin/python3 scripts/build-auth-fonts.py /usr/share/fonts` in un ambiente di manutenzione con Noto, fontTools e Brotli. È uno strumento opzionale: il build e l'applicazione non richiedono Python né dipendenze nuove. La ridistribuzione conserva la licenza nel repository.

## File dell'implementazione

- Configurazione, resolver, cataloghi e errori: `src/lib/i18n/config.ts`, `catalog.ts`, `errors.ts` e i dieci JSON di `messages/`.
- Interfaccia: `AuthI18n.tsx`, `AuthPublic.tsx`, `Login.tsx`, `Brand.tsx`, `ThemeToggle.tsx` e `Turnstile.tsx` in `src/components/`.
- Caricamento e percorsi pubblici: `src/layouts/Base.astro`, `src/pages/index.astro`, `login.astro`, `login/complete.astro`, `denied.astro` e `404.astro`.
- Stili e font: `src/styles/global.css`, `public/fonts/`, `scripts/build-auth-fonts.py` e `docs/licenses/noto-fonts.txt`.
- Presentazione delle richieste e e-mail: `src/lib/utils.ts`, `src/server/auth.ts`, `src/server/index.ts` e `src/server/services/auth-mail.ts`.
- Test: `tests/auth-i18n.test.ts`, `tests/auth.test.ts` e `tests/browser/auth-i18n.mjs`. Documentazione: questo file, `docs/validation.md`, `README.md` e `CHANGELOG.md`.

## Convalida

`tests/auth-i18n.test.ts` verifica i dieci cataloghi, parametri, varianti, priorità, resolver del head, fallback, direzione, errori, normalizzazione e testi di e-mail. L'integrazione in `tests/auth.test.ts` consegna OTP in dieci lingue con Better Auth e D1 locali, e controlla l'uso unico. Non invia e-mail reali.

`tests/browser/auth-i18n.mjs` utilizza un Playwright già disponibile e API simulate. Viene eseguito contro il build servito localmente:

```sh
AUTH_TEST_URL=http://127.0.0.1:4321 \
PLAYWRIGHT_MODULE=/ruta/a/playwright/index.js \
node tests/browser/auth-i18n.mjs
```

Incluse la rilevazione prima di idratare, l'assenza di sfarfallio, la persistenza, il cambio immediato senza navigazione né richieste, la conservazione del modulo e il caricamento in corso, dieci lingue di ingresso/registrazione/OTP/MFA/recupero, errori, aiuto, le pagine pubbliche, archiviazione bloccata, CAPTCHA, avvisi di riautenticazione e larghezze di 320, 390, 768 e 1440 px. Il controllo visivo aggiuntivo verifica font reali e desktop/mobile per arabo, hindi, cinese, giapponese, tedesco e francese.

L’inglese resta incluso come fallback. Gli altri cataloghi di accesso e pannello usano import dinamici e cache in memoria per modulo. Il focus di tastiera o puntatore precarica solo l’opzione indicata; aprire il menu non scarica tutte le lingue. Il cambio attende i cataloghi completi e conserva moduli, sessione e navigazione. La cache evita la rete; prevale l’ultima scelta. Un errore iniziale mostra l’inglese, un errore successivo mantiene la lingua attuale. Email e metadati del build usano cataloghi completi solo sul server. Vedi il [caricamento delle lingue](language-loading.md).
