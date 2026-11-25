# <picture><img src="../assets/icons/users.svg" width="28" height="28" alt=""></picture> Registration, Approvals, and Extensions

<p align="center"><strong>English</strong> | <a href="../es/registration.md" lang="es">Español</a> | <a href="../pt/registration.md" lang="pt">Português</a> | <a href="../de/registration.md" lang="de">Deutsch</a> | <a href="../fr/registration.md" lang="fr">Français</a> | <a href="../it/registration.md" lang="it">Italiano</a> | <a href="../zh/registration.md" lang="zh">简体中文</a> | <a href="../ja/registration.md" lang="ja">日本語</a> | <a href="../hi/registration.md" lang="hi">हिन्दी</a> | <a href="../ar/registration.md" lang="ar">العربية</a></p>

[Technical documentation](README.md) | [Project overview](../../README.md)

> [!NOTE]
> The initial mode is `closed`. No public registration link is displayed, and the API rejects registration requests. Administrators can create accounts that then verify their email when logging in.

In `approval`, the person requests an OTP and confirms their email. TBA creates a pending account without a role and a single request, revokes any provisional session, and notifies administrators via the email adapter. Approval requires choosing an explicit role; rejection does not enable access. Both actions are audited. Upon approval, the user is notified.

In `open`, the email is verified before activating the account. An administrator chooses the initial role from Access and Registration among **all configured roles**, including custom roles, Editor, and Administrator. The choice is saved in `settings.public_role_id`, without schema changes. The server checks that the role exists and that the administrator explicitly confirms open registration. The registering visitor never chooses or sends an effective role: the one configured on the server is applied when completing email verification.

The selector appears only when choosing Open Registration. It reuses the app menu, shows the role permissions (or full administrative control), retains the choice when changing language, and requires re-confirmation if the role changes. If there are no roles or the configured one is no longer available, it explains the situation and prevents saving an empty selection. The texts are translated into ten languages.

The changes only affect new registrations. Previous accounts and requests retain their status and role. A previous pending request is never approved because the mode changes. Each completion re-consults the current mode and role; if there is no valid role, it does not enable the account. Email OTP, sending limits and attempts, configuration permissions, and auditing are maintained.

The public role brand with basic access (`isPublic`) retains its minimum permission validation in the role editor but no longer restricts the initial role selector. Choosing a management or Administrator role grants that same scope to new accounts; the view shows that scope and includes it in the confirmation.

The private configuration query delivers the roles in the same response: a single HTTP request, without additional queries when changing language or opening the selector. It adds a role catalog read to the two existing reads of that view. The other views retain their query budget.

## Extension

`src/server/services/registration-hook.ts` exposes `onUserRegistered(user, context)`. The core does not create CRM, CMS, or other business profiles. The function receives only identity and a stable key `registration:<userId>`; it does not receive mutable permissions.

The `registration_event` table avoids duplicate completed deliveries and claims executions through a conditional update. A failed delivery remains pending, and a stuck delivery can be resumed after five minutes. An administrator can retry via `POST /api/private/hooks/:userId/retry`.

The semantics are **at least once**: a process could finish after producing an effect and before marking the event as completed. The consumer must make their writings idempotent with `context.idempotencyKey`, for example, using a UNIQUE index. We do not promise exact external effects once. Errors in the extension point do not grant additional permissions or block the persistence of the verified identity.

To extend a CMS, create a own profile table with `user_id UNIQUE`, insert with `ON CONFLICT DO NOTHING`, and retain permission control outside the callback. The example does not run automatically and does not belong to the TBA core.
