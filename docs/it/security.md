# <picture><img src="../assets/icons/shield.svg" width="28" height="28" alt=""></picture> Autenticazione e sicurezza

<p align="center"><a href="../en/security.md" lang="en">English</a> | <a href="../es/security.md" lang="es">Español</a> | <a href="../pt/security.md" lang="pt">Português</a> | <a href="../de/security.md" lang="de">Deutsch</a> | <a href="../fr/security.md" lang="fr">Français</a> | <strong>Italiano</strong> | <a href="../zh/security.md" lang="zh">简体中文</a> | <a href="../ja/security.md" lang="ja">日本語</a> | <a href="../hi/security.md" lang="hi">हिन्दी</a> | <a href="../ar/security.md" lang="ar">العربية</a></p>

[Documentazione tecnica](README.md) | [Panoramica del progetto](../README.it.md)

## Sicurezza SQL

> [!IMPORTANT]
> Associa i valori esterni e archiviati con parametri del driver o predicati Drizzle. Seleziona identificatori, filtri e ordinamenti dagli elenchi del server. Limita i privilegi operativi e proteggi errori e credenziali. [SQL](../en/security.md#sql-security-en) | [PostgreSQL](../en/security.md#postgresql-runtime-privileges)

Il database conserva i limiti delle richieste e le autorizzazioni di sessione con versione in tutti e tre i motori.

## Email OTP

L'accesso informa 403 con `ACCESS_NOT_ENABLED` quando l'indirizzo email non corrisponde a un account abilitato e non invia OTP né crea utenti. L'interfaccia conserva il modulo e visualizza l'avviso per verificare l'indirizzo o richiedere l'accesso. Viene utilizzato lo stesso messaggio per account inesistenti, pendenti, sospesi o disabilitati, senza rivelare il loro stato specifico. Questa politica, richiesta per orientare la persona, consente di distinguere gli account abilitati da quelli che non hanno accesso; sostituisce la risposta uniforme precedente del login. Vengono conservati i limiti per IP e per email. La registrazione mantiene la sua risposta uniforme e i controlli di modalità. L'invio elegibile si completa mediante `waitUntil`. L'adattatore utilizza il provider configurato in `MAIL_PROVIDER`: Cloudflare Email Sending su D1, Resend su Worker e Node o la casella locale di sviluppo. La selezione viene implementata in `services/mail.ts`.

Il codice ha sei cifre, scade in cinque minuti e Better Auth lo conserva con hash. È limitato a cinque tentativi per OTP, dieci verifiche per email ogni quindici minuti e un invio per email per minuto. Ci sono inoltre un limite per IP di venti richieste ogni quindici minuti e limiti del provider di autenticazione. I limiti vivono in D1 e le chiavi di throttle vengono conservate con SHA-256. Non vengono stampati OTP né token nei log.

`/access/verify` distingue esplicitamente login e registrazione. Login utilizza `disableSignUp:true`, richiede un account attivo già esistente e non concede accesso agli account pendenti o sospesi. Un OTP utilizzato o scaduto non genera nuovamente una sessione.

## Google OAuth

Viene abilitato solo quando `GOOGLE_ENABLED="true"` e esistono entrambi i segreti. Viene richiesto `email_verified` del profilo di Google e viene disabilitata la creazione di utenti da OAuth. Il risultato passa attraverso la stessa barriera di stato, sessione, permessi e MFA di Email OTP. Callback: `https://app.example.test/api/auth/callback/google`. Registra quell'URI esatto in Google Cloud e configura lo schermo di consenso. Questo flusso richiede un test esterno reale dopo la configurazione delle credenziali.

## Sessioni e origine

Le sessioni durano otto ore e vengono verificate nel database senza cache di cookie. Dopo la MFA, quando necessaria, la sessione salva nel database uno snapshot di autorizzazione con versione. Ogni operazione protetta verifica sessione e versione. Uno snapshot valido fornisce i permessi senza rileggere il ruolo. Se riceve `409 authorization_changed` prima di una scrittura, il pannello aggiorna il contesto e riprova una volta per lo stesso utente. Ogni mutazione richiede un `Origin` uguale a `APP_URL`, JSON e corpo di fino a 16 KiB. Le richieste HTTPS sono obbligatorie fuori da localhost. Non c'è CORS aperto né token in localStorage; solo le preferenze visive di tema e menu contraibile vengono conservate lì.

Il gateway espone solo le rotte di Google e chiusura di sessione del handler pubblico di Better Auth. I metodi OTP, ispezione di codici, MFA e signup non possono essere invocati dall'esterno delle politiche del server. I corpi di risposta di Better Auth che contengono token non vengono consegnati al frontend: vengono propagate solo le cookie e i dati strettamente necessari.

Vengono inclusi header di sicurezza e CSP. La CSP consente script/stili inline necessari per l'idratazione di Astro e token visivi; non consente oggetti né frame di siti esterni a Turnstile. Se un derivato elimina gli script inline, può irrigidirla utilizzando hash/nonces.

## Render amministrativo prima dell'autorizzazione

Gli otto documenti amministrativi vengono generati senza struttura visiva del pannello. La prima uscita di React è anche vuota: non vengono montati menu, intestazione, titolo della vista, form, avvisi di sessione o indicatori di caricamento prima di ricevere una risposta privata autorizzata. Un reindirizzamento pendente mantiene quell'uscita vuota. Il risultato confermato di un cambio di posta viene visualizzato come ricevuta pubblica separata, poiché quell'operazione chiude le sessioni; non rimonta il pannello. È una correzione di presentazione del contenitore statico; i dati privati erano già protetti dall'API. Non sostituisce l'autenticazione né aggiunge letture.

I rifiuti 403 e i fallimenti 503 durante il caricamento di una vista senza accesso confermato mostrano solo un messaggio pubblico e opzioni di recupero, senza il pannello. Quando si salva una pagina in BFCache, la sua struttura viene nascosta in modo sincrono e vengono chiusi i dialoghi in modo che l'istantanea non la ridisegni durante la convalida. Solo una risposta autorizzata la fa riapparire.

## Ritorno al login per perdita di sessione

Un 401 in una lettura o azione del pannello invalida la sua cache di presentazione, annulla letture pendenti e pulisce i dati privati, QR, semi e codici transitori prima di sostituire l'URL con `/login/`. La chiusura della sessione con successo utilizza la stessa pulizia e navigazione per sostituzione. Riaprire un collegamento amministrativo con la sessione chiusa segue questo flusso automaticamente.

Una restaurazione del documento da BFCache richiede una lettura attuale del server, anche se la cache visiva precedente era ancora valida. Viene controllato l'indicatore `persisted` di `pageshow`: i carichi normali e la navigazione interna non ricevono una richiesta aggiuntiva. Un 403 per mancanza di permessi non si converte in logout; il codice `MFA_REQUIRED` indirizza alla sfida MFA e `RECENT_AUTH_REQUIRED` mantiene il flusso di identità recente. Un fallimento 503 non viene interpretato come sessione chiusa. Le destinazioni sono percorsi locali fissi. Le API continuano a rispondere JSON 401/403, senza reindirizzamenti HTTP che rompano client o nascondano errori.

## MFA volontario

Profilo → Sicurezza utilizza il plugin ufficiale Two Factor con `allowPasswordless:true`. Non esiste secondo fattore per posta. L'attivazione accetta un ingresso di meno di cinque minuti o una conferma di posta all'interno dell'app, collegata alla sessione vigente. Genera un segreto cifrato e conferma un TOTP prima di attivare il secondo fattore. Il QR viene generato nel browser, senza inviare il segreto a terzi. La stessa chiave di configurazione viene copiata quando si preme e può essere caricata manualmente come TOTP nell'applicazione di autenticazione. L'interfaccia elimina il QR e la chiave di configurazione dal suo stato quando si chiude il dialogo o si completa l'attivazione.

L'anzianità di cinque minuti viene calcolata dall'ingresso che ha creato la sessione, non dall'ultima attività. La sessione generale dura ancora otto ore. Ad eccezione dell'alta MFA, che consente la conferma sullo schermo descritta sotto, se un'operazione sensibile supera quel limite di tempo, l'API risponde 403 con `RECENT_AUTH_REQUIRED`; l'interfaccia spiega la causa e offre di confermare l'identità in `/login/?reauth=1`. Viene richiesto un nuovo OTP e il secondo fattore quando corrisponde, e si torna a `/admin/security/`. Per i cambiamenti del profilo si utilizza `/login/?reauth=profile` e si torna a `/admin/profile/`. Le destinazioni vengono scelte da un elenco fisso: non accetta URL di ritorno esterne né si elimina il controllo del primo fattore recente. Non si esegue automaticamente l'operazione sensibile al ritorno.

Il plugin non intercetta automaticamente tutti i metodi passwordless nella versione installata. TBA conserva una tabella `assurance`, collegata alla sessione, all'utente e alla sua versione di MFA. Ogni API privata rifiuta una sessione che non abbia completato il secondo fattore. Email OTP e OAuth producono prima una sessione pendente di quella barriera. Cambiare lo stato in React o chiamare direttamente un'API non consente di eluderla.

Il gateway aggiunge un budget di cinque tentativi di secondo fattore per utente ogni cinque minuti, anche quando Better Auth riceve una sessione di primo fattore autenticata. Cambiamenti sensibili richiedono primo fattore recente e una nuova conferma TOTP o codice di recupero.

## Dispositivi attendibili

La revoca da Sicurezza viene confermata all'interno dell'app con un TOTP o codice di recupero nuovo e lo stesso limite di cinque tentativi. Non richiede di tornare al Login a causa dell'età dell'accesso: richiede sessione valida, MFA completato e una nuova verifica del secondo fattore. Dopo aver eliminato tutti i dispositivi attendibili e aver incrementato la versione MFA, viene reimpostata solo la verifica della sessione che ha appena confermato il codice. Le altre sessioni devono completare MFA di nuovo. MFA rimane attivo e non viene generato un nuovo dispositivo di fiducia. La disattivazione MFA e le altre operazioni sensibili conservano i loro requisiti.

La modalità ufficiale `trustDevice` del plugin non soddisfa da sola la verifica di tutti i flussi passwordless di questa versione. Per questo motivo viene utilizzato un token casuale di 256 bit generato con Web Crypto, memorizzato in cookie HttpOnly, Secure e SameSite=Strict. In D1 viene memorizzato solo l'hash del token, utente, versione di MFA e scadenza assoluta di trenta giorni. Non si fa affidamento su IP né User-Agent.

La fiducia viene creata solo dopo aver verificato il secondo fattore e per selezione esplicita. La casella appare nei passaggi di correo OTP, Authenticator e recupero, e conserva la selezione al cambiare di metodo o reinviare il correo. La selezione durante l'OTP esprime solo una preferenza per il passaggio MFA: non crea fiducia di per sé né influenza i conti senza MFA. Non sostituisce mai il primo fattore né si rinnova automaticamente. Revocare la fiducia o disattivare MFA elimina i token e incrementa la versione di MFA. Revocare le sessioni o sospendere un utente interrompe l'accesso esistente. In localhost si omette Secure e il prefisso `__Host-` per consentire lo sviluppo HTTP.

## Recupero

Al revocare dispositivi attendibili in HTTPS viene cancellata la cookie con gli attributi di sicurezza appropriati. La disattivazione di MFA revoca la fiducia e le sessioni secondo le regole descritte in questa guida.

I dieci codici vengono cifrati mediante Better Auth. Vengono visualizzati al generarsi e ognuno può essere utilizzato una volta, sempre dopo il primo fattore. La rigenerazione invalida i precedenti. L'interfaccia utente consente di copiarli o scaricarli in un file `.txt` generato localmente mediante Blob. Il file include indicazioni di archiviazione privata e ricorda che la posta elettronica rimane necessaria. L'utente deve salvare quel file per proprio conto; l'applicazione revoca l'URL temporaneo e non lo invia a nessun server. L'interfaccia utente li elimina dalla memoria al chiudere la visualizzazione; non vengono persistiti nel browser. Il permesso di fotocamera, SMS e secondo indirizzo e-mail non sono necessari.

## RBAC e auditoria

L’accesso è negato per impostazione predefinita. Ogni richiesta privata verifica la sessione attiva e la versione globale delle autorizzazioni. I permessi provengono dallo snapshot versionato della sessione. Se non è aggiornato, il server rilegge il ruolo e lo ricostruisce. Le modifiche amministrative verificano i permessi e il ruolo di amministratore. La revoca richiede `users.edit`. I trigger proteggono l’ultimo amministratore attivo.

La registrazione conserva attore, azione, risorsa, risultato e data. Non conserva corpi di richiesta, segreti, codici né token. La conservazione deve essere definita per applicazione; programma pulizia di sessioni, verifiche, throttle, fiducia scaduta e registrazione con un compito esplicito secondo le proprie esigenze. La prima versione non installa cronjob né risorse aggiuntive.

## Presentazione di permessi e attività

Gli identificatori di permessi ed eventi rimangono sul server e nel database. Il pannello traduce le etichette nella lingua selezionata. I nuovi ruoli ricevono identificatori univoci e quelli esistenti mantengono i propri.

L'endpoint di registrazione richiede ancora `audit.read` e risolve il correo dell'utente o il nome del ruolo associato mediante join di lettura. Se la risorsa non esiste più, viene visualizzata un'etichetta neutra. Risorsa descrive l'elemento interessato (sessione, secondo fattore, recupero, profilo o fiducia), invece di ripetere il correo dell'attore. In azioni amministrative conserva il nome dell'altra persona interessata, o il suo correo se non c'è nome; ruoli e configurazione mostrano il loro nome leggibile. I nomi vengono risolti mediante i join di lettura esistenti, senza modificare eventi. Le referenze originali vengono conservate in D1 per tracciabilità; l'interfaccia di registrazione non mostra codici tecnici né identificatori in dettagli espandibili. Non viene modificato né riscritto il registro.

I selettori utilizzano un combobox con opzioni in un popover e conservano un `select` nativo nascosto per serializzare e validare i formulari. Il menu viene posizionato secondo lo spazio disponibile senza essere troncato dal dialogo. Consente frecce, Inizio/Fin, selezione con Invio, Esc e Tab; si chiude quando si clicca fuori, si ridimensiona o si sposta il contenitore. I campi obbligatori enfocano il selettore e mostrano un messaggio di validazione. Non sono state aggiunte dipendenze. L'autocompletamento rispetta i colori del tema chiaro o scuro.

## Cambio del correo di accesso

Il profilo offre un flusso guidato mediante il plugin Email OTP di Better Auth: `POST /api/private/profile/email/request` invia il codice alla direzione nuova e `POST /api/private/profile/email/confirm` verifica e applica il cambio. Entrambi richiedono sessione attiva, MFA completo quando corrisponde e primo fattore di meno di cinque minuti. La conferma richiede inoltre un codice nuovo di Authenticator o recupero se l'account ha MFA, anche con un dispositivo di fiducia. L'API informa `mfaRequired` quando si richiede il correo e rifiuta una conferma senza secondo fattore con `MFA_CONFIRMATION_REQUIRED`, prima di consumare il OTP del correo. Vengono conservati i controlli di origine, JSON, dimensione e frequenza. Gli endpoint crudi del plugin rimangono bloccati dal gateway.

Viene utilizzato un OTP con hash, cinque minuti di validità e un massimo di cinque tentativi, vincolato all'utente e alla direzione nuova. Un indirizzo già utilizzato non riceve codice né sostituisce un'altra account. L'indirizzo attuale rimane valido fino al completamento della verifica. Non viene marcato manualmente nessun correo come verificato: l'operazione ufficiale del plugin lo fa solo dopo aver validato il OTP.

Better Auth verifica e consuma il codice ricevuto via email. La persistenza applica in modo atomico la modifica dell’utente, l’incremento della versione MFA, la revoca di dispositivi e sessioni e la voce di audit. D1 usa un batch. SQLite e PostgreSQL usano transazioni. Se la scrittura fallisce, richiedere un nuovo codice.

Una volta confermato quel lotto, un errore successivo nel preparare la risposta di Better Auth non viene segnalato come cambio fallito. Non è necessario emettere un cookie di sostituzione perché le sessioni sono già revocate. La notifica all'indirizzo precedente viene inviata al di fuori del lotto mediante `waitUntil`; il suo errore viene registrato separatamente e non altera il successo del cambio. I diagnóstici di errore registrano solo etichette di fase, metodo e ruta, senza email, OTP, MFA, cookie né corpi di richiesta. La persona deve rientrare con la nuova email e il suo MFA. Vengono conservati l'identificatore di utente, il ruolo, lo stato, il segreto TOTP e i codici di recupero restanti. Se se ne utilizza uno per confermare il cambio, viene consumato come in qualsiasi verifica. La registrazione degli eventi registra l'evento e l'identificatore dell'utente, senza codici né corpi di richiesta. Non sono richieste migrazioni né nuove tabelle.

Restano gli elenchi di utenti, richieste e audit con navigazione limitata e permessi lato server. Motori avanzati ed Excel sono esclusi dalla base; ogni derivato li implementa se necessario. Vedere l’[ambito](template-scope.md).

<a id="email-verification-before-mfa-it"></a>

### Conferma di email per attivare MFA senza uscire dall'app

Quando l'accesso supera i cinque minuti, `enroll` e `confirm` rispondono `MFA_ENROLL_CONFIRMATION_REQUIRED`. L'interfaccia invia un codice all'indirizzo dell'attore autenticato mediante `/api/private/security/enroll/email`, lo conferma mediante `/api/private/security/enroll/email/confirm` e prosegue con il QR. Non reindirizza al Login né cambia i cookie, l'anzianità della sessione o i suoi permessi. Una sessione scaduta o revocata continua a rispondere 401.

Il codice crittografico di sei cifre viene salvato come hash con il segreto dell'app e l'identificatore di sessione, nella tabella di verifica esistente. Scade in cinque minuti, ammette cinque tentativi e viene consumato solo una volta mediante aggiornamento condizionale. L'invio è limitato a uno per utente per minuto. L'autorizzazione risultante dura cinque minuti e serve esclusivamente per avviare e confermare l'attivazione MFA in quella sessione; non sostituisce il TOTP di attivazione, né autorizza cambi di email, disattivazione, recupero o revocazioni. Viene eliminata al completamento dell'attivazione. Non vengono create tabelle, migrazioni o servizi.
