# <picture><img src="../assets/icons/layers.svg" width="28" height="28" alt=""></picture> Alcance de la plantilla

<p align="center"><a href="../en/template-scope.md" lang="en">English</a> | <strong>Español</strong> | <a href="../pt/template-scope.md" lang="pt">Português</a> | <a href="../de/template-scope.md" lang="de">Deutsch</a> | <a href="../fr/template-scope.md" lang="fr">Français</a> | <a href="../it/template-scope.md" lang="it">Italiano</a> | <a href="../zh/template-scope.md" lang="zh">简体中文</a> | <a href="../ja/template-scope.md" lang="ja">日本語</a> | <a href="../hi/template-scope.md" lang="hi">हिन्दी</a> | <a href="../ar/template-scope.md" lang="ar">العربية</a></p>

[Documentación técnica](README.md) | [Presentación del proyecto](../README.es.md)

TBA usa Cloudflare Workers con D1 de forma predeterminada. La misma interfaz y API Hono también funcionan en Node.js con SQLite o PostgreSQL. [Motores de base de datos](database-engines.md)

El template base incluye OTP por correo, Google opcional, MFA TOTP y recuperación, dispositivos confiables, sesiones, roles y permisos, perfil, cambio de correo, gestión básica de cuentas, solicitudes de registro, auditoría y dashboard. Login y administración ofrecen diez idiomas y temas claro/oscuro.

> [!NOTE]
> Se incluyen los listados básicos y su navegación acotada por páginas, además de las tablas de base de datos, restricciones y migraciones genéricas necesarias para identidad, auditoría y dashboard. Quedan fuera de la distribución base los motores de búsqueda, filtros, ordenamiento y paginación avanzada, y la exportación Excel/XLSX. Cada proyecto puede incorporarlos según su modelo de datos y permisos. La descarga local `.txt` de recuperación MFA sigue formando parte de la seguridad de la cuenta.

Cada aplicación utiliza Worker, base, usuarios, secretos, dominios y correo propios. No se crean perfiles comerciales, organizaciones, facturación ni datos de clientes por defecto. El hook de registro permite integrar lógica específica del proyecto. La reutilización sigue la [licencia MIT](../../LICENSE), conservando avisos y [licencias de fuentes](../licenses/README.md#es). Las marcas corporativas se regulan por separado en [TRADEMARKS](../../TRADEMARKS.md).
