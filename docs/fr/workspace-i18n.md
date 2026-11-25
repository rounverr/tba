# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> Langue et sélecteur du panneau

<p align="center"><a href="../en/workspace-i18n.md" lang="en">English</a> | <a href="../es/workspace-i18n.md" lang="es">Español</a> | <a href="../pt/workspace-i18n.md" lang="pt">Português</a> | <a href="../de/workspace-i18n.md" lang="de">Deutsch</a> | <strong>Français</strong> | <a href="../it/workspace-i18n.md" lang="it">Italiano</a> | <a href="../zh/workspace-i18n.md" lang="zh">简体中文</a> | <a href="../ja/workspace-i18n.md" lang="ja">日本語</a> | <a href="../hi/workspace-i18n.md" lang="hi">हिन्दी</a> | <a href="../ar/workspace-i18n.md" lang="ar">العربية</a></p>

[Documentation technique](README.md) | [Présentation du projet](../README.fr.md)

> [!TIP]
> L’anglais est la langue de base du code et de l’assistant setup. Les dix traductions et polices locales sont incluses. `npm run setup -- --languages en,pt` active uniquement anglais et portugais, sans installer de paquets ni supprimer les autres traductions. Sans `--languages`, la sélection reste inchangée ; sans liste existante, les dix sont activées. L’anglais reste actif comme repli des traductions. `--locale en` définit la langue par défaut et accepte toute langue activée. La priorité est préférence enregistrée, langue compatible du navigateur, puis langue par défaut configurée. Le changement ne recharge pas la page et conserve les formulaires ; l’arabe garde RTL.

Connexion, pages publiques, administration, dialogues, validations et e-mails proposent `en`, `es`, `pt`, `de`, `fr`, `it`, `zh`, `ja`, `hi` et `ar`. La priorité est la préférence valide enregistrée (`tba-language`), la première langue compatible de `navigator.languages`/`navigator.language`, puis l’anglais. Les variantes `es-AR`, `pt-BR` et `en-GB` sont normalisées.

Le sélecteur est un bouton de 48 × 38 px avec le symbole de langues et une flèche. Son menu affiche les dix noms natifs, codes courts et l'option actuelle marquée, avec des couleurs et des surfaces du thème. La largeur et la hauteur sont limitées à l'espace disponible. `ui/select.tsx` est réutilisé, en conservant le select natif caché pour la sérialisation et en ajoutant du contenu de déclencheur, d'en-tête et de dimensions optionnelles. Les autres selects conservent leurs valeurs et leur fonctionnement.

Le menu prend en charge les flèches, Début/Fin, l'écriture par initiale, Entrée, Échappement, Tab et la fermeture externe. Le focus revient au contrôle lors du choix ou de l'annulation avec Échappement. Le glyphe de langue reste stable et seule la flèche tourne. Le mouvement réduit, le clavier, le lecteur d'écran, les appareils mobiles et RTL sont respectés. Le sélecteur n'apparaît que dans Login et dans l'en-tête de l'application. Les dialogues et les formulaires héritent de cette préférence et n'incluent pas de contrôles de langue propres.

## Textes et données

`AuthI18n` réutilise le contexte existant pour le panneau. `page=panel` configure la langue et la direction, tandis que Admin conserve ses titres par vue et le gardien d'autorisation existant. La sortie initiale du panneau reste vide jusqu'à autorisation.

`src/lib/i18n/panel/*.json` centralise les catalogues du panneau. `panel.ts` applique le fallback et les paramètres ; `panel-sources.json` lie les étiquettes canoniques existantes et les messages publics du serveur avec des clés traduisibles. `use-panel.ts` offre le format aux composants. Les textes dynamiques de confirmation et de téléchargement conservent les clés et les paramètres, de sorte qu'ils changent de langue même s'ils sont ouverts.

`src/lib/i18n/config.ts` définit langues et direction. `messages/*.json` et `panel/*.json` contiennent les catalogues ; `catalog.ts`, `panel.ts` et le contexte gèrent clés, paramètres et fallback. Gardez les dix catalogues complets. Les erreurs inconnues utilisent un message public traduit. Les noms, adresses, rôles personnalisés et codes ne se traduisent pas.

`X-Auth-Language` choisit une langue activée pour l’e-mail, jamais les autorisations. Sans en-tête ou préférence valide, le défaut configuré s’applique (anglais initialement). Une préférence désactivée revient aussi au défaut. Les clés manquantes utilisent l’anglais. L’accès/inscription confirmé et le sélecteur mémorisent la préférence dans `verification` (`mail-language:<userId>`) ; les avis différés utilisent la langue du destinataire. Changer de langue ne renvoie pas les codes et ne change ni expiration, ni essais, ni vérification. Les anciens textes d’erreur restent reconnus.

Le sélecteur se trouve à la connexion et dans l’en-tête de l’application. Les dialogues héritent de la langue sans sélecteur propre. React actualise les textes sans rechargement ni navigation, en conservant formulaires, session et vue. Un changement dans le panneau envoie aussi `POST /api/private/profile/language` pour les e-mails ultérieurs, sans recharger les données administratives. Le blocage du stockage n’empêche pas la traduction durant la visite.

## RTL et polices

L'arabe place la barre latérale et les marges du panneau à droite, adapte l'image de bienvenue, les flèches, les contrôles, les tableaux et les dialogues. Les adresses électroniques, les clés et les codes conservent LTR. Les boutons longs et les lignes de sécurité sont ajustés sur les écrans petits. Les menus utilisent les polices locales des dix langues. Les sous-ensembles CJK incorporent également les caractères des nouveaux catalogues du panneau, via `scripts/build-auth-fonts.py`.

## Fichiers et vérification

Les tests de langue utilisent Better Auth et D1 locaux ou des API simulées. Voir [implémentation de l'accès multilingue](auth-i18n.md).

L’anglais reste inclus comme repli. Les autres catalogues de connexion et du panneau utilisent des imports dynamiques et un cache mémoire par module. Le focus clavier ou pointeur précharge uniquement l’option visée ; ouvrir le menu ne charge pas toutes les langues. Le changement attend les catalogues complets et conserve formulaires, session et navigation. Le cache évite le réseau ; le dernier choix prévaut. Un échec initial affiche l’anglais, un échec ultérieur conserve la langue actuelle. E-mails et métadonnées du build utilisent des catalogues complets côté serveur. Voir le [chargement des langues](language-loading.md).
