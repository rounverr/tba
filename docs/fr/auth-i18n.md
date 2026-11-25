# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> Langues de l'accès public

<p align="center"><a href="../en/auth-i18n.md" lang="en">English</a> | <a href="../es/auth-i18n.md" lang="es">Español</a> | <a href="../pt/auth-i18n.md" lang="pt">Português</a> | <a href="../de/auth-i18n.md" lang="de">Deutsch</a> | <strong>Français</strong> | <a href="../it/auth-i18n.md" lang="it">Italiano</a> | <a href="../zh/auth-i18n.md" lang="zh">简体中文</a> | <a href="../ja/auth-i18n.md" lang="ja">日本語</a> | <a href="../hi/auth-i18n.md" lang="hi">हिन्दी</a> | <a href="../ar/auth-i18n.md" lang="ar">العربية</a></p>

[Documentation technique](README.md) | [Présentation du projet](../README.fr.md)

> [!TIP]
> L’anglais est la langue de base du code et de l’assistant setup. Les dix traductions et polices locales sont incluses. `npm run setup -- --languages en,pt` active uniquement anglais et portugais, sans installer de paquets ni supprimer les autres traductions. Sans `--languages`, la sélection reste inchangée ; sans liste existante, les dix sont activées. L’anglais reste actif comme repli des traductions. `--locale en` définit la langue par défaut et accepte toute langue activée. La priorité est préférence enregistrée, langue compatible du navigateur, puis langue par défaut configurée. Le changement ne recharge pas la page et conserve les formulaires ; l’arabe garde RTL.

L'accès public prend en charge l'anglais (`en`), l'espagnol (`es`), le portugais (`pt`), l'allemand (`de`), le français (`fr`), l'italien (`it`), le chinois simplifié (`zh`), le japonais (`ja`), l'hindi (`hi`) et l'arabe (`ar`). L'anglais est la langue par défaut.

## Audit et portée

L'application utilise Astro statique avec des îles React et une authentification sans mot de passe via Better Auth. Il n'y avait pas de couche i18n. Les textes étaient en Login, les pages publiques et les messages du serveur. On réutilise l'état React, les composants actuels et les routes existantes, sans ajouter de packages npm.

On traduit l'inscription, l'enregistrement ouvert ou avec approbation, la vérification de courrier, OTP, MFA, codes de récupération, aide, avertissements de réauthentification, erreurs, validations, chargement, retour de Google, accès refusé et page inexistante. Les courriers OTP d'accès sont envoyés dans la langue choisie. Il n'y a pas d'écrans de mot de passe, de récupération ou de réinitialisation de mot de passe : ce mécanisme n'est pas ajouté. L'extension ultérieure inclut également le panneau administratif et ses paramètres ; voir [sélecteur et panneau multilingue](workspace-i18n.md).

## Résolution et chargement initial

`src/lib/i18n/config.ts` centralise les dix langues, les noms natifs, la direction et la clé `tba-language`. La priorité est la préférence valide de `localStorage`, la première langue compatible de `navigator.languages`, `navigator.language` et, enfin, l'anglais. On normalise les majuscules, les traits d'union et les variantes régionales, comme `es-AR`, `pt-BR` ou `en-GB`.

`Base.astro` exécute le même résolveur de manière synchrone dans l'en-tête. Il configure `lang`, `dir` et le titre avant d'afficher le contenu. Le HTML statique utilise l'anglais pour correspondre à la première hydratation ; `data-auth-pending` cache l'île jusqu'à ce que `AuthI18n` applique la traduction via `useLayoutEffect`. Ainsi, on ne voit pas un éclair d'une autre langue. Les accès bloqués au stockage sont capturés et on utilise le navigateur ou l'état de la visite.

Le sélecteur compact utilise un bouton avec le symbole de langue et un menu propre. Il a un nom accessible traduit et des options avec des noms natifs, `lang` et `dir`. Le sélecteur natif caché conserve la sérialisation. Le changer met à jour le contexte React et persiste la préférence. Il ne recharge pas, ne navigue pas ni ne consulte l'API. Il ne remonte pas le formulaire : il conserve le courrier, le code, l'intention d'enregistrement, l'étape, la confiance du dispositif, l'attente de réenvoi, les erreurs et l'opération en cours. Les erreurs conservent les clés, donc elles changent également de langue tandis qu'elles sont visibles. La langue choisie persiste entre les visites ; les champs et les codes ne sont pas stockés dans le stockage.

## Catalogues, erreurs et courriers

`src/lib/i18n/messages/*.json` contient 112 clés par langue. `catalog.ts` type les clés, interpole les paramètres et résout les manquants en anglais. Une clé inconnue affiche une erreur publique traduite, jamais la clé interne. Les marques, les courriers entrés, les codes et les noms d'organisation sont des données, pas des traductions.

`errors.ts` transforme les messages publics existants et les codes connus de l'API en clés de présentation. Les erreurs inconnues n'exposent pas les détails du serveur. Les champs conservent les restrictions et la validation du serveur ; on présente des validations locales traduites au lieu de messages natifs dépendants de la langue installée sur le navigateur. Les chiffres arabes, perses, devanagari et de largeur complète d'OTP sont normalisés aux mêmes six chiffres ASCII. Les codes de récupération sont maintenus intacts.

`X-Auth-Language` choisit une langue activée pour l’e-mail, jamais les autorisations. Sans en-tête ou préférence valide, le défaut configuré s’applique (anglais initialement). Une préférence désactivée revient aussi au défaut. Les clés manquantes utilisent l’anglais. L’accès/inscription confirmé et le sélecteur mémorisent la préférence dans `verification` (`mail-language:<userId>`) ; les avis différés utilisent la langue du destinataire. Changer de langue ne renvoie pas les codes et ne change ni expiration, ni essais, ni vérification. Les anciens textes d’erreur restent reconnus.

Turnstile reçoit la langue sélectionnée, avec `zh-CN` pour le chinois simplifié. Son widget se recrée lors du changement pour mettre à jour son interface. Cela invalide la vérification CAPTCHA précédente et nécessite la vérification du widget mis à jour ; il conserve les autres données du formulaire et les contrôles du serveur.

## Conception, RTL et polices

L'arabe configure `dir=rtl`, inverse les flèches de navigation et ajuste le panneau d'image, la fermeture d'aide et les alignements. Les courriels et les codes utilisent LTR et l'isolement bidirectionnel. Les en-têtes acceptent plusieurs lignes, les textes longs sont ajustés et les étiquettes ne dépendent pas de largeurs fixes. L'identité, le thème et l'adaptation mobile existants sont maintenus.

Les polices WOFF2 sont servies depuis `public/fonts`, avec la politique `font-src 'self'` existante. Inter continue pour les langues latines. Les familles TBA Arabic et TBA Devanagari conservent les glyphes des polices Noto originales. TBA Chinese et TBA Japanese incluent les caractères des catalogues chinois, japonais et anglais et les noms du sélecteur. L'extension inclut également les catalogues du panneau ; les polices du système couvrent les autres caractères de données introduits. Seules les polices nécessaires au navigateur sont téléchargées. Il n'y a pas de requêtes aux fournisseurs de polices.

Les polices proviennent de Noto Sans Arabic, Noto Sans Devanagari et Noto Sans CJK, avec licence [SIL OFL 1.1](../licenses/noto-fonts.txt). Les familles modifiées ont été renommées. Pour les régénérer après avoir ajouté des caractères aux catalogues CJK, exécuter `/usr/bin/python3 scripts/build-auth-fonts.py /usr/share/fonts` dans un environnement de maintenance avec Noto, fontTools et Brotli. C'est un outil facultatif : le build et l'application n'exigent pas Python ni de nouvelles dépendances. La redistribution conserve la licence dans le référentiel.

## Fichiers de l'implémentation

- Configuration, résolveur, catalogues et erreurs : `src/lib/i18n/config.ts`, `catalog.ts`, `errors.ts` et les dix JSON de `messages/`.
- Interface : `AuthI18n.tsx`, `AuthPublic.tsx`, `Login.tsx`, `Brand.tsx`, `ThemeToggle.tsx` et `Turnstile.tsx` dans `src/components/`.
- Chargement et chemins publics : `src/layouts/Base.astro`, `src/pages/index.astro`, `login.astro`, `login/complete.astro`, `denied.astro` et `404.astro`.
- Styles et polices : `src/styles/global.css`, `public/fonts/`, `scripts/build-auth-fonts.py` et `docs/licenses/noto-fonts.txt`.
- Présentation des requêtes et courriels : `src/lib/utils.ts`, `src/server/auth.ts`, `src/server/index.ts` et `src/server/services/auth-mail.ts`.
- Tests : `tests/auth-i18n.test.ts`, `tests/auth.test.ts` et `tests/browser/auth-i18n.mjs`. Documentation : ce fichier, `docs/validation.md`, `README.md` et `CHANGELOG.md`.

## Validation

`tests/auth-i18n.test.ts` vérifie les dix catalogues, paramètres, variantes, priorité, résolveur de l'en-tête, fallback, direction, erreurs, normalisation et textes de courriel. L'intégration dans `tests/auth.test.ts` livre OTP dans dix langues avec Better Auth et D1 locales, et vérifie l'utilisation unique. Il n'envoie pas de courriels réels.

`tests/browser/auth-i18n.mjs` utilise un Playwright déjà disponible et des API simulées. Il s'exécute contre le build servi localement :

```sh
AUTH_TEST_URL=http://127.0.0.1:4321 \
PLAYWRIGHT_MODULE=/ruta/a/playwright/index.js \
node tests/browser/auth-i18n.mjs
```

Il inclut la détection avant l'hydratation, l'absence de clignotement, la persistance, le changement immédiat sans navigation ni requêtes, la conservation du formulaire et du chargement en cours, les dix langues d'entrée/inscription/OTP/MFA/récupération, les erreurs, l'aide, les pages publiques, le stockage bloqué, CAPTCHA, les avertissements de réauthentification et les largeurs de 320, 390, 768 et 1440 px. La vérification visuelle supplémentaire vérifie les polices réelles et le bureau/mobile pour l'arabe, l'hindi, le chinois, le japonais, l'allemand et le français.

L’anglais reste inclus comme repli. Les autres catalogues de connexion et du panneau utilisent des imports dynamiques et un cache mémoire par module. Le focus clavier ou pointeur précharge uniquement l’option visée ; ouvrir le menu ne charge pas toutes les langues. Le changement attend les catalogues complets et conserve formulaires, session et navigation. Le cache évite le réseau ; le dernier choix prévaut. Un échec initial affiche l’anglais, un échec ultérieur conserve la langue actuelle. E-mails et métadonnées du build utilisent des catalogues complets côté serveur. Voir le [chargement des langues](language-loading.md).
