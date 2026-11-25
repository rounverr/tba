# <picture><img src="../assets/icons/layers.svg" width="28" height="28" alt=""></picture> Ambito del modello

<p align="center"><a href="../en/template-scope.md" lang="en">English</a> | <a href="../es/template-scope.md" lang="es">Español</a> | <a href="../pt/template-scope.md" lang="pt">Português</a> | <a href="../de/template-scope.md" lang="de">Deutsch</a> | <a href="../fr/template-scope.md" lang="fr">Français</a> | <strong>Italiano</strong> | <a href="../zh/template-scope.md" lang="zh">简体中文</a> | <a href="../ja/template-scope.md" lang="ja">日本語</a> | <a href="../hi/template-scope.md" lang="hi">हिन्दी</a> | <a href="../ar/template-scope.md" lang="ar">العربية</a></p>

[Documentazione tecnica](README.md) | [Panoramica del progetto](../README.it.md)

TBA usa Cloudflare Workers con D1 per impostazione predefinita. La stessa interfaccia e API Hono funzionano in Node.js con SQLite o PostgreSQL. [Motori di database](database-engines.md)

Il template base comprende OTP email, Google facoltativo, MFA TOTP e recupero, dispositivi attendibili, sessioni, ruoli e permessi, profilo, cambio email, gestione di base degli account, richieste di registrazione, audit e dashboard. Login e amministrazione offrono dieci lingue e temi chiaro/scuro.

> [!NOTE]
> Include elenchi di base con navigazione limitata per pagina e tabelle di database, vincoli e migrazioni generiche necessari per identità, audit e dashboard. Ricerca, filtri, motori di ordinamento e paginazione avanzata ed esportazione Excel/XLSX sono esclusi dalla distribuzione base. Ogni progetto può aggiungerli secondo i propri dati e permessi. Il download locale `.txt` dei codici di recupero MFA rimane una funzione di sicurezza.

Ogni applicazione ha Worker, database, utenti, segreti, domini e posta propri. Non crea automaticamente profili commerciali, organizzazioni, fatturazione o dati dei clienti. Il hook di registrazione consente integrazioni specifiche. Il riuso segue la [licenza MIT](../../LICENSE), mantenendo gli avvisi e le [licenze dei font](../licenses/README.md#it). I marchi sono regolati separatamente in [TRADEMARKS](../../TRADEMARKS.md).
