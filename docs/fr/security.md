# <picture><img src="../assets/icons/shield.svg" width="28" height="28" alt=""></picture> Authentification et sécurité

<p align="center"><a href="../en/security.md" lang="en">English</a> | <a href="../es/security.md" lang="es">Español</a> | <a href="../pt/security.md" lang="pt">Português</a> | <a href="../de/security.md" lang="de">Deutsch</a> | <strong>Français</strong> | <a href="../it/security.md" lang="it">Italiano</a> | <a href="../zh/security.md" lang="zh">简体中文</a> | <a href="../ja/security.md" lang="ja">日本語</a> | <a href="../hi/security.md" lang="hi">हिन्दी</a> | <a href="../ar/security.md" lang="ar">العربية</a></p>

[Documentation technique](README.md) | [Présentation du projet](../README.fr.md)

## Sécurité SQL

> [!IMPORTANT]
> Liez les valeurs externes ou stockées avec des paramètres du pilote ou des prédicats Drizzle. Les identifiants, filtres et tris proviennent de listes côté serveur. Limitez le compte applicatif et protégez erreurs et identifiants de connexion. [SQL](../en/security.md#sql-security-en) | [PostgreSQL](../en/security.md#postgresql-runtime-privileges)

La base stocke les limites de requêtes et l’autorisation de session versionnée dans les trois moteurs.

## Email OTP

L'entrée informe 403 avec `ACCESS_NOT_ENABLED` lorsque le courrier ne correspond pas à un compte activé et n'envoie pas d'OTP ni ne crée d'utilisateurs. L'interface conserve le formulaire et affiche l'avis pour vérifier l'adresse ou demander l'accès. Le même message est utilisé pour les comptes inexistants, en attente, suspendus ou désactivés, sans révéler leur état concret. Cette politique, demandée pour guider la personne, permet de distinguer les comptes activés de ceux qui n'ont pas d'accès ; elle remplace la réponse uniforme précédente du login. Les limites par IP et par courrier sont conservées. L'enregistrement maintient sa réponse uniforme et ses contrôles de modalité. L'envoi éligible est complété par `waitUntil`. L'adaptateur utilise le fournisseur configuré en `MAIL_PROVIDER` : Cloudflare Email Sending sous D1, Resend sous Worker et Node, ou la boîte locale de développement. La sélection est implémentée en `services/mail.ts`.

Le code a six chiffres, expire en cinq minutes et Better Auth le stocke avec hash. Il est limité à cinq tentatives par OTP, dix vérifications par courrier toutes les quinze minutes et un envoi par courrier par minute. Il y a également une limite par IP de vingt requêtes toutes les quinze minutes et des limites du fournisseur d'authentification. Les limites vivent en D1 et les clés de throttle sont stockées avec SHA-256. Aucun OTP ni token n'est imprimé dans les logs.

`/access/verify` distingue explicitement le login et l'enregistrement. Le login utilise `disableSignUp:true`, exige un compte actif existant et ne concède pas d'accès aux comptes en attente ou suspendus. Un OTP utilisé ou expiré ne génère pas à nouveau de session.

## Google OAuth

Il n'est activé que lorsque `GOOGLE_ENABLED="true"` et que les deux secrets existent. Il exige `email_verified` du profil Google et désactive la création d'utilisateurs depuis OAuth. Le résultat passe par la même barrière d'état, de session, de permissions et de MFA que Email OTP. Callback : `https://app.example.test/api/auth/callback/google`. Il enregistre cet URI exact dans Google Cloud et configure l'écran de consentement. Ce flux nécessite un test externe réel après avoir configuré les informations d'identification.

## Sessions et origine

Les sessions durent huit heures et sont vérifiées dans la base sans cache de cookie. La session enregistre un instantané d’autorisation versionné dans la base après la MFA si nécessaire. Chaque opération protégée vérifie la session et la version. Un instantané valide fournit les permissions sans relire le rôle. Si le panneau reçoit `409 authorization_changed` avant une écriture, il actualise le contexte et réessaie une fois pour le même utilisateur. Les cookies HttpOnly, SameSite=Lax et Secure sont utilisés en production. Chaque mutation exige un `Origin` égal à `APP_URL`, JSON et corps de jusqu'à 16 KiB. Les requêtes HTTPS sont obligatoires en dehors de localhost. Il n'y a pas de CORS ouvert ni de tokens dans localStorage ; seules les préférences visuelles de thème et de menu contracté sont stockées là.

Le gateway n'expose que les routes de Google et de fermeture de session du handler public de Better Auth. Les méthodes OTP, inspection de codes, MFA et signup ne peuvent pas être invoquées depuis l'extérieur des politiques du serveur. Les corps de réponse de Better Auth qui contiennent des tokens ne sont pas livrés au frontend : seules les cookies et les données strictement nécessaires sont propagées.

Les en-têtes de sécurité et CSP sont inclus. La CSP autorise les scripts/styles inline nécessaires pour l'hydratation d'Astro et les tokens visuels ; elle n'autorise pas les objets ni les frames de sites étrangers à Turnstile. Si un dérivé supprime les scripts inline, il peut durcir la CSP en utilisant des hashes/nonces.

## Render administratif avant d'autoriser

Les huit documents administratifs sont générés sans structure visuelle du panneau. La sortie initiale de React est également vide : ni menu, en-tête, titre de la vue, formulaires, avertissements de session ou indicateurs de chargement ne sont montés avant de recevoir une réponse privée autorisée. Une redirection pendante conserve cette sortie vide. Le résultat confirmé d'un changement de courriel est affiché comme reçu public séparé, car cette opération ferme les sessions ; il ne remonte pas le panneau. Il s'agit d'une correction de présentation du conteneur statique ; les données privées étaient déjà protégées par l'API. Cela ne remplace pas son authentification ni n'ajoute de lectures.

Les rejets 403 et les défaillances 503 lors du chargement d'une vue sans accès confirmé n'affichent qu'un message public et des options de récupération, sans le panneau. Lors de l'enregistrement d'une page dans BFCache, sa structure est masquée de manière synchrone et les dialogues sont fermés pour que l'instantané ne la repinte pas pendant la révalidation. Seule une réponse autorisée la fait réapparaître.

## Retour au login en cas de perte de session

Un 401 lors d'une lecture ou d'une action du panneau invalide sa mise en cache de présentation, annule les lectures pendantes et nettoie les données privées, les QR, les graines et les codes transitoires avant de remplacer l'URL par `/login/`. La fermeture de session réussie utilise le même nettoyage et la même navigation par remplacement. Réouvrir un lien administratif avec la session fermée suit ce flux automatiquement.

Une restauration du document depuis BFCache nécessite une lecture actuelle du serveur, même si la mise en cache visuelle précédente était toujours valable. L'indicateur `persisted` de `pageshow` est vérifié : les chargements normaux et la navigation interne ne reçoivent pas de requête supplémentaire. Un 403 en raison d'un manque de permissions ne se traduit pas par une déconnexion ; le code `MFA_REQUIRED` dirige vers le défi MFA et `RECENT_AUTH_REQUIRED` conserve son flux d'identité récent. Un défaillance 503 n'est pas non plus interprétée comme une session fermée. Les destinations sont des routes locales fixes. Les API continuent de répondre JSON 401/403, sans redirections HTTP qui cassent les clients ou cachent les erreurs.

## MFA volontaire

Profil → Sécurité utilise le plugin officiel Two Factor avec `allowPasswordless:true`. Il n'existe pas de deuxième facteur par courriel. L'activation accepte un ingres de moins de cinq minutes ou une confirmation de courriel à l'intérieur de l'application, liée à la session en cours. Cela génère un secret chiffré et confirme un TOTP avant d'activer le deuxième facteur. Le QR est généré dans le navigateur, sans envoyer le secret à des tiers. La même clé de configuration est copiée en la pressant et peut être chargée manuellement comme TOTP dans l'application d'authentification. L'interface supprime le QR et la clé de configuration de son état lors de la fermeture du dialogue ou de la completion de l'activation.

L'ancienneté de cinq minutes est comptée depuis l'ingres qui a créé la session, et non depuis la dernière activité. La session générale dure toujours huit heures. Excepté l'inscription MFA, qui admet la confirmation à l'écran décrite ci-dessous, si une opération sensible dépasse ce délai, l'API répond 403 avec `RECENT_AUTH_REQUIRED` ; l'interface explique la cause et propose de confirmer l'identité en `/login/?reauth=1`. Un nouveau OTP et le deuxième facteur sont demandés lorsqu'il y a lieu, et on revient à `/admin/security/`. Pour les modifications du profil, `/login/?reauth=profile` est utilisé et on revient à `/admin/profile/`. Les destinations sont choisies dans une liste fixe : il n'accepte pas d'URL de retour externes ni ne supprime la vérification du premier facteur récent. L'opération sensible ne s'exécute pas automatiquement lors du retour.

Le plugin n'intercepte pas automatiquement toutes les méthodes sans mot de passe dans la version installée. TBA conserve un tableau `assurance`, lié à la session, à l'utilisateur et à sa version de MFA. Toute API privée rejette une session qui n'a pas terminé le deuxième facteur. L'e-mail OTP et OAuth produisent d'abord une session en attente de cette barrière. Changer l'état dans React ou appeler directement une API ne permet pas de l'éviter.

Le passerelle ajoute un budget de cinq tentatives de deuxième facteur par utilisateur toutes les cinq minutes, même lorsque Better Auth reçoit une session de premier facteur authentifiée. Les changements sensibles nécessitent un premier facteur récent et une nouvelle confirmation TOTP ou code de récupération.

## Appareils de confiance

La révocation depuis la Sécurité est confirmée à l'intérieur de l'application avec un TOTP ou un code de récupération nouveau et la même limite de cinq tentatives. Elle n'exige pas de revenir à la connexion en raison de l'ancienneté de l'entrée : elle exige une session valide, un MFA terminé et une nouvelle vérification du deuxième facteur. Après avoir supprimé tous les appareils de confiance et augmenté la version MFA, seule la vérification de la session qui vient de confirmer le code est réinitialisée. Les autres sessions doivent terminer à nouveau le MFA. Le MFA reste actif et aucun nouvel appareil de confiance n'est généré. La désactivation du MFA et les autres opérations sensibles conservent leurs exigences.

Le mode officiel `trustDevice` du plugin ne satisfait pas à lui seul à la vérification de tous les flux sans mot de passe de cette version. C'est pourquoi un jeton aléatoire de 256 bits généré avec Web Crypto, stocké dans un cookie HttpOnly, Secure et SameSite=Strict, est utilisé. Dans D1, seul le hachage du jeton, de l'utilisateur, de la version de MFA et de la date d'expiration absolue de trente jours est stocké. On ne se fie pas à l'IP ni à l'User-Agent.

La confiance n'est créée qu'après avoir vérifié le deuxième facteur et par sélection explicite. La case à cocher apparaît dans les étapes de courrier électronique OTP, d'Authentificateur et de récupération, et conserve la sélection lors du changement de méthode ou de la réexpédition du courrier. La sélection pendant l'OTP n'exprime qu'une préférence pour l'étape MFA : elle ne crée pas de confiance par elle-même et n'affecte pas les comptes sans MFA. Elle ne remplace jamais le premier facteur et n'est pas renouvelée automatiquement. Révoquer la confiance ou désactiver le MFA supprime les jetons et augmente la version de MFA. Révoquer les sessions ou suspendre un utilisateur coupe l'accès existant. En localhost, Secure est omis et le préfixe `__Host-` est omis pour permettre le développement HTTP.

## Récupération

Lors de la révocation des appareils de confiance en HTTPS, le cookie est supprimé avec les attributs de sécurité appropriés. La désactivation du MFA révoque la confiance et les sessions selon les règles décrites dans ce guide.

Les dix codes sont chiffrés par Better Auth. Ils sont affichés lors de leur génération et chacun peut être utilisé une seule fois, toujours après le premier facteur. La régénération les rend invalides. L'interface utilisateur permet de les copier ou de les télécharger dans un fichier `.txt` généré localement à l'aide de Blob. Le fichier inclut des instructions de stockage privé et rappelle que le courrier électronique est toujours nécessaire. L'utilisateur doit enregistrer ce fichier par ses propres moyens ; l'application révoque l'URL temporaire et ne l'envoie à aucun serveur. L'interface utilisateur les supprime de la mémoire lors de la fermeture de leur affichage ; ils ne sont pas persistants dans le navigateur. Les autorisations de caméra, de SMS et de deuxième courrier électronique ne sont pas nécessaires.

## RBAC et audit

L’accès est refusé par défaut. Chaque requête privée vérifie la session active et la version globale de l’autorisation. Les permissions proviennent de l’instantané versionné de la session. S’il est périmé, le serveur relit le rôle et le reconstruit. Les modifications administratives vérifient les permissions du point d’accès et le statut administrateur. La révocation exige `users.edit`. Les déclencheurs protègent le dernier administrateur actif.

L'audit conserve l'acteur, l'action, la ressource, le résultat et la date. Il ne conserve pas les corps de requête, les secrets, les codes ni les jetons. La rétention doit être définie par application ; programme de nettoyage de sessions, de vérifications, de throttle, de confiance expirée et d'audit avec une tâche explicite selon ses besoins. La première version n'installe pas de cronjobs ni de ressources supplémentaires.

## Présentation des autorisations et de l'activité

Les identifiants des permissions et des événements restent côté serveur et dans la base. Le panneau traduit leurs libellés dans la langue choisie. Les nouveaux rôles reçoivent des identifiants uniques et les anciens gardent les leurs.

Le point de terminaison de l'audit exige toujours `audit.read` et résout le courrier de l'utilisateur ou le nom du rôle associé via des joints de lecture. Si la ressource n'existe plus, une étiquette neutre est affichée. La ressource décrit l'élément affecté (session, deuxième facteur, récupération, profil ou confiance), au lieu de répéter le courrier de l'acteur. Dans les actions administratives, il conserve le nom de l'autre personne affectée, ou son courrier si aucun nom n'est disponible ; les rôles et la configuration affichent leur nom lisible. Les noms sont résolus via les joints de lecture existants, sans modifier les événements. Les références originales sont conservées dans D1 pour la traçabilité ; l'interface d'audit n'affiche pas de codes techniques ni d'identificateurs dans les détails déployables. L'historique n'est pas modifié ni réécrit.

Les sélecteurs utilisent un combobox avec des options dans un popover et conservent un `select` natif caché pour sérialiser et valider les formulaires. Le menu est positionné en fonction de l'espace disponible sans être tronqué par le dialogue. Il permet les flèches, les touches Début/Fin, la sélection avec Entrée, Échap et Tab ; il se ferme en cliquant en dehors, en redimensionnant ou en déplaçant le conteneur. Les champs obligatoires mettent le focus sur le sélecteur et affichent un message de validation. Aucune dépendance n'a été ajoutée. L'autocomplétion respecte les couleurs du thème clair ou sombre.

## Changement de l'adresse de messagerie

Le profil propose un flux guidé via le plugin Email OTP de Better Auth : `POST /api/private/profile/email/request` envoie le code à la nouvelle adresse et `POST /api/private/profile/email/confirm` vérifie et applique le changement. Les deux exigent une session active, un MFA complet lorsque cela correspond et un premier facteur de moins de cinq minutes. La confirmation exige en outre un nouveau code d'Authentificateur ou de récupération si le compte a un MFA, même avec un appareil de confiance. L'API informe `mfaRequired` lors de la demande de l'adresse de messagerie et rejette une confirmation sans deuxième facteur avec `MFA_CONFIRMATION_REQUIRED`, avant de consommer le OTP du courrier. Les contrôles d'origine, JSON, de taille et de fréquence sont conservés. Les points de terminaison bruts du plugin restent bloqués par le passerelle.

Un OTP avec hachage, cinq minutes de validité et un maximum de cinq tentatives, lié à l'utilisateur et à la nouvelle adresse, est utilisé. Une adresse déjà utilisée ne reçoit pas de code et ne remplace pas un autre compte. L'adresse actuelle reste valide jusqu'à la completion de la vérification. Aucun courrier n'est marqué manuellement comme vérifié : l'opération officielle du plugin le fait uniquement après avoir validé l'OTP.

Better Auth vérifie et consomme le code reçu par e-mail. La couche de persistance applique atomiquement la modification du compte, l’incrément de la version MFA, la révocation des appareils et sessions et l’entrée d’audit. D1 utilise un lot. SQLite et PostgreSQL utilisent des transactions. En cas d’échec, demandez un nouveau code.

Une fois que ce lot est confirmé, une erreur survenue lors de la préparation de la réponse de Better Auth n'est pas signalée comme un changement ayant échoué. Il n'est pas nécessaire d'émettre un cookie de remplacement car les sessions sont déjà révoquées. La notification à l'ancienne adresse est envoyée en dehors du lot via `waitUntil` ; son échec est enregistré séparément et n'altère pas la réussite du changement. Les diagnostics d'erreur n'enregistrent que les étiquettes de phase, de méthode et de chemin, sans courrier, OTP, MFA, cookies ni corps de requêtes. La personne doit se reconnecter avec le nouveau courrier et son MFA. L'identifiant d'utilisateur, le rôle, l'état, le secret TOTP et les codes de récupération restants sont conservés. Si l'un d'eux est utilisé pour confirmer le changement, il est consommé comme dans toute vérification. L'audit enregistre l'événement et l'identifiant de l'utilisateur, sans codes ni corps de requête. Aucune migration ni nouvelle table n'est requise.

Les listes simples des utilisateurs, demandes et audits restent disponibles avec navigation bornée et autorisations serveur. Les moteurs avancés et Excel sont exclus de la base ; chaque dérivé les ajoute si nécessaire. Voir le [périmètre](template-scope.md).

<a id="email-verification-before-mfa-fr"></a>

### Confirmation de courrier pour activer MFA sans quitter l'application

Lorsque la connexion dépasse cinq minutes, `enroll` et `confirm` répondent `MFA_ENROLL_CONFIRMATION_REQUIRED`. L'interface envoie un code à l'adresse de l'acteur authentifié via `/api/private/security/enroll/email`, le confirme via `/api/private/security/enroll/email/confirm` et continue avec le QR. Elle ne redirige pas vers la connexion ni ne modifie les cookies, l'ancienneté de la session ou ses autorisations. Une session expirée ou révoquée continue de répondre 401.

Le code cryptographique à six chiffres est enregistré sous forme de hachage avec le secret de l'application et l'identifiant de session, dans la table de vérification existante. Il expire dans cinq minutes, admet cinq tentatives et n'est consommé qu'une seule fois via une mise à jour conditionnelle. L'envoi est limité à un par utilisateur par minute. L'autorisation résultante dure cinq minutes et sert exclusivement à lancer et à confirmer l'inscription MFA dans cette session ; elle ne remplace pas le TOTP d'activation, ni n'autorise les modifications de courrier, la désactivation, la récupération ou les révocations. Elle est supprimée à la fin de l'inscription. Aucune table, migration ou service n'est créé.
