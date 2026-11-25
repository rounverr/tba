# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> Idioma e seletor do painel

<p align="center"><a href="../en/workspace-i18n.md" lang="en">English</a> | <a href="../es/workspace-i18n.md" lang="es">Español</a> | <strong>Português</strong> | <a href="../de/workspace-i18n.md" lang="de">Deutsch</a> | <a href="../fr/workspace-i18n.md" lang="fr">Français</a> | <a href="../it/workspace-i18n.md" lang="it">Italiano</a> | <a href="../zh/workspace-i18n.md" lang="zh">简体中文</a> | <a href="../ja/workspace-i18n.md" lang="ja">日本語</a> | <a href="../hi/workspace-i18n.md" lang="hi">हिन्दी</a> | <a href="../ar/workspace-i18n.md" lang="ar">العربية</a></p>

[Documentação técnica](README.md) | [Visão geral do projeto](../README.pt.md)

> [!TIP]
> O inglês é a base do código e do assistente setup. As dez traduções e fontes locais estão incluídas. Use `npm run setup -- --languages en,pt` para habilitar somente inglês e português, sem instalar pacotes nem apagar outras traduções. Omitir `--languages` preserva a seleção atual ou habilita os dez quando não existe lista. Inglês permanece habilitado como fallback das traduções. `--locale en` define o idioma padrão da aplicação e aceita qualquer idioma habilitado. A interface prioriza a preferência salva, depois o idioma compatível do navegador e finalmente o padrão configurado. Mudar idioma não recarrega a página nem reinicia formulários; árabe mantém RTL.

Login, páginas públicas, administração, diálogos, validações e e-mails oferecem `en`, `es`, `pt`, `de`, `fr`, `it`, `zh`, `ja`, `hi` e `ar`. A prioridade é preferência válida salva (`tba-language`), primeiro idioma compatível de `navigator.languages`/`navigator.language` e inglês. Variantes como `es-AR`, `pt-BR` e `en-GB` são normalizadas.

O seletor é um botão de 48 × 38 px com o símbolo de idiomas e uma flecha. Seu menu mostra os dez nomes nativos, códigos breves e a opção atual marcada, com cores e superfícies do tema. A largura e a altura são limitadas ao espaço disponível. Reutiliza-se `ui/select.tsx`, conservando o select nativo oculto para serialização e adicionando conteúdo de disparador, cabeçalho e dimensões opcionais. Os demais selects conservam seus valores e funcionamento.

O menu suporta flechas, Início/Fim, escrita por inicial, Enter, Escape, Tab e fechamento exterior. O foco retorna ao controle ao escolher ou cancelar com Escape. O glifo de idioma permanece estável e somente gira a flecha. Respeitam-se movimento reduzido, teclado, leitor de tela, dispositivos móveis e RTL. O seletor aparece apenas no Login e no cabeçalho da app. Os diálogos e formulários herdam essa preferência e não incluem controles de idioma próprios.

## Textos e dados

`AuthI18n` reutiliza o contexto existente para o painel. `page=panel` configura idioma e direção, enquanto Admin conserva seus títulos por vista e o guard de autorização existente. A saída inicial do painel segue vazia até autorizar.

`src/lib/i18n/panel/*.json` centraliza os catálogos do painel. `panel.ts` aplica fallback e parâmetros; `panel-sources.json` vincula as etiquetas canônicas existentes e as mensagens públicas do servidor com chaves traduzíveis. `use-panel.ts` oferece o formato a componentes. Os textos dinâmicos de confirmação e download guardam chaves e parâmetros, por isso mudam de idioma mesmo estando abertos.

`src/lib/i18n/config.ts` centraliza idiomas e direção. `messages/*.json` e `panel/*.json` contêm os catálogos públicos e administrativos; `catalog.ts`, `panel.ts` e o contexto comum fornecem chaves, parâmetros e fallback. Mantenha os dez catálogos completos. Erros desconhecidos usam mensagem pública traduzida. Nomes, endereços, funções personalizadas e códigos não são traduzidos.

`X-Auth-Language` escolhe um idioma habilitado para o e-mail, nunca permissões. Sem cabeçalho ou preferência válida, usa o padrão configurado (inglês inicialmente). Preferência desabilitada também retorna ao padrão. Inglês continua como fallback de chaves ausentes. Acesso/cadastro verificado e seleção no painel guardam a preferência em `verification` (`mail-language:<userId>`); avisos posteriores usam o idioma do destinatário. Mudar idioma não reenvia códigos nem altera validade, tentativas ou verificação. Erros antigos continuam reconhecidos por compatibilidade.

O seletor aparece no Login e no cabeçalho da aplicação. Diálogos herdam o idioma, sem seletores próprios. React atualiza textos sem recarregar ou navegar, mantendo formulários, sessão e vista atual. Uma mudança no painel também envia `POST /api/private/profile/language` para lembrar o idioma de e-mails posteriores, sem recarregar dados administrativos. Armazenamento bloqueado não impede a tradução na visita atual.

## RTL e fontes

Árabe coloca a barra lateral e os margens do painel à direita, adapta a imagem de boas-vindas, flechas, controles, tabelas e diálogos. E-mails, chaves e códigos conservam LTR. Os botões longos e as linhas de segurança são ajustados em telas pequenas. Os menus usam as fontes locais dos dez idiomas. Os subconjuntos CJK incorporam também os caracteres dos novos catálogos do painel, mediante `scripts/build-auth-fonts.py`.

## Arquivos e verificação

As provas de idioma usam Better Auth e D1 locais ou APIs simuladas. Veja [implementação do acesso multilíngue](auth-i18n.md).

O inglês permanece incluído como fallback. Os outros catálogos de login e painel usam imports dinâmicos e cache em memória por módulo. O foco do teclado ou ponteiro antecipa apenas a opção indicada; abrir o menu não baixa todos os idiomas. A troca ocorre quando os catálogos estão prontos, preservando formulários, sessão e navegação. Idiomas em cache não exigem rede; vale a última escolha. Falhas iniciais mostram inglês; falhas na troca mantêm o idioma atual. E-mails e metadados do build usam catálogos completos apenas no servidor. Consulte a [carga de idiomas](language-loading.md).
