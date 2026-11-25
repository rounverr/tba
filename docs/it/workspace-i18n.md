# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> Lingua e selettore del pannello

<p align="center"><a href="../en/workspace-i18n.md" lang="en">English</a> | <a href="../es/workspace-i18n.md" lang="es">Español</a> | <a href="../pt/workspace-i18n.md" lang="pt">Português</a> | <a href="../de/workspace-i18n.md" lang="de">Deutsch</a> | <a href="../fr/workspace-i18n.md" lang="fr">Français</a> | <strong>Italiano</strong> | <a href="../zh/workspace-i18n.md" lang="zh">简体中文</a> | <a href="../ja/workspace-i18n.md" lang="ja">日本語</a> | <a href="../hi/workspace-i18n.md" lang="hi">हिन्दी</a> | <a href="../ar/workspace-i18n.md" lang="ar">العربية</a></p>

[Documentazione tecnica](README.md) | [Panoramica del progetto](../README.it.md)

> [!TIP]
> L’inglese è la lingua base del codice e dell’assistente setup. Sono incluse dieci traduzioni e font locali. `npm run setup -- --languages en,pt` abilita solo inglese e portoghese, senza installare pacchetti né cancellare altre traduzioni. Senza `--languages` si conserva la selezione attuale; senza elenco esistente vengono abilitate tutte e dieci. Inglese resta attivo come fallback delle traduzioni. `--locale en` imposta la lingua predefinita e accetta ogni lingua abilitata. La priorità è preferenza salvata, lingua compatibile del browser, poi predefinita configurata. Il cambio non ricarica né azzera moduli; arabo mantiene RTL.

Login, pagine pubbliche, amministrazione, finestre, convalide ed email offrono `en`, `es`, `pt`, `de`, `fr`, `it`, `zh`, `ja`, `hi` e `ar`. La priorità è preferenza valida salvata (`tba-language`), prima lingua supportata da `navigator.languages`/`navigator.language`, poi inglese. Varianti come `es-AR`, `pt-BR` ed `en-GB` vengono normalizzate.

Il selettore è un pulsante di 48 × 38 px con il simbolo delle lingue e una freccia. Il suo menu mostra i dieci nomi nativi, codici brevi e l'opzione attuale marcata, con colori e superfici del tema. La larghezza e l'altezza sono limitate allo spazio disponibile. Viene riutilizzato `ui/select.tsx`, conservando il select nativo nascosto per la serializzazione e aggiungendo contenuto di trigger, intestazione e dimensioni opzionali. Gli altri select conservano i loro valori e funzionamento.

Il menu supporta frecce, Inizio/Fine, scrittura per iniziale, Invio, Esc, Tab e chiusura esterna. Il focus ritorna al controllo quando si sceglie o si cancella con Esc. Il glifo della lingua rimane stabile e solo gira la freccia. Vengono rispettati movimento ridotto, tastiera, lettore di schermo, dispositivi mobili e RTL. Il selettore appare unicamente in Login e nell'intestazione dell'app. I dialoghi e i formulari ereditano questa preferenza e non includono controlli di lingua propri.

## Testi e dati

`AuthI18n` riutilizza il contesto esistente per il pannello. `page=panel` configura la lingua e la direzione, mentre Admin conserva i suoi titoli per vista e il guard di autorizzazione esistente. La salida iniziale del pannello rimane vuota fino a quando non si è autorizzati.

`src/lib/i18n/panel/*.json` centralizza i cataloghi del pannello. `panel.ts` applica fallback e parametri; `panel-sources.json` collega le etichette canoniche esistenti e i messaggi pubblici del server con chiavi traducibili. `use-panel.ts` offre il formato a componenti. I testi dinamici di conferma e download conservano chiavi e parametri, quindi cambiano lingua anche quando sono aperti.

`src/lib/i18n/config.ts` centralizza lingue e direzione. `messages/*.json` e `panel/*.json` contengono i cataloghi; `catalog.ts`, `panel.ts` e il contesto gestiscono chiavi, parametri e fallback. Mantenere completi i dieci cataloghi. Errori sconosciuti usano messaggi pubblici tradotti. Nomi, indirizzi, ruoli personalizzati e codici non vengono tradotti.

`X-Auth-Language` sceglie una lingua abilitata per le email, mai i permessi. Senza header o preferenza valida si usa il valore predefinito configurato (inizialmente inglese). Una preferenza disabilitata torna allo stesso valore. Inglese resta il fallback per chiavi mancanti. Accesso/registrazione verificato e selettore salvano la preferenza in `verification` (`mail-language:<userId>`); le notifiche successive usano la lingua del destinatario. Il cambio lingua non rinvia codici né modifica scadenze, tentativi o verifica. I vecchi errori restano riconosciuti.

Il selettore è nel Login e nell’intestazione dell’app. Le finestre ereditano la lingua, senza selettori propri. React aggiorna i testi senza ricaricare o navigare, conservando moduli, sessione e vista. Un cambio nel pannello invia anche `POST /api/private/profile/language` per le email successive, senza ricaricare dati amministrativi. Il blocco dello storage non impedisce la traduzione durante la visita.

## RTL e font

Arabo posiziona la barra laterale e i margini del pannello a destra, adatta l'immagine di benvenuto, frecce, controlli, tabelle e dialoghi. Indirizzi, chiavi e codici conservano LTR. I pulsanti lunghi e le righe di sicurezza si adattano a schermi piccoli. I menu utilizzano le font locali dei dieci idiomi. I sottinsiemi CJK incorporano anche i caratteri dei nuovi cataloghi del pannello, tramite `scripts/build-auth-fonts.py`.

## File e verifica

Le prove di lingua utilizzano Better Auth e D1 locali o API simulate. Vedi [implementazione dell'accesso multilingue](auth-i18n.md).

L’inglese resta incluso come fallback. Gli altri cataloghi di accesso e pannello usano import dinamici e cache in memoria per modulo. Il focus di tastiera o puntatore precarica solo l’opzione indicata; aprire il menu non scarica tutte le lingue. Il cambio attende i cataloghi completi e conserva moduli, sessione e navigazione. La cache evita la rete; prevale l’ultima scelta. Un errore iniziale mostra l’inglese, un errore successivo mantiene la lingua attuale. Email e metadati del build usano cataloghi completi solo sul server. Vedi il [caricamento delle lingue](language-loading.md).
