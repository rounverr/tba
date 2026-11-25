# <picture><img src="../assets/icons/shield.svg" width="28" height="28" alt=""></picture> Autenticación y seguridad

<p align="center"><a href="../en/security.md" lang="en">English</a> | <strong>Español</strong> | <a href="../pt/security.md" lang="pt">Português</a> | <a href="../de/security.md" lang="de">Deutsch</a> | <a href="../fr/security.md" lang="fr">Français</a> | <a href="../it/security.md" lang="it">Italiano</a> | <a href="../zh/security.md" lang="zh">简体中文</a> | <a href="../ja/security.md" lang="ja">日本語</a> | <a href="../hi/security.md" lang="hi">हिन्दी</a> | <a href="../ar/security.md" lang="ar">العربية</a></p>

[Documentación técnica](README.md) | [Presentación del proyecto](../README.es.md)

<a id="sql-security-es"></a>
## Seguridad SQL y de bases de datos

> [!IMPORTANT]
> Separe las instrucciones de los valores externos. Use `prepare().bind()` en D1, sentencias preparadas en SQLite, parámetros en PostgreSQL y predicados de Drizzle. Por ejemplo, `command('SELECT id FROM "user" WHERE email=?', email)` y `eq(user.email, email)` transmiten el correo como dato. Interpolar ese valor en la cadena SQL o entregarlo a `sql.raw()` permite que forme parte de la instrucción. Aplique la misma regla al reutilizar datos almacenados, valores devueltos por servicios.

Valide los filtros con Zod o un analizador tipado. Seleccione tablas, columnas, operadores y direcciones mediante mapas explícitos del servidor. En búsquedas que requieran coincidencia literal, escape `%`, `_` y el carácter de escape de `LIKE`, y vincule el patrón como parámetro. Conserve Unicode y la puntuación legítima. Evite exponer errores SQL, parámetros y credenciales en respuestas o registros. Cada módulo nuevo requiere revisar la autorización, el costo de sus consultas y las regresiones en los motores reales.

El conversor PostgreSQL reemplaza `?` fuera de literales ordinarios e identificadores entre comillas por parámetros `$n`. Admite delimitadores duplicados y exige una sola instrucción, un punto y coma final opcional y un valor por marcador. La conexión establece `standard_conforming_strings=on`. La gramática portátil excluye comentarios, cadenas con delimitadores dollar-quoted, marcadores nativos explícitos, cadenas con prefijos de escape y operadores JSON con interrogación. Para esos operadores, utilice una función como `jsonb_exists` o una instrucción nativa fija con valores vinculados. Los archivos de migración versionados usan la vía nativa.

Separe al propietario del esquema, al encargado de migrar y al usuario operativo. Use una base dedicada, un propietario sin acceso interactivo y un usuario operativo sin superusuario, privilegios de creación ni propiedad sobre los objetos. Limite el acceso a la base y al esquema de TBA. Revise los permisos heredados de `PUBLIC` y retire `CREATE` del esquema si está concedido de forma pública. Restrinja el acceso a otras bases con `pg_hba.conf` o con los permisos `CONNECT` de esas bases. [Permisos operativos PostgreSQL comprobados](../en/security.md#postgresql-runtime-privileges)

En Node independiente, la identidad del cliente se obtiene del socket de forma predeterminada. Declare solo proxies de confianza explícita, sanee los encabezados en el proxy de entrada y mantenga `dist` y los directorios de datos bajo control del despliegue. [Ajustes de seguridad para Node](database-engines.md)

Los listados básicos tienen orden fijo, proyectan explícitamente los campos necesarios y parametrizan el límite y el desplazamiento. Los registros de errores de la aplicación usan el método HTTP y la plantilla de la ruta.

La base de datos guarda los límites de solicitudes y la autorización versionada por sesión en los tres motores.

## Email OTP

El ingreso informa 403 con `ACCESS_NOT_ENABLED` cuando el correo no corresponde a una cuenta habilitada y no envía OTP ni crea usuarios. La interfaz conserva el formulario y muestra el aviso para revisar la dirección o solicitar acceso. Se usa el mismo mensaje para cuentas inexistentes, pendientes, suspendidas o desactivadas, sin revelar su estado concreto. Esta política, solicitada para orientar a la persona, permite distinguir cuentas habilitadas de las que no tienen acceso; sustituye la respuesta uniforme anterior del login. Se conservan los límites por IP y por correo. El registro mantiene su respuesta uniforme y sus controles de modalidad. El envío elegible se completa mediante `waitUntil`. El adaptador usa el proveedor configurado en `MAIL_PROVIDER`: Cloudflare Email Sending en D1, Resend en Worker y Node, o el buzón local para desarrollo. La selección se implementa en `services/mail.ts`.

El código tiene seis dígitos, vence en cinco minutos y Better Auth lo guarda con hash. Se limita a cinco intentos por OTP, diez verificaciones por correo cada quince minutos y un envío por correo por minuto. Hay además un límite por IP de veinte solicitudes cada quince minutos y límites del proveedor de autenticación. Los límites se almacenan en la base de datos y las claves de throttle se guardan con SHA-256. No se imprimen OTP ni tokens en logs.

`/access/verify` distingue explícitamente login y registro. Login usa `disableSignUp:true`, exige una cuenta activa ya existente y no concede acceso a cuentas pendientes o suspendidas. Un OTP usado o vencido no vuelve a generar sesión.

## Google OAuth

Solo se habilita cuando `GOOGLE_ENABLED="true"` y existen ambos secretos. Se exige `email_verified` del perfil de Google y se deshabilita la creación de usuarios desde OAuth. El resultado pasa por la misma barrera de estado, sesión, permisos y MFA que Email OTP. Callback: `https://app.example.test/api/auth/callback/google`. Registra ese URI exacto en Google Cloud y configura la pantalla de consentimiento. Este flujo requiere una prueba externa real después de configurar las credenciales.

## Sesiones y origen

Las sesiones duran ocho horas y se comprueban en la base de datos sin caché de cookie. La sesión guarda un snapshot de autorización versionado en la base de datos después de completar MFA cuando corresponde. Cada operación protegida valida la sesión y su versión vigente. Un snapshot vigente aporta los permisos sin otra lectura del rol. Una mutación desactualizada del panel puede recibir `409 authorization_changed` antes de escribir. El panel actualiza el contexto y reintenta una sola vez para el mismo usuario. Cookies HttpOnly, SameSite=Lax y Secure en producción. Cada mutación exige un `Origin` igual a `APP_URL`, JSON y cuerpo de hasta 16 KiB. Las peticiones HTTPS son obligatorias fuera de localhost. No hay CORS abierto ni tokens en localStorage; solo las preferencias visuales de tema y menú contraído se guardan allí.

El gateway solo expone del handler público de Better Auth las rutas de Google y cierre de sesión. Los métodos OTP, inspección de códigos, MFA y signup no se pueden invocar por fuera de las políticas del servidor. Los cuerpos de respuesta de Better Auth que contienen tokens no se entregan al frontend: solo se propagan sus cookies y los datos estrictamente necesarios.

Se incluyen encabezados de seguridad y CSP. La CSP admite scripts/estilos inline necesarios para la hidratación de Astro y tokens visuales; no admite objetos ni frames de sitios ajenos a Turnstile. Si un derivado elimina los scripts inline, puede endurecerla usando hashes/nonces.

## Render administrativo antes de autorizar

Los ocho documentos administrativos se generan sin estructura visual del panel. La salida inicial de React también es vacía: ni menú, cabecera, título de la vista, formularios, avisos de sesión o indicadores de carga se montan antes de recibir una respuesta privada autorizada. Una redirección pendiente conserva esa salida vacía. El resultado confirmado de un cambio de correo se muestra como recibo público separado, porque esa operación cierra las sesiones; no vuelve a montar el panel. Es una corrección de presentación del contenedor estático; los datos privados ya estaban protegidos por la API. No sustituye su autenticación ni añade lecturas.

Los rechazos 403 y fallos 503 al cargar una vista sin acceso confirmado muestran únicamente un mensaje público y opciones de recuperación, sin el panel. Al guardar una página en BFCache se oculta su estructura de forma síncrona y se cierran diálogos para que la instantánea no vuelva a pintarla durante la revalidación. Solo una respuesta autorizada vuelve a mostrarla.

## Retorno al login por pérdida de sesión

Un 401 en una lectura o acción del panel invalida su caché de presentación, aborta lecturas pendientes y limpia los datos privados, QR, semillas y códigos transitorios antes de reemplazar la URL por `/login/`. El cierre de sesión exitoso usa la misma limpieza y navegación por reemplazo. Volver a abrir un enlace administrativo con la sesión cerrada sigue este flujo automáticamente.

Una restauración del documento desde BFCache requiere una lectura actual del servidor, incluso si la caché visual anterior todavía estaba vigente. Se comprueba el indicador `persisted` de `pageshow`: las cargas normales y la navegación interna no reciben una consulta adicional. Un 403 por falta de permisos no se convierte en logout; el código `MFA_REQUIRED` dirige al desafío MFA y `RECENT_AUTH_REQUIRED` conserva su flujo de identidad reciente. Un fallo 503 tampoco se interpreta como sesión cerrada. Los destinos son rutas locales fijas. Las APIs siguen respondiendo JSON 401/403, sin redirecciones HTTP que rompan clientes o escondan errores.

## MFA voluntario

Perfil → Seguridad usa el plugin oficial Two Factor con `allowPasswordless:true`. No existe segundo factor por correo. La activación acepta un ingreso de menos de cinco minutos o una confirmación de correo dentro de la app, vinculada a la sesión vigente. Genera un secreto cifrado y confirma un TOTP antes de activar el segundo factor. El QR se genera en el navegador, sin enviar el secreto a terceros. La misma clave de configuración se copia al pulsarla y puede cargarse manualmente como TOTP en la aplicación autenticadora. La interfaz elimina el QR y la clave de configuración de su estado al cerrar el diálogo o completar la activación.

La antigüedad de cinco minutos se cuenta desde el ingreso que creó la sesión, no desde la última actividad. La sesión general sigue durando ocho horas. Excepto el alta MFA, que admite la confirmación en pantalla descrita abajo, si una operación sensible supera ese plazo, la API responde 403 con `RECENT_AUTH_REQUIRED`; la interfaz explica la causa y ofrece confirmar la identidad en `/login/?reauth=1`. Se solicita un nuevo OTP y el segundo factor cuando corresponde, y se regresa a `/admin/security/`. Para cambios del perfil se utiliza `/login/?reauth=profile` y se regresa a `/admin/profile/`. Los destinos se eligen de una lista fija: no acepta URLs de retorno externas ni se elimina la comprobación de primer factor reciente. No se ejecuta automáticamente la operación sensible al regresar.

El plugin no intercepta automáticamente todos los métodos passwordless en la versión instalada. TBA conserva una tabla `assurance`, vinculada a la sesión, el usuario y su versión de MFA. Toda API privada rechaza una sesión que no haya completado el segundo factor. Email OTP y OAuth producen primero una sesión pendiente de esa barrera. Cambiar el estado en React o llamar directamente a una API no permite eludirla.

El gateway añade un presupuesto de cinco intentos de segundo factor por usuario cada cinco minutos, incluso cuando Better Auth recibe una sesión de primer factor autenticada. Cambios sensibles requieren primer factor reciente y una nueva confirmación TOTP o código de recuperación.

## Dispositivos confiables

La revocación desde Seguridad se confirma dentro de la app con un TOTP o código de
recuperación nuevo y el mismo límite de cinco intentos. No exige volver al Login
por la antigüedad del ingreso: exige sesión válida, MFA completado y una nueva
verificación del segundo factor. Tras eliminar todos los dispositivos confiables
e incrementar la versión MFA, se restablece únicamente la verificación de la sesión
que acaba de confirmar el código. Las otras sesiones deben completar MFA otra vez.
MFA permanece activo y no se genera un nuevo dispositivo de confianza. La
desactivación MFA y las otras operaciones sensibles conservan sus requisitos.

El modo oficial `trustDevice` del plugin no satisface por sí solo la verificación de todos los flujos passwordless de esta versión. Por eso se utiliza un token aleatorio de 256 bits generado con Web Crypto, guardado en cookie HttpOnly, Secure y SameSite=Strict. En D1 solo se guarda el hash del token, usuario, versión de MFA y vencimiento absoluto de treinta días. No se confía en IP ni User-Agent.

La confianza solo se crea después de verificar el segundo factor y por selección explícita. La casilla aparece en los pasos de correo OTP, Authenticator y recuperación, y conserva la selección al cambiar de método o reenviar el correo. La selección durante el OTP solo expresa una preferencia para el paso MFA: no crea confianza por sí misma ni afecta a cuentas sin MFA. Nunca sustituye al primer factor ni se renueva automáticamente. Revocar confianza o desactivar MFA elimina los tokens e incrementa la versión de MFA. Revocar sesiones o suspender un usuario corta el acceso existente. En localhost se omite Secure y el prefijo `__Host-` para permitir desarrollo HTTP.

## Recuperación

Al revocar dispositivos confiables en HTTPS se borra la cookie con los atributos de seguridad apropiados. La desactivación de MFA revoca la confianza y las sesiones según las reglas descritas en esta guía.

Los diez códigos se cifran mediante Better Auth. Se muestran al generarlos y cada uno puede usarse una vez, siempre después del primer factor. La regeneración invalida los anteriores. La UI permite copiarlos o descargarlos en un archivo `.txt` generado localmente mediante Blob. El archivo incluye indicaciones de almacenamiento privado y recuerda que el correo sigue siendo necesario. El usuario debe guardar ese archivo por su cuenta; la aplicación revoca la URL temporal y no lo envía a ningún servidor. La UI los elimina de memoria al cerrar su visualización; no se persisten en el navegador. El permiso de cámara, SMS y segundo email no son necesarios.

## RBAC y auditoría

El acceso se deniega por defecto. Cada solicitud privada valida la sesión activa y la versión global de autorización. Los permisos provienen del snapshot versionado de la sesión. Si la versión está desactualizada, el servidor vuelve a leer el rol y reconstruye el snapshot. Las operaciones administrativas aplican los permisos del endpoint y su control de administrador. La revocación de sesiones exige `users.edit`. Los triggers protegen al último administrador activo.

La auditoría guarda actor, acción, recurso, resultado y fecha. No guarda cuerpos de solicitud, secretos, códigos ni tokens. La retención debe definirse por aplicación; programa limpieza de sesiones, verificaciones, throttle, confianza vencida y auditoría con una tarea explícita según sus necesidades. La primera versión no instala cronjobs ni recursos adicionales.

## Presentación de permisos y actividad

Los identificadores de permisos y eventos se conservan en el servidor y en la base de datos. El panel traduce las etiquetas al idioma seleccionado. Los roles nuevos reciben identificadores únicos y los existentes conservan los suyos.

El endpoint de auditoría sigue exigiendo `audit.read` y resuelve el correo del usuario o nombre del rol asociado mediante joins de lectura. Si el recurso ya no existe se muestra una etiqueta neutral. Recurso describe el elemento afectado (sesión, segundo factor, recuperación, perfil o confianza), en lugar de repetir el correo del actor. En acciones administrativas conserva el nombre de la otra persona afectada, o su correo si no hay nombre; roles y configuración muestran su nombre legible. Los nombres se resuelven mediante los joins de lectura existentes, sin modificar eventos. Las referencias originales se conservan en la base de datos para trazabilidad; la interfaz de auditoría no muestra códigos técnicos ni identificadores en detalles desplegables. No se modifica ni reescribe el historial.

Los selectores usan un combobox con opciones en un popover y conservan un `select` nativo oculto para serializar y validar los formularios. El menú se posiciona según el espacio disponible sin quedar recortado por el diálogo. Permite flechas, Inicio/Fin, selección con Enter, Escape y Tab; cierra al pulsar fuera, redimensionar o desplazar el contenedor. Los campos obligatorios enfocan el selector y muestran un mensaje de validación. No se agregaron dependencias. El autocompletado respeta los colores del tema claro u oscuro.

## Cambio del correo de acceso

El perfil ofrece un flujo guiado mediante el plugin Email OTP de Better Auth: `POST /api/private/profile/email/request` envía el código a la dirección nueva y `POST /api/private/profile/email/confirm` verifica y aplica el cambio. Ambos exigen sesión activa, MFA completo cuando corresponde y primer factor de menos de cinco minutos. La confirmación exige además un código nuevo de Authenticator o recuperación si la cuenta tiene MFA, incluso con un dispositivo de confianza. La API informa `mfaRequired` al solicitar el correo y rechaza una confirmación sin segundo factor con `MFA_CONFIRMATION_REQUIRED`, antes de consumir el OTP del correo. Se conservan los controles de origen, JSON, tamaño y frecuencia. Los endpoints crudos del plugin permanecen bloqueados por el gateway.

Se usa un OTP con hash, cinco minutos de vigencia y un máximo de cinco intentos, vinculado al usuario y a la dirección nueva. Una dirección ya utilizada no recibe código ni reemplaza otra cuenta. La dirección actual sigue siendo válida hasta completar la verificación. No se marca manualmente ningún correo como verificado: la operación oficial del plugin lo hace solo tras validar el OTP.

Better Auth verifica y consume el código de correo. La capa de persistencia aplica en una sola operación atómica el cambio de usuario, el incremento de la versión MFA, la revocación de dispositivos y sesiones y el registro de auditoría. D1 usa un lote y SQLite y PostgreSQL usan transacciones. Si falla la escritura, solicita un código nuevo.

Una vez confirmado ese lote, un fallo posterior al preparar la respuesta de Better Auth no se informa como cambio fallido. No se necesita emitir una cookie de reemplazo porque las sesiones ya están revocadas. La notificación a la dirección anterior se envía fuera del lote mediante `waitUntil`; su fallo se registra por separado y no altera el éxito del cambio. Los diagnósticos de error solo registran etiquetas de fase, método y ruta, sin correo, OTP, MFA, cookies ni cuerpos de solicitudes. La persona debe volver a ingresar con el correo nuevo y su MFA. Se conservan el identificador de usuario, el rol, el estado, el secreto TOTP y los códigos de recuperación restantes. Si se usa uno para confirmar el cambio, se consume como en cualquier verificación. La auditoría registra el evento y el identificador del usuario, sin códigos ni cuerpos de solicitud. No se requieren migraciones ni nuevas tablas.

Se conservan los listados básicos de usuarios, solicitudes y auditoría, con navegación acotada y permisos del servidor. Los motores de tablas avanzadas y Excel quedan fuera del template base; cada derivado los implementa si los necesita. Ver [alcance del template](template-scope.md).

<a id="email-verification-before-mfa-es"></a>

### Confirmación de correo para activar MFA sin salir de la app

Cuando el ingreso supera cinco minutos, `enroll` y `confirm` responden `MFA_ENROLL_CONFIRMATION_REQUIRED`. La interfaz envía un código a la dirección del actor autenticado mediante `/api/private/security/enroll/email`, lo confirma mediante `/api/private/security/enroll/email/confirm` y continúa con el QR. No redirige al Login ni cambia las cookies, la antigüedad de la sesión o sus permisos. Una sesión vencida o revocada sigue respondiendo 401.

El código criptográfico de seis dígitos se guarda como hash con el secreto de la app y el identificador de sesión, en la tabla de verificación existente. Vence en cinco minutos, admite cinco intentos y solo se consume una vez mediante actualización condicional. El envío se limita a uno por usuario por minuto. La autorización resultante dura cinco minutos y sirve exclusivamente para iniciar y confirmar el alta MFA en esa sesión; no sustituye al TOTP de activación, ni autoriza cambios de correo, desactivación, recuperación o revocaciones. Se elimina al completar el alta. No se crean tablas, migraciones o servicios.
