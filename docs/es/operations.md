# <picture><img src="../assets/icons/settings.svg" width="28" height="28" alt=""></picture> Configuración y operaciones

<p align="center"><a href="../en/operations.md" lang="en">English</a> | <strong>Español</strong> | <a href="../pt/operations.md" lang="pt">Português</a> | <a href="../de/operations.md" lang="de">Deutsch</a> | <a href="../fr/operations.md" lang="fr">Français</a> | <a href="../it/operations.md" lang="it">Italiano</a> | <a href="../zh/operations.md" lang="zh">简体中文</a> | <a href="../ja/operations.md" lang="ja">日本語</a> | <a href="../hi/operations.md" lang="hi">हिन्दी</a> | <a href="../ar/operations.md" lang="ar">العربية</a></p>

[Documentación técnica](README.md) | [Presentación del proyecto](../README.es.md)

TBA usa Cloudflare Workers con D1 de forma predeterminada. La misma interfaz y API Hono también funcionan en Node.js con SQLite o PostgreSQL. [Motores de base de datos](database-engines.md)

Usa `db:migrate:local`, `admin:bootstrap` y `npm start` en la instalación elegida. D1 y SQLite usan almacenamiento local de forma predeterminada. PostgreSQL exige `--target` para migraciones y bootstrap. Conserva un respaldo consistente antes de migrar. Restaura SQLite con la aplicación detenida y PostgreSQL con un propietario autorizado. Consulta la [guía de motores](database-engines.md).

## Inicialización

El inglés es la base del código y del asistente setup. Las diez traducciones y sus fuentes locales vienen incluidas. Usa `npm run setup -- --languages en,pt` para habilitar únicamente inglés y portugués, sin instalar paquetes adicionales ni eliminar las otras traducciones. Omitir `--languages` conserva la selección actual, o habilita los diez si la configuración no tiene una lista. El inglés siempre permanece habilitado como respaldo de traducciones. `--locale en` establece el idioma predeterminado de la aplicación; admite cualquiera de los habilitados. La interfaz prioriza la preferencia guardada, después un idioma compatible del navegador y finalmente el predeterminado configurado. Cambiar idioma no recarga la página ni reinicia formularios; árabe conserva RTL.

`npm run setup -- --interactive` | `--name` | `--id` | `--domain` | `--database` | `--account` | `--mail local|resend|cloudflare` | `--google true|false` | `--mfa true|false` | `--trust true|false` | `--r2 true|false` | `--theme light|dark`.

El script genera `.dev.vars` con secreto aleatorio cuando no existe. No escribe credenciales en archivos versionados ni crea administradores o recursos remotos. Modifica la identidad técnica antes de aprovisionar un derivado.

## D1, Drizzle y migraciones

`src/server/database/schema.ts` es el esquema de Drizzle. `drizzle/0001_initial.sql` contiene el esquema base y `0002_defaults_and_guards.sql` carga roles, registro cerrado y triggers. `drizzle/generated` conserva el snapshot de Drizzle para futuras comparaciones; Wrangler solo ejecuta los SQL en la raíz de `drizzle`. Aplica `drizzle/0003_session_authorization.sql` junto con las demás migraciones. Las sesiones existentes adquieren su snapshot la próxima vez que se necesitan permisos.

`db:generate` produce candidatos en `drizzle/generated`. Revisa cada candidato y cópialo con el siguiente número a la raíz; añade triggers o datos en una migración separada cuando corresponda. Nunca edites una migración ya aplicada. Revisa posibles conflictos antes de usar una D1 existente y realiza respaldo antes de cambios remotos. La plantilla no ejecuta SQL remoto durante instalación o build.

> [!IMPORTANT]
> Los scripts `db:create`, `db:link`, `db:migrate:remote` y `deploy` requieren cuenta explícita y `--confirm`; sin confirmación las operaciones de creación y escritura se detienen. `db:create` comprueba nombres existentes y recupera el UUID real. `db:link` enumera bases de la cuenta y muestra su esquema antes de guardar el binding, sin modificarlo. Si una operación falla, no se escribe un binding supuesto. Ningún script elimina bases.

Usa `--config wrangler.<environment>.jsonc` o `--config wrangler.<other-environment>.jsonc` para objetivos separados. Copia la configuración y asigna nombre, URL, account_id y database_id reales diferentes para cada entorno. Las variables y bindings no deben compartirse accidentalmente. No hay entornos remotos precreados en TBA.

## Secretos y correo

El setup admite `--mail local`, `--mail resend` y `--mail cloudflare`. El correo local usa un `APP_URL` local y `npm run mail:dev`. Resend requiere `RESEND_API_KEY` y `MAIL_FROM`. Cloudflare reutiliza el adaptador existente y requiere un binding `send_email` llamado `EMAIL`, un `MAIL_FROM` permitido y un dominio habilitado para enviar. El setup comprueba requisitos locales sin crear recursos ni verificar dominios remotos. Se puede configurar después: el modo interactivo pregunta si deseas continuar y el no interactivo continúa con una lista de pendientes. No inventa bindings, remitentes ni credenciales; el correo no podrá enviarse hasta configurarlo. Guarda los secretos fuera de Git. Wavicc sigue como integración futura preferida y `WAVICC_API_KEY` como placeholder. Consulta el [setup de correo](setup-mail.md).

Wavicc es la integración futura preferida: no hay adaptador ni contrato API verificado. Los placeholders `WAVICC_API_KEY` y `CUSTOM_MAIL_API_KEY` no habilitan proveedores. No uses `MAIL_PROVIDER=wavicc`. Para otro servicio implementa y prueba el transporte con su contrato publicado, conservando HTML/texto y autenticación; esta guía no supone endpoints del proveedor.

Verifica cada mensaje con cuentas aisladas y el proveedor elegido: idioma, móvil, caducidad, fallo de entrega y respuesta tras cambios confirmados. No registres códigos, cuerpos, tokens ni credenciales. Ver [operaciones](operations.md) y [validación](validation.md).

## Google y Turnstile

Google requiere `GOOGLE_ENABLED="true"`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` con callback exacto `/api/auth/callback/google`. No existen valores por defecto. Usa una cuenta activa previamente autorizada y verifica MFA, rechazo de usuarios suspendidos y correo verificado antes de publicar.

Turnstile es opcional. Si defines `TURNSTILE_SITE_KEY`, define también `TURNSTILE_SECRET_KEY`. El registro muestra el widget y el backend valida token, hostname y acción `register` en Siteverify; no basta con resolver el widget en React. No se crean widgets remotos desde TBA. Si no lo configuras, continúan activos los límites D1 por correo, IP y verificación. Evalúa habilitarlo antes de abrir un registro al público.

R2 está apagado y no se declaran buckets. Solo agrégalo si el derivado necesita archivos, con autorización explícita para aprovisionar y tipos regenerados.

## Administrador inicial

`npm run admin:bootstrap -- --email admin@example.test` usa D1 local por defecto. El correo no se marca como verificado y debe confirmarse con OTP. No se añade otro administrador si ya hay uno activo.

El modo remoto exige `--remote --account ACCOUNT_ID --confirm` y verifica que la configuración tenga una D1 real y la misma cuenta. No incluyas correos reales en SQL versionado. Si pierdes el acceso al único administrador, sigue un procedimiento operativo propio; no hay backdoor ni restablecimiento automático de privilegios.

## Despliegue manual con D1

1. Configura la identidad del derivado y la cuenta correcta.
2. Crea o vincula una D1 tras autorización. Revisa y aplica SQL explícitamente.
3. Configura HTTPS, origen exacto y correo externo; opcionalmente Google y Turnstile.
4. Ejecuta `types:worker`, `check`, `test`, `build`, `worker:check`.
5. Ejecuta `npm run deploy -- --account ACCOUNT_ID --confirm` con el archivo seleccionado.
6. Ejecuta bootstrap remoto y una prueba con usuarios aislados.
7. Verifica eventos, MFA, recuperación, roles y flujo de correo antes de admitir usuarios reales.

La configuración incluye Logs y Traces de Workers. Evita añadir logging de cuerpos/cookies. El equipo mantiene validaciones y publicaciones manuales. GitHub Actions y Workers Builds no son requisitos para desplegar y no deben configurarse como condición de publicación. Ejecuta localmente las comprobaciones pertinentes antes de cualquier cambio remoto, con la cuenta y el destino confirmados.

## Actualizaciones y problemas frecuentes

- Error de origen: `APP_URL` debe coincidir con el origen del navegador, sin barra final. Usa el Worker local para la prueba completa.
- No llega OTP: revisa buzón local o remitente/credenciales del proveedor. La respuesta genérica no confirma que exista la cuenta.
- Acceso denegado: confirma estado activo, correo verificado, rol y MFA completo en el backend.
- Cambio sensible rechazado: vuelve a iniciar sesión; la comprobación reciente dura cinco minutos.
- D1 inexistente: aplica migraciones locales o verifica el binding remoto y cuenta; no rellenes IDs inventados.
- Actualización del núcleo: compara commits, revisa `CHANGELOG`, actualiza dependencias de forma deliberada y aplica migraciones revisadas en un entorno de prueba. GitHub Template no propaga cambios a los derivados.
