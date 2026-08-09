/**
 * Contrato da fase 3 (Diagnóstico) do exame guiado — ticket 06 da
 * `.scratch/exame-guiado/issues/`. Segue o mesmo padrão de
 * `comparison/types.ts`: tipos puros, sem React, sem rede.
 */

/**
 * A natureza de um motivo de descarte — espelha `UnmetRequirementKind` do
 * `BuyerAgentDecisionEngine` (apps/mcp-server/Tools/BuyerAgentDecisionEngine.cs).
 * `illegibility` é o descarte que esta ferramenta existe para expor: o dado
 * não existe ou não é reconhecível como estruturado, o produto pode atender
 * na prática. `legitimateRejection` é descarte correto: o dado existe e nega
 * o requisito. Esse valor nasce em `engine.ts`, no exato ponto em que o
 * motivo é produzido — nenhuma camada acima (agregação, componente React)
 * pode derivá-lo relendo `message`. É a regra dura do ticket 06.
 */
export type UnmetRequirementKind = "illegibility" | "legitimateRejection"

/** Um motivo de descarte: a frase legível e a natureza, emparelhadas. */
export type UnmetRequirement = {
  message: string
  kind: UnmetRequirementKind
}

/**
 * Um requisito de atributo digitado à mão nesta fase — mesmo shape que
 * `BuyerAttributeRequirement` no C#. O ticket 06 não bloqueia nos tickets 03
 * (gerador) nem 07 (revisão): "os pedidos entram digitados à mão neste
 * ticket". Sem uma chamada de IA para extrair requisitos de um pedido em
 * linguagem natural (isso é o que `simulate_buyer_agent` faz no servidor, e
 * não há transporte para isso ainda), o pedido "digitado à mão" nesta tela é
 * digitado já como requisito estruturado — o lojista escreve a asserção
 * diretamente, no espírito do "test suite" do projeto (ver
 * `docs/o-que-estamos-construindo.md` §5: a mecânica do agente comprador são
 * as asserções, não o texto em prosa). O campo `label` guarda o texto em
 * linguagem natural só para leitura humana, sem alimentar o motor.
 */
export type HandwrittenAttributeRequirement = {
  attributeName: string
  expectedValue: string
}

/** Um requisito de mínimo numérico digitado à mão — mesmo shape que
 * `BuyerNumericMinimumRequirement` no C#. */
export type HandwrittenNumericMinimumRequirement = {
  attributeName: string
  minValue: number
  unit: string | null
}

/** Um pedido de teste digitado à mão nesta fase. */
export type HandwrittenOrder = {
  id: string
  /** O texto em linguagem natural — só para leitura humana na tela; o motor
   * de avaliação nunca lê este campo, só os requisitos estruturados abaixo. */
  label: string
  attributeRequirements: HandwrittenAttributeRequirement[]
  numericMinimumRequirements: HandwrittenNumericMinimumRequirement[]
  maxPrice: number | null
}

/**
 * Um produto descartado por pelo menos um pedido do lote. `reasons` é a
 * união deduplicada (por frase) dos motivos de todos os pedidos que o
 * descartaram — ver o comentário de `aggregateDiagnosis` em `aggregate.ts`
 * para a decisão de deduplicação e a decisão de motivo misto.
 */
export type DiscardedProduct = {
  productId: string
  handle: string
  title: string
  reasons: UnmetRequirement[]
  /**
   * true quando TODOS os motivos deste produto são de ilegibilidade — é o
   * que decide se ele conta para `illegibleProductCount`. false quando há
   * pelo menos um motivo de rejeição legítima (produto de motivo misto ou
   * só rejeição legítima). Ver `aggregate.ts`.
   */
  onlyIllegibilityReasons: boolean
}

/**
 * Resultado do diagnóstico da fase 3: a rodada "antes", contra o catálogo
 * cru, sem gabarito nenhum. Não existe percentual de classificação correta
 * aqui — essa métrica depende de `expectedOutcomes` (D3 da spec), que é um
 * conceito da fase 4 (antes/depois com controles curados), não desta fase.
 * Fase 3 mede a loja como ela é, sozinha; a ausência de percentual não é uma
 * omissão, é a forma certa do dado nesta fase — e a UI deixa isso explícito
 * em vez de simplesmente não desenhar nada.
 */
export type DiagnosisResult = {
  /** Escopo do número: catálogo inteiro (loja), não só os produtos citados
   * em algum pedido. */
  totalProductCount: number
  /** Quantos pedidos foram rodados para produzir este resultado — parte do
   * escopo declarado na tela ("loja inteira, simulada contra N pedidos"). */
  orderCount: number
  /** A métrica de topo: produtos cujos motivos de descarte são TODOS de
   * ilegibilidade, agregados sem duplicar (produto, motivo) através dos
   * pedidos. É "quantas vendas o conserto de conteúdo pode recuperar". */
  illegibleProductCount: number
  /** Todo produto descartado por ao menos um pedido — ilegibilidade pura,
   * rejeição legítima pura, ou motivo misto. A UI distingue os três
   * visualmente; nenhum é escondido. */
  discardedProducts: DiscardedProduct[]
}

/**
 * Contrato transposto do ticket 01 da `.scratch/catalogo-como-exame/` (D5 da
 * spec) — ver `catalogExam.ts` para a agregação em si e para as decisões de
 * modelagem por trás dos campos abaixo.
 */

/**
 * Um dos quatro estados do D2 — nunca um booleano, porque rejeição não é
 * propriedade do produto, é do par produto × requisito:
 *
 * - `passed` — não foi descartado por nenhum pedido aprovado.
 * - `illegible` — descartado, e TODOS os motivos acumulados são de
 *   ilegibilidade. É o único estado com ação de conserto sem ressalva.
 * - `mixed` — descartado, com motivos das duas naturezas entre os pedidos.
 * - `legitimatelyRejected` — descartado, e TODOS os motivos são rejeição
 *   legítima. Nenhuma ação de conserto de conteúdo recupera essa venda.
 */
export type ProductExamState =
  | "passed"
  | "illegible"
  | "mixed"
  | "legitimatelyRejected"

/**
 * Um motivo de descarte com atribuição de origem. `aggregateDiagnosis` já
 * deduplica por frase (`message`) — aqui a dedup continua igual, mas cada
 * frase carrega em `orderIds` todo pedido do lote que a produziu. Sem isso
 * não existe perda silenciosa (quantos pedidos) nem o drill-down por pedido
 * do ticket 05.
 */
export type AttributedUnmetRequirement = UnmetRequirement & {
  orderIds: string[]
}

/**
 * Uma linha do exame do catálogo: um produto, com o veredito acumulado sobre
 * todos os pedidos aprovados do lote. Existe uma linha por produto do
 * catálogo inteiro — inclusive os que passaram em todos os pedidos, que
 * `DiscardedProduct` não representa.
 */
export type ProductExamRow = {
  productId: string
  handle: string
  title: string
  state: ProductExamState
  /** Motivos deduplicados por frase, cada um com os pedidos de origem. Vazio
   * quando `state` é `passed`. */
  reasons: AttributedUnmetRequirement[]
  /** A perda silenciosa (D4 da spec): em quantos dos pedidos aprovados este
   * produto foi descartado inteiramente por ilegibilidade — nenhum motivo de
   * rejeição legítima misturado naquele pedido específico. É "quantas vendas
   * este produto está perdendo sem ninguém saber". Um produto `mixed` pode
   * ter perda silenciosa maior que zero: ele só não entra no número de topo
   * porque, no agregado, resta pelo menos um pedido cuja rejeição é legítima
   * — mas noutro pedido específico ele pode ter sido descartado só por
   * ilegibilidade, e essa venda é recuperável. */
  silentLossCount: number
}

/**
 * O resultado do exame do catálogo inteiro — a forma transposta que a tabela
 * consome: um produto, N pedidos. Coexiste com `DiagnosisResult`; a fase 3 do
 * wizard continua consumindo `aggregateDiagnosis` até o ticket 08 da spec
 * `catalogo-como-exame`.
 */
export type CatalogExamResult = {
  /** Escopo do número: catálogo inteiro (loja), igual a `rows.length`. */
  totalProductCount: number
  /** Quantos pedidos aprovados compõem este exame. */
  orderCount: number
  /** `false` quando `orderCount` é zero — nenhum pedido rodou ainda. É a
   * distinção "examinado / não examinado" do D1: com zero pedidos, todo
   * produto sai como `passed` por vacuidade (não foi descartado por
   * nenhum pedido, porque não há pedido nenhum), e sem este campo a UI leria
   * isso como "loja 100% legível" em vez de "exame não rodou". A UI decide o
   * que mostrar a partir deste campo, sem recontar `rows`. */
  examined: boolean
  /** A métrica de topo: produtos em estado `illegible` — TODOS os motivos
   * são de ilegibilidade. Mesma regra de `DiagnosisResult.illegibleProductCount`:
   * produto `mixed` fica de fora porque consertar conteúdo não recupera a
   * venda quando sobra um motivo de rejeição legítima. */
  illegibleProductCount: number
  /** Uma linha por produto do catálogo inteiro, na ordem do catálogo de
   * entrada — a ordenação do D4 é responsabilidade de quem consome este
   * contrato (ticket 03), não deste agregador. */
  rows: ProductExamRow[]
}

/**
 * O contrato do redesenho de botão único ("Rodar Agente de Simulação",
 * `.scratch/catalogo-como-exame/`): o lojista não aprova nem edita pedido
 * nenhum — ele clica, e por baixo dos panos a tela "escreve os pedidos" e
 * "roda o agente" em duas chamadas que, em produção, são as tools do
 * servidor C# `generate_test_orders` (`TestOrderGenerationTools.cs`) e N ×
 * `simulate_buyer_agent` (`BuyerAgentSimulatorTools.cs` /
 * `BuyerAgentDecisionEngine.cs`). Nesta etapa não existe transporte — os
 * dois tipos abaixo são cópia fiel, campo a campo, dos records C#, para que
 * plugar o transporte depois seja trocar a ORIGEM do dado
 * (`runSimulationAgent` em `lib/`), nunca a FORMA. `HandwrittenOrder` acima
 * não é reaproveitado aqui de propósito: aquele é requisito já estruturado,
 * digitado à mão; este é a saída de um agente que escreve prosa, e a
 * estruturação (a extração de requisitos) só acontece depois, no servidor,
 * dentro da etapa 2 — nunca visível neste contrato.
 */

/**
 * Espelho de `CatalogSummary` (`TestOrderGenerationTools.cs`) — o resumo
 * exclusivamente AGREGADO do catálogo que o gerador de pedidos "viu". Nunca
 * carrega prosa por produto (nenhuma descrição, nenhum metafield, nenhuma
 * `GeneratedProperties`) — é o seam anti-circularidade do ticket 05 do
 * `exame-guiado`: um gerador que lesse a mesma prosa que
 * `generate_optimized_content` estrutura devolveria delta antes/depois
 * garantido positivo por construção, não uma medida real da loja. A tela
 * mostra este resumo ao lojista como prova visível de que o gerador não leu
 * as descrições.
 */
export type TestOrderCatalogSummary = {
  productCount: number
  productTypes: string[]
  vendors: string[]
  titles: string[]
  minPrice: number | null
  maxPrice: number | null
}

/**
 * Espelho do vocabulário fechado de `TestOrderGenerationTools.cs`
 * (`AxisContraste`, `AxisRequisitoEmProsa`, `AxisPoucasRestricoes`,
 * `AxisRestritivo`) — um pedido testa exatamente um destes quatro eixos. No
 * servidor um valor fora deste conjunto é erro de parse na resposta do
 * modelo; aqui o tipo fechado cumpre o mesmo papel em tempo de compilação —
 * nenhuma camada acima pode inventar um quinto eixo.
 */
export type TestOrderConstraintAxis =
  | "contraste"
  | "requisito-em-prosa"
  | "poucas-restricoes"
  | "restritivo"

/**
 * Um pedido de teste em linguagem natural, já escrito pelo agente gerador —
 * espelho de `GeneratedTestOrder` (C#), com um campo a mais: `id`. O record
 * C# não tem identificador porque `GenerateTestOrders` devolve o lote inteiro
 * numa resposta só; aqui cada pedido precisa de uma chave estável porque a
 * etapa 2 (`BuyerAgentOrderOutcome.orderId` abaixo) atribui o veredito de
 * volta a ELE — sem `id`, não haveria como a tabela saber qual pedido
 * descartou qual produto. Quem implementar o transporte real decide de onde
 * `id` vem (o servidor pode passar a devolvê-lo, ou o cliente gera um no
 * momento da chamada); esta etapa não resolve isso, só declara que o campo
 * existe e é necessário.
 */
export type GeneratedTestOrder = {
  id: string
  /** O texto em linguagem natural, primeira pessoa — o que vai, em
   * produção, direto no argumento `naturalLanguageOrder` de
   * `simulate_buyer_agent`. Espelha `GeneratedTestOrder.Order` no C#. */
  text: string
  /** Se o gerador acredita que algum produto do catálogo (pelo resumo
   * agregado) atende — "nenhum produto atende" é acerto do exame, não falha
   * do gerador (regra 2 do ticket 05 do `exame-guiado`). */
  expectsValidMatch: boolean
  constraintAxis: TestOrderConstraintAxis
  /** Frase curta do porquê deste pedido específico existe no lote — exibida
   * ao lojista, então precisa ser clara para quem não escreveu o exame. */
  rationale: string
}

/** Espelho de `TestOrderGenerationResult` (C#) — saída da etapa 1 ("escrevendo
 * os pedidos"). */
export type TestOrderGenerationResult = {
  catalogSummary: TestOrderCatalogSummary
  orders: GeneratedTestOrder[]
}

/**
 * O veredito de UM produto em UM pedido — espelho de `BuyerFilterOutcome`
 * (C#), na forma que a etapa 2 devolve: cada produto já vem identificável
 * (`productId`/`handle`/`title`) para a tela não precisar cruzar de volta
 * com o catálogo carregado. `unmetRequirements` reusa o MESMO
 * `UnmetRequirement` do topo deste arquivo — `kind` nasce no servidor, no
 * ponto de criação do motivo (`BuyerAgentDecisionEngine.EvaluateProduct`),
 * nunca é derivado aqui.
 */
export type SimulatedProductOutcome = {
  productId: string
  handle: string
  title: string
  passed: boolean
  /** Espelho de `BuyerFilterOutcome.ConfirmedRequirements` (C#) e de
   * `ProductFilterOutcome.confirmedRequirements` (`engine.ts`) — frases
   * prontas dos requisitos que o produto CONFIRMOU naquele pedido, na mesma
   * forma que `unmetRequirements` abaixo. Existe desde que o motor calcula
   * o veredito; até o ticket 05 do `catalogo-como-exame` era descartado na
   * agregação (`catalogExam.ts`/`simulationAgentPayloads.ts` só propagavam
   * `unmetRequirements`) porque nada consumia ainda. Sem este campo, um
   * produto `passed` não teria nada específico para mostrar no drill-down
   * por pedido além de "nenhum motivo de descarte". */
  confirmedRequirements: string[]
  unmetRequirements: UnmetRequirement[]
}

/**
 * O resultado de rodar UM pedido contra o catálogo inteiro — o que UMA
 * chamada de `simulate_buyer_agent` devolve, achatada num formato que já
 * identifica de qual pedido ela veio (`orderId`, o `GeneratedTestOrder.id`
 * correspondente).
 */
export type BuyerAgentOrderOutcome = {
  orderId: string
  products: SimulatedProductOutcome[]
}

/**
 * Saída agregada da etapa 2 ("rodando o agente"): N respostas de
 * `simulate_buyer_agent` — uma por pedido do lote gerado na etapa 1 —
 * embrulhadas num único payload, porque é assim que a tela consome (todas
 * juntas, para `aggregateExamOutcomes` em `catalogExam.ts` agregar de uma
 * vez). `totalProductCount` existe pelo mesmo motivo de
 * `CatalogExamResult.totalProductCount`: a tela valida o escopo sem
 * recontar `outcomes`.
 */
export type BuyerAgentSimulationBatchResult = {
  totalProductCount: number
  outcomes: BuyerAgentOrderOutcome[]
}
