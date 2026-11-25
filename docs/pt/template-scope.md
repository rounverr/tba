# <picture><img src="../assets/icons/layers.svg" width="28" height="28" alt=""></picture> Escopo do modelo

<p align="center"><a href="../en/template-scope.md" lang="en">English</a> | <a href="../es/template-scope.md" lang="es">Español</a> | <strong>Português</strong> | <a href="../de/template-scope.md" lang="de">Deutsch</a> | <a href="../fr/template-scope.md" lang="fr">Français</a> | <a href="../it/template-scope.md" lang="it">Italiano</a> | <a href="../zh/template-scope.md" lang="zh">简体中文</a> | <a href="../ja/template-scope.md" lang="ja">日本語</a> | <a href="../hi/template-scope.md" lang="hi">हिन्दी</a> | <a href="../ar/template-scope.md" lang="ar">العربية</a></p>

[Documentação técnica](README.md) | [Visão geral do projeto](../README.pt.md)

O TBA usa Cloudflare Workers com D1 por padrão. A mesma interface e API Hono também funcionam no Node.js com SQLite ou PostgreSQL. [Mecanismos de banco de dados](database-engines.md)

O template básico inclui OTP por e-mail, Google opcional, MFA TOTP e recuperação, dispositivos confiáveis, sessões, funções e permissões, perfil, alteração de e-mail, gestão básica de contas, solicitações de cadastro, auditoria e dashboard. Login e administração oferecem dez idiomas e temas claro/escuro.

> [!NOTE]
> Inclui listagens básicas com navegação limitada por páginas e as tabelas de banco de dados, restrições e migrações genéricas necessárias para identidade, auditoria e dashboard. Busca, filtros, motores de ordenação e paginação avançada e exportação Excel/XLSX ficam fora da distribuição básica. Cada projeto pode adicioná-los conforme seus dados e permissões. O download local `.txt` dos códigos de recuperação MFA continua incluído na segurança da conta.

Cada aplicação tem Worker, banco, usuários, segredos, domínios e e-mail próprios. Não cria perfis comerciais, organizações, cobrança ou dados de clientes por padrão. Use o hook de cadastro para integrações específicas. A reutilização segue a [licença MIT](../../LICENSE), preservando os avisos e as [licenças de fontes](../licenses/README.md#pt). Consulte [TRADEMARKS](../../TRADEMARKS.md) para marcas corporativas.
