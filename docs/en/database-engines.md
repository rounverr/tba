# <picture><img src="../assets/icons/database.svg" width="28" height="28" alt=""></picture> Database engines

<p align="center"><strong>English</strong> | <a href="../es/database-engines.md" lang="es">Español</a> | <a href="../pt/database-engines.md" lang="pt">Português</a> | <a href="../de/database-engines.md" lang="de">Deutsch</a> | <a href="../fr/database-engines.md" lang="fr">Français</a> | <a href="../it/database-engines.md" lang="it">Italiano</a> | <a href="../zh/database-engines.md" lang="zh">简体中文</a> | <a href="../ja/database-engines.md" lang="ja">日本語</a> | <a href="../hi/database-engines.md" lang="hi">हिन्दी</a> | <a href="../ar/database-engines.md" lang="ar">العربية</a></p>

[Technical documentation](README.md) | [Project overview](../../README.md)

> [!NOTE]
> TBA supports Cloudflare D1 on Workers and SQLite or PostgreSQL on Node.js 24+. Each installation uses one engine and one database. Start from a separate source copy for each installation. The setup command writes the engine and public settings to `tba.runtime.json`. Use `.dev.vars` or environment variables for credentials, and keep the same `BETTER_AUTH_SECRET` across restarts. The installer preserves it and asks for a new source copy if you select another engine. Git ignores the local installer configuration. Keep SQLite files with custom names and database backups in the ignored `work/` directory or outside the source tree.

D1 and SQLite apply SQL files 0001–0003 from `drizzle/`. PostgreSQL applies its own numbered files from `drizzle/postgresql/`. Migration history belongs to each installation.

| Engine | Runtime and driver | Storage | Mail |
| --- | --- | --- | --- |
| `d1` (default) | Cloudflare Workers, Wrangler and Drizzle D1 | Local Wrangler state or a linked D1 database | Local inbox, Resend, Cloudflare Email Sending |
| `sqlite` | Hono on Node.js and Drizzle with `better-sqlite3` | Private file with WAL and foreign keys | Local inbox or Resend |
| `postgresql` | The same Node.js server and Drizzle with `pg` | Maintained PostgreSQL release and a connection pool per process | Local inbox or Resend |

Use `npm ci` in the source directory. Run `npm run setup -- --interactive` for the prompts, or use the following commands. D1 retains `--database` as the Cloudflare database name. For the Node engines, `--host`, `--port` and `--domain` set the bind address, HTTP port and public origin. SQLite also accepts `--sqlite-path`. Set `DATABASE_URL` privately before running PostgreSQL commands.

```sh
# Run just the setup line for the engine in this installation.
npm run setup -- --db-engine d1 --database tba-local
npm run setup -- --db-engine sqlite --port 8787 --sqlite-path work/sqlite/tba.db
npm run setup -- --db-engine postgresql --port 8787
npm run build
```

| Operation | D1 and SQLite local | PostgreSQL |
| --- | --- | --- |
| Migrate | `npm run db:migrate:local` | `npm run db:migrate:local -- --target tba_db` |
| Bootstrap | `npm run admin:bootstrap -- --email admin@example.test` | `npm run admin:bootstrap -- --target tba_db --email admin@example.test` |
| Start after build | `npm start` | `npm start` |
| Local development | D1 uses `npm run dev` for Astro and `npm run dev:worker` for the API. SQLite uses `npm run dev` to build and start Node. | `npm run dev` builds and starts the Node server. |
| Dry-run Workers | D1 only, `npm run worker:check` | Use `npm run build` and the Node startup check. |

PostgreSQL requires an explicit database name for a loopback connection and `host:port/database` in `--target` for a non-loopback server. The command checks the connected database inside the migration or bootstrap transaction. D1 remote commands retain their existing confirmation requirements. See [D1 operations](operations.md).

For local email, run `npm run mail:dev` in another terminal, open the login page at the configured loopback origin, and read the OTP at `http://127.0.0.1:8025`. For externally hosted Node, use an HTTPS reverse proxy that preserves the configured public Host, and set `MAIL_PROVIDER=resend`, `MAIL_FROM` and `RESEND_API_KEY`. The runtime derives client identity from the socket. By default a reverse proxy shares its socket address among downstream clients for IP rate limiting. To use client addresses, set `TRUSTED_PROXIES` to a comma-separated list of explicit proxy IPs or IPv4/IPv6 CIDRs. The runtime uses a single valid `X-Forwarded-For` header only from a trusted peer and selects the first untrusted hop from the right. Set the edge proxy to overwrite or sanitize that header, configure only proxies you control, and restrict direct backend access when possible. Google remains optional. Wavicc is a future integration. See [Mail setup](setup-mail.md).

- **SQLite.** Place `SQLITE_PATH` outside the served build. Use a persistent local volume that supports SQLite locking. `better-sqlite3` is optional for installation and required only for SQLite. If the driver is missing, run `npm ci --include=optional` on a supported Node and platform. Where there is no compatible binary, follow the driver’s native build instructions. Use the normal `npm ci` for D1 and PostgreSQL as well. A blanket `--omit=optional` can remove platform packages required by the build toolchain. Each process opens one connection and waits up to 5 seconds on a busy database. Take a consistent backup with SQLite's backup API or an offline copy after closing the application. Include WAL state when restoring an online filesystem snapshot.
- **PostgreSQL.** Set `DATABASE_URL` privately to the connection string for the PostgreSQL database. TLS validates the peer and hostname by default on non-loopback connections. Use `PG_CA_FILE` for a private CA and `sslmode=verify-full` to enable TLS on loopback. Unencrypted connections are limited to loopback. `PG_POOL_MAX`, `PG_CONNECT_TIMEOUT_MS` and `PG_IDLE_TIMEOUT_MS` default to 10, 5000 and 30000. Size the pool across replicas and preserve the configured secret. Use standard `pg_dump` and `pg_restore` workflows and test restoration. The admin guard serializes changes to active administrator membership and PostgreSQL may return a transaction conflict under contention. Migrations live in `drizzle/postgresql` with an independent history.
- **D1.** Follow the local or remote backup and restore procedure for the chosen database. See [D1 operations](operations.md).

The core migrations need PostgreSQL 11 syntax for `CREATE TRIGGER ... EXECUTE FUNCTION` and use identity columns and JSONB. PostgreSQL 11 is a theoretical SQL floor. The core test matrix uses 17.12 and 18.7. Check the upstream maintenance schedule before choosing a version. Use the latest patch of PostgreSQL 18 for new installations, or a maintained PostgreSQL 17 when required. [Trigger syntax](https://www.postgresql.org/docs/11/sql-createtrigger.html) | [PostgreSQL versioning policy](https://www.postgresql.org/support/versioning/)

Node deployments need the built `dist`, the application source and runtime scripts, `public/_headers`, migration files, production dependencies and environment configuration. Keep `dist` as a real directory and restrict writes to it and the database directory to the deployment owner. Start with `npm start` and send SIGTERM for orderly shutdown. Keep a tested backup before migrations. Schema migrations operate on one engine and installation at a time.

Validation is pending for installation and junction handling on Windows, an external Google OAuth callback, live Resend delivery, and independent penetration testing, including SQL exploitation and timing. Security and compliance certifications are outside the scope of these validations.
