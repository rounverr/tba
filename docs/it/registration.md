# <picture><img src="../assets/icons/users.svg" width="28" height="28" alt=""></picture> Registro, approvazioni ed estensioni

<p align="center"><a href="../en/registration.md" lang="en">English</a> | <a href="../es/registration.md" lang="es">Español</a> | <a href="../pt/registration.md" lang="pt">Português</a> | <a href="../de/registration.md" lang="de">Deutsch</a> | <a href="../fr/registration.md" lang="fr">Français</a> | <strong>Italiano</strong> | <a href="../zh/registration.md" lang="zh">简体中文</a> | <a href="../ja/registration.md" lang="ja">日本語</a> | <a href="../hi/registration.md" lang="hi">हिन्दी</a> | <a href="../ar/registration.md" lang="ar">العربية</a></p>

[Documentazione tecnica](README.md) | [Panoramica del progetto](../README.it.md)

> [!NOTE]
> La modalità iniziale è `closed`. Non viene mostrato un link di registrazione pubblica e l'API rifiuta le richieste di registrazione. Gli amministratori possono creare account che successivamente verificano la propria email al momento del login.

In `approval`, la persona richiede un OTP e conferma l'email. TBA crea un account pendente senza ruolo e una richiesta univoca, revoca eventuali sessioni provvisorie e notifica gli amministratori tramite l'adattatore di posta. L'approvazione richiede la scelta di un ruolo esplicito; il rifiuto non abilita l'accesso. Entrambe le azioni vengono registrate. Al momento dell'approvazione, viene notificato l'utente.

In `open`, l'email viene verificata prima di attivare l'account. Un amministratore sceglie 
il ruolo iniziale da Accesso e registrazione tra **tutti i ruoli configurati**, 
inclusi i ruoli personalizzati, Editore e Amministratore. La scelta viene salvata 
in `settings.public_role_id`, senza modifiche allo schema. Il server verifica che il 
ruolo esista e che l'amministratore confermi esplicitamente la registrazione aperta.
Il visitatore che si registra non sceglie mai un ruolo effettivo: viene applicato 
il ruolo configurato sul server al completamento della verifica dell'email.

Il selettore appare unicamente quando si sceglie la registrazione aperta. Riutilizza il menu dell'app, mostra i permessi del ruolo (o il controllo amministrativo completo), conserva la scelta al cambio di lingua ed esige di confermare nuovamente se il ruolo cambia. Se non ci sono ruoli o il ruolo configurato non è più disponibile, spiega la situazione e evita di salvare una selezione vuota. I testi sono tradotti in dieci lingue.

I cambiamenti interessano solo le nuove registrazioni. Gli account e le richieste precedenti 
conservano il loro stato e ruolo. Una richiesta pendente precedente non viene mai approvata 
perché si cambia la modalità. Ogni completamento richiede nuovamente la modalità e il ruolo 
vigenti; se non c'è un ruolo valido, non abilita l'account. Vengono mantenuti Email OTP, 
limiti di invio e tentativi, permessi di configurazione e registrazione.

Il marchio di ruolo pubblico con accesso di base (`isPublic`) conserva la sua validazione 
di permessi minimi nell'editor di ruoli, ma non limita più il selettore del ruolo iniziale. 
Scegliere un ruolo di gestione o Amministratore concede lo stesso ambito agli account nuovi; 
la vista mostra questo ambito e lo include nella conferma.

La consultazione privata della configurazione consegna i ruoli nella stessa risposta: 
una sola richiesta HTTP, senza consultazioni aggiuntive al cambio di lingua o all'apertura 
del selettore. Aggiunge una lettura del catalogo dei ruoli alle due letture esistenti di questa vista.
Le altre viste conservano il loro budget di consultazioni.

## Estensione

`src/server/services/registration-hook.ts` espone `onUserRegistered(user, context)`. Il nucleo non crea profili di CRM, CMS o altri affari. 
La funzione riceve unicamente identità e una chiave stabile `registration:<userId>`; non riceve 
permessi mutabili.

La tabella `registration_event` evita consegne duplicate completate e richiede esecuzioni 
mediante un'aggiornamento condizionale. Una consegna fallita rimane pendente e 
una consegna bloccata può essere ripresa dopo cinque minuti. Un amministratore 
può ritentare mediante `POST /api/private/hooks/:userId/retry`.

La semantica è **almeno una volta**: un processo potrebbe terminare dopo aver prodotto 
un effetto e prima di marcare l'evento come completato. Il consumatore deve fare 
le proprie scritture idempotenti con `context.idempotencyKey`, ad esempio mediante un indice UNIQUE. 
Non promettiamo effetti esterni esattamente una volta. Gli errori del punto di estensione 
non concedono permessi aggiuntivi né bloccano la persistenza dell'identità verificata.

Per estendere un CMS, crea una tabella di profilo propria con `user_id UNIQUE`, 
inserisci con `ON CONFLICT DO NOTHING` e conserva il controllo dei permessi al di fuori 
del callback. L'esempio non si esegue automaticamente e non appartiene al nucleo TBA.
