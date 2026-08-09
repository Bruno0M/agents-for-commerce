# Spec — O `apps/web` como view do Studio

> **Migrado para o GitHub: [#3](https://github.com/Bruno0M/agents-for-commerce/issues/3).** Este arquivo é histórico — edite a issue, não este arquivo.

**Status:** ready-for-agent

**Escopo desta spec:** transformar o `apps/web/` — que hoje só roda como SPA própria em
`localhost` — numa **view do Deco Studio**, aberta como aba na área principal, do mesmo jeito
que a aba `Calculator` do tutorial da deco. Cobre o contrato MCP (resource + `_meta.ui.resourceUri`
+ handshake), o build single-file, a troca de transporte, e a fixação da view na org.

**Não cobre:** nenhuma tela nova, nenhuma tool nova de domínio, nenhuma mudança no que o
`/web` mostra. Se um ticket daqui pedir para redesenhar alguma tela, o ticket está errado.

**Relação com o issue tracker:** é o desdobramento de
`.scratch/entrega-hackathon/issues/14-mcp-app-view.md`. A 14 continua sendo o ticket-guarda-chuva
("a view existe e está fixada"); esta spec é a decomposição executável dela, e os critérios da 14
são satisfeitos quando os tickets 04, 06 e 07 daqui fecharem.

Ela também **derruba uma premissa** registrada em `.scratch/exame-guiado/issues/05-fase-1-conectar-e-ler-o-catalogo.md`
— ver D3.

---

## Problem Statement

Hoje o `apps/web/` só existe se alguém rodar `bun dev` na própria máquina. Isso tem três
consequências, e a terceira é a que dói.

**Primeira:** o jurado não vê. A entrega do hackathon acontece dentro do Studio, e uma SPA em
`localhost:5173` não está lá. O que está lá são as Connections, os Agents e as views fixadas na
sidebar da org.

**Segunda:** o loop fica partido em dois lugares. O agente comprador roda no `mcp-server`, que
o Studio já conhece como Connection. A tela que explica o que ele fez roda em outro processo,
em outro domínio, com outro modelo de autenticação. Quem apresenta precisa alternar entre duas
janelas para contar uma história só.

**Terceira, e a que trava:** o transporte real do `/web` está bloqueado por um problema de
segurança que não tem saída boa fora do Studio. O comentário do ticket 05 da `exame-guiado`
registra: `get_product_catalog` custa zero e por isso pôde virar `GET /catalog` isento de auth
(`apps/mcp-server/Program.cs:107`), mas `generate_test_orders`, `compare_buyer_agent_rounds`,
`generate_optimized_content` e `publish_suggestion` **queimam crédito de LLM por chamada**.
Expor essas como rota isenta cria endpoint público que gasta dinheiro de quem descobrir a URL;
mandar o bearer para dentro do bundle viola o critério explícito do próprio ticket. O caminho
que sobrava era proxy de dev do Vite — que resolve na máquina do desenvolvedor e não resolve
em lugar nenhum onde a demo acontece.

Ou seja: **o `/web` não tem como completar o próprio transporte enquanto viver fora do Studio.**

## Solution

O `apps/web/` passa a ser compilado num **HTML único**, servido pelo `mcp-server` .NET como
resource MCP, e declarado por uma tool via `_meta.ui.resourceUri`. O Studio renderiza esse HTML
num iframe na área principal, e a view é fixada na org para abrir em dois cliques.

Dentro desse iframe, o `/web` **para de falar HTTP** e passa a chamar as tools do próprio
servidor pelo bridge do host — `app.callServerTool({ name, arguments })`. Quem executa a chamada
é o Studio, com as credenciais que a Connection já guarda.

Isso mata os três problemas de uma vez: a tela está onde a demo acontece, o loop fica num lugar
só, e o transporte deixa de precisar de bearer no bundle, de CORS, de rota isenta e de proxy.

### O contrato, verificado no código

Não há duas maneiras de fazer isso. O `full-code-guides/building-views.mdx` da deco descreve
outro mecanismo — o diretório `/view` de um worker deco com RPC tipado — que **não se aplica**
a um backend .NET. O mecanismo que vale é o MCP App (`ext-apps`), e ele foi confirmado lendo o
clone do Studio em `apps/studio/` (não versionado; clone local de referência):

| Fato | Onde foi confirmado |
| --- | --- |
| Uma view fixada é `{connectionId, toolName, label, icon}` — **uma tool**, não uma URL | `apps/api/src/tools/virtual/pinned-views-update.ts:16` |
| Só entram como candidatas as tools em que `getUIResourceUri(t._meta)` resolve | `apps/web/src/views/virtual-mcp/layout-tab-content.tsx:83` |
| A chave da aba é `ext-apps:${connectionId}:${toolName}` | `apps/web/src/views/virtual-mcp/layout-tab-content.tsx:302` |
| O mime type do resource é `text/html;profile=mcp-app` | `packages/shared/src/mcp-apps/types.test.ts:11` |
| A aba principal renderiza em `displayMode: "fullscreen"` | `apps/web/src/routes/project-app-view.tsx` (`handleRequestDisplayMode`), `apps/web/src/components/home/home-grid.tsx:311-322` |
| O iframe roda com `sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"` | `apps/web/src/mcp-apps/mcp-app-renderer.tsx:167` |
| O `AppBridge` recebe o cliente MCP do host e auto-liga `oncalltool` | `apps/web/src/mcp-apps/use-app-bridge.ts:325` |
| O guest chama tools com `app.callServerTool(params)` | `@modelcontextprotocol/ext-apps@1.7.1`, `dist/src/app.d.ts:917` |
| A CSP default e o override por `_meta.ui.csp` | `packages/shared/src/mcp-apps/csp-injector.ts` (`DEFAULT_CSP`, `buildCSPPolicy`) |

E do lado .NET, o SDK 1.2.0 já tem tudo: `McpServerResource` / `WithResourcesFromAssembly`,
`TextResourceContents` com `MimeType`, e `Meta` (serializado como `_meta`) nas primitivas.
Nenhum runtime novo, nenhum pacote novo no servidor.

---

## User Stories

**Como jurado da hackathon**

1. Como jurado, quero abrir a org e ver o exame como uma aba ao lado das outras, para entender
   que isso é parte do Studio e não um site solto que alguém abriu numa aba do navegador.
2. Como jurado, quero clicar na aba e ver a tela carregada com dados da loja de verdade, sem
   ninguém rodar comando nenhum.

**Como apresentador**

3. Como apresentador, quero contar a história inteira sem trocar de janela, para não gastar
   tempo de pitch em alt-tab.
4. Como apresentador, quero que a tela abra em dois cliques a partir da home da org, para não
   navegar por menu durante a demo.

**Como lojista (o usuário que o projeto finge ter)**

5. Como lojista, quero rodar o exame de dentro do Studio onde minha loja já está conectada,
   para não configurar credencial em dois lugares.

**Como desenvolvedor**

6. Como desenvolvedor, quero continuar rodando o `/web` com `bun dev` e fixtures, para
   desenvolver tela sem depender do Studio nem de loja no ar.
7. Como desenvolvedor, quero que o bearer token não exista dentro do bundle, para poder
   distribuir o HTML sem vazar credencial.
8. Como desenvolvedor, quero descobrir cedo se o handshake sobe, para não empilhar trabalho em
   cima de uma integração que talvez não feche.

---

## Implementation Decisions

### D1 — O transporte é o bridge, não HTTP

Dentro do Studio o `/web` chama `app.callServerTool({ name, arguments })`. Não faz `fetch`.

O motivo é o Problem Statement inteiro: é isso que tira o bearer do bundle e dispensa CORS,
rota isenta e proxy. O host já tem um cliente MCP autenticado para aquela Connection e o
`AppBridge` expõe `oncalltool` automaticamente (`use-app-bridge.ts:325`).

**A alternativa foi considerada e recusada.** A CSP é negociável: `buildCSPPolicy` lê
`_meta.ui.csp.connectDomains` e emite `connect-src` com os domínios declarados. Dava para
apontar o iframe direto no `mcp-server` — e isso devolveria na hora o problema do bearer no
bundle, que é o critério que o ticket 05 da `exame-guiado` protege. **Não declaramos
`connectDomains`.** A view roda sob a CSP default, e isso é um critério verificável, não uma
intenção.

### D2 — Uma árvore de componentes, dois transportes

O `/web` continua rodando como SPA própria com `bun dev`. Não existe fork, não existe segunda
cópia dos componentes.

O que existe é uma **interface de transporte** com duas implementações — `fetch` para o front
avulso, `callServerTool` para o Studio — escolhida uma vez no entry point. Nenhum componente
sabe qual está ativa.

Isso é a generalização direta do D7 da `exame-guiado`, que já dizia que a fronteira é entre
orquestração e renderização. O seam também já existe e está documentado como tal em
`apps/web/src/diagnosis/lib/runSimulationAgent.ts`, que se descreve como "o SEAM do transporte
futuro". **Emenda ao que aquele arquivo prevê:** ele diz que o corpo das funções "troca para um
`fetch`". Para o alvo Studio, troca para `callServerTool`.

O modo fixture não morre. Continua sendo como as telas se desenvolvem sem loja no ar.

### D3 — O `GET /catalog` não morre, mas deixa de ser o caminho principal

`apps/mcp-server/Program.cs:107` existe porque "o browser não fala o JSON-RPC do MCP". A
premissa vale para uma SPA avulsa e **não vale dentro do iframe**, onde o host fala MCP pela
gente.

A rota fica de pé para o modo avulso (D2) e porque removê-la não ganha nada agora. Mas nenhum
ticket desta spec adiciona rota nova, isenção nova ou policy CORS nova — e essa é a regra que
substitui o "caminho provável: proxy de dev do Vite" registrado no ticket 05 da `exame-guiado`.

### D4 — A tool hospedeira é nulária e burra

A tool que carrega `_meta.ui.resourceUri` não recebe parâmetro nem devolve dado de domínio.
Ela existe para ser um ponto de montagem.

O host tem dois caminhos para alimentar a view: pré-executar a tool hospedeira e injetar o
`toolResult` no iframe (`project-app-view.tsx` faz isso via `useMCPToolCall`), ou deixar a
própria view chamar tools pelo bridge. **Escolhemos o segundo.** Uma tool hospedeira que
devolvesse o exame inteiro obrigaria o exame a rodar — e a gastar crédito de LLM — toda vez que
alguém clicasse na aba, antes de a pessoa pedir qualquer coisa. A view carrega vazia e o
usuário dispara o que quiser.

### D5 — Risco na ordem certa: handshake antes de conteúdo

O primeiro ticket sobe um bundle **mínimo** — um "hello" de poucas linhas — só para provar
resource + `_meta` + handshake. O `/web` de verdade entra depois.

O motivo é a assimetria de diagnóstico. Se subirmos o `/web` completo de primeira e a tela não
aparecer, o suspeito é qualquer coisa entre a serialização do `_meta` em C#, o mime type, o
timeout de 15s do handshake, o tamanho do bundle, a CSP e um `import()` dinâmico que o Vite
deixou escapar. Com um bundle trivial, sobra um suspeito por vez.

A validação não precisa de agente nem de provider: a aba **UI** da própria Connection roda a
tool e mostra o card (`apps/web/src/components/details/connection/connection-ui-tab.tsx`, com
`displayMode="inline"`), conforme já registrado em `docs/deco-studio-internals.md` §6.

### D6 — O bundle é um arquivo, e isso é verificado por teste

`vite-plugin-singlefile` num modo de build separado do `bun dev`. A CSP default impõe o que o
build precisa garantir:

- `font-src data:` → o `@fontsource-variable/geist` vira data URI ou sai. Se virar data URI,
  entra o peso da fonte no HTML; medir antes de decidir.
- `base-uri 'none'` → nada de roteamento por URL. O `App.tsx` já navega por
  `useState<Destination>`; isso deixa de ser acaso e vira requisito.
- `script-src`/`style-src` só com `'unsafe-inline'` → zero arquivo externo, zero code splitting,
  zero `import()` dinâmico.
- `img-src * data: blob:` é aberto e `lucide-react` é SVG inline — imagem e ícone não são
  problema.

"Um arquivo só, sem referência externa" é o tipo de propriedade que quebra silenciosamente numa
dependência nova. Vira asserção automatizada (ver Testing Decisions), não inspeção manual.

### D7 — O bundle entra no assembly como embedded resource

O HTML de saída do build vai para dentro do `.csproj` como `EmbeddedResource`, e o servidor o
serve a partir do assembly. Sem arquivo solto no disco, sem caminho relativo que muda entre
`dotnet run` e publish.

O custo é honesto e fica registrado: **o ciclo de iteração passa a ser rebuild do .NET.** Não
temos o hot reload que o vídeo tutorial da deco mostra, porque aquilo é um projeto full-code
que o próprio Studio hospeda e gerencia — nosso servidor é externo, registrado como Custom
Connection. Por isso o D2 importa tanto: o desenvolvimento de tela continua acontecendo no
`bun dev`, e o bundle só é regerado quando se quer ver a coisa dentro do Studio.

---

## Testing Decisions

O que é verificável por máquina, e portanto tem teste:

- **A pureza do bundle.** Um teste roda o build de produção e falha se o `dist/` tiver mais de
  um arquivo, ou se o HTML contiver `src=`/`href=` apontando para fora (http, https, //, ou
  caminho relativo). É a rede de segurança do D6 e o único jeito de essa propriedade sobreviver
  a uma dependência nova.
- **A seleção de transporte.** Testes do módulo de transporte cobrem as duas implementações
  contra a mesma interface, com o bridge mockado. Nenhum componente é testado duas vezes por
  causa disso — se for preciso, o D2 está sendo violado.
- **A ausência de segredo.** Um teste falha se a string do bearer token, ou o nome da variável
  de ambiente que a carrega, aparecer no HTML gerado.
- **O `_meta` que o servidor emite.** Teste no `McpServer.Tests` afirmando que a tool hospedeira
  serializa `_meta.ui.resourceUri` e que o resource responde com `mimeType`
  `text/html;profile=mcp-app`. É o contrato inteiro do lado .NET, e é barato de afirmar.

O que **não** tem teste automatizado, e por quê:

- **O handshake dentro do Studio.** Depende do host real. Verificação é manual, pela aba UI da
  Connection (D5), e está nos critérios dos tickets 01 e 07.
- **Layout dentro do iframe.** Altura, dialog, sheet e sidebar sob auto-resize só se avaliam
  olhando. Ticket 05.

---

## Out of Scope

- **Tela nova ou redesenho.** Esta spec porta o que existe. O que o `/web` mostra é assunto da
  `catalogo-como-exame` e da `exame-guiado`.
- **Tool de domínio nova.** As tools do `mcp-server` são as que já existem
  (`get_product_catalog`, `generate_test_orders`, `simulate_buyer_agent`,
  `compare_buyer_agent_rounds`, `generate_optimized_content`, `publish_suggestion`, ...).
  A única tool nova é a hospedeira do D4, que não faz nada.
- **Multi-loja.** Continua uma loja só, lida do boot do servidor. O D5 da `exame-guiado`
  ("conectar a loja é fachada") continua valendo palavra por palavra.
- **Publicar no registry da deco.** A Connection é custom e local à org. Virar item de registry
  é outro eixo — ver `apps/mcp-server/docs/adr/0004-task-board-nao-registry-publish.md`.
- **Migrar o `mcp-server` para o template full-code da deco.** Seria a única forma de ter o hot
  reload do vídeo, e custa reescrever o servidor em TypeScript. Não.
- **Aposentar o `GET /catalog`** (D3).

---

## Further Notes

**Ordem de construção.** Os tickets estão numerados na ordem de execução e o risco está na
frente: 01 (handshake com bundle mínimo) e 02 (build single-file) são as duas incertezas
técnicas, e falham por motivos independentes — por isso são tickets separados, executáveis em
paralelo. O 03 (transporte) é o maior volume de código mas o menor risco de descoberta, e pode
andar em paralelo com os dois primeiros porque é desenvolvido contra a interface, com o bridge
mockado. O 04 junta tudo. 05, 06 e 07 são acabamento e prova.

**O que dá para apresentar se algo escorregar.** Se o 04 não fechar, o `/web` avulso continua
apresentável — é o que já existe hoje. Se o 03 não fechar, a view sobe com fixtures e ainda
conta a história. A ordem foi escolhida para que nenhum ticket aberto derrube todos os outros.

**O tutorial da deco, e no que ele não serve de parâmetro.** O vídeo em que a IA do Studio cria
uma tool `calculator` com UI mostra o mesmo mecanismo — o resumo dele cita `_meta.ui.resourceUri`
e o resource `ui://mcp-app/calculator` explicitamente. Duas diferenças que importam: aquilo é um
projeto full-code hospedado pelo Studio, com dev server e hot reload (ver D7); e uma calculadora
mantém "toda a lógica em estado local, sem round-trips ao servidor", o que faz dela o caso em que
a CSP nunca incomoda ninguém. O `/web` é o caso oposto, e é por isso que o D1 é a decisão central
desta spec e não um detalhe de implementação.
