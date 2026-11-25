# <picture><img src="../assets/icons/database.svg" width="28" height="28" alt=""></picture> Motori di database

<p align="center"><a href="../en/database-engines.md" lang="en">English</a> | <a href="../es/database-engines.md" lang="es">Español</a> | <a href="../pt/database-engines.md" lang="pt">Português</a> | <a href="../de/database-engines.md" lang="de">Deutsch</a> | <a href="../fr/database-engines.md" lang="fr">Français</a> | <strong>Italiano</strong> | <a href="../zh/database-engines.md" lang="zh">简体中文</a> | <a href="../ja/database-engines.md" lang="ja">日本語</a> | <a href="../hi/database-engines.md" lang="hi">हिन्दी</a> | <a href="../ar/database-engines.md" lang="ar">العربية</a></p>

[Documentazione tecnica](README.md) | [Panoramica del progetto](../README.it.md)

> [!NOTE]
> Usa Cloudflare Workers per D1 e Node.js 24+ per SQLite o PostgreSQL. Prepara una copia del codice per ogni installazione. Esegui `npm ci` e scegli il motore con `npm run setup -- --interactive`. D1 è il valore predefinito. Conserva `DATABASE_URL` e `BETTER_AUTH_SECRET` in `.dev.vars` o nell’ambiente. Segui la [tabella dei comandi](../en/database-engines.md) per build, migrazioni e creazione del primo amministratore, poi esegui `npm start`. PostgreSQL richiede `--target`. Prepara backup e usa la posta locale o Resend con Node. [Operazioni D1](operations.md) | [Posta](setup-mail.md)

D1 e SQLite applicano i file SQL da 0001 a 0003 in `drizzle/`. PostgreSQL usa i propri file numerati in `drizzle/postgresql/`. Ogni installazione conserva il proprio storico.

`better-sqlite3` è una dipendenza facoltativa richiesta solo da SQLite. Il file SQLite deve rimanere fuori da `dist`. PostgreSQL verifica certificato e nome host con TLS. Per una destinazione remota usare `--target host:porta/database`.

Le migrazioni da 0001 a 0003 richiedono almeno la sintassi di PostgreSQL 11. I test di integrazione hanno verificato 17.12 e 18.7. Per nuove installazioni usare una versione mantenuta, preferibilmente l’ultima patch di PostgreSQL 18.

Restano da verificare l’installazione e le directory junction su Windows, il callback esterno di Google OAuth, l’invio reale tramite Resend e un test di penetrazione indipendente.
