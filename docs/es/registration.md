# <picture><img src="../assets/icons/users.svg" width="28" height="28" alt=""></picture> Registro, aprobaciones y extensiones

<p align="center"><a href="../en/registration.md" lang="en">English</a> | <strong>Español</strong> | <a href="../pt/registration.md" lang="pt">Português</a> | <a href="../de/registration.md" lang="de">Deutsch</a> | <a href="../fr/registration.md" lang="fr">Français</a> | <a href="../it/registration.md" lang="it">Italiano</a> | <a href="../zh/registration.md" lang="zh">简体中文</a> | <a href="../ja/registration.md" lang="ja">日本語</a> | <a href="../hi/registration.md" lang="hi">हिन्दी</a> | <a href="../ar/registration.md" lang="ar">العربية</a></p>

[Documentación técnica](README.md) | [Presentación del proyecto](../README.es.md)

> [!NOTE]
> La modalidad inicial es `closed`. No se muestra un enlace de registro público y la API rechaza solicitudes de registro. Los administradores pueden dar de alta cuentas que luego verifican su correo al iniciar sesión.

En `approval`, la persona solicita un OTP y confirma el correo. TBA crea una cuenta pendiente sin rol y una solicitud única, revoca cualquier sesión provisional y notifica a los administradores mediante el adaptador de correo. La aprobación requiere elegir un rol explícito; el rechazo no habilita acceso. Ambas acciones quedan auditadas. Al aprobar se notifica al usuario.

En `open`, el correo se verifica antes de activar la cuenta. Un administrador elige
el rol inicial desde Acceso y registro entre **todos los roles configurados**,
incluidos los roles personalizados, Editor y Administrador. La elección se guarda
en `settings.public_role_id`, sin cambios de esquema. El servidor comprueba que el
rol exista y que el administrador confirme explícitamente el registro abierto.
El visitante que se registra nunca elige ni envía un rol efectivo: se aplica el
configurado en el servidor al completar la verificación del correo.

El selector aparece únicamente al elegir Registro abierto. Reutiliza el menú de la
app, muestra los permisos del rol (o control administrativo completo), conserva la
elección al cambiar de idioma y exige volver a confirmar si cambia el rol. Si no
hay roles o el configurado ya no está disponible, explica la situación y evita
guardar una selección vacía. Los textos están traducidos a los diez idiomas.

Los cambios solo afectan a nuevos registros. Las cuentas y solicitudes anteriores
conservan su estado y rol. Una solicitud pendiente anterior nunca se aprueba porque
se cambie la modalidad. Cada finalización vuelve a consultar la modalidad y el rol
vigentes; si no hay rol válido, no habilita la cuenta. Se mantienen Email OTP,
límites de envío e intentos, permisos de configuración y auditoría.

La marca de rol público con acceso básico (`isPublic`) conserva su validación de
mínimos permisos en el editor de roles, pero ya no restringe el selector del rol
inicial. Elegir un rol de gestión o Administrador otorga ese mismo alcance a las
cuentas nuevas; la vista muestra ese alcance y lo incluye en la confirmación.

La consulta privada de configuración entrega los roles en la misma respuesta:
una sola petición HTTP, sin consultas adicionales al cambiar de idioma o abrir el
selector. Añade una lectura del catálogo de roles a las dos lecturas existentes de esa vista.
Las demás vistas conservan su presupuesto de consultas.

## Extensión

`src/server/services/registration-hook.ts` expone `onUserRegistered(user, context)`. El núcleo no crea perfiles de CRM, CMS u otros negocios. La función recibe únicamente identidad y una clave estable `registration:<userId>`; no recibe permisos mutables.

La tabla `registration_event` evita entregas duplicadas completadas y reclama ejecuciones mediante una actualización condicional. Una entrega fallida queda pendiente y una entrega atascada puede retomarse tras cinco minutos. Un administrador puede reintentar mediante `POST /api/private/hooks/:userId/retry`.

La semántica es **al menos una vez**: un proceso podría terminar después de producir un efecto y antes de marcar el evento como completado. El consumidor debe hacer sus escrituras idempotentes con `context.idempotencyKey`, por ejemplo mediante un índice UNIQUE. No prometemos efectos externos exactamente una vez. Los errores del punto de extensión no conceden permisos adicionales ni bloquean la persistencia de la identidad verificada.

Para extender un CMS, crea una tabla de perfil propia con `user_id UNIQUE`, inserta con `ON CONFLICT DO NOTHING` y conserva el control de permisos fuera del callback. El ejemplo no se ejecuta automáticamente y no pertenece al núcleo TBA.
