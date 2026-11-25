# <picture><img src="../assets/icons/database.svg" width="28" height="28" alt=""></picture> Moteurs de base de données

<p align="center"><a href="../en/database-engines.md" lang="en">English</a> | <a href="../es/database-engines.md" lang="es">Español</a> | <a href="../pt/database-engines.md" lang="pt">Português</a> | <a href="../de/database-engines.md" lang="de">Deutsch</a> | <strong>Français</strong> | <a href="../it/database-engines.md" lang="it">Italiano</a> | <a href="../zh/database-engines.md" lang="zh">简体中文</a> | <a href="../ja/database-engines.md" lang="ja">日本語</a> | <a href="../hi/database-engines.md" lang="hi">हिन्दी</a> | <a href="../ar/database-engines.md" lang="ar">العربية</a></p>

[Documentation technique](README.md) | [Présentation du projet](../README.fr.md)

> [!NOTE]
> Utilisez Cloudflare Workers pour D1 et Node.js 24+ pour SQLite ou PostgreSQL. Préparez une copie du code par installation. Exécutez `npm ci` et sélectionnez le moteur avec `npm run setup -- --interactive`. D1 est le choix par défaut. Placez `DATABASE_URL` et `BETTER_AUTH_SECRET` dans `.dev.vars` ou dans l’environnement. Suivez le [tableau des commandes](../en/database-engines.md) pour compiler, migrer et créer le premier administrateur, puis lancez `npm start`. PostgreSQL exige `--target`. Préparez des sauvegardes et utilisez le courrier local ou Resend sous Node. [Opérations D1](operations.md) | [Courrier](setup-mail.md)

D1 et SQLite appliquent les fichiers SQL 0001 à 0003 de `drizzle/`. PostgreSQL utilise ses propres fichiers numérotés dans `drizzle/postgresql/`. Chaque installation conserve son historique.

`better-sqlite3` est une dépendance facultative requise uniquement pour SQLite. Placer le fichier SQLite hors de `dist`. PostgreSQL valide le certificat et le nom d’hôte en TLS. Pour une cible distante, indiquer `--target hôte:port/base`.

Les migrations 0001 à 0003 exigent au minimum la syntaxe PostgreSQL 11. Les tests d’intégration ont vérifié 17.12 et 18.7. Pour une nouvelle installation, utiliser une version maintenue, de préférence le dernier correctif de PostgreSQL 18.

Restent à vérifier l’installation et les jonctions sous Windows, le callback Google OAuth externe, l’envoi réel par Resend et un test d’intrusion indépendant.
