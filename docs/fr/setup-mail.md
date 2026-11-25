# <picture><img src="../assets/icons/mail.svg" width="28" height="28" alt=""></picture> Configuration de la messagerie

<p align="center"><a href="../en/setup-mail.md" lang="en">English</a> | <a href="../es/setup-mail.md" lang="es">Español</a> | <a href="../pt/setup-mail.md" lang="pt">Português</a> | <a href="../de/setup-mail.md" lang="de">Deutsch</a> | <strong>Français</strong> | <a href="../it/setup-mail.md" lang="it">Italiano</a> | <a href="../zh/setup-mail.md" lang="zh">简体中文</a> | <a href="../ja/setup-mail.md" lang="ja">日本語</a> | <a href="../hi/setup-mail.md" lang="hi">हिन्दी</a> | <a href="../ar/setup-mail.md" lang="ar">العربية</a></p>

[Documentation technique](README.md) | [Présentation du projet](../README.fr.md)

> [!NOTE]
> Cloudflare Email Sending fonctionne sur Workers avec la liaison `EMAIL`. Resend et la boîte locale fonctionnent sur Workers et Node.js. L’intégration Wavicc est prévue.

Le setup accepte `--mail local`, `--mail resend` et `--mail cloudflare`. Le courrier local utilise une `APP_URL` locale et `npm run mail:dev`. Resend nécessite `RESEND_API_KEY` et `MAIL_FROM`. Cloudflare réutilise l’adaptateur existant avec un binding `send_email` nommé `EMAIL`, un `MAIL_FROM` autorisé et un domaine configuré pour l’envoi. Le setup vérifie localement, sans créer de ressources ni vérifier un domaine distant. La configuration peut attendre : le mode interactif demande confirmation, le mode non interactif continue avec une liste de tâches. Aucun binding, expéditeur ou secret n’est inventé ; l’envoi nécessite la configuration. Garder les secrets hors de Git. Wavicc reste l’intégration future privilégiée avec `WAVICC_API_KEY` comme emplacement réservé. Voir le [setup e-mail](setup-mail.md).

```bash
npm run setup -- --mail local
npm run setup -- --mail resend
npm run setup -- --mail cloudflare
```

```jsonc
// Merge into the existing configuration; preserve its other bindings and vars.
{
  "send_email": [{ "name": "EMAIL" }],
  "vars": { "MAIL_FROM": "sender@example.com" }
}
```
