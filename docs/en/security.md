# <picture><img src="../assets/icons/shield.svg" width="28" height="28" alt=""></picture> Authentication and Security

<p align="center"><strong>English</strong> | <a href="../es/security.md" lang="es">Español</a> | <a href="../pt/security.md" lang="pt">Português</a> | <a href="../de/security.md" lang="de">Deutsch</a> | <a href="../fr/security.md" lang="fr">Français</a> | <a href="../it/security.md" lang="it">Italiano</a> | <a href="../zh/security.md" lang="zh">简体中文</a> | <a href="../ja/security.md" lang="ja">日本語</a> | <a href="../hi/security.md" lang="hi">हिन्दी</a> | <a href="../ar/security.md" lang="ar">العربية</a></p>

[Technical documentation](README.md) | [Project overview](../../README.md)

<a id="sql-security-en"></a>
## SQL and database security

> [!IMPORTANT]
> Keep instructions and external values separate. Use D1 `prepare().bind()`, SQLite prepared statements, PostgreSQL bound parameters and Drizzle predicates. For example, `command('SELECT id FROM "user" WHERE email=?', email)` and `eq(user.email, email)` pass the email as data. Interpolating it into a SQL string or passing it to `sql.raw()` turns input into SQL. Stored values and values from external services follow the same rule when reused.

Validate filters with Zod or a typed parser. Select table names, columns, operators and directions from mappings maintained by the server. Bind the search pattern after escaping literal `%`, `_` and the escape character when the feature calls for literal `LIKE` matching. Preserve Unicode and legitimate punctuation. Keep SQL errors, parameter values and credentials out of responses and logs. Review authorization and query cost separately before adding a new module. Add real-engine regression tests for any new SQL builder.

The PostgreSQL adapter converts `?` outside ordinary single-quoted literals and double-quoted identifiers into ordered `$n` parameters. Doubled quote delimiters are supported. The pool sets `standard_conforming_strings=on`. The portable path expects one statement, optionally with a final semicolon, and exactly one value per marker. Comments, dollar quotes, explicit native markers, escape-prefixed strings and JSON question-mark operators are outside this grammar. Use PostgreSQL JSON functions such as `jsonb_exists` for this logic, or a fixed native statement with bound parameters. Trusted migration files use the native PostgreSQL connection.

<a id="postgresql-runtime-privileges"></a>
### PostgreSQL operational grants

Use a dedicated database. Let a non-login schema owner own the objects and a deployment-only migrator run migrations with the owner's rights. Configure the application with a separate login that owns no objects and lacks superuser, role creation and database creation privileges. Grant it access only to the TBA database and schema. Review inherited access through `PUBLIC`. Revoke public `CREATE` on the TBA schema where present. Restrict access to other databases in `pg_hba.conf` or through those databases’ `CONNECT` grants. Keep the application search path limited to trusted schemas.

The following grants apply to the current schema after migration. Execute them as the owner or an authorized grantor, with the TBA schema on the path. Replace `tba_db`, `public` and `tba_runtime` with the installation names.

```sql
GRANT CONNECT ON DATABASE tba_db TO tba_runtime;
GRANT USAGE ON SCHEMA public TO tba_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "user", session, account, assurance, rate_limit, registration,
  registration_event, throttle, trusted_device, two_factor, verification
  TO tba_runtime;
GRANT SELECT, INSERT, UPDATE ON role TO tba_runtime;
GRANT SELECT, INSERT ON audit TO tba_runtime;
GRANT SELECT, UPDATE ON settings TO tba_runtime;
GRANT SELECT, UPDATE (active_count) ON tba_admin_guard TO tba_runtime;
GRANT SELECT ON tba_migration TO tba_runtime;
GRANT EXECUTE ON FUNCTION tba_admin_delta(bigint) TO tba_runtime;
```

Identity columns supply their values during inserts. The application does not call `nextval` directly. The guard trigger calls `tba_admin_delta`, and the role trigger updates the authorization version in `settings`. Reserve migration, bootstrap and schema ownership for the deployment role.

In standalone Node, the socket determines client identity by default. Configure only explicitly trusted proxies, have the edge sanitize forwarding headers, and keep `dist` and database directories under deployment control. [Standalone security settings](database-engines.md)

Basic lists use a fixed order, project the necessary fields explicitly and bind the limit and offset. Application error logs record the HTTP method and route template.

The database stores rate limits and versioned session authorization across all three engines.

## Email OTP

The login informs 403 with `ACCESS_NOT_ENABLED` when the email does not correspond to an enabled account and does not send OTP or create users. The interface keeps the form and shows the notice to review the address or request access. The same message is used for non-existent, pending, suspended, or deactivated accounts, without revealing their specific status. This policy, requested to guide the person, allows distinguishing enabled accounts from those without access; it replaces the previous uniform login response. The limits by IP and email are preserved. The registration maintains its uniform response and its modality controls. Eligible sending is completed using `waitUntil`. The adapter uses the provider configured in `MAIL_PROVIDER`: Cloudflare Email Sending on D1, Resend on Worker and Node, or the local inbox for development. The selection is implemented in `services/mail.ts`.

The code has six digits, expires in five minutes, and Better Auth stores it with a hash. It is limited to five attempts per OTP, ten checks per email every fifteen minutes, and one sending per email per minute. There is also a limit of twenty requests per IP every fifteen minutes and authentication provider limits. The limits live in the database and the throttle keys are stored with SHA-256. OTPs and tokens are not printed in logs.

`/access/verify` explicitly distinguishes between login and registration. Login uses `disableSignUp:true`, requires an already existing active account, and does not grant access to pending or suspended accounts. A used or expired OTP does not generate a new session.

## Google OAuth

It is only enabled when `GOOGLE_ENABLED="true"` and both secrets exist. It requires `email_verified` from the Google profile and disables user creation from OAuth. The result goes through the same barrier of state, session, permissions, and MFA as Email OTP. Callback: `https://app.example.test/api/auth/callback/google`. It registers that exact URI in Google Cloud and configures the consent screen. This flow requires a real external test after configuring the credentials.

## Sessions and Origin

Sessions last eight hours and are checked in the configured database without cookie caching. The session stores a versioned authorization snapshot in the database after MFA when required. Each protected operation validates the current session and version. A current snapshot supplies permissions without another role lookup. A stale panel mutation can receive `409 authorization_changed` before it writes. The panel then refreshes once and retries only for the same user. HttpOnly, SameSite=Lax, and Secure cookies are used in production. Each mutation requires an `Origin` equal to `APP_URL`, JSON, and a body of up to 16 KiB. HTTPS requests are mandatory outside of localhost. There is no open CORS or tokens in localStorage; only visual theme and menu preferences are stored there.

The gateway only exposes the public handler of Better Auth, the Google and logout routes. The OTP, code inspection, MFA, and signup methods cannot be invoked from outside the server policies. Better Auth response bodies containing tokens are not delivered to the frontend: only their cookies and strictly necessary data are propagated.

Security headers and CSP are included. The CSP allows necessary inline scripts/styles for Astro hydration and visual tokens; it does not allow objects or frames from sites other than Turnstile. If a derivative removes inline scripts, it can harden it using hashes/nonces.

## Administrative Rendering before Authorization

The eight administrative documents are generated without visual structure of the panel. The initial output of React is also empty: neither menu, header, view title, forms, session warnings or loading indicators are mounted before receiving a private authorized response. A pending redirect keeps that empty output. The confirmed result of an email change is displayed as a separate public receipt, because that operation closes sessions; it does not remount the panel. It is a correction of the presentation of the static container; private data was already protected by the API. It does not replace its authentication or add readings.

The 403 rejections and 503 failures when loading a view without confirmed access only show a public message and recovery options, without the panel. When saving a page in BFCache, its structure is hidden synchronously and dialogs are closed so that the snapshot does not repaint it during revalidation. Only an authorized response shows it again.

## Return to login due to session loss

A 401 in a panel read or action invalidates its presentation cache, aborts pending reads, and clears private data, QR, seeds, and transient codes before replacing the URL with `/login/`. Successful logout uses the same cleaning and navigation by replacement. Reopening an administrative link with the session closed follows this flow automatically.

A restoration of the document from BFCache requires a current read from the server, even if the previous visual cache was still valid. The `persisted` indicator of `pageshow` is checked: normal loads and internal navigation do not receive an additional query. A 403 due to lack of permissions is not converted to logout; code `MFA_REQUIRED` directs to the MFA challenge and `RECENT_AUTH_REQUIRED` preserves its recent identity flow. A 503 failure is also not interpreted as a closed session. Destinations are fixed local routes. APIs continue to respond with JSON 401/403, without HTTP redirects that break clients or hide errors.

## Voluntary MFA

Profile → Security uses the official Two Factor plugin with `allowPasswordless:true`. There is no second factor by email. Activation accepts an input of less than five minutes or a confirmation email within the app, linked to the current session. It generates an encrypted secret and confirms a TOTP before activating the second factor. The QR is generated in the browser, without sending the secret to third parties. The same configuration key is copied when clicked and can be manually loaded as TOTP in the authenticator application. The interface eliminates the QR and configuration key from its state when closing the dialog or completing activation.

The five-minute age is counted from the input that created the session, not from the last activity. The general session still lasts eight hours. Except for MFA enrollment, which allows the on-screen confirmation described below, if a sensitive operation exceeds that deadline, the API responds with 403 and `RECENT_AUTH_REQUIRED`; the interface explains the cause and offers to confirm identity in `/login/?reauth=1`. A new OTP and second factor are requested when corresponding, and it returns to `/admin/security/`. For profile changes, `/login/?reauth=profile` is used and it returns to `/admin/profile/`. Destinations are chosen from a fixed list: it does not accept external return URLs or eliminate the recent first-factor check. The sensitive operation is not executed automatically when returning.

The plugin does not automatically intercept all passwordless methods in the installed version. TBA maintains a table `assurance`, linked to the session, user, and their MFA version. Any private API rejects a session that has not completed the second factor. Email OTP and OAuth first produce a pending session from that barrier. Changing the state in React or calling an API directly does not allow bypassing it.

The gateway adds a budget of five second-factor attempts per user every five minutes, even when Better Auth receives an authenticated first-factor session. Sensitive changes require a recent first factor and a new TOTP confirmation or recovery code.

## Trusted devices

Revocation from Security is confirmed within the app with a new TOTP or recovery code and the same five-attempt limit. It does not require returning to Login due to the age of entry: it requires a valid session, completed MFA, and new second-factor verification. After deleting all trusted devices and incrementing the MFA version, only the session verification that just confirmed the code is reset. The other sessions must complete MFA again. MFA remains active and does not generate a new trusted device. Disabling MFA and other sensitive operations maintain their requirements.

The official mode `trustDevice` of the plugin does not satisfy the verification of all passwordless flows in this version on its own. That is why a random 256-bit token generated with Web Crypto is used, stored in an HttpOnly, Secure, and SameSite=Strict cookie. In D1, only the hash of the token, user, MFA version, and absolute expiration of thirty days are stored. IP or User-Agent is not trusted.

Trust is only created after verifying the second factor and by explicit selection. The checkbox appears in the email OTP, Authenticator, and recovery steps and maintains the selection when changing the method or re-sending the email. The selection during OTP only expresses a preference for the MFA step: it does not create trust by itself nor affects accounts without MFA. It never replaces the first factor nor is renewed automatically. Revoking trust or disabling MFA eliminates the tokens and increments the MFA version. Revoking sessions or suspending a user cuts off existing access. In localhost, Secure is omitted and the prefix `__Host-` is allowed for HTTP development.

## Recovery

When revoking trusted devices in HTTPS, the cookie is deleted with the appropriate security attributes. Disabling MFA revokes trust and sessions according to the rules described in this guide.

The ten codes are encrypted by Better Auth. They are displayed when generated, and each one can be used once, always after the first factor. Regeneration invalidates the previous ones. The UI allows copying them or downloading them in a `.txt` file generated locally using Blob. The file includes private storage instructions and reminds that email is still necessary. The user must save that file on their own; the application revokes the temporary URL and does not send it to any server. The UI eliminates them from memory when closing their view; they are not persisted in the browser. Camera, SMS, and second email permissions are not necessary.

## RBAC and auditing

Access is denied by default. Each private request validates the active session and global authorization version. Permissions come from the versioned session snapshot. When its version is stale, the server reloads the role and rebuilds the snapshot. Administrative changes enforce endpoint permissions and their administrator guard. The revocation endpoint separately requires `users.edit`. Triggers protect the last active administrator.

The audit logs actor, action, resource, result, and date. It does not store request bodies, secrets, codes, or tokens. Retention must be defined by application; a cleanup program for sessions, checks, throttle, expired trust, and audit with an explicit task according to their needs. The first version does not install cronjobs or additional resources.

## Permission and activity presentation

Permission and event identifiers remain on the server and in the database. The panel translates their labels into the selected language. New roles receive unique identifiers, and existing roles keep their identifiers.

The audit endpoint still requires `audit.read` and resolves the user's email or associated role name through read joins. If the resource no longer exists, a neutral label is displayed. Resource describes the affected element (session, second factor, recovery, profile, or trust), instead of repeating the actor's email. In administrative actions, it keeps the name of the other affected person, or their email if there is no name; roles and configuration show their readable name. Names are resolved through existing read joins, without modifying events. Original references are kept in the database for traceability; the audit interface does not show technical codes or identifiers in expandable details. The history is not modified or rewritten.

Selectors use a combobox with options in a popover and keep a native hidden `select` to serialize and validate forms. The menu is positioned according to available space without being cut off by the dialog. It allows arrows, Home/End, selection with Enter, Escape, and Tab; closes when clicking outside, resizing, or moving the container. Required fields focus the selector and show a validation message. No dependencies were added. Autocomplete respects the colors of the light or dark theme.

## Access email change

The profile offers a guided flow through the Email OTP plugin from Better Auth: `POST /api/private/profile/email/request` sends the code to the new address and `POST /api/private/profile/email/confirm` verifies and applies the change. Both require an active session, complete MFA when applicable, and a first factor of less than five minutes. Confirmation also requires a new Authenticator code or recovery if the account has MFA, even with a trusted device. The API reports `mfaRequired` when requesting the email and rejects a confirmation without a second factor with `MFA_CONFIRMATION_REQUIRED`, before consuming the email OTP. Origin, JSON, size, and frequency controls are kept. The plugin's raw endpoints remain blocked by the gateway.

A hash-based OTP is used, with a five-minute validity and a maximum of five attempts, linked to the user and the new address. An already used address does not receive a code or replace another account. The current address remains valid until verification is complete. No email is manually marked as verified: the plugin's official operation does so only after validating the OTP.

Better Auth verifies and consumes the email code. The persistence layer then applies the user update, MFA version increment, trusted-device and session revocation, and audit entry atomically. D1 uses a batch, and SQLite and PostgreSQL use transactions. If the write fails, request a new code.

Once that batch is confirmed, a subsequent failure to prepare the Better Auth response is not reported as a failed change. There is no need to issue a replacement cookie because the sessions are already revoked. The notification to the previous address is sent outside the batch via `waitUntil`; its failure is logged separately and does not alter the success of the change. Error diagnostics only log phase, method, and path tags, without email, OTP, MFA, cookies, or request bodies. The person must log in again with the new email and their MFA. The user identifier, role, status, TOTP secret, and remaining recovery codes are preserved. If one is used to confirm the change, it is consumed as in any verification. The audit logs the event and the user identifier, without codes or request bodies. No migrations or new tables are required.

Basic user, request and audit lists remain available with bounded navigation and server-side permissions. Advanced table engines and Excel export are outside the base template; each derivative implements them if needed. See [template scope](template-scope.md).

<a id="email-verification-before-mfa-en"></a>

### Email confirmation to enable MFA without leaving the app

When login exceeds five minutes, `enroll` and `confirm` respond `MFA_ENROLL_CONFIRMATION_REQUIRED`. The interface sends a code to the address of the authenticated actor via `/api/private/security/enroll/email`, confirms it via `/api/private/security/enroll/email/confirm`, and continues with the QR. It does not redirect to Login nor change the cookies, session age, or its permissions. An expired or revoked session still responds 401.

The six-digit cryptographic code is stored as a hash with the app secret and the session identifier, in the existing verification table. It expires in five minutes, allows five attempts, and is only consumed once via conditional update. The sending is limited to one per user per minute. The resulting authorization lasts five minutes and serves exclusively to initiate and confirm MFA enrollment in that session; it does not replace the TOTP activation, nor authorize email changes, deactivation, recovery, or revocations. It is deleted upon completing the enrollment. No tables, migrations, or services are created.
