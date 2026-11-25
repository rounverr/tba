# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> Idiomas del acceso público

<p align="center"><a href="../en/auth-i18n.md" lang="en">English</a> | <strong>Español</strong> | <a href="../pt/auth-i18n.md" lang="pt">Português</a> | <a href="../de/auth-i18n.md" lang="de">Deutsch</a> | <a href="../fr/auth-i18n.md" lang="fr">Français</a> | <a href="../it/auth-i18n.md" lang="it">Italiano</a> | <a href="../zh/auth-i18n.md" lang="zh">简体中文</a> | <a href="../ja/auth-i18n.md" lang="ja">日本語</a> | <a href="../hi/auth-i18n.md" lang="hi">हिन्दी</a> | <a href="../ar/auth-i18n.md" lang="ar">العربية</a></p>

[Documentación técnica](README.md) | [Presentación del proyecto](../README.es.md)

> [!TIP]
> El inglés es la base del código y del asistente setup. Las diez traducciones y sus fuentes locales vienen incluidas. Usa `npm run setup -- --languages en,pt` para habilitar únicamente inglés y portugués, sin instalar paquetes adicionales ni eliminar las otras traducciones. Omitir `--languages` conserva la selección actual, o habilita los diez si la configuración no tiene una lista. El inglés siempre permanece habilitado como respaldo de traducciones. `--locale en` establece el idioma predeterminado de la aplicación; admite cualquiera de los habilitados. La interfaz prioriza la preferencia guardada, después un idioma compatible del navegador y finalmente el predeterminado configurado. Cambiar idioma no recarga la página ni reinicia formularios; árabe conserva RTL.

El acceso público admite inglés (`en`), español (`es`), portugués (`pt`), alemán (`de`), francés (`fr`), italiano (`it`), chino simplificado (`zh`), japonés (`ja`), hindi (`hi`) y árabe (`ar`). Inglés es el fallback.

## Auditoría y alcance

La aplicación usa Astro estático con islas React y autenticación sin contraseña mediante Better Auth. No existía una capa i18n. Los textos estaban en Login, las páginas públicas y los mensajes del servidor. Se reutilizan el estado React, los componentes actuales y las rutas existentes, sin añadir paquetes npm.

Se traducen ingreso, registro abierto o con aprobación, verificación de correo, OTP, MFA, códigos de recuperación, ayuda, avisos de reautenticación, errores, validaciones, carga, retorno de Google, acceso denegado y página inexistente. Los correos OTP del acceso se envían en el idioma elegido. No existen pantallas de contraseña, recuperación o restablecimiento de contraseña: no se agrega ese mecanismo. La ampliación posterior incorpora también el panel administrativo y sus ajustes; ver [selector y panel multidioma](workspace-i18n.md).

## Resolución y carga inicial

`src/lib/i18n/config.ts` centraliza los diez idiomas, nombres nativos, dirección y clave `tba-language`. La prioridad es preferencia válida de `localStorage`, primer idioma compatible de `navigator.languages`, `navigator.language` y, finalmente, inglés. Se normalizan mayúsculas, guiones y variantes regionales, como `es-AR`, `pt-BR` o `en-GB`.

`Base.astro` ejecuta el mismo resolver sincrónicamente en el head. Configura `lang`, `dir` y título antes de mostrar el contenido. El HTML estático usa inglés para coincidir con la primera hidratación; `data-auth-pending` oculta la isla hasta que `AuthI18n` aplica la traducción mediante `useLayoutEffect`. Así no se ve un destello de otro idioma. Los accesos bloqueados a almacenamiento se capturan y se utiliza el navegador o el estado de la visita.

El selector compacto usa un botón con el símbolo de idioma y un menú propio. Tiene nombre accesible traducido y opciones con nombres nativos, `lang` y `dir`. El select nativo oculto conserva la serialización. Cambiarlo actualiza el contexto React y persiste la preferencia. No recarga, navega ni consulta la API. No se remonta el formulario: conserva correo, código, intención de registro, paso, confianza del dispositivo, espera de reenvío, errores y operación en curso. Los errores guardan claves, por lo que también cambian de idioma mientras están visibles. El idioma elegido persiste entre visitas; los campos y códigos no se guardan en almacenamiento.

## Catálogos, errores y correos

`src/lib/i18n/messages/*.json` contiene 112 claves por idioma. `catalog.ts` tipa las claves, interpola parámetros y resuelve faltantes al inglés. Una clave desconocida muestra un error público traducido, nunca la clave interna. Las marcas, correos ingresados, códigos y nombres de organización son datos, no traducciones.

`errors.ts` transforma los mensajes públicos existentes y los códigos conocidos de la API en claves de presentación. Los errores desconocidos no exponen detalles del servidor. Los campos conservan restricciones y validación del servidor; se presentan validaciones locales traducidas en lugar de mensajes nativos dependientes del idioma instalado en el navegador. Los dígitos árabes, persas, devanagari y de ancho completo de OTP se normalizan a los mismos seis dígitos ASCII. Los códigos de recuperación se mantienen intactos.

`X-Auth-Language` elige un idioma habilitado para presentar el correo, nunca permisos. Sin cabecera válida o preferencia del destinatario se usa el idioma predeterminado configurado (inglés inicialmente). Una preferencia guardada que ya no esté habilitada también usa ese predeterminado. El inglés sigue siendo el respaldo de claves faltantes. El acceso/registro verificado y la selección explícita del panel recuerdan la preferencia en metadata existente de `verification` (`mail-language:<userId>`); los avisos diferidos usan el idioma del destinatario. Cambiar idioma no reenvía códigos ni modifica caducidad, intentos o verificación. Los textos de error anteriores siguen reconociéndose por compatibilidad.

Turnstile recibe el idioma seleccionado, con `zh-CN` para chino simplificado. Su widget se recrea al cambiarlo para actualizar su interfaz. Esto invalida la prueba CAPTCHA anterior y requiere la prueba del widget actualizado; conserva los demás datos del formulario y los controles del servidor.

## Diseño, RTL y fuentes

Árabe configura `dir=rtl`, invierte las flechas de navegación y ajusta el panel de imagen, el cierre de ayuda y las alineaciones. Correos y códigos usan LTR y aislamiento bidireccional. Las cabeceras admiten varias líneas, los textos largos se ajustan y las etiquetas no dependen de anchos fijos. Se mantiene la identidad, el tema y la adaptación móvil existentes.

Las fuentes WOFF2 se sirven desde `public/fonts`, con la política `font-src 'self'` existente. Inter continúa para los idiomas latinos. Las familias TBA Arabic y TBA Devanagari conservan los glifos de las fuentes Noto originales. TBA Chinese y TBA Japanese incluyen los caracteres de los catálogos chino, japonés e inglés y los nombres del selector. La ampliación también incluye los catálogos del panel; las fuentes del sistema cubren otros caracteres de datos introducidos. Solo se descargan las fuentes que el navegador necesita. No hay peticiones a proveedores de fuentes.

Las fuentes proceden de Noto Sans Arabic, Noto Sans Devanagari y Noto Sans CJK, con licencia [SIL OFL 1.1](../licenses/noto-fonts.txt). Se renombraron las familias modificadas. Para regenerarlas después de añadir caracteres a los catálogos CJK, ejecutar `/usr/bin/python3 scripts/build-auth-fonts.py /usr/share/fonts` en un entorno de mantenimiento con Noto, fontTools y Brotli. Es una herramienta opcional: el build y la aplicación no requieren Python ni dependencias nuevas. La redistribución conserva la licencia en el repositorio.

## Archivos de la implementación

- Configuración, resolver, catálogos y errores: `src/lib/i18n/config.ts`, `catalog.ts`, `errors.ts` y los diez JSON de `messages/`.
- Interfaz: `AuthI18n.tsx`, `AuthPublic.tsx`, `Login.tsx`, `Brand.tsx`, `ThemeToggle.tsx` y `Turnstile.tsx` en `src/components/`.
- Carga y rutas públicas: `src/layouts/Base.astro`, `src/pages/index.astro`, `login.astro`, `login/complete.astro`, `denied.astro` y `404.astro`.
- Estilos y fuentes: `src/styles/global.css`, `public/fonts/`, `scripts/build-auth-fonts.py` y `docs/licenses/noto-fonts.txt`.
- Presentación de las peticiones y correos: `src/lib/utils.ts`, `src/server/auth.ts`, `src/server/index.ts` y `src/server/services/auth-mail.ts`.
- Pruebas: `tests/auth-i18n.test.ts`, `tests/auth.test.ts` y `tests/browser/auth-i18n.mjs`. Documentación: este archivo, `docs/validation.md`, `README.md` y `CHANGELOG.md`.

## Validación

`tests/auth-i18n.test.ts` verifica los diez catálogos, parámetros, variantes, prioridad, resolver del head, fallback, dirección, errores, normalización y textos de correo. La integración en `tests/auth.test.ts` entrega OTP en diez idiomas con Better Auth y D1 locales, y comprueba uso único. No envía correos reales.

`tests/browser/auth-i18n.mjs` usa un Playwright ya disponible y APIs simuladas. Se ejecuta contra el build servido localmente:

```sh
AUTH_TEST_URL=http://127.0.0.1:4321 \
PLAYWRIGHT_MODULE=/ruta/a/playwright/index.js \
node tests/browser/auth-i18n.mjs
```

Incluye detección antes de hidratar, ausencia de parpadeo, persistencia, cambio inmediato sin navegación ni peticiones, conservación del formulario y carga en curso, diez idiomas de ingreso/registro/OTP/MFA/recuperación, errores, ayuda, las páginas públicas, almacenamiento bloqueado, CAPTCHA, avisos de reautenticación y anchos de 320, 390, 768 y 1440 px. La comprobación visual adicional verifica fuentes reales y escritorio/móvil para árabe, hindi, chino, japonés, alemán y francés.

El inglés permanece incluido como respaldo. Los demás catálogos de acceso y panel usan importaciones dinámicas y caché en memoria por módulo. El foco de teclado o puntero sobre una opción anticipa su carga; abrir el menú no descarga todos los idiomas. El cambio se aplica cuando sus catálogos están listos y conserva formularios, sesión y navegación. Los cambios en caché no requieren red; prevalece la última selección. Ante un fallo inicial se muestra inglés; durante un cambio se mantiene el idioma actual. El correo y los metadatos del build usan catálogos completos solo en servidor. Consulta la [carga de idiomas](language-loading.md).
