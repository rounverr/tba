# <picture><img src="../assets/icons/database.svg" width="28" height="28" alt=""></picture> Mecanismos de banco de dados

<p align="center"><a href="../en/database-engines.md" lang="en">English</a> | <a href="../es/database-engines.md" lang="es">Español</a> | <strong>Português</strong> | <a href="../de/database-engines.md" lang="de">Deutsch</a> | <a href="../fr/database-engines.md" lang="fr">Français</a> | <a href="../it/database-engines.md" lang="it">Italiano</a> | <a href="../zh/database-engines.md" lang="zh">简体中文</a> | <a href="../ja/database-engines.md" lang="ja">日本語</a> | <a href="../hi/database-engines.md" lang="hi">हिन्दी</a> | <a href="../ar/database-engines.md" lang="ar">العربية</a></p>

[Documentação técnica](README.md) | [Visão geral do projeto](../README.pt.md)

> [!NOTE]
> Use Node.js 24+ para SQLite ou PostgreSQL e Cloudflare Workers para D1. Prepare uma cópia por instalação e execute `npm ci` e `npm run setup -- --interactive`. A opção padrão é D1. `--db-engine` aceita `d1`, `sqlite` e `postgresql`. Guarde `DATABASE_URL` e `BETTER_AUTH_SECRET` em `.dev.vars` ou no ambiente. Execute `npm run build`, as migrações e a inicialização conforme a [tabela de comandos](../en/database-engines.md), depois `npm start`. O PostgreSQL exige `--target`. Preserve os backups, verifique o TLS e use o correio local ou Resend no Node. [Operações D1](operations.md) | [Correio](setup-mail.md)

D1 e SQLite aplicam os arquivos SQL 0001 a 0003 de `drizzle/`. PostgreSQL aplica seus próprios arquivos numerados em `drizzle/postgresql/`. Cada instalação mantém seu histórico.

`better-sqlite3` é uma dependência opcional necessária somente para SQLite. O arquivo SQLite deve ficar fora de `dist`. O PostgreSQL valida o certificado e o nome do servidor em conexões TLS. Para destinos não locais, informe `--target host:porta/base`.

O SQL das migrações 0001 a 0003 exige no mínimo a sintaxe do PostgreSQL 11. Os testes de integração verificaram 17.12 e 18.7. Para uma nova instalação, use uma versão mantida, de preferência o último patch do PostgreSQL 18.

Ainda faltam validar a instalação e as junções no Windows, o callback externo do Google OAuth, a entrega real pelo Resend e um teste de penetração independente.
