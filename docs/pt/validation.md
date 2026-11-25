# <picture><img src="../assets/icons/check.svg" width="28" height="28" alt=""></picture> Lista de validação

<p align="center"><a href="../en/validation.md" lang="en">English</a> | <a href="../es/validation.md" lang="es">Español</a> | <strong>Português</strong> | <a href="../de/validation.md" lang="de">Deutsch</a> | <a href="../fr/validation.md" lang="fr">Français</a> | <a href="../it/validation.md" lang="it">Italiano</a> | <a href="../zh/validation.md" lang="zh">简体中文</a> | <a href="../ja/validation.md" lang="ja">日本語</a> | <a href="../hi/validation.md" lang="hi">हिन्दी</a> | <a href="../ar/validation.md" lang="ar">العربية</a></p>

[Documentação técnica](README.md) | [Visão geral do projeto](../README.pt.md)

Execute as suítes de D1, SQLite e PostgreSQL em instalações isoladas conforme o [guia dos mecanismos](database-engines.md).

1. Instalar dependências com `npm ci`.
2. Verificar os tipos do frontend e backend com `npm run check`.
3. Executar testes unitários e de integração com `npm test`.
4. Compilar os recursos de produção com `npm run build`.
5. Validar o pacote do Worker com `npm run worker:check`.
6. Testar manualmente OTP por e-mail, login opcional com Google, ativação e recuperação de MFA, dispositivos confiáveis, revogação de sessões, funções e permissões, modos de cadastro e bloqueio de acesso não autorizado.
7. Verificar o login e o painel administrativo nos dez idiomas, inclusive árabe RTL. Confirmar que mudar o idioma não recarrega a página nem reinicia formulários.
8. Conferir layout em computador e celular, navegação por teclado, leitores de tela e cabeçalhos de segurança.
9. Antes de qualquer promoção expressamente autorizada, revisar segredos, migrações, configurações do ambiente, links da documentação e diferenças dos arquivos selecionados. A publicação é manual; CI e Workers Builds não são obrigatórios.

Execute a lista no pacote reutilizável real, não apenas em desenvolvimento com extensões. Verifique listas básicas, auditoria e dashboard sem busca/filtro/ordenação avançados ou imports XLSX. Com sessão autorizada, as rotas excluídas `/api/private/export/*` devem retornar 404. Preserve o `.txt` de recuperação MFA. 


Os scripts `tests/browser/*.mjs` são verificações manuais opcionais, fora de `npm test`. Forneça Playwright (`PLAYWRIGHT_MODULE`), Chromium (`BROWSER_EXECUTABLE`) e um site local compilado (`AUTH_TEST_URL`) com fallback 404. Login/painel usam os dez idiomas; `enabled-languages.mjs` exige uma fixture separada com `--languages en,pt --locale en`. Gere fixtures HTML com `MAIL_PREVIEW_DIR` em `tests/mail-template.test.ts` antes de `mail-preview.mjs`. Use uma cópia fixa de `dist`. Use `node-panel.mjs` para verificar OTP e requisições HTTP num servidor real. Os demais testes de interface podem simular a API.

Execute `node tests/browser/panel-idle.mjs` no site compilado para medir dez minutos de inatividade nas listas básicas e verificar a revalidação do BFCache.

O inglês permanece incluído como fallback. Os outros catálogos de login e painel usam imports dinâmicos e cache em memória por módulo. O foco do teclado ou ponteiro antecipa apenas a opção indicada; abrir o menu não baixa todos os idiomas. A troca ocorre quando os catálogos estão prontos, preservando formulários, sessão e navegação. Idiomas em cache não exigem rede; vale a última escolha. Falhas iniciais mostram inglês; falhas na troca mantêm o idioma atual. E-mails e metadados do build usam catálogos completos apenas no servidor. Consulte a [carga de idiomas](language-loading.md).

> [!NOTE]
> Ainda faltam validar a instalação e as junções no Windows, o callback externo do Google OAuth, a entrega real pelo Resend e um teste de penetração independente.
