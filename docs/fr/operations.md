# <picture><img src="../assets/icons/settings.svg" width="28" height="28" alt=""></picture> Configuration et opérations

<p align="center"><a href="../en/operations.md" lang="en">English</a> | <a href="../es/operations.md" lang="es">Español</a> | <a href="../pt/operations.md" lang="pt">Português</a> | <a href="../de/operations.md" lang="de">Deutsch</a> | <strong>Français</strong> | <a href="../it/operations.md" lang="it">Italiano</a> | <a href="../zh/operations.md" lang="zh">简体中文</a> | <a href="../ja/operations.md" lang="ja">日本語</a> | <a href="../hi/operations.md" lang="hi">हिन्दी</a> | <a href="../ar/operations.md" lang="ar">العربية</a></p>

[Documentation technique](README.md) | [Présentation du projet](../README.fr.md)

TBA utilise Cloudflare Workers avec D1 par défaut. La même interface et la même API Hono fonctionnent sous Node.js avec SQLite ou PostgreSQL. [Moteurs de base de données](database-engines.md)

## Initialisation

L’anglais est la langue de base du code et de l’assistant setup. Les dix traductions et polices locales sont incluses. `npm run setup -- --languages en,pt` active uniquement anglais et portugais, sans installer de paquets ni supprimer les autres traductions. Sans `--languages`, la sélection reste inchangée ; sans liste existante, les dix sont activées. L’anglais reste actif comme repli des traductions. `--locale en` définit la langue par défaut et accepte toute langue activée. La priorité est préférence enregistrée, langue compatible du navigateur, puis langue par défaut configurée. Le changement ne recharge pas la page et conserve les formulaires ; l’arabe garde RTL.

`npm run setup -- --interactive` | `--name` | `--id` | `--domain` | `--database` | `--account` | `--mail local|resend|cloudflare` | `--google true|false` | `--mfa true|false` | `--trust true|false` | `--r2 true|false` | `--theme light|dark`.

Le script génère `.dev.vars` avec un secret aléatoire lorsqu'il n'existe pas. Il n'écrit pas d'informations d'identification dans les fichiers versionnés ni ne crée d'administrateurs ou de ressources distantes. Il modifie l'identité technique avant de configurer un dérivé.

## D1, Drizzle et migrations

`src/server/database/schema.ts` est le schéma de Drizzle. `drizzle/0001_initial.sql` contient le schéma de base et `0002_defaults_and_guards.sql` charge les rôles, l'enregistrement fermé et les déclencheurs. `drizzle/generated` conserve l'instantané de Drizzle pour des comparaisons futures ; Wrangler n'exécute les SQL que dans la racine de `drizzle`. Appliquez `drizzle/0003_session_authorization.sql` avec les autres migrations. Les sessions existantes acquièrent leur instantané au prochain contrôle des permissions.

`db:generate` produit des candidats dans `drizzle/generated`. Vérifiez chaque candidat et copiez-le avec le numéro suivant à la racine ; ajoutez des déclencheurs ou des données dans une migration distincte lorsque cela est approprié. N'éditez jamais une migration déjà appliquée. Vérifiez les conflits potentiels avant d'utiliser une D1 existante et effectuez une sauvegarde avant les modifications distantes. La plantilla n'exécute pas de SQL distant pendant l'installation ou la construction.

> [!IMPORTANT]
> Les scripts `db:create`, `db:link`, `db:migrate:remote` et `deploy` nécessitent un compte explicite et `--confirm` ; sans confirmation, les opérations de création et d'écriture sont arrêtées. `db:create` vérifie les noms existants et récupère l'UUID réel. `db:link` énumère les bases de données du compte et affiche son schéma avant de sauvegarder le binding, sans le modifier. Si une opération échoue, aucun binding supposé n'est écrit. Aucun script ne supprime de bases de données.

Utilisez `--config wrangler.<environment>.jsonc` ou `--config wrangler.<other-environment>.jsonc` pour des objectifs distincts. Copiez la configuration et attribuez un nom, une URL, un account_id et un database_id réels différents pour chaque environnement. Les variables et les bindings ne doivent pas être partagés accidentellement. Il n'y a pas d'environnements distants précréés dans TBA.

## Secrets et courrier

Le setup accepte `--mail local`, `--mail resend` et `--mail cloudflare`. Le courrier local utilise une `APP_URL` locale et `npm run mail:dev`. Resend nécessite `RESEND_API_KEY` et `MAIL_FROM`. Cloudflare réutilise l’adaptateur existant avec un binding `send_email` nommé `EMAIL`, un `MAIL_FROM` autorisé et un domaine configuré pour l’envoi. Le setup vérifie localement, sans créer de ressources ni vérifier un domaine distant. La configuration peut attendre : le mode interactif demande confirmation, le mode non interactif continue avec une liste de tâches. Aucun binding, expéditeur ou secret n’est inventé ; l’envoi nécessite la configuration. Garder les secrets hors de Git. Wavicc reste l’intégration future privilégiée avec `WAVICC_API_KEY` comme emplacement réservé. Voir le [setup e-mail](setup-mail.md).

Wavicc est l’intégration future privilégiée, sans adaptateur ni contrat API vérifié. `WAVICC_API_KEY` et `CUSTOM_MAIL_API_KEY` n’activent aucun fournisseur. N’utilisez pas `MAIL_PROVIDER=wavicc`. Un autre service exige un adaptateur testé selon son contrat publié, conservant HTML/texte et authentification ; aucun endpoint n’est supposé.

Vérifiez chaque message avec des comptes isolés : langue, mobile, expiration, échec d’envoi et réponse après changements confirmés. Ne journalisez pas codes, contenus, jetons ou secrets. Voir [opérations](operations.md) et [validation](validation.md).

## Google et Turnstile

Google nécessite `GOOGLE_ENABLED="true"`, `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` avec callback exact `/api/auth/callback/google`. Il n'y a pas de valeurs par défaut. Utilisez un compte actif préalablement autorisé et vérifiez MFA, rejet des utilisateurs suspendus et courrier vérifié avant de publier.

Turnstile est facultatif. Si vous définissez `TURNSTILE_SITE_KEY`, définissez également `TURNSTILE_SECRET_KEY`. L'enregistrement affiche le widget et le backend valide le token, le nom d'hôte et l'action `register` dans Siteverify ; il ne suffit pas de résoudre le widget dans React. Aucun widget distant n'est créé à partir de TBA. Si vous ne le configurez pas, les limites D1 par courrier, IP et vérification restent actives. Évaluez l'activation avant d'ouvrir un enregistrement au public.

R2 est désactivé et les buckets ne sont pas déclarés. N'ajoutez-le que si le dérivé nécessite des fichiers, avec autorisation explicite pour provisionner et types régénérés.

## Administrateur initial

`npm run admin:bootstrap -- --email admin@example.test` utilise D1 local par défaut. Le courrier n'est pas marqué comme vérifié et doit être confirmé avec OTP. Aucun autre administrateur n'est ajouté si l'un d'entre eux est déjà actif.

Le mode distant exige `--remote --account ACCOUNT_ID --confirm` et vérifie que la configuration a une D1 réelle et le même compte. N'incluez pas de courriers réels dans SQL versionné. Si vous perdez l'accès à l'unique administrateur, suivez une procédure opérationnelle propre ; il n'y a pas de backdoor ni de réinitialisation automatique des privilèges.

## Déploiement manuel avec D1

1. Configurez l'identité du dérivé et le compte correct.
2. Créez ou liez une D1 après autorisation. Révisez et appliquez SQL explicitement.
3. Configurez HTTPS, origine exacte et courrier externe ; facultativement Google et Turnstile.
4. Exécutez `types:worker`, `check`, `test`, `build`, `worker:check`.
5. Exécutez `npm run deploy -- --account ACCOUNT_ID --confirm` avec le fichier sélectionné.
6. Exécutez le bootstrap distant et un test avec des utilisateurs isolés.
7. Vérifiez les événements, MFA, récupération, rôles et flux de courrier avant d'admettre des utilisateurs réels.

La configuration inclut les journaux et les traces des Workers. Évitez d'ajouter la journalisation des corps/cookies. L'équipe maintient les validations et les publications manuelles. GitHub Actions et Workers Builds ne sont pas des exigences pour déployer et ne doivent pas être configurés comme condition de publication. Exécutez localement les vérifications pertinentes avant de tout changement distant, avec le compte et la destination confirmés.

## Mises à jour et problèmes fréquents

- Erreur d'origine : `APP_URL` doit correspondre à l'origine du navigateur, sans barre finale. Utilisez le Worker local pour le test complet.
- OTP non reçu : vérifiez la boîte aux lettres locale ou l'expéditeur/les informations d'identification du fournisseur. La réponse générique ne confirme pas que le compte existe.
- Accès refusé : confirmez l'état actif, le courrier vérifié, le rôle et MFA complet dans le backend.
- Changement sensible rejeté : reconnectez-vous ; la vérification récente dure cinq minutes.
- D1 inexistante : appliquez les migrations locales ou vérifiez le binding distant et le compte ; ne remplissez pas les IDs inventés.
- Mise à jour du noyau : comparez les commits, révisez `CHANGELOG`, mettez à jour les dépendances de manière délibérée et appliquez les migrations révisées dans un environnement de test. Le modèle GitHub ne propage pas les changements aux dérivés.
