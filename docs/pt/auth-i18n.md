# <picture><img src="../assets/icons/globe.svg" width="28" height="28" alt=""></picture> Idiomas do acesso público

<p align="center"><a href="../en/auth-i18n.md" lang="en">English</a> | <a href="../es/auth-i18n.md" lang="es">Español</a> | <strong>Português</strong> | <a href="../de/auth-i18n.md" lang="de">Deutsch</a> | <a href="../fr/auth-i18n.md" lang="fr">Français</a> | <a href="../it/auth-i18n.md" lang="it">Italiano</a> | <a href="../zh/auth-i18n.md" lang="zh">简体中文</a> | <a href="../ja/auth-i18n.md" lang="ja">日本語</a> | <a href="../hi/auth-i18n.md" lang="hi">हिन्दी</a> | <a href="../ar/auth-i18n.md" lang="ar">العربية</a></p>

[Documentação técnica](README.md) | [Visão geral do projeto](../README.pt.md)

> [!TIP]
> O inglês é a base do código e do assistente setup. As dez traduções e fontes locais estão incluídas. Use `npm run setup -- --languages en,pt` para habilitar somente inglês e português, sem instalar pacotes nem apagar outras traduções. Omitir `--languages` preserva a seleção atual ou habilita os dez quando não existe lista. Inglês permanece habilitado como fallback das traduções. `--locale en` define o idioma padrão da aplicação e aceita qualquer idioma habilitado. A interface prioriza a preferência salva, depois o idioma compatível do navegador e finalmente o padrão configurado. Mudar idioma não recarrega a página nem reinicia formulários; árabe mantém RTL.

O acesso público suporta inglês (`en`), espanhol (`es`), português (`pt`), alemão (`de`), francês (`fr`), italiano (`it`), chinês simplificado (`zh`), japonês (`ja`), hindi (`hi`) e árabe (`ar`). O inglês é o fallback.

## Auditoria e escopo

O aplicativo usa Astro estático com ilhas React e autenticação sem senha por meio do Better Auth. Não existia uma camada i18n. Os textos estavam no Login, nas páginas públicas e nas mensagens do servidor. Reutilizam-se o estado React, os componentes atuais e as rotas existentes, sem adicionar pacotes npm.

São traduzidos o ingresso, o registro aberto ou com aprovação, a verificação de e-mail, OTP, MFA, códigos de recuperação, ajuda, avisos de reautenticação, erros, validações, carga, retorno do Google, acesso negado e página inexistente. Os e-mails OTP do acesso são enviados no idioma escolhido. Não existem telas de senha, recuperação ou redefinição de senha: não se adiciona esse mecanismo. A ampliação posterior incorpora também o painel administrativo e seus ajustes; veja [seletor e painel multilíngue](workspace-i18n.md).

## Resolução e carga inicial

`src/lib/i18n/config.ts` centraliza os dez idiomas, nomes nativos, direção e chave `tba-language`. A prioridade é a preferência válida de `localStorage`, o primeiro idioma compatível de `navigator.languages`, `navigator.language` e, finalmente, o inglês. São normalizadas as maiúsculas, hifens e variantes regionais, como `es-AR`, `pt-BR` ou `en-GB`.

`Base.astro` executa o mesmo resolver sincronicamente no head. Configura `lang`, `dir` e título antes de mostrar o conteúdo. O HTML estático usa o inglês para coincidir com a primeira hidratação; `data-auth-pending` oculta a ilha até que `AuthI18n` aplique a tradução por meio de `useLayoutEffect`. Assim, não se vê um lampejo de outro idioma. Os acessos bloqueados ao armazenamento são capturados e se utiliza o navegador ou o estado da visita.

O seletor compacto usa um botão com o símbolo de idioma e um menu próprio. Tem nome acessível traduzido e opções com nomes nativos, `lang` e `dir`. O seletor nativo oculto conserva a serialização. Alterá-lo atualiza o contexto React e persiste a preferência. Não recarrega, navega nem consulta a API. Não se remonta o formulário: conserva o e-mail, código, intenção de registro, passo, confiança do dispositivo, espera de reenvio, erros e operação em curso. Os erros guardam chaves, por isso também mudam de idioma enquanto estão visíveis. O idioma escolhido persiste entre visitas; os campos e códigos não são guardados no armazenamento.

## Catálogos, erros e e-mails

`src/lib/i18n/messages/*.json` contém 112 chaves por idioma. `catalog.ts` tipa as chaves, interpola parâmetros e resolve faltantes para o inglês. Uma chave desconhecida mostra um erro público traduzido, nunca a chave interna. As marcas, e-mails inseridos, códigos e nomes de organização são dados, não traduções.

`errors.ts` transforma as mensagens públicas existentes e os códigos conhecidos da API em chaves de apresentação. Os erros desconhecidos não expõem detalhes do servidor. Os campos conservam restrições e validação do servidor; são apresentadas validações locais traduzidas em vez de mensagens nativas dependentes do idioma instalado no navegador. Os dígitos árabes, persas, devanagari e de largura completa de OTP são normalizados para os mesmos seis dígitos ASCII. Os códigos de recuperação são mantidos intactos.

`X-Auth-Language` escolhe um idioma habilitado para o e-mail, nunca permissões. Sem cabeçalho ou preferência válida, usa o padrão configurado (inglês inicialmente). Preferência desabilitada também retorna ao padrão. Inglês continua como fallback de chaves ausentes. Acesso/cadastro verificado e seleção no painel guardam a preferência em `verification` (`mail-language:<userId>`); avisos posteriores usam o idioma do destinatário. Mudar idioma não reenvia códigos nem altera validade, tentativas ou verificação. Erros antigos continuam reconhecidos por compatibilidade.

O Turnstile recebe o idioma selecionado, com `zh-CN` para chinês simplificado. Seu widget é recriado ao alterá-lo para atualizar sua interface. Isso invalida a prova CAPTCHA anterior e requer a prova do widget atualizado; conserva os demais dados do formulário e os controles do servidor.

## Design, RTL e fontes

Árabe configura `dir=rtl`, inverte as setas de navegação e ajusta o painel de imagem, o fechamento de ajuda e as alinhamentos. Correios e códigos usam LTR e isolamento bidirecional. As cabeçalhos admitem várias linhas, os textos longos se ajustam e as etiquetas não dependem de larguras fixas. Mantém a identidade, o tema e a adaptação móvel existentes.

As fontes WOFF2 são servidas a partir de `public/fonts`, com a política `font-src 'self'` existente. Inter continua para os idiomas latinos. As famílias TBA Arabic e TBA Devanagari conservam os glifos das fontes Noto originais. TBA Chinese e TBA Japanese incluem os caracteres dos catálogos chinês, japonês e inglês e os nomes do seletor. A ampliação também inclui os catálogos do painel; as fontes do sistema cobrem outros caracteres de dados introduzidos. Somente as fontes que o navegador precisa são baixadas. Não há solicitações a provedores de fontes.

As fontes procedem de Noto Sans Arabic, Noto Sans Devanagari e Noto Sans CJK, com licença [SIL OFL 1.1](../licenses/noto-fonts.txt). As famílias modificadas foram renomeadas. Para regenerá-las após adicionar caracteres aos catálogos CJK, execute `/usr/bin/python3 scripts/build-auth-fonts.py /usr/share/fonts` em um ambiente de manutenção com Noto, fontTools e Brotli. É uma ferramenta opcional: o build e a aplicação não requerem Python nem dependências novas. A redistribuição conserva a licença no repositório.

## Arquivos da implementação

- Configuração, resolver, catálogos e erros: `src/lib/i18n/config.ts`, `catalog.ts`, `errors.ts` e os dez JSON de `messages/`.
- Interface: `AuthI18n.tsx`, `AuthPublic.tsx`, `Login.tsx`, `Brand.tsx`, `ThemeToggle.tsx` e `Turnstile.tsx` em `src/components/`.
- Carga e rotas públicas: `src/layouts/Base.astro`, `src/pages/index.astro`, `login.astro`, `login/complete.astro`, `denied.astro` e `404.astro`.
- Estilos e fontes: `src/styles/global.css`, `public/fonts/`, `scripts/build-auth-fonts.py` e `docs/licenses/noto-fonts.txt`.
- Apresentação das solicitações e correios: `src/lib/utils.ts`, `src/server/auth.ts`, `src/server/index.ts` e `src/server/services/auth-mail.ts`.
- Testes: `tests/auth-i18n.test.ts`, `tests/auth.test.ts` e `tests/browser/auth-i18n.mjs`. Documentação: este arquivo, `docs/validation.md`, `README.md` e `CHANGELOG.md`.

## Validação

`tests/auth-i18n.test.ts` verifica os dez catálogos, parâmetros, variantes, prioridade, resolver do head, fallback, direção, erros, normalização e textos de correio. A integração em `tests/auth.test.ts` entrega OTP em dez idiomas com Better Auth e D1 locais, e verifica uso único. Não envia correios reais.

`tests/browser/auth-i18n.mjs` usa um Playwright já disponível e APIs simuladas. É executado contra o build servido localmente:

```sh
AUTH_TEST_URL=http://127.0.0.1:4321 \
PLAYWRIGHT_MODULE=/ruta/a/playwright/index.js \
node tests/browser/auth-i18n.mjs
```

Inclui detecção antes de hidratar, ausência de piscar, persistência, mudança imediata sem navegação nem solicitações, conservação do formulário e carga em curso, dez idiomas de ingresso/registro/OTP/MFA/recuperação, erros, ajuda, as páginas públicas, armazenamento bloqueado, CAPTCHA, avisos de reautenticação e larguras de 320, 390, 768 e 1440 px. A verificação visual adicional verifica fontes reais e escritório/móvel para árabe, hindi, chinês, japonês, alemão e francês.

O inglês permanece incluído como fallback. Os outros catálogos de login e painel usam imports dinâmicos e cache em memória por módulo. O foco do teclado ou ponteiro antecipa apenas a opção indicada; abrir o menu não baixa todos os idiomas. A troca ocorre quando os catálogos estão prontos, preservando formulários, sessão e navegação. Idiomas em cache não exigem rede; vale a última escolha. Falhas iniciais mostram inglês; falhas na troca mantêm o idioma atual. E-mails e metadados do build usam catálogos completos apenas no servidor. Consulte a [carga de idiomas](language-loading.md).
