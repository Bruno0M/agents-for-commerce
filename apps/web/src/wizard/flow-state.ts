import type { ProductCatalogReadResult } from "@/lib/catalog"
import type { ComparisonResult } from "@/comparison/types"
import type { DiagnosisResult } from "@/diagnosis/types"

/**
 * As cinco fases do exame guiado. Os números são os da spec
 * (`.scratch/exame-guiado/issues/spec.md`), não os dos tickets que as
 * implementam — a tabela de "Emendas" no fim da spec explica a diferença.
 */
export type PhaseIndex = 1 | 2 | 3 | 4 | 5

export type PhaseDefinition = {
  index: PhaseIndex
  title: string
  description: string
  /** Número do ticket em `.scratch/exame-guiado/issues/` dono do conteúdo real desta fase. */
  ownerTicket: string
}

export const PHASES: PhaseDefinition[] = [
  {
    index: 1,
    title: "Conectar",
    description: "Lê o catálogo inteiro da loja configurada.",
    ownerTicket: "05",
  },
  {
    index: 2,
    title: "Definir o exame",
    description:
      "Gera pedidos de teste a partir do catálogo; o lojista revisa, edita e aprova.",
    ownerTicket: "07",
  },
  {
    index: 3,
    title: "Diagnóstico",
    description: "Simula os pedidos aprovados contra a loja como ela está.",
    ownerTicket: "06",
  },
  {
    index: 4,
    title: "Conserto",
    description:
      "Gera conteúdo otimizado só nos produtos que falharam por ilegibilidade, re-simula e mostra o delta.",
    ownerTicket: "09",
  },
  {
    index: 5,
    title: "Publicar",
    description: "Envia os itens consertados para aprovação humana.",
    ownerTicket: "10",
  },
]

/**
 * Os quatro eixos de restrição que `generate_test_orders` varia entre os
 * pedidos de um lote — mesmos quatro valores de
 * `TestOrderGenerationTools.AxisContraste/AxisRequisitoEmProsa/
 * AxisPoucasRestricoes/AxisRestritivo` no servidor. União literal fechada,
 * não `string`: um eixo inventado vira erro de tipo no build, não um bug
 * descoberto na tela pelo lojista.
 */
export type ConstraintAxis =
  | "contraste"
  | "requisito-em-prosa"
  | "poucas-restricoes"
  | "restritivo"

/**
 * Espelha `CatalogSummary` (`TestOrderGenerationTools.cs`) — o resumo
 * exclusivamente AGREGADO do catálogo que o gerador viu para escrever os
 * pedidos. Nunca carrega descrição de produto: é o próprio tipo que torna a
 * circularidade do ticket 05 irrepresentável (gerador e `generate_optimized_
 * content` não podem ler a mesma prosa se esta prosa nunca sai do servidor).
 * A fase 2 devolve este resumo à tela para o lojista poder auditar isso.
 */
export type CatalogSummary = {
  productCount: number
  productTypes: string[]
  vendors: string[]
  titles: string[]
  minPrice: number | null
  maxPrice: number | null
}

/**
 * Espelha `GeneratedTestOrder` (`TestOrderGenerationTools.cs`) mais um `id`
 * local — o C# não precisa de um, porque nunca referencia um pedido
 * individualmente fora do lote; a lista da UI precisa de chave estável.
 * `naturalLanguageOrder` é o `Order` do record, renomeado para o nome do
 * argumento que ele vira na fronteira seguinte (`simulate_buyer_agent` e
 * `compare_buyer_agent_rounds`, ticket 05) — o mesmo texto, nomeado pelo que
 * faz depois, não pela struct de origem.
 *
 * `constraintAxis` e `expectsValidMatch` são independentes um do outro (ver
 * o comentário equivalente no C#): nunca derive um a partir do outro na UI.
 */
export type GeneratedTestOrder = {
  id: string
  naturalLanguageOrder: string
  expectsValidMatch: boolean
  constraintAxis: ConstraintAxis
  rationale: string
}

/**
 * Conjunto de pedidos de teste gerado e aprovado pelo lojista na fase 2.
 * Contrato completo (edição por pedido, descarte, escrita do zero) é do
 * ticket 07 e fica para depois; isto cobre a ficha de revisão + o gate de
 * aprovação, e é o mínimo que a casca precisa para travar o avanço e para
 * repassar a mesma unidade, inalterada, às fases 3 e 4 (D4).
 */
export type ApprovedTestOrderSet = {
  id: string
  orders: GeneratedTestOrder[]
  catalogSummary: CatalogSummary
}

/**
 * Resultado do diagnóstico da fase 3: a rodada "antes", rodada contra o
 * catálogo cru. Contrato completo — motivo por produto, natureza
 * (ilegibilidade / rejeição legítima), agregação sem duplicar (produto,
 * motivo) — vive em `@/diagnosis/types` (ticket 06), reexportado aqui pelo
 * mesmo motivo que `ComparisonResult` é importado de `@/comparison/types`
 * acima: o wizard consome o tipo, não é dono dele.
 */
export type { DiagnosisResult }

/**
 * Estado de envio da fase 5: os itens mandados para o Task Board e o estado
 * de cada um. Contrato completo (link do item, status por revisão) é do
 * ticket 10.
 */
export type SubmissionState = {
  items: { productId: string; status: "pending" | "submitted" }[]
}

export type WizardState = {
  currentPhase: PhaseIndex
  fixtureMode: boolean
  catalog: ProductCatalogReadResult | null
  approvedOrders: ApprovedTestOrderSet | null
  diagnosis: DiagnosisResult | null
  comparison: ComparisonResult | null
  submission: SubmissionState | null
}

export const INITIAL_WIZARD_STATE: WizardState = {
  currentPhase: 1,
  // Ligado por padrão: o ticket 09 da entrega-hackathon (servidor no ar)
  // está aberto, então sem fixture não há demo possível.
  fixtureMode: true,
  catalog: null,
  approvedOrders: null,
  diagnosis: null,
  comparison: null,
  submission: null,
}

/** A fase `phase` já produziu o insumo que a fase seguinte consome? */
export function hasProducedInput(
  state: WizardState,
  phase: PhaseIndex
): boolean {
  switch (phase) {
    case 1:
      return state.catalog !== null
    case 2:
      return state.approvedOrders !== null
    case 3:
      return state.diagnosis !== null
    case 4:
      return state.comparison !== null
    case 5:
      return state.submission !== null
  }
}

/**
 * A fase mais avançada que o lojista pode alcançar agora, dado o que já foi
 * produzido. Avançar para a fase N exige que a fase N-1 tenha produzido seu
 * insumo — voltar para qualquer fase <= esta é sempre permitido.
 */
export function maxReachablePhase(state: WizardState): PhaseIndex {
  let max: PhaseIndex = 1

  for (const phase of [2, 3, 4, 5] as const) {
    const previous = (phase - 1) as PhaseIndex
    if (!hasProducedInput(state, previous)) break
    max = phase
  }

  return max
}

export type WizardAction =
  | { type: "GO_TO_PHASE"; phase: PhaseIndex }
  | { type: "SET_FIXTURE_MODE"; enabled: boolean }
  | { type: "CATALOG_READ"; catalog: ProductCatalogReadResult }
  | { type: "ORDERS_APPROVED"; approvedOrders: ApprovedTestOrderSet }
  | { type: "DIAGNOSIS_READY"; diagnosis: DiagnosisResult }
  | { type: "COMPARISON_READY"; comparison: ComparisonResult }
  | { type: "SUBMISSION_READY"; submission: SubmissionState }

export function wizardReducer(
  state: WizardState,
  action: WizardAction
): WizardState {
  switch (action.type) {
    case "GO_TO_PHASE": {
      // Defesa em profundidade: mesmo que quem despachou já devesse ter
      // checado alcançabilidade (stepper e botão "Avançar" checam), o
      // reducer nunca aceita pular para uma fase sem insumo da anterior.
      if (action.phase > maxReachablePhase(state)) return state
      return { ...state, currentPhase: action.phase }
    }
    case "SET_FIXTURE_MODE":
      return { ...state, fixtureMode: action.enabled }
    case "CATALOG_READ":
      return { ...state, catalog: action.catalog }
    case "ORDERS_APPROVED":
      return { ...state, approvedOrders: action.approvedOrders }
    case "DIAGNOSIS_READY":
      return { ...state, diagnosis: action.diagnosis }
    case "COMPARISON_READY":
      return { ...state, comparison: action.comparison }
    case "SUBMISSION_READY":
      return { ...state, submission: action.submission }
    default:
      return state
  }
}
