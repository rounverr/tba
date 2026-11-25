# <picture><img src="../assets/icons/shield.svg" width="28" height="28" alt=""></picture> Autenticação e segurança

<p align="center"><a href="../en/security.md" lang="en">English</a> | <a href="../es/security.md" lang="es">Español</a> | <strong>Português</strong> | <a href="../de/security.md" lang="de">Deutsch</a> | <a href="../fr/security.md" lang="fr">Français</a> | <a href="../it/security.md" lang="it">Italiano</a> | <a href="../zh/security.md" lang="zh">简体中文</a> | <a href="../ja/security.md" lang="ja">日本語</a> | <a href="../hi/security.md" lang="hi">हिन्दी</a> | <a href="../ar/security.md" lang="ar">العربية</a></p>

[Documentação técnica](README.md) | [Visão geral do projeto](../README.pt.md)

## Segurança SQL

> [!IMPORTANT]
> Use parâmetros do driver ou predicados Drizzle para valores externos e armazenados. Escolha identificadores, filtros e ordenação em mapas do servidor. Restrinja o usuário operacional e proteja erros e credenciais. [SQL](../en/security.md#sql-security-en) | [PostgreSQL](../en/security.md#postgresql-runtime-privileges)

O banco de dados armazena os limites de requisições e a autorização versionada por sessão nos três mecanismos.

## Email OTP

O ingresso informa 403 com `ACCESS_NOT_ENABLED` quando o e-mail não corresponde a uma conta habilitada e não envia OTP nem cria usuários. A interface conserva o formulário e mostra o aviso para revisar o endereço ou solicitar acesso. Usa-se a mesma mensagem para contas inexistentes, pendentes, suspensas ou desativadas, sem revelar seu estado concreto. Essa política, solicitada para orientar a pessoa, permite distinguir contas habilitadas das que não têm acesso; substitui a resposta uniforme anterior do login. São conservados os limites por IP e por e-mail. O registro mantém sua resposta uniforme e seus controles de modalidade. O envio elegível se completa mediante `waitUntil`. O adaptador usa o provedor configurado em `MAIL_PROVIDER`: Cloudflare Email Sending no D1, Resend no Worker e no Node ou a caixa local para desenvolvimento. A seleção é implementada em `services/mail.ts`.

O código tem seis dígitos, expira em cinco minutos e Better Auth o guarda com hash. Limita-se a cinco tentativas por OTP, dez verificações por e-mail cada quinze minutos e um envio por e-mail por minuto. Há, além disso, um limite por IP de vinte solicitações cada quinze minutos e limites do provedor de autenticação. Os limites vivem em D1 e as chaves de throttle são guardadas com SHA-256. Não se imprimem OTP nem tokens em logs.

`/access/verify` distingue explicitamente login e registro. Login usa `disableSignUp:true`, exige uma conta ativa já existente e não concede acesso a contas pendentes ou suspensas. Um OTP usado ou expirado não volta a gerar sessão.

## Google OAuth

Só se habilita quando `GOOGLE_ENABLED="true"` e existem ambos os segredos. Exige-se `email_verified` do perfil de Google e desabilita-se a criação de usuários desde OAuth. O resultado passa pela mesma barreira de estado, sessão, permissões e MFA que Email OTP. Callback: `https://app.example.test/api/auth/callback/google`. Registra esse URI exato no Google Cloud e configura a tela de consentimento. Esse fluxo requer uma prova externa real após configurar as credenciais.

## Sessões e origem

As sessões duram oito horas e são verificadas no banco de dados sem cache de cookie. Após a MFA quando exigida, a sessão armazena um snapshot de autorização versionado no banco de dados. Cada operação protegida valida a sessão e a versão. Um snapshot válido fornece as permissões sem reler o papel. Se receber `409 authorization_changed` antes da gravação, o painel atualiza o contexto e tenta uma vez para o mesmo usuário. Cookies HttpOnly, SameSite=Lax e Secure em produção. Cada mutação exige um `Origin` igual a `APP_URL`, JSON e corpo de até 16 KiB. As requisições HTTPS são obrigatórias fora de localhost. Não há CORS aberto nem tokens em localStorage; somente as preferências visuais de tema e menu contraído são guardadas ali.

O gateway só expõe do handler público de Better Auth as rotas de Google e fechamento de sessão. Os métodos OTP, inspeção de códigos, MFA e signup não podem ser invocados por fora das políticas do servidor. Os corpos de resposta de Better Auth que contêm tokens não são entregues ao frontend: somente se propagam suas cookies e os dados estritamente necessários.

São incluídos cabeçalhos de segurança e CSP. A CSP admite scripts/estilos inline necessários para a hidratação de Astro e tokens visuais; não admite objetos nem frames de sites ajenos a Turnstile. Se um derivado elimina os scripts inline, pode endurecê-la usando hashes/nonces.

## Render administrativo antes de autorizar

Os oito documentos administrativos são gerados sem estrutura visual do painel. A saída inicial do React também é vazia: nem menu, cabeçalho, título da vista, formulários, avisos de sessão ou indicadores de carga são montados antes de receber uma resposta privada autorizada. Uma redireção pendente conserva essa saída vazia. O resultado confirmado de uma alteração de e-mail é mostrado como recibo público separado, porque essa operação fecha as sessões; não remonta o painel. É uma correção de apresentação do contêiner estático; os dados privados já estavam protegidos pela API. Não substitui sua autenticação nem adiciona leituras.

Os rejeições 403 e falhas 503 ao carregar uma vista sem acesso confirmado mostram apenas uma mensagem pública e opções de recuperação, sem o painel. Ao salvar uma página no BFCache, sua estrutura é ocultada de forma síncrona e os diálogos são fechados para que a instância não repinte durante a revalidação. Somente uma resposta autorizada a mostra novamente.

## Retorno ao login por perda de sessão

Um 401 em uma leitura ou ação do painel invalida sua cache de apresentação, aborta leituras pendentes e limpa os dados privados, QR, sementes e códigos transitórios antes de substituir a URL por `/login/`. O fechamento de sessão bem-sucedido usa a mesma limpeza e navegação por substituição. Voltar a abrir um link administrativo com a sessão fechada segue esse fluxo automaticamente.

Uma restauração do documento do BFCache requer uma leitura atual do servidor, mesmo que a cache visual anterior ainda estivesse vigente. É verificado o indicador `persisted` de `pageshow`: as cargas normais e a navegação interna não recebem uma consulta adicional. Um 403 por falta de permissões não se converte em logout; o código `MFA_REQUIRED` direciona ao desafio MFA e `RECENT_AUTH_REQUIRED` conserva seu fluxo de identidade recente. Uma falha 503 também não é interpretada como sessão fechada. Os destinos são rotas locais fixas. As APIs seguem respondendo JSON 401/403, sem redireções HTTP que quebrem clientes ou escondam erros.

## MFA voluntário

Perfil → Segurança usa o plugin oficial Two Factor com `allowPasswordless:true`. Não existe segundo fator por e-mail. A ativação aceita um ingresso de menos de cinco minutos ou uma confirmação de e-mail dentro do aplicativo, vinculada à sessão vigente. Gera um segredo cifrado e confirma um TOTP antes de ativar o segundo fator. O QR é gerado no navegador, sem enviar o segredo para terceiros. A mesma chave de configuração é copiada ao pressioná-la e pode ser carregada manualmente como TOTP no aplicativo autenticador. A interface elimina o QR e a chave de configuração de seu estado ao fechar o diálogo ou completar a ativação.

A antiguidade de cinco minutos é contada desde o ingresso que criou a sessão, não desde a última atividade. A sessão geral segue durando oito horas. Exceto o alta MFA, que admite a confirmação na tela descrita abaixo, se uma operação sensível supera esse prazo, a API responde 403 com `RECENT_AUTH_REQUIRED`; a interface explica a causa e oferece confirmar a identidade em `/login/?reauth=1`. É solicitado um novo OTP e o segundo fator quando corresponde, e se regressa a `/admin/security/`. Para alterações do perfil, é utilizado `/login/?reauth=profile` e se regressa a `/admin/profile/`. Os destinos são escolhidos de uma lista fixa: não aceita URLs de retorno externas nem se elimina a verificação de primeiro fator recente. Não é executada automaticamente a operação sensível ao regressar.

O plugin não intercepta automaticamente todos os métodos sem senha na versão instalada. TBA conserva uma tabela `assurance`, vinculada à sessão, ao usuário e à sua versão de MFA. Toda API privada rejeita uma sessão que não tenha completado o segundo fator. Email OTP e OAuth produzem primeiro uma sessão pendente dessa barreira. Alterar o estado em React ou chamar diretamente uma API não permite contorná-la.

O gateway adiciona um orçamento de cinco tentativas de segundo fator por usuário a cada cinco minutos, mesmo quando Better Auth recebe uma sessão de primeiro fator autenticada. Alterações sensíveis requerem primeiro fator recente e uma nova confirmação TOTP ou código de recuperação.

## Dispositivos confiáveis

A revogação desde Segurança é confirmada dentro do aplicativo com um TOTP ou código de recuperação novo e o mesmo limite de cinco tentativas. Não exige voltar ao Login por causa da antiguidade do ingresso: exige sessão válida, MFA completado e uma nova verificação do segundo fator. Após eliminar todos os dispositivos confiáveis e incrementar a versão MFA, é restabelecida apenas a verificação da sessão que acabou de confirmar o código. As outras sessões devem completar MFA novamente. MFA permanece ativo e não é gerado um novo dispositivo de confiança. A desativação MFA e as outras operações sensíveis conservam seus requisitos.

O modo oficial `trustDevice` do plugin não satisfaz por si só a verificação de todos os fluxos sem senha dessa versão. Por isso, é utilizado um token aleatório de 256 bits gerado com Web Crypto, guardado em cookie HttpOnly, Secure e SameSite=Strict. Em D1, só é guardado o hash do token, usuário, versão de MFA e vencimento absoluto de trinta dias. Não se confia em IP nem User-Agent.

A confianza só é criada após verificar o segundo fator e por seleção explícita. A caixa de seleção aparece nos passos de correio OTP, Authenticator e recuperação, e conserva a seleção ao mudar de método ou reenviar o correio. A seleção durante o OTP só expressa uma preferência para o passo MFA: não cria confiança por si mesma nem afeta contas sem MFA. Nunca substitui o primeiro fator nem é renovada automaticamente. Revogar confianza ou desativar MFA elimina os tokens e incrementa a versão de MFA. Revogar sessões ou suspender um usuário corta o acesso existente. Em localhost, é omitido Secure e o prefixo `__Host-` para permitir desenvolvimento HTTP.

## Recuperação

Ao revogar dispositivos confiáveis em HTTPS, é apagada a cookie com os atributos de segurança apropriados. A desativação de MFA revoga a confianza e as sessões de acordo com as regras descritas nessa guia.

Os dez códigos são cifrados mediante Better Auth. São mostrados ao gerá-los e cada um pode ser usado uma vez, sempre após o primeiro fator. A regeneração invalida os anteriores. A UI permite copiá-los ou baixá-los em um arquivo `.txt` gerado localmente mediante Blob. O arquivo inclui instruções de armazenamento privado e lembra que o correio ainda é necessário. O usuário deve guardar esse arquivo por sua conta; o aplicativo revoga a URL temporária e não o envia a nenhum servidor. A UI os elimina da memória ao fechar sua visualização; não são persistidos no navegador. A permissão de câmera, SMS e segundo email não são necessários.

## RBAC e auditoria

O acesso é negado por padrão. Cada requisição privada valida a sessão ativa e a versão global da autorização. As permissões vêm do snapshot versionado da sessão. Se estiver desatualizado, o servidor consulta a função e reconstrói o snapshot. As alterações administrativas verificam as permissões do endpoint e a condição de administrador. A revogação exige `users.edit`. Triggers protegem o último administrador ativo.

A auditoria guarda ator, ação, recurso, resultado e data. Não guarda corpos de solicitação, segredos, códigos nem tokens. A retenção deve ser definida por aplicação; programa limpeza de sessões, verificações, throttle, confiança vencida e auditoria com uma tarefa explícita de acordo com suas necessidades. A primeira versão não instala cronjobs nem recursos adicionais.

## Apresentação de permissões e atividade

Os identificadores de permissões e eventos permanecem no servidor e no banco de dados. O painel traduz os rótulos para o idioma selecionado. Novas funções recebem identificadores únicos e as existentes mantêm os seus.

O endpoint de auditoria segue exigindo `audit.read` e resolve o e-mail do usuário ou nome do papel associado mediante joins de leitura. Se o recurso já não existe, é mostrada uma etiqueta neutra. Recurso descreve o elemento afetado (sessão, segundo fator, recuperação, perfil ou confiança), em vez de repetir o e-mail do ator. Em ações administrativas, conserva o nome da outra pessoa afetada, ou seu e-mail se não houver nome; papéis e configuração mostram seu nome legível. Os nomes são resolvidos mediante os joins de leitura existentes, sem modificar eventos. As referências originais são conservadas em D1 para rastreabilidade; a interface de auditoria não mostra códigos técnicos nem identificadores em detalhes desplegáveis. Não se modifica nem reescreve o histórico.

Os seletores usam um combobox com opções em um popover e conservam um `select` nativo oculto para serializar e validar os formulários. O menu é posicionado de acordo com o espaço disponível sem ficar recortado pelo diálogo. Permite setas, Início/Fim, seleção com Enter, Escape e Tab; fecha ao clicar fora, redimensionar ou deslocar o contêiner. Os campos obrigatórios enfocam o seletor e mostram uma mensagem de validação. Não se agregaram dependências. O autocompletado respeita as cores do tema claro ou escuro.

## Mudança do e-mail de acesso

O perfil oferece um fluxo guiado mediante o plugin Email OTP de Better Auth: `POST /api/private/profile/email/request` envia o código para o endereço novo e `POST /api/private/profile/email/confirm` verifica e aplica a mudança. Ambos exigem sessão ativa, MFA completo quando corresponde e primeiro fator de menos de cinco minutos. A confirmação exige, além disso, um código novo de Authenticator ou recuperação se a conta tiver MFA, mesmo com um dispositivo de confiança. A API informa `mfaRequired` ao solicitar o e-mail e rejeita uma confirmação sem segundo fator com `MFA_CONFIRMATION_REQUIRED`, antes de consumir o OTP do e-mail. São conservados os controles de origem, JSON, tamanho e frequência. Os endpoints crus do plugin permanecem bloqueados pelo gateway.

Usa-se um OTP com hash, cinco minutos de vigência e um máximo de cinco tentativas, vinculado ao usuário e ao endereço novo. Um endereço já utilizado não recebe código nem substitui outra conta. O endereço atual segue sendo válido até completar a verificação. Não se marca manualmente nenhum e-mail como verificado: a operação oficial do plugin o faz somente após validar o OTP.

Better Auth verifica e consome o código de e-mail. A camada de persistência grava atomicamente a mudança do usuário, o incremento da versão MFA, a revogação de dispositivos e sessões e o registro de auditoria. D1 usa um lote. SQLite e PostgreSQL usam transações. Se a gravação falhar, solicite outro código.

Uma vez confirmado esse lote, uma falha posterior ao preparar a resposta do Better Auth não é informada como alteração falha. Não é necessário emitir um cookie de substituição porque as sessões já estão revogadas. A notificação para o endereço anterior é enviada fora do lote por meio do `waitUntil`; sua falha é registrada separadamente e não altera o sucesso da alteração. Os diagnósticos de erro registram apenas etiquetas de fase, método e rota, sem e-mail, OTP, MFA, cookies ou corpos de solicitações. A pessoa deve voltar a entrar com o novo e-mail e seu MFA. São conservados o identificador de usuário, o papel, o estado, o segredo TOTP e os códigos de recuperação restantes. Se um deles for usado para confirmar a alteração, é consumido como em qualquer verificação. A auditoria registra o evento e o identificador do usuário, sem códigos ou corpos de solicitação. Não são necessárias migrações ou novas tabelas.

As listagens básicas de usuários, solicitações e auditoria permanecem, com navegação limitada e permissões no servidor. Motores avançados e Excel ficam fora da base; cada derivado os implementa se necessário. Veja o [escopo](template-scope.md).

<a id="email-verification-before-mfa-pt"></a>

### Confirmação de e-mail para ativar MFA sem sair do aplicativo

Quando o login supera cinco minutos, `enroll` e `confirm` respondem `MFA_ENROLL_CONFIRMATION_REQUIRED`. A interface envia um código para o endereço do ator autenticado por meio do `/api/private/security/enroll/email`, o confirma por meio do `/api/private/security/enroll/email/confirm` e continua com o QR. Não redireciona para o Login nem altera os cookies, a antiguidade da sessão ou seus permisos. Uma sessão vencida ou revogada continua respondendo 401.

O código criptográfico de seis dígitos é salvo como hash com o segredo do aplicativo e o identificador de sessão, na tabela de verificação existente. Vence em cinco minutos, admite cinco tentativas e é consumido apenas uma vez por meio de atualização condicional. O envio é limitado a um por usuário por minuto. A autorização resultante dura cinco minutos e serve exclusivamente para iniciar e confirmar o alto MFA nessa sessão; não substitui o TOTP de ativação, nem autoriza alterações de e-mail, desativação, recuperação ou revogações. É eliminada ao completar o alto. Não são criadas tabelas, migrações ou serviços.
