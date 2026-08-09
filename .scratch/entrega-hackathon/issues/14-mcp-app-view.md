# 14 — View do MCP: "o que o agente comprador viu vs. o que faltou"

**What to build:** uma view renderizada dentro do Studio que mostra, produto a produto, o que
o agente comprador conseguiu confirmar e o que faltava — e, ao lado, o mesmo produto depois
da otimização. É o número do ticket 04 virando imagem: em vez de uma taxa de sucesso dita em
voz alta, o jurado vê a rejeição acontecendo e o motivo dela.

**Como se constrói.** O contrato é MCP puro, confirmado pela doc da deco
(`full-code-guides/building-views/`) e pela spec SEP-1865:

1. A tool declara `_meta.ui.resourceUri` apontando para um bundle HTML.
2. O servidor serve esse HTML como **resource**, com `mimeType: "text/html;profile=mcp-app"`.
3. A página faz o handshake `postMessage` (`ui/initialize`) com o host, dentro de 15s.

A linguagem do backend é irrelevante para o protocolo — o servidor .NET serve a view sem
problema. O que continua sendo JS é a **página**.

**A restrição que define o desenho:** a CSP é `default-src 'none'; connect-src 'none'`. A
view não busca nada — nem do nosso servidor, nem de CDN. Todo o dado que ela mostra chega
pelo **resultado da tool**, entregue pelo host no handshake. Por isso o ticket 04 precisa
produzir a comparação como objeto estruturado: a view é só o renderizador dele.

**Como produzir o bundle:** Vite + `vite-plugin-singlefile` num diretório pequeno, usando o
SDK `@modelcontextprotocol/ext-apps` para o handshake, com o HTML de saída embutido como
embedded resource no assembly .NET. Escrever HTML + JS inline à mão evita o toolchain, mas
depende de acertar o formato exato das mensagens do handshake — e errar isso queima horas.
O build roda uma vez e cospe um arquivo; o runtime segue .NET puro.

**Como validar sem depender do agente:** `docs/deco-studio-internals.md` §6 registra que a
aba **UI** da própria Connection deixa rodar e re-rodar a tool e ver o card renderizado, sem
precisar de agente nem de provider. É o caminho mais curto para saber se tool + handshake
estão de pé — e a §2 do mesmo doc confirma, por observação direta, que a aba UI só aparece
para servers que falam `ext-apps`.

**Blocked by:** 04 (a view renderiza a saída estruturada da comparação).

**Status:** ready-for-agent

- [ ] O servidor expõe a view como recurso e a declara via `_meta.ui.resourceUri` na tool que a usa
- [ ] A view completa o handshake dentro do timeout e renderiza dentro do Studio
- [ ] Todo CSS e JS é inline; a página não faz nenhuma requisição de rede
- [ ] A tela mostra, por produto, requisitos confirmados e requisitos que faltaram, no antes e no depois
- [ ] A view está fixada na org (`VIRTUAL_MCP_PINNED_VIEWS_UPDATE`) e abre em dois cliques a partir da home

## Comments

**04/08/2026 — ponto de partida.** `apps/mcp-app/` já existe, mas é o scaffold cru do
template deco (`api/tools/hello.ts`) — nenhuma tool ou view nossa.

**05/08/2026 — premissa antiga descartada.** `apps/mcp-app/` não existe mais no disco: era
teste, foi removido. Com ele caem tanto o problema do repo git aninhado (registrado aqui e na
15) quanto a ideia de construir a view como MCP App separado do template. A view passa a ser
servida pelo próprio servidor .NET, como resource — menos peças, nenhum runtime novo para
publicar.

Este ticket também **perdeu a regra de corte** que tinha ("cortar sem hesitar se o P0
escorregar"): a UI foi promovida a prioridade explícita. O que a substitui é a ordem — ela
vem depois de o loop estar fechado (fases 1 e 2 do README), não antes.

**07/08/2026 — a tela saiu deste ticket.** O desenho da tela virou spec própria em
`.scratch/view-antes-depois/spec.md`: app React/TS/Vite em `apps/comparison-view/` com dados
mockados, sem rede e sem MCP no circuito. A 14 fica com o que sempre foi o risco de verdade —
resource, `_meta.ui.resourceUri` e handshake — e passa a renderizar o componente que a outra
spec produz.

Motivo da separação: as duas incertezas (o handshake sobe? a tela comunica?) falham por
motivos diferentes e não deviam falhar no mesmo passo. Separadas, uma tela pronta sem
handshake ainda é apresentável num front próprio; um handshake provado sem tela é trabalho que
não se perde.

Decidido junto: a tela é escrita **uma vez** e serve aos dois consumidores — a view dentro do
Studio e um front próprio servido à parte. A única diferença entre eles é de onde vem o
`BeforeAfterComparisonResult` (handshake vs. HTTP); o componente de topo é o mesmo.

A spec registra um achado que volta para cá e para a 04: a tela precisa de dois campos que o
servidor **não produz hoje** — a origem de cada dado confirmado e o trecho da descrição onde a
informação já estava. Sem eles não existe o drill-down de evidência.

**08/08/2026 — a tela mudou de endereço, não de natureza.** O desenvolvimento passou a seguir só
no `apps/web/` e o `apps/comparison-view/` foi aposentado como app; componentes, fixtures e
testes migram para lá (ticket 04 da `exame-guiado`, e emenda ao D7 no fim daquela spec).

**Nada disso bloqueia este ticket**, porque ele nunca dependeu de o `comparison-view` existir
como app — dependia de o `ComparisonView` ser função pura do `BeforeAfterComparisonResult`, e
essa propriedade virou critério explícito no 11 justamente para não se perder na migração.

Duas coisas para conferir na hora de montar o bundle, que antes o isolamento do app dava de
graça: o `apps/web` traz shadcn, Tailwind v4 e `@fontsource-variable/geist` no entorno, e sob
`default-src 'none'` **a fonte precisa virar data URI ou sair**. Ícones do `lucide-react` são
SVG inline e não são problema; Tailwind compila para CSS e também não. O que não pode entrar no
componente é qualquer coisa que exija requisição em runtime.
