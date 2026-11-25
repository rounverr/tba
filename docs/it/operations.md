# <picture><img src="../assets/icons/settings.svg" width="28" height="28" alt=""></picture> Configurazione e operazioni

<p align="center"><a href="../en/operations.md" lang="en">English</a> | <a href="../es/operations.md" lang="es">Español</a> | <a href="../pt/operations.md" lang="pt">Português</a> | <a href="../de/operations.md" lang="de">Deutsch</a> | <a href="../fr/operations.md" lang="fr">Français</a> | <strong>Italiano</strong> | <a href="../zh/operations.md" lang="zh">简体中文</a> | <a href="../ja/operations.md" lang="ja">日本語</a> | <a href="../hi/operations.md" lang="hi">हिन्दी</a> | <a href="../ar/operations.md" lang="ar">العربية</a></p>

[Documentazione tecnica](README.md) | [Panoramica del progetto](../README.it.md)

TBA usa Cloudflare Workers con D1 per impostazione predefinita. La stessa interfaccia e API Hono funzionano in Node.js con SQLite o PostgreSQL. [Motori di database](database-engines.md)

## Inizializzazione

L’inglese è la lingua base del codice e dell’assistente setup. Sono incluse dieci traduzioni e font locali. `npm run setup -- --languages en,pt` abilita solo inglese e portoghese, senza installare pacchetti né cancellare altre traduzioni. Senza `--languages` si conserva la selezione attuale; senza elenco esistente vengono abilitate tutte e dieci. Inglese resta attivo come fallback delle traduzioni. `--locale en` imposta la lingua predefinita e accetta ogni lingua abilitata. La priorità è preferenza salvata, lingua compatibile del browser, poi predefinita configurata. Il cambio non ricarica né azzera moduli; arabo mantiene RTL.

`npm run setup -- --interactive` | `--name` | `--id` | `--domain` | `--database` | `--account` | `--mail local|resend|cloudflare` | `--google true|false` | `--mfa true|false` | `--trust true|false` | `--r2 true|false` | `--theme light|dark`.

Lo script genera `.dev.vars` con segreto casuale quando non esiste. Non scrive credenziali in file versionati né crea amministratori o risorse remote. Modifica l'identità tecnica prima di approvisionare un derivato.

## D1, Drizzle e migrazioni

`src/server/database/schema.ts` è lo schema di Drizzle. `drizzle/0001_initial.sql` contiene lo schema base e `0002_defaults_and_guards.sql` carica ruoli, registro chiuso e trigger. `drizzle/generated` conserva lo snapshot di Drizzle per future comparazioni; Wrangler esegue solo gli SQL nella radice di `drizzle`. Applica `drizzle/0003_session_authorization.sql` con le altre migrazioni. Le sessioni esistenti ricevono lo snapshot al prossimo controllo dei permessi.

`db:generate` produce candidati in `drizzle/generated`. Verifica ogni candidato e copialo con il numero successivo nella radice; aggiungi trigger o dati in una migrazione separata quando corrisponde. Non modificare mai una migrazione già applicata. Verifica possibili conflitti prima di utilizzare una D1 esistente e realizza un backup prima di cambiamenti remoti. La plantilla non esegue SQL remoto durante l'installazione o la build.

> [!IMPORTANT]
> Gli script `db:create`, `db:link`, `db:migrate:remote` e `deploy` richiedono un account esplicito e `--confirm`; senza conferma le operazioni di creazione e scrittura si fermano. `db:create` controlla nomi esistenti e recupera l'UUID reale. `db:link` elenca le basi dell'account e mostra lo schema prima di salvare il binding, senza modificarlo. Se un'operazione fallisce, non si scrive un binding supposto. Nessuno script elimina basi.

Utilizza `--config wrangler.<environment>.jsonc` o `--config wrangler.<other-environment>.jsonc` per obiettivi separati. Copia la configurazione e assegna nome, URL, account_id e database_id reali diversi per ogni ambiente. Le variabili e i binding non devono essere condivisi accidentalmente. Non ci sono ambienti remoti precreati in TBA.

## Segreti e posta

Il setup accetta `--mail local`, `--mail resend` e `--mail cloudflare`. La posta locale usa `APP_URL` locale e `npm run mail:dev`. Resend richiede `RESEND_API_KEY` e `MAIL_FROM`. Cloudflare riutilizza l’adattatore esistente e richiede un binding `send_email` chiamato `EMAIL`, `MAIL_FROM` consentito e dominio abilitato all’invio. Il setup verifica localmente senza creare risorse né verificare domini remoti. Si può configurare dopo: il modo interattivo chiede se proseguire, quello non interattivo continua con le attività pendenti. Non inventa binding, mittenti o credenziali; l’invio richiede la configurazione. I segreti restano fuori da Git. Wavicc resta l’integrazione futura preferita con `WAVICC_API_KEY` come placeholder. Vedi il [setup email](setup-mail.md).

Wavicc è l’integrazione futura preferita, senza adattatore né contratto API verificato. `WAVICC_API_KEY` e `CUSTOM_MAIL_API_KEY` non attivano provider. Non usare `MAIL_PROVIDER=wavicc`. Un altro servizio richiede un adattatore testato sul contratto pubblicato, conservando HTML/testo e autenticazione; nessun endpoint viene presunto.

Verificare ogni messaggio con account isolati: lingua, mobile, scadenza, errori e risposta dopo modifiche confermate. Non registrare codici, corpi, token o segreti. Vedere [operazioni](operations.md) e [verifica](validation.md).

## Google e Turnstile

Google richiede `GOOGLE_ENABLED="true"`, `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` con callback esatto `/api/auth/callback/google`. Non esistono valori predefiniti. Utilizza un account attivo precedentemente autorizzato e verifica MFA, rifiuto di utenti sospesi e posta verificata prima di pubblicare.

Turnstile è opzionale. Se definisci `TURNSTILE_SITE_KEY`, definisci anche `TURNSTILE_SECRET_KEY`. La registrazione mostra il widget e il backend valida token, hostname e azione `register` in Siteverify; non basta risolvere il widget in React. Non vengono creati widget remoti da TBA. Se non lo configuri, continuano attivi i limiti D1 per posta, IP e verifica. Valuta l'abilitazione prima di aprire una registrazione al pubblico.

R2 è disattivato e non vengono dichiarati bucket. Aggiungilo solo se il derivato necessita di file, con autorizzazione esplicita per l'approvvigionamento e tipi rigenerati.

## Amministratore iniziale

`npm run admin:bootstrap -- --email admin@example.test` utilizza D1 locale per default. La posta non viene marcata come verificata e deve essere confermata con OTP. Non viene aggiunto altro amministratore se già ce n'è uno attivo.

La modalità remota richiede `--remote --account ACCOUNT_ID --confirm` e verifica che la configurazione abbia una D1 reale e lo stesso account. Non includere indirizzi di posta reali in SQL versionato. Se perdi l'accesso all'unico amministratore, segui una procedura operativa propria; non c'è backdoor né ripristino automatico dei privilegi.

## Distribuzione manuale con D1

1. Configura l'identità del derivato e l'account corretto.
2. Crea o collega una D1 dopo autorizzazione. Verifica e applica SQL esplicitamente.
3. Configura HTTPS, origine esatta e posta esterna; opzionalmente Google e Turnstile.
4. Esegui `types:worker`, `check`, `test`, `build`, `worker:check`.
5. Esegui `npm run deploy -- --account ACCOUNT_ID --confirm` con il file selezionato.
6. Esegui bootstrap remoto e una prova con utenti isolati.
7. Verifica eventi, MFA, recupero, ruoli e flusso di posta prima di ammettere utenti reali.

La configurazione include Log e Tracce di Workers. Evita aggiungere logging di corpi/cookie. Il team mantiene validazioni e pubblicazioni manuali. GitHub Actions e Workers Builds non sono requisiti per la distribuzione e non devono essere configurati come condizione di pubblicazione. Esegui localmente le verifiche pertinenti prima di qualsiasi cambio remoto, con l'account e la destinazione confermati.

## Aggiornamenti e problemi frequenti

- Errore di origine: `APP_URL` deve coincidere con l'origine del browser, senza barra finale. Utilizza il Worker locale per la prova completa.
- Non arriva OTP: verifica la casella locale o il mittente/credenziali del fornitore. La risposta generica non conferma che esista l'account.
- Accesso negato: conferma stato attivo, posta verificata, ruolo e MFA completo nel backend.
- Cambio sensibile rifiutato: riavvia la sessione; il controllo recente dura cinque minuti.
- D1 inesistente: applica migrazioni locali o verifica il binding remoto e account; non riempire ID inventati.
- Aggiornamento del nucleo: confronta commit, verifica `CHANGELOG`, aggiorna dipendenze in modo deliberato e applica migrazioni revisionate in un ambiente di test. GitHub Template non propaga cambiamenti ai derivati.
