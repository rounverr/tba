# <picture><img src="../assets/icons/layers.svg" width="28" height="28" alt=""></picture> Périmètre du modèle

<p align="center"><a href="../en/template-scope.md" lang="en">English</a> | <a href="../es/template-scope.md" lang="es">Español</a> | <a href="../pt/template-scope.md" lang="pt">Português</a> | <a href="../de/template-scope.md" lang="de">Deutsch</a> | <strong>Français</strong> | <a href="../it/template-scope.md" lang="it">Italiano</a> | <a href="../zh/template-scope.md" lang="zh">简体中文</a> | <a href="../ja/template-scope.md" lang="ja">日本語</a> | <a href="../hi/template-scope.md" lang="hi">हिन्दी</a> | <a href="../ar/template-scope.md" lang="ar">العربية</a></p>

[Documentation technique](README.md) | [Présentation du projet](../README.fr.md)

TBA utilise Cloudflare Workers avec D1 par défaut. La même interface et la même API Hono fonctionnent sous Node.js avec SQLite ou PostgreSQL. [Moteurs de base de données](database-engines.md)

Le modèle de base comprend OTP par e-mail, connexion Google facultative, MFA TOTP et récupération, appareils de confiance, sessions, rôles et autorisations, profil, changement d’adresse, gestion simple des comptes, demandes d’inscription, audit et tableau de bord. La connexion et l’administration proposent dix langues et les thèmes clair/sombre.

> [!NOTE]
> Les listes simples avec navigation bornée, les tables de base de données, les contraintes et les migrations génériques nécessaires à l’identité, à l’audit et au tableau de bord sont incluses. Recherche, filtres, moteurs de tri et pagination avancés, ainsi que l’export Excel/XLSX, sont exclus de la base. Chaque projet peut les ajouter selon ses données et autorisations. Le téléchargement local `.txt` des codes de récupération MFA reste une fonction de sécurité.

Chaque application possède ses propres Worker, base, utilisateurs, secrets, domaines et messagerie. Aucun profil métier, organisation, facturation ou donnée client n’est créé par défaut. Utilisez le hook d’inscription pour les intégrations propres au projet. La réutilisation relève de la [licence MIT](../../LICENSE), avec les mentions requises et les [licences des polices](../licenses/README.md#fr). Les marques sont régies séparément par [TRADEMARKS](../../TRADEMARKS.md).
