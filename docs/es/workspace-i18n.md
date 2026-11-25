# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> Idioma y selector del panel

<p align="center"><a href="../en/workspace-i18n.md" lang="en">English</a> | <strong>Español</strong> | <a href="../pt/workspace-i18n.md" lang="pt">Português</a> | <a href="../de/workspace-i18n.md" lang="de">Deutsch</a> | <a href="../fr/workspace-i18n.md" lang="fr">Français</a> | <a href="../it/workspace-i18n.md" lang="it">Italiano</a> | <a href="../zh/workspace-i18n.md" lang="zh">简体中文</a> | <a href="../ja/workspace-i18n.md" lang="ja">日本語</a> | <a href="../hi/workspace-i18n.md" lang="hi">हिन्दी</a> | <a href="../ar/workspace-i18n.md" lang="ar">العربية</a></p>

[Documentación técnica](README.md) | [Presentación del proyecto](../README.es.md)

> [!TIP]
> El inglés es la base del código y del asistente setup. Las diez traducciones y sus fuentes locales vienen incluidas. Usa `npm run setup -- --languages en,pt` para habilitar únicamente inglés y portugués, sin instalar paquetes adicionales ni eliminar las otras traducciones. Omitir `--languages` conserva la selección actual, o habilita los diez si la configuración no tiene una lista. El inglés siempre permanece habilitado como respaldo de traducciones. `--locale en` establece el idioma predeterminado de la aplicación; admite cualquiera de los habilitados. La interfaz prioriza la preferencia guardada, después un idioma compatible del navegador y finalmente el predeterminado configurado. Cambiar idioma no recarga la página ni reinicia formularios; árabe conserva RTL.

Login, páginas públicas, administración, diálogos, validaciones y correos ofrecen `en`, `es`, `pt`, `de`, `fr`, `it`, `zh`, `ja`, `hi` y `ar`. La prioridad es preferencia válida guardada (`tba-language`), primer idioma compatible de `navigator.languages`/`navigator.language` e inglés. Se normalizan variantes como `es-AR`, `pt-BR` y `en-GB`.

El selector es un botón de 48 × 38 px con el símbolo de idiomas y una flecha. Su menú muestra los diez nombres nativos, códigos breves y la opción actual marcada, con colores y superficies del tema. El ancho y la altura se limitan al espacio disponible. Se reutiliza `ui/select.tsx`, conservando el select nativo oculto para serialización y agregando contenido de disparador, cabecera y dimensiones opcionales. Los demás selects conservan sus valores y funcionamiento.

El menú soporta flechas, Inicio/Fin, escritura por inicial, Enter, Escape, Tab y cierre exterior. El foco regresa al control al elegir o cancelar con Escape. El glifo de idioma permanece estable y solo gira la flecha. Se respetan movimiento reducido, teclado, lector de pantalla, móviles y RTL. El selector aparece únicamente en Login y en la cabecera de la app. Los diálogos y formularios heredan esa preferencia y no incluyen controles de idioma propios.

## Textos y datos

`AuthI18n` reutiliza el contexto existente para el panel. `page=panel` configura idioma y dirección, mientras Admin conserva sus títulos por vista y el guard de autorización existente. La salida inicial del panel sigue vacía hasta autorizarse.

`src/lib/i18n/panel/*.json` centraliza los catálogos del panel. `panel.ts` aplica fallback y parámetros; `panel-sources.json` vincula las etiquetas canónicas existentes y los mensajes públicos del servidor con claves traducibles. `use-panel.ts` ofrece el formato a componentes. Los textos dinámicos de confirmación y descarga guardan claves y parámetros, por lo que cambian de idioma aun estando abiertos.

`src/lib/i18n/config.ts` centraliza idiomas y dirección. `messages/*.json` y `panel/*.json` contienen los catálogos públicos y administrativos; `catalog.ts`, `panel.ts` y el contexto compartido gestionan claves, parámetros y fallback. Mantén las claves completas en los diez catálogos. Los errores desconocidos muestran un mensaje público traducido, sin detalles internos. Nombres, direcciones, roles personalizados y códigos son datos y no se traducen.

`X-Auth-Language` elige un idioma habilitado para presentar el correo, nunca permisos. Sin cabecera válida o preferencia del destinatario se usa el idioma predeterminado configurado (inglés inicialmente). Una preferencia guardada que ya no esté habilitada también usa ese predeterminado. El inglés sigue siendo el respaldo de claves faltantes. El acceso/registro verificado y la selección explícita del panel recuerdan la preferencia en metadata existente de `verification` (`mail-language:<userId>`); los avisos diferidos usan el idioma del destinatario. Cambiar idioma no reenvía códigos ni modifica caducidad, intentos o verificación. Los textos de error anteriores siguen reconociéndose por compatibilidad.

El selector aparece en Login y en la cabecera de la aplicación. Los diálogos heredan esa preferencia y no tienen selectores propios. React actualiza los textos sin recargar ni navegar, conservando formularios, sesión y vista actual. Elegir otro idioma en el panel también envía `POST /api/private/profile/language` para recordar el idioma del destinatario en correos posteriores; no vuelve a cargar datos administrativos. El bloqueo del almacenamiento no impide traducir durante la visita actual.

## RTL y fuentes

Árabe coloca la barra lateral y los márgenes del panel a la derecha, adapta la imagen de bienvenida, flechas, controles, tablas y diálogos. Correos, claves y códigos conservan LTR. Los botones largos y las filas de seguridad se ajustan en pantallas pequeñas. Los menús usan las fuentes locales de los diez idiomas. Los subconjuntos CJK incorporan también los caracteres de los nuevos catálogos del panel, mediante `scripts/build-auth-fonts.py`.

## Archivos y verificación

Las pruebas de idioma utilizan Better Auth y D1 locales o APIs simuladas. Ver [implementación del acceso multilingüe](auth-i18n.md).

El inglés permanece incluido como respaldo. Los demás catálogos de acceso y panel usan importaciones dinámicas y caché en memoria por módulo. El foco de teclado o puntero sobre una opción anticipa su carga; abrir el menú no descarga todos los idiomas. El cambio se aplica cuando sus catálogos están listos y conserva formularios, sesión y navegación. Los cambios en caché no requieren red; prevalece la última selección. Ante un fallo inicial se muestra inglés; durante un cambio se mantiene el idioma actual. El correo y los metadatos del build usan catálogos completos solo en servidor. Consulta la [carga de idiomas](language-loading.md).
