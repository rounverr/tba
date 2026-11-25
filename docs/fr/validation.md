# <picture><img src="../assets/icons/check.svg" width="28" height="28" alt=""></picture> Liste de validation

<p align="center"><a href="../en/validation.md" lang="en">English</a> | <a href="../es/validation.md" lang="es">Español</a> | <a href="../pt/validation.md" lang="pt">Português</a> | <a href="../de/validation.md" lang="de">Deutsch</a> | <strong>Français</strong> | <a href="../it/validation.md" lang="it">Italiano</a> | <a href="../zh/validation.md" lang="zh">简体中文</a> | <a href="../ja/validation.md" lang="ja">日本語</a> | <a href="../hi/validation.md" lang="hi">हिन्दी</a> | <a href="../ar/validation.md" lang="ar">العربية</a></p>

[Documentation technique](README.md) | [Présentation du projet](../README.fr.md)

Exécutez les tests de D1, SQLite et PostgreSQL dans des installations isolées selon le [guide des moteurs](database-engines.md).

1. Installer les dépendances avec `npm ci`.
2. Vérifier les types frontend et backend avec `npm run check`.
3. Exécuter les tests unitaires et d'intégration avec `npm test`.
4. Construire les ressources de production avec `npm run build`.
5. Vérifier le paquet Worker avec `npm run worker:check`.
6. Tester manuellement l'OTP par e-mail, la connexion Google facultative, l'activation et la récupération MFA, les appareils de confiance, la révocation des sessions, les rôles et permissions, les modes d'inscription et le refus des accès non autorisés.
7. Vérifier la connexion et le panneau d'administration dans les dix langues, dont l'arabe en RTL. Confirmer que le changement de langue ne recharge pas la page et ne réinitialise pas les formulaires.
8. Contrôler les vues ordinateur et mobile, le clavier, les lecteurs d'écran et les en-têtes de sécurité.
9. Avant toute promotion expressément autorisée, examiner secrets, migrations, paramètres propres à l'environnement, liens de documentation et différences des fichiers retenus. La publication est manuelle; CI et Workers Builds ne sont pas obligatoires.

Exécutez la liste sur le paquet réutilisable réel, pas seulement une copie avec extensions. Vérifiez listes simples, audit et tableau de bord sans contrôles avancés de recherche/filtre/tri ni imports XLSX. Avec une session autorisée, les routes exclues `/api/private/export/*` doivent répondre 404. Conservez le `.txt` de récupération MFA. 


Les scripts `tests/browser/*.mjs` sont des vérifications manuelles facultatives hors de `npm test`. Fournir Playwright (`PLAYWRIGHT_MODULE`), Chromium (`BROWSER_EXECUTABLE`) et un site local compilé (`AUTH_TEST_URL`) avec repli 404. Connexion/panneau utilisent les dix langues ; `enabled-languages.mjs` nécessite une fixture séparée avec `--languages en,pt --locale en`. Générer les fixtures HTML avec `MAIL_PREVIEW_DIR` et `tests/mail-template.test.ts` avant `mail-preview.mjs`. Utiliser une copie fixe de `dist`. Utilisez `node-panel.mjs` pour vérifier les OTP et les requêtes HTTP sur un serveur local réel. Les autres tests d’interface peuvent simuler l’API.

Exécutez `node tests/browser/panel-idle.mjs` sur le site compilé pour mesurer dix minutes d’inactivité des listes simples et vérifier la revalidation du BFCache.

L’anglais reste inclus comme repli. Les autres catalogues de connexion et du panneau utilisent des imports dynamiques et un cache mémoire par module. Le focus clavier ou pointeur précharge uniquement l’option visée ; ouvrir le menu ne charge pas toutes les langues. Le changement attend les catalogues complets et conserve formulaires, session et navigation. Le cache évite le réseau ; le dernier choix prévaut. Un échec initial affiche l’anglais, un échec ultérieur conserve la langue actuelle. E-mails et métadonnées du build utilisent des catalogues complets côté serveur. Voir le [chargement des langues](language-loading.md).

> [!NOTE]
> Restent à vérifier l’installation et les jonctions sous Windows, le callback Google OAuth externe, l’envoi réel par Resend et un test d’intrusion indépendant.
