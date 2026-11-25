# <picture><img src="../assets/icons/users.svg" width="28" height="28" alt=""></picture> Enregistrement, approbations et extensions

<p align="center"><a href="../en/registration.md" lang="en">English</a> | <a href="../es/registration.md" lang="es">Español</a> | <a href="../pt/registration.md" lang="pt">Português</a> | <a href="../de/registration.md" lang="de">Deutsch</a> | <strong>Français</strong> | <a href="../it/registration.md" lang="it">Italiano</a> | <a href="../zh/registration.md" lang="zh">简体中文</a> | <a href="../ja/registration.md" lang="ja">日本語</a> | <a href="../hi/registration.md" lang="hi">हिन्दी</a> | <a href="../ar/registration.md" lang="ar">العربية</a></p>

[Documentation technique](README.md) | [Présentation du projet](../README.fr.md)

> [!NOTE]
> La modalité initiale est `closed`. Il n'y a pas de lien d'enregistrement public et l'API refuse les demandes d'enregistrement. Les administrateurs peuvent créer des comptes qui vérifient ensuite leur courrier électronique lors de la connexion.

En `approval`, la personne demande un OTP et confirme son courrier électronique. TBA crée un compte en attente sans rôle et une demande unique, révoque toute session provisoire et notifie les administrateurs via l'adaptateur de courrier électronique. L'approbation nécessite de choisir un rôle explicite ; le rejet n'autorise pas l'accès. Les deux actions sont auditées. Lors de l'approbation, l'utilisateur est notifié.

En `open`, le courrier électronique est vérifié avant d'activer le compte. Un administrateur choisit le rôle initial depuis Accès et enregistrement parmi **tous les rôles configurés**, y compris les rôles personnalisés, Éditeur et Administrateur. Le choix est enregistré dans `settings.public_role_id`, sans changement de schéma. Le serveur vérifie que le rôle existe et que l'administrateur confirme explicitement l'enregistrement ouvert. Le visiteur qui s'enregistre ne choisit jamais ni n'envoie un rôle effectif : le rôle configuré sur le serveur est appliqué lors de la vérification du courrier électronique.

Le sélecteur n'apparaît que lors du choix de l'enregistrement ouvert. Il réutilise le menu de l'application, affiche les autorisations du rôle (ou le contrôle administratif complet), conserve le choix lors du changement de langue et exige de confirmer à nouveau si le rôle change. Si aucun rôle n'est disponible ou si le rôle configuré n'est plus disponible, il explique la situation et évite d'enregistrer un choix vide. Les textes sont traduits dans les dix langues.

Les changements n'affectent que les nouveaux enregistrements. Les comptes et demandes précédents conservent leur état et leur rôle. Une demande en attente précédente ne sera jamais approuvée parce que la modalité a changé. Chaque finalisation consulte à nouveau la modalité et le rôle actuels ; si aucun rôle valide n'est disponible, il n'active pas le compte. Les fonctionnalités Email OTP, limites d'envoi et de tentatives, autorisations de configuration et audit sont maintenues.

La marque de rôle public avec accès de base (`isPublic`) conserve sa validation de minimum d'autorisations dans l'éditeur de rôles, mais ne restreint plus le sélecteur de rôle initial. Choisir un rôle de gestion ou Administrateur accorde la même portée aux nouveaux comptes ; la vue affiche cette portée et l'inclut dans la confirmation.

La consultation privée de configuration livre les rôles dans la même réponse : une seule requête HTTP, sans consultations supplémentaires lors du changement de langue ou de l'ouverture du sélecteur. Elle ajoute une lecture D1 de rôles aux deux lectures existantes de cette vue. Les autres vues conservent leur budget de consultations.

## Extension

`src/server/services/registration-hook.ts` expose `onUserRegistered(user, context)`. Le noyau ne crée pas de profils de CRM, CMS ou autres entreprises. La fonction reçoit uniquement l'identité et une clé stable `registration:<userId>` ; elle ne reçoit pas d'autorisations mutables.

La table `registration_event` évite les livraisons dupliquées complètes et réclame les exécutions via une mise à jour conditionnelle. Une livraison échouée reste en attente et une livraison bloquée peut être reprise après cinq minutes. Un administrateur peut réessayer via `POST /api/private/hooks/:userId/retry`.

La sémantique est **au moins une fois** : un processus pourrait se terminer après avoir produit un effet et avant de marquer l'événement comme complété. Le consommateur doit rendre ses écritures idempotentes avec `context.idempotencyKey`, par exemple via un index UNIQUE. Nous ne promettons pas d'effets externes exactement une fois. Les erreurs du point d'extension n'accordent pas d'autorisations supplémentaires ni ne bloquent la persistance de l'identité vérifiée.

Pour étendre un CMS, créez une table de profil propre avec `user_id UNIQUE`, insérez avec `ON CONFLICT DO NOTHING` et conservez le contrôle des autorisations en dehors du callback. L'exemple ne s'exécute pas automatiquement et n'appartient pas au noyau TBA.
