# <picture><img src="../assets/icons/settings.svg" width="28" height="28" alt=""></picture> Configuração e operações

<p align="center"><a href="../en/operations.md" lang="en">English</a> | <a href="../es/operations.md" lang="es">Español</a> | <strong>Português</strong> | <a href="../de/operations.md" lang="de">Deutsch</a> | <a href="../fr/operations.md" lang="fr">Français</a> | <a href="../it/operations.md" lang="it">Italiano</a> | <a href="../zh/operations.md" lang="zh">简体中文</a> | <a href="../ja/operations.md" lang="ja">日本語</a> | <a href="../hi/operations.md" lang="hi">हिन्दी</a> | <a href="../ar/operations.md" lang="ar">العربية</a></p>

[Documentação técnica](README.md) | [Visão geral do projeto](../README.pt.md)

O TBA usa Cloudflare Workers com D1 por padrão. A mesma interface e API Hono também funcionam no Node.js com SQLite ou PostgreSQL. [Mecanismos de banco de dados](database-engines.md)

## Inicialização

O inglês é a base do código e do assistente setup. As dez traduções e fontes locais estão incluídas. Use `npm run setup -- --languages en,pt` para habilitar somente inglês e português, sem instalar pacotes nem apagar outras traduções. Omitir `--languages` preserva a seleção atual ou habilita os dez quando não existe lista. Inglês permanece habilitado como fallback das traduções. `--locale en` define o idioma padrão da aplicação e aceita qualquer idioma habilitado. A interface prioriza a preferência salva, depois o idioma compatível do navegador e finalmente o padrão configurado. Mudar idioma não recarrega a página nem reinicia formulários; árabe mantém RTL.

`npm run setup -- --interactive` | `--name` | `--id` | `--domain` | `--database` | `--account` | `--mail local|resend|cloudflare` | `--google true|false` | `--mfa true|false` | `--trust true|false` | `--r2 true|false` | `--theme light|dark`.

O script gera `.dev.vars` com segredo aleatório quando não existe. Não escreve credenciais em arquivos versionados nem cria administradores ou recursos remotos. Modifica a identidade técnica antes de provisionar um derivado.

## D1, Drizzle e migrações

`src/server/database/schema.ts` é o esquema de Drizzle. `drizzle/0001_initial.sql` contém o esquema base e `0002_defaults_and_guards.sql` carrega papéis, registro fechado e triggers. `drizzle/generated` conserva o snapshot de Drizzle para comparações futuras; Wrangler apenas executa os SQL na raiz de `drizzle`. Aplique `drizzle/0003_session_authorization.sql` com as demais migrações. As sessões existentes recebem o snapshot no próximo uso das permissões.

`db:generate` produz candidatos em `drizzle/generated`. Revise cada candidato e copie-o com o próximo número na raiz; adicione triggers ou dados em uma migração separada quando apropriado. Nunca edite uma migração já aplicada. Revise possíveis conflitos antes de usar uma D1 existente e realize backup antes de alterações remotas. A plantilla não executa SQL remoto durante instalação ou build.

> [!IMPORTANT]
> Os scripts `db:create`, `db:link`, `db:migrate:remote` e `deploy` requerem conta explícita e `--confirm`; sem confirmação, as operações de criação e escrita são interrompidas. `db:create` verifica nomes existentes e recupera o UUID real. `db:link` enumera bases da conta e mostra seu esquema antes de salvar o binding, sem modificá-lo. Se uma operação falhar, não se escreve um binding suposto. Nenhum script elimina bases.

Use `--config wrangler.<environment>.jsonc` ou `--config wrangler.<other-environment>.jsonc` para objetivos separados. Copie a configuração e atribua nome, URL, account_id e database_id reais diferentes para cada ambiente. As variáveis e bindings não devem ser compartilhados acidentalmente. Não há ambientes remotos pré-criados em TBA.

## Segredos e correio

O setup aceita `--mail local`, `--mail resend` e `--mail cloudflare`. E-mail local usa `APP_URL` local e `npm run mail:dev`. Resend exige `RESEND_API_KEY` e `MAIL_FROM`. Cloudflare reutiliza o adaptador existente e exige binding `send_email` chamado `EMAIL`, `MAIL_FROM` permitido e domínio habilitado para envio. O setup verifica requisitos locais sem criar recursos nem verificar domínios remotos. É possível configurar depois: o modo interativo pergunta se deseja continuar; o não interativo continua com pendências. Não inventa bindings, remetentes ou credenciais; o envio depende da configuração. Segredos ficam fora do Git. Wavicc permanece a integração futura preferida, com `WAVICC_API_KEY` como placeholder. Consulte o [setup de e-mail](setup-mail.md).

Wavicc é a integração futura preferida, sem adaptador ou contrato API verificado. `WAVICC_API_KEY` e `CUSTOM_MAIL_API_KEY` não habilitam provedores. Não use `MAIL_PROVIDER=wavicc`. Outros serviços exigem adaptador testado conforme seu contrato publicado, mantendo HTML/texto e autenticação; nenhum endpoint é presumido.

Verifique cada mensagem com contas isoladas: idioma, celular, validade, falhas e sucesso após mudanças confirmadas. Não registre códigos, corpos, tokens ou segredos. Veja [operações](operations.md) e [validação](validation.md).

## Google e Turnstile

Google requer `GOOGLE_ENABLED="true"`, `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` com callback exato `/api/auth/callback/google`. Não existem valores padrão. Use uma conta ativa previamente autorizada e verifique MFA, rejeição de usuários suspensos e e-mail verificado antes de publicar.

Turnstile é opcional. Se você definir `TURNSTILE_SITE_KEY`, defina também `TURNSTILE_SECRET_KEY`. O registro mostra o widget e o backend valida token, hostname e ação `register` em Siteverify; não basta resolver o widget em React. Não se criam widgets remotos a partir de TBA. Se você não o configurar, continuam ativos os limites D1 por e-mail, IP e verificação. Avalie habilitá-lo antes de abrir um registro ao público.

R2 está desligado e não se declaram buckets. Adicione-o apenas se o derivado precisar de arquivos, com autorização explícita para provisionar e tipos regenerados.

## Administrador inicial

`npm run admin:bootstrap -- --email admin@example.test` usa D1 local por padrão. O e-mail não é marcado como verificado e deve ser confirmado com OTP. Não se adiciona outro administrador se já houver um ativo.

O modo remoto exige `--remote --account ACCOUNT_ID --confirm` e verifica que a configuração tenha uma D1 real e a mesma conta. Não inclua e-mails reais em SQL versionado. Se você perder o acesso ao único administrador, siga um procedimento operativo próprio; não há backdoor nem restabelecimento automático de privilégios.

## Implantação manual com D1

1. Configure a identidade do derivado e a conta correta.
2. Crie ou vincule uma D1 após autorização. Revise e aplique SQL explicitamente.
3. Configure HTTPS, origem exata e e-mail externo; opcionalmente Google e Turnstile.
4. Execute `types:worker`, `check`, `test`, `build`, `worker:check`.
5. Execute `npm run deploy -- --account ACCOUNT_ID --confirm` com o arquivo selecionado.
6. Execute bootstrap remoto e uma prova com usuários isolados.
7. Verifique eventos, MFA, recuperação, papéis e fluxo de e-mail antes de admitir usuários reais.

A configuração inclui Logs e Traces de Workers. Evite adicionar logging de corpos/cookies. A equipe mantém validações e publicações manuais. GitHub Actions e Workers Builds não são requisitos para desplegar e não devem ser configurados como condição de publicação. Execute localmente as verificações pertinentes antes de qualquer alteração remota, com a conta e o destino confirmados.

## Atualizações e problemas frequentes

- Erro de origem: `APP_URL` deve coincidir com a origem do navegador, sem barra final. Use o Worker local para a prova completa.
- Não chega OTP: revise a caixa de entrada local ou remetente/credenciais do provedor. A resposta genérica não confirma que exista a conta.
- Acesso negado: confirme estado ativo, e-mail verificado, papel e MFA completo no backend.
- Alteração sensível rejeitada: volte a iniciar sessão; a verificação recente dura cinco minutos.
- D1 inexistente: aplique migrações locais ou verifique o binding remoto e conta; não preencha IDs inventados.
- Atualização do núcleo: compare commits, revise `CHANGELOG`, atualize dependências de forma deliberada e aplique migrações revisadas em um ambiente de teste. GitHub Template não propaga alterações para os derivados.
