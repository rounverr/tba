# <picture><img src="../assets/icons/users.svg" width="28" height="28" alt=""></picture> Registro, aprovações e extensões

<p align="center"><a href="../en/registration.md" lang="en">English</a> | <a href="../es/registration.md" lang="es">Español</a> | <strong>Português</strong> | <a href="../de/registration.md" lang="de">Deutsch</a> | <a href="../fr/registration.md" lang="fr">Français</a> | <a href="../it/registration.md" lang="it">Italiano</a> | <a href="../zh/registration.md" lang="zh">简体中文</a> | <a href="../ja/registration.md" lang="ja">日本語</a> | <a href="../hi/registration.md" lang="hi">हिन्दी</a> | <a href="../ar/registration.md" lang="ar">العربية</a></p>

[Documentação técnica](README.md) | [Visão geral do projeto](../README.pt.md)

> [!NOTE]
> A modalidade inicial é `closed`. Não é exibido um link de registro público e a API rejeita solicitações de registro. Os administradores podem criar contas que, posteriormente, verificam o e-mail ao iniciar a sessão.

Em `approval`, a pessoa solicita um OTP e confirma o e-mail. TBA cria uma conta pendente sem papel e uma solicitação única, revoga qualquer sessão provisória e notifica os administradores por meio do adaptador de e-mail. A aprovação requer a escolha de um papel explícito; a rejeição não habilita o acesso. Ambas as ações são auditadas. Ao aprovar, é notificado o usuário.

Em `open`, o e-mail é verificado antes de ativar a conta. Um administrador escolhe o papel inicial desde Acesso e registro entre **todos os papéis configurados**, incluindo os papéis personalizados, Editor e Administrador. A escolha é salva em `settings.public_role_id`, sem alterações de esquema. O servidor verifica se o papel existe e se o administrador confirma explicitamente o registro aberto. O visitante que se registra nunca escolhe ou envia um papel efetivo: é aplicado o configurado no servidor ao completar a verificação do e-mail.

O seletor aparece apenas ao escolher Registro aberto. Reutiliza o menu da aplicação, mostra as permissões do papel (ou controle administrativo completo), conserva a escolha ao mudar de idioma e exige voltar a confirmar se o papel for alterado. Se não houver papéis ou o configurado já não estiver disponível, explica a situação e evita salvar uma seleção vazia. Os textos estão traduzidos para os dez idiomas.

As alterações afetam apenas novos registros. As contas e solicitações anteriores conservam seu estado e papel. Uma solicitação pendente anterior nunca é aprovada porque a modalidade é alterada. Cada finalização volta a consultar a modalidade e o papel vigentes; se não houver papel válido, não habilita a conta. São mantidos E-mail OTP, limites de envio e tentativas, permissões de configuração e auditoria.

A marca de papel público com acesso básico (`isPublic`) conserva sua validação de mínimos permisos no editor de papéis, mas já não restringe o seletor do papel inicial. Escolher um papel de gestão ou Administrador outorga esse mesmo alcance às contas novas; a vista mostra esse alcance e o inclui na confirmação.

A consulta privada de configuração entrega os papéis na mesma resposta: uma única petição HTTP, sem consultas adicionais ao mudar de idioma ou abrir o seletor. Acrescenta uma leitura do catálogo de funções às duas leituras existentes dessa vista. As demais vistas conservam seu orçamento de consultas.

## Extensão

`src/server/services/registration-hook.ts` expõe `onUserRegistered(user, context)`. O núcleo não cria perfis de CRM, CMS ou outros negócios. A função recebe apenas identidade e uma chave estável `registration:<userId>`; não recebe permissões mutáveis.

A tabela `registration_event` evita entregas duplicadas completadas e reclama execuções por meio de uma atualização condicional. Uma entrega falhada fica pendente e uma entrega atascada pode ser retomada após cinco minutos. Um administrador pode reintentar por meio de `POST /api/private/hooks/:userId/retry`.

A semântica é **pelo menos uma vez**: um processo poderia terminar após produzir um efeito e antes de marcar o evento como completado. O consumidor deve fazer suas escritas idempotentes com `context.idempotencyKey`, por exemplo, por meio de um índice UNIQUE. Não prometemos efeitos externos exatamente uma vez. Os erros do ponto de extensão não concedem permissões adicionais nem bloqueiam a persistência da identidade verificada.

Para estender um CMS, crie uma tabela de perfil própria com `user_id UNIQUE`, insira com `ON CONFLICT DO NOTHING` e conserve o controle de permissões fora do callback. O exemplo não é executado automaticamente e não pertence ao núcleo TBA.
