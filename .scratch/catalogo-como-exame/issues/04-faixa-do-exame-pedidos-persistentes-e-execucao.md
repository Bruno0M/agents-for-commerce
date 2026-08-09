# 04 — A faixa do exame: um botão só, pedidos sempre visíveis, sem aprovação

**What to build:** a faixa entre o placar e a tabela — um único botão, **"Rodar Agente de
Simulação"** — que dispara as duas chamadas do exame em sequência (escrever os pedidos em
linguagem natural, depois rodar o agente comprador contra eles) e mostra o resultado de cada
etapa assim que ela chega. O lojista não aprova nada e não edita nada: clica, e o placar e a
tabela preenchem sozinhos.

**Este desenho substitui um anterior, rejeitado pelo dono do projeto depois de implementado — ver
`## Comments` para as falas literais e o porquê.** O ticket original (aprovação explícita, sheet
com `OrderEditor`, aviso de comparabilidade ao editar) foi construído, testado e marcado `done`;
o dono olhou o resultado e pediu para simplificar. Este arquivo foi reescrito para descrever o
desenho que **de fato existe no código hoje**, não o que foi apagado.

**O argumento original sobre por que os pedidos não podem morar escondidos continua de pé — só
que satisfeito de outro jeito.** A versão anterior deste ticket argumentava, com a user story do
`exame-guiado` (*"quero entender de onde saíram as perguntas que o robô fez, e poder mudá-las —
porque se as perguntas forem convenientes demais o exame não vale nada"*), que os pedidos são o
**eixo auditável do exame** e não podem morar num modal que o lojista fecha e não reencontra. Essa
exigência não caiu: o painel de pedidos (`CatalogExamOrdersPanel.tsx`) é **sempre visível na
tela**, sem clique nenhum para abrir, com o eixo de restrição e se cada pedido espera resposta
válida — só que agora é **read-only**, porque a capacidade de editar é o que o dono cortou, não a
visibilidade.

**A descoberta técnica que motivou o corte:** a tela nunca falou com o servidor para examinar.
`diagnosis/engine.ts` é um porto TypeScript local do `BuyerAgentDecisionEngine`, e os "pedidos"
que a versão anterior deixava editar já entravam como requisito estruturado
(`HandwrittenOrder`) — sem prosa, sem chamada de LLM nenhuma. Gerar o texto em linguagem natural
de verdade e rodar o simulador de verdade contra ele é **transporte**, que é o que o ticket 05 do
`.scratch/exame-guiado/issues/` deixa em aberto (ver a seção de transporte abaixo). Editar um
pedido que nunca passou por geração nenhuma não protegia nada contra "perguntas convenientes
demais" — só dava ao lojista a ilusão de estar auditando uma etapa de IA que não rodava.

**Blocked by:** 02

**Status:** done

- [x] Um único botão, "Rodar Agente de Simulação", dispara as duas etapas do exame em sequência
      (`writeTestOrders` depois `runBuyerAgent`, `diagnosis/lib/runSimulationAgent.ts`), sem
      aprovação nem edição intermediária
- [ ] Os pedidos em prosa que o agente escreveu ficam sempre visíveis assim que a etapa 1
      resolve — antes de a etapa 2 sequer começar — com o eixo de restrição testado e se o pedido
      espera alguma resposta válida (removido por enquanto, ver `## Comments` — "A remoção
      temporária dos cartões de pedido")
- [x] Os pedidos são **read-only**: não existe `OrderEditor`, `Sheet` nem qualquer campo editável
      nesta tela
- [x] A execução tem progresso em duas etapas com escopo declarado ("escrevendo os pedidos sobre N
      produtos…", depois "rodando o agente comprador contra N pedidos e M produtos…") — nunca um
      spinner sem contexto
- [x] Falha em qualquer etapa mostra `Alert` com a mensagem exata da etapa que falhou e um botão
      "Tentar novamente" — nunca tela branca nem spinner infinito; a tabela crua continua visível
      por baixo
- [ ] Os pedidos da etapa 1 continuam visíveis e auditáveis mesmo quando a etapa 2 falha
      (o dado continua carregado e contado, mas não mais desenhado — ver `## Comments`)
- [x] A tela declara explicitamente que rodar o exame não gera conteúdo nenhum
- [x] Ao terminar, a tabela e o placar (`CatalogExamStrip`, ticket 02) preenchem sem o lojista
      navegar para lugar nenhum
- [x] Funciona inteiro em modo fixture, sem servidor no ar — e sem toggle de modo fixture: "route
      não tiver conexão com API, vai ser sempre dado mockado" é decisão literal do dono, não um
      passo intermediário
- [x] Os dois contratos mockados (`TestOrderGenerationResult`, `BuyerAgentSimulationBatchResult`
      em `diagnosis/types.ts`) são cópia campo a campo dos records C# do servidor
      (`TestOrderGenerationTools.cs`, `BuyerAgentSimulatorTools.cs`), para que plugar o transporte
      real troque a ORIGEM do dado, nunca a FORMA

## Comments

### A remoção temporária dos cartões de pedido

O dono do projeto olhou a faixa depois deste ticket entrar em `done` e pediu, apontando para os
cartões de pedido (texto em prosa, badge do eixo de restrição, "espera/não espera resposta válida"
e a rationale): **"por enquanto não preciso que mostre esses pedidos, pode remover isso."**

Isso desfaz, na prática, os dois critérios de aceite acima que dependiam da visibilidade dos
cartões — ambos desmarcados. O argumento original deste ticket (a user story do `exame-guiado`:
*"quero entender de onde saíram as perguntas que o robô fez... porque se as perguntas forem
convenientes demais o exame não vale nada"*) não deixou de valer — só ficou sem UI por ora. Por
isso a remoção é só de RENDERIZAÇÃO, marcada como "por enquanto" (é barato reverter):
`GeneratedTestOrder[]` continua sendo produzido pela etapa 1 (`writeTestOrders`), carregado pelo
reducer (`diagnosis/lib/simulationRun.ts`, sem alteração) e passado adiante para o filtro por
pedido do `CatalogExamControls.tsx` (ticket 03) e para a agregação — nada nesse caminho de dado foi
tocado. `CatalogExamOrdersPanel.tsx` manteve o botão, as duas etapas de progresso, o estado de erro
com retentativa e o rodapé ("rodar o exame não gera conteúdo nenhum"); só a `<ul>` de cartões (e o
`CONSTRAINT_AXIS_LABELS`/`Badge` que só existiam para ela) saíram. O subtítulo que anunciava "N
pedidos em linguagem natural... só leitura" também saiu — hoje, com pedidos já gerados, o painel só
diz "N pedidos gerados nesta rodada", sem prometer leitura de um conteúdo que não está mais na
tela.

### A rejeição do desenho anterior

O ticket original foi implementado (aprovação explícita, `Sheet` hospedando `OrderEditor`, aviso
de comparabilidade ao editar, distinção "mesma linha de base vs. linha de base nova") e marcado
`done`. O dono do projeto revisou o resultado e pediu, literalmente:

> "Vamos unir a fase 2 e 3. No lugar de Rodar Exame, vai ser um de 'Rodar Agente de Simulação'.
> Quando clicar nesse botão, ele já vai fazer exatamente tudo o que é necessário por debaixo dos
> panos, gerando os textos de linguagem natural e rodando esse agente simulador."

> "O user não vai precisar editar nada por agora, ele só vai ver o resultado do catálogo com as
> colunas preenchidas."

> "Enquanto não tiver conexão com api, vai ser sempre dado mockado, remova esse toggle."

Mais um pedido fixo na conversa: **4 pedidos por rodada, sem controle nenhum na tela** — nem
contador, nem seletor de quantidade.

**Por que isso é decisão de produto, não descuido de implementação:** o desenho anterior cumpria
os critérios de aceite que tinha (aprovação explícita, sheet reabrível, aviso de comparabilidade),
mas o dono julgou que o CUSTO de interação (dois cliques — aprovar, depois rodar — mais um sheet
que interrompe o fluxo) não se pagava, porque a etapa que a aprovação protegia (edição de um
pedido que nunca passou por geração de IA nenhuma) não protegia nada de real. A simplificação para
um botão só é junto com a decisão de que a tela não tem mais nada para o lojista aprovar até que
exista transporte de verdade — nesse ponto, editar um `HandwrittenOrder` local não é uma ação de
auditoria de IA, é só um formulário.

**O que sobreviveu da spec anterior, e o que caiu — nenhuma decisão morre em silêncio:**

| Do ticket 04 original | Sobreviveu? | Como |
| --- | --- | --- |
| Pedidos sempre visíveis, sem refazer nada | Sim | Painel read-only sempre na tela, nunca atrás de clique |
| Progresso com escopo declarado, em duas etapas | Sim | `writing-orders` → `running-agent`, cada um com contagem |
| Erro visível com retentativa, nunca tela branca | Sim | `Alert` + "Tentar novamente" por etapa |
| A tela diz que não gera conteúdo | Sim | Frase fixa no rodapé do painel |
| Tabela e placar preenchem sem navegar | Sim | Mesmo `catalog-page.tsx`, sem rota nova |
| Funciona sem servidor | Sim | Mock congelado, `runSimulationAgent.ts` |
| Gate de aprovação explícita antes de rodar | **Não** | Um clique faz as duas etapas |
| Sheet hospedando `OrderEditor` | **Não** | Painel read-only, sem `OrderEditor` nesta tela |
| Aviso de comparabilidade ao editar | **Não** | Não existe edição, não existe o que avisar |
| "Mesma linha de base vs. linha de base nova" | **Não** | Não existe linha de base aprovada para comparar contra |

### O desenho atual, em código

**Arquivos novos:**

- `diagnosis/types.ts` (adições) — `TestOrderCatalogSummary`, `TestOrderConstraintAxis`,
  `GeneratedTestOrder` (`{ id, text, expectsValidMatch, constraintAxis, rationale }`),
  `TestOrderGenerationResult`, `SimulatedProductOutcome`, `BuyerAgentOrderOutcome`,
  `BuyerAgentSimulationBatchResult` — espelho campo a campo dos records C# de
  `TestOrderGenerationTools.cs` e `BuyerAgentSimulatorTools.cs`.
- `diagnosis/catalogExam.ts` (adição) — `aggregateExamOutcomes(catalog, outcomes)`: o split entre
  AVALIAR (`evaluateProduct`, só faz sentido com requisito estruturado local) e AGREGAR (o que o
  servidor vai alimentar via `BuyerAgentOrderOutcome[]` quando o transporte existir).
  `aggregateCatalogExam` (ticket 01) mantém a mesma assinatura — o wizard depende dela — e delega
  para a nova função por dentro.
- `diagnosis/fixtures/simulationAgentPayloads.ts` (+ `.test.ts`) — `simulationAgentNormalScenario`,
  `simulationAgentNoPassScenario`, `simulationAgentFailureScenario`: os payloads mockados que
  `runSimulationAgent` devolve. Derivados rodando `evaluateProduct`/`toCandidateProduct` reais
  sobre `loja-real-sem-gabarito.ts` uma vez, no load do módulo, e congelando o resultado — nunca
  frase transcrita à mão, para o mock não desandar quando o fraseado do engine mudar.
- `diagnosis/lib/runSimulationAgent.ts` (+ `.test.ts`) — `writeTestOrders`/`runBuyerAgent`, o
  NAMESPACE `runSimulationAgent`, e `SimulationAgentOptions` (`scenario`, `delayMs`). É o **seam**
  do transporte futuro — ver a seção abaixo.
- `diagnosis/lib/simulationRun.ts` (+ `.test.ts`, 11 testes) — o reducer
  `idle → writing-orders → running-agent → success/error`, puro e testado isolado do componente.
  `running-agent` e o `error` da etapa 2 carregam os `GeneratedTestOrder[]` da etapa 1, que é o
  que mantém os pedidos visíveis durante e depois da etapa 2.

**Arquivos apagados** (do desenho rejeitado, cada um com seu `.test.ts`):
`diagnosis/lib/approvedOrders.ts`, `diagnosis/lib/runCatalogExam.ts`,
`diagnosis/lib/catalogExamRun.ts`.

**Arquivos reescritos:**

- `diagnosis/components/CatalogExamOrdersPanel.tsx` — a faixa EXAME: read-only, sem `Sheet`, sem
  `OrderEditor`. Um botão, os pedidos em prosa (texto, eixo, se espera resposta válida, rationale)
  assim que a etapa 1 resolve, progresso por etapa, erro com retentativa, e a frase fixa "rodar o
  exame não gera conteúdo nenhum".
- `components/catalog-page.tsx` — sem `fixtureMode`/`realState`/`approvedOrders`, sem `useEffect`
  de carregamento (o catálogo é constante do módulo, `lojaRealSemGabaritoCatalog` — decisão
  literal do dono: "enquanto não tiver conexão com api, vai ser sempre dado mockado"; `fetchCatalog`
  de `lib/catalog.ts` continua intacto, só sem uso nesta tela, para religar barato quando o
  transporte existir). `runSimulation()` orquestra as duas chamadas via `useReducer` sobre
  `catalogSimulationRunReducer`.
- `components/catalog-page.test.tsx` — 25 testes nos dois `describe` ("resultado do exame" e
  "botão único 'Rodar Agente de Simulação'"), cobrindo placar, tabela, ordenação/filtro (tickets
  02/03, intactos), as duas etapas de progresso, erro com retentativa em cada etapa, e a ausência
  de qualquer affordance de aprovação/edição.

**Toque mínimo:** `diagnosis/components/CatalogExamControls.tsx` — o prop `orders` passou de
`HandwrittenOrder[]` para `FilterableOrderSummary = { id, label }`, porque só usava `.id`/`.label`
e os pedidos agora são `GeneratedTestOrder` (que tem `text`, não `label`).

### A pendência de transporte — onde o próximo agente pluga

**A tela roda inteira sobre mock hoje, por decisão literal do dono ("enquanto não tiver conexão
com api, vai ser sempre dado mockado").** Ligar o transporte real é trabalho do **ticket 05 do
`.scratch/exame-guiado/issues/`** (`05-fase-1-conectar-e-ler-o-catalogo.md`), que segue
`Status: ready-for-agent` e cujos próprios `## Comments` já apontam a lacuna: *"As fases seguintes
precisam de `generate_test_orders`, `compare_buyer_agent_rounds` e `publish_suggestion` — POST, e
cada chamada gasta crédito de LLM"* — e propõe proxy de dev do Vite com bearer do lado do
servidor, em vez de rota isenta de auth. Uma anotação foi deixada lá apontando de volta para este
seam.

**O seam é `diagnosis/lib/runSimulationAgent.ts`.** As duas funções exportadas
(`writeTestOrders(catalog, options)`, `runBuyerAgent(catalog, orders, options)`) já têm a
assinatura que uma implementação HTTP real teria — quando o transporte existir, só o CORPO de
cada uma troca para um `fetch` (via o proxy de dev citado acima, ou equivalente), e nada muda em
quem chama (`catalog-page.tsx`, que só conhece o namespace `runSimulationAgent`). O contrato do
payload já está congelado nos tipos de `diagnosis/types.ts` — cópia campo a campo dos records C#
(`TestOrderGenerationResult` ≡ saída de `generate_test_orders`, `BuyerAgentSimulationBatchResult`
≡ N respostas de `simulate_buyer_agent` agregadas) — então plugar o transporte é trocar a ORIGEM
do dado, nunca a FORMA que `aggregateExamOutcomes`/a tabela consomem.

Não foi aberto ticket novo nesta pasta para o transporte: o ticket 05 do `exame-guiado` já é dono
desse escopo (é onde o bearer token, CORS e a forma de invocar tool por MCP a partir do browser
são resolvidos, para catálogo E para as tools de custo) e duplicar o escopo em dois tickets
criaria duas fontes de verdade sobre a mesma pendência. Quando aquele ticket for retomado, o
critério de aceite a acrescentar lá é: "`runSimulationAgent.writeTestOrders`/`runBuyerAgent`
chamam `generate_test_orders`/`simulate_buyer_agent` de verdade, sem mudar a assinatura nem o
contrato de retorno."

### Verificação (a partir de `apps/web/`, com npm)

- `npm run test` — 17 arquivos, 180 testes, todos verdes
- `npm run typecheck` — limpo
- `npm run lint` (via `./node_modules/.bin/eslint .` — o wrapper `npm run lint` pode falhar por um
  hook de shell do usuário) — 4 erros, todos pré-existentes e já documentados nos tickets 02/03
  (`badge.tsx`, `button.tsx`, `sidebar.tsx`, `use-mobile.ts`); nenhum novo
