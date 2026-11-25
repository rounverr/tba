# <picture><img src="../assets/icons/check.svg" width="28" height="28" alt=""></picture> Lista de validación

<p align="center"><a href="../en/validation.md" lang="en">English</a> | <strong>Español</strong> | <a href="../pt/validation.md" lang="pt">Português</a> | <a href="../de/validation.md" lang="de">Deutsch</a> | <a href="../fr/validation.md" lang="fr">Français</a> | <a href="../it/validation.md" lang="it">Italiano</a> | <a href="../zh/validation.md" lang="zh">简体中文</a> | <a href="../ja/validation.md" lang="ja">日本語</a> | <a href="../hi/validation.md" lang="hi">हिन्दी</a> | <a href="../ar/validation.md" lang="ar">العربية</a></p>

[Documentación técnica](README.md) | [Presentación del proyecto](../README.es.md)

Consulta la [instalación por motor](database-engines.md). Usa copias separadas para D1, SQLite, PostgreSQL 17 y PostgreSQL 18. Ejecuta `npm ls`, `npm audit`, `npm audit --omit=dev` y las suites por motor. Para `test:integration:postgresql`, define `TBA_TEST_DATABASE_URL` con una base loopback aislada. Ejecuta `test:integration:sqlite` para SQLite. Escanea el código y los artefactos con Gitleaks o una herramienta equivalente.

Para comprobar OTP real y contar peticiones, inicia el runtime y el buzón local. Ejecuta `node tests/browser/node-panel.mjs` con `AUTH_TEST_URL` y el administrador sintético en `TBA_TEST_EMAIL`. El intervalo predeterminado de inactividad es de 601 segundos. Usa `TBA_CHROMIUM_CDP` con una sesión aislada de Chromium con interfaz para verificar los cambios reales de ventana. Los demás scripts de navegador pueden usar datos simulados.

1. Instalar las dependencias con `npm ci`.
2. Comprobar los tipos del frontend y del backend con `npm run check`.
3. Ejecutar las pruebas unitarias y de integración con `npm test`.
4. Generar los recursos de producción con `npm run build`.
5. Validar el empaquetado del Worker con `npm run worker:check`.
6. Verificar manualmente OTP por correo, acceso opcional con Google, activación y recuperación de MFA, dispositivos confiables, revocación de sesiones, roles y permisos, modalidades de registro y rechazo de accesos no autorizados.
7. Verificar el acceso y el panel administrativo en los diez idiomas, incluido el diseño RTL en árabe. Confirmar que cambiar de idioma no recarga la página ni reinicia los formularios.
8. Comprobar la interfaz en escritorio y dispositivos móviles, navegación por teclado, lectores de pantalla y encabezados de seguridad.
9. Antes de cualquier promoción expresamente autorizada, revisar secretos, migraciones, configuración específica del entorno, enlaces de documentación y diferencias de los archivos seleccionados. La publicación es manual; CI y Workers Builds no son obligatorios.

Ejecuta esta lista sobre el paquete reutilizable real, no solo sobre una copia de desarrollo con extensiones. Verifica listados básicos, auditoría y dashboard sin controles avanzados de búsqueda/filtro/orden ni imports XLSX. Con sesión autorizada, las rutas excluidas `/api/private/export/*` deben responder 404. Conserva la descarga `.txt` de recuperación MFA. 


Los scripts `tests/browser/*.mjs` son pruebas manuales opcionales y no forman parte de `npm test`. Proporciona Playwright (`PLAYWRIGHT_MODULE`), Chromium (`BROWSER_EXECUTABLE`) y una web local compilada (`AUTH_TEST_URL`) con fallback de página 404. Las pruebas de acceso/panel requieren los diez idiomas habilitados. `enabled-languages.mjs` necesita una copia aparte compilada después de `npm run setup -- --languages en,pt --locale en`. Para `mail-preview.mjs`, genera antes los HTML con `MAIL_PREVIEW_DIR` al ejecutar `tests/mail-template.test.ts`. Usa una copia fija de `dist`: las pruebas de assets lo recompilan. Ejecuta las suites de integración de autenticación y persistencia en cada motor.

Ejecuta `node tests/browser/panel-idle.mjs` contra el sitio compilado para medir diez minutos de inactividad en los listados básicos y comprobar la revalidación de BFCache.

El inglés permanece incluido como respaldo. Los demás catálogos de acceso y panel usan importaciones dinámicas y caché en memoria por módulo. El foco de teclado o puntero sobre una opción anticipa su carga; abrir el menú no descarga todos los idiomas. El cambio se aplica cuando sus catálogos están listos y conserva formularios, sesión y navegación. Los cambios en caché no requieren red; prevalece la última selección. Ante un fallo inicial se muestra inglés; durante un cambio se mantiene el idioma actual. El correo y los metadatos del build usan catálogos completos solo en servidor. Consulta la [carga de idiomas](language-loading.md).

> [!NOTE]
> Siguen pendientes la instalación y las uniones de directorio en Windows, el callback externo de Google OAuth, la entrega real por Resend y una prueba de penetración independiente.
