import type { ProductCatalogContent } from "@/lib/catalog"
import { evaluateProduct, toCandidateProduct } from "./engine"
import type {
  AttributedUnmetRequirement,
  BuyerAgentOrderOutcome,
  CatalogExamResult,
  HandwrittenOrder,
  ProductExamRow,
  ProductExamState,
  UnmetRequirement,
} from "./types"

/**
 * Ticket 01 da `.scratch/catalogo-como-exame/` — o contrato transposto (D5
 * da spec). `aggregateDiagnosis` (`aggregate.ts`) roda todos os pedidos
 * contra o catálogo inteiro e devolve produtos **descartados**; a tabela do
 * catálogo precisa do inverso: uma linha por produto do catálogo **inteiro**,
 * cada uma carregando quantos e quais pedidos a atingiram. Esta função reusa
 * os mesmos `toCandidateProduct` / `evaluateProduct` de `engine.ts` — zero
 * lógica de avaliação nova, só uma forma de agregação diferente sobre o
 * mesmo resultado por (produto, pedido).
 *
 * As duas agregações coexistem de propósito: a fase 3 do wizard consome
 * `aggregateDiagnosis` até o ticket 08 da spec, e não é reescrita aqui.
 *
 * Quatro decisões de modelagem, documentadas aqui porque é o padrão do
 * módulo (ver o cabeçalho de `aggregateDiagnosis` em `aggregate.ts`):
 *
 * 1) O ESTADO É DERIVADO DO `kind`, NUNCA DE STRING. Os quatro estados do D2
 *    (`passed`, `illegible`, `mixed`, `legitimatelyRejected`) saem de quais
 *    naturezas (`UnmetRequirementKind`) aparecem nos motivos acumulados de
 *    um produto. `kind` nasce em `engine.ts`, no ponto exato em que o motivo
 *    é produzido (`evaluateProduct`) — esta função só lê o campo, nunca
 *    releitura de `message`. Um produto nunca visto num pedido reprovado
 *    (nenhuma chamada a `evaluateProduct` devolveu `passed: false` para ele)
 *    é `passed` por vacuidade — inclusive quando `orders` está vazio, o que
 *    é a base do campo `examined` no agregado de topo.
 *
 * 2) PRODUTO QUE PASSA NUM PEDIDO E É ILEGÍVEL NOUTRO É `illegible`, NÃO
 *    "PARCIALMENTE APROVADO". Rejeição é propriedade do par produto ×
 *    requisito (D2), não do produto isolado: um pedido que não pede o
 *    requisito que faltou simplesmente não gera motivo para aquele produto
 *    naquele pedido. O estado olha só para os motivos que existem, então
 *    "passou no pedido A" não aparece como informação negativa em lugar
 *    nenhum — é a ausência de motivo vinda de A.
 *
 * 3) ATRIBUIÇÃO POR PEDIDO SOBREVIVE À DEDUP POR FRASE. Igual a
 *    `aggregateDiagnosis`, duas ocorrências da mesma frase (mesmo produto,
 *    pedidos diferentes) colapsam numa linha — senão o "quantos motivos"
 *    infla com o tamanho do lote em vez de medir o catálogo. A diferença
 *    aqui é que a linha colapsada guarda `orderIds`: todo pedido que
 *    produziu aquela frase, não só o primeiro. Sem isso não existe perda
 *    silenciosa nem drill-down por pedido (ticket 05).
 *
 * 4) PERDA SILENCIOSA CONTA POR PEDIDO, NÃO POR MOTIVO. "Em quantos pedidos
 *    este produto foi descartado por ilegibilidade" só faz sentido pedido a
 *    pedido: um produto pode, no MESMO pedido, ter um motivo de ilegibilidade
 *    e um de rejeição legítima ao mesmo tempo (ex: sem cor estruturada E
 *    preço acima do limite) — consertar o conteúdo não recupera aquela venda
 *    específica, porque o motivo de rejeição legítima daquele pedido
 *    continua de pé. Por isso `silentLossCount` incrementa só quando TODOS
 *    os motivos daquele pedido, para aquele produto, são ilegibilidade —
 *    mesmo critério do estado `illegible`, aplicado por pedido em vez de
 *    sobre o acumulado. É consistente com a decisão do `mixed` em
 *    `aggregate.ts`: a métrica de "venda recuperável" nunca conta um pedido
 *    onde sobra rejeição legítima.
 */
export function aggregateCatalogExam(
  catalog: ProductCatalogContent[],
  orders: HandwrittenOrder[]
): CatalogExamResult {
  const candidates = catalog.map(toCandidateProduct)

  // Roda o motor local (evaluateProduct) por (pedido, produto) e monta a
  // MESMA forma que a etapa 2 do redesenho de botão único devolveria em
  // produção — um BuyerAgentOrderOutcome por pedido, com o veredito já
  // computado por produto. Isto não é conveniência: é o que garante que
  // `aggregateCatalogExam` (pedidos estruturados, avaliados aqui) e
  // `aggregateExamOutcomes` (veredito já computado, que virá do servidor)
  // nunca divirjam em como agregam — uma delega para a outra, então só
  // existe UMA regra de agregação no módulo.
  const outcomes: BuyerAgentOrderOutcome[] = orders.map((order) => ({
    orderId: order.id,
    products: candidates.map((candidate) => {
      const outcome = evaluateProduct(candidate, order)
      return {
        productId: candidate.productId,
        handle: candidate.handle,
        title: candidate.title,
        passed: outcome.passed,
        confirmedRequirements: outcome.confirmedRequirements,
        unmetRequirements: outcome.unmetRequirements,
      }
    }),
  }))

  return aggregateExamOutcomes(catalog, outcomes)
}

/**
 * O split do ticket A do redesenho de botão único
 * (`.scratch/catalogo-como-exame/`, ver o comentário de
 * `TestOrderGenerationResult`/`BuyerAgentSimulationBatchResult` em
 * `types.ts`): `aggregateCatalogExam` acima AVALIA (chama `evaluateProduct`,
 * o porto local do engine) e AGREGA na mesma passada — o desenho certo
 * enquanto os pedidos eram estruturados e avaliados no cliente. No
 * redesenho, quem avalia é o servidor (N × `simulate_buyer_agent`); o
 * cliente só recebe vereditos já computados
 * (`BuyerAgentOrderOutcome[]`, o mock de `runSimulationAgent`) e precisa
 * SÓ agregar. Esta função é esse "só agregar" — literalmente o miolo de
 * `aggregateCatalogExam` (o loop de `discarded`/`silentLossCount`/dedup por
 * frase) extraído para operar sobre veredito pronto em vez de chamar
 * `evaluateProduct`.
 *
 * Reusa exatamente as mesmas duas peças que a versão anterior reusava:
 * `deriveProductExamState` (nunca uma segunda cópia da regra "estado vem do
 * `kind`, nunca de string") e a MESMA regra de dedup por frase com
 * atribuição de pedido (`AttributedUnmetRequirement.orderIds`) — ver o
 * cabeçalho de `aggregateCatalogExam`/`deriveProductExamState` para as
 * quatro decisões de modelagem, que continuam valendo aqui sem mudança.
 *
 * Diferença estrutural única: em vez de iterar CANDIDATOS × PEDIDOS
 * chamando `evaluateProduct`, itera OUTCOMES × PRODUTOS DO OUTCOME lendo
 * `passed`/`unmetRequirements` já prontos. As linhas do resultado ainda
 * saem na ordem do `catalog` de entrada (não na ordem de `outcomes`) — um
 * produto que nunca aparece em nenhum outcome (lote vazio, ou um outcome
 * que por algum motivo não cobriu o catálogo inteiro) é `passed` por
 * vacuidade, mesmo critério do comentário 1) em `aggregateCatalogExam`.
 */
export function aggregateExamOutcomes(
  catalog: ProductCatalogContent[],
  outcomes: readonly BuyerAgentOrderOutcome[]
): CatalogExamResult {
  const entriesByProductId = new Map<
    string,
    {
      reasonsByMessage: Map<string, AttributedUnmetRequirement>
      discarded: boolean
      silentLossCount: number
    }
  >()

  for (const outcome of outcomes) {
    for (const product of outcome.products) {
      if (product.passed) continue

      let entry = entriesByProductId.get(product.productId)
      if (!entry) {
        entry = {
          reasonsByMessage: new Map(),
          discarded: false,
          silentLossCount: 0,
        }
        entriesByProductId.set(product.productId, entry)
      }
      entry.discarded = true

      if (
        product.unmetRequirements.every(
          (reason) => reason.kind === "illegibility"
        )
      ) {
        entry.silentLossCount++
      }

      for (const reason of product.unmetRequirements) {
        const existing = entry.reasonsByMessage.get(reason.message)
        if (existing) {
          if (!existing.orderIds.includes(outcome.orderId)) {
            existing.orderIds.push(outcome.orderId)
          }
          continue
        }
        entry.reasonsByMessage.set(reason.message, {
          message: reason.message,
          kind: reason.kind,
          orderIds: [outcome.orderId],
        })
      }
    }
  }

  const rows: ProductExamRow[] = catalog.map((product) => {
    const entry = entriesByProductId.get(product.id)
    const reasons = entry ? Array.from(entry.reasonsByMessage.values()) : []

    return {
      productId: product.id,
      handle: product.handle,
      title: product.title,
      state: deriveProductExamState(entry?.discarded ?? false, reasons),
      reasons,
      silentLossCount: entry?.silentLossCount ?? 0,
    }
  })

  const illegibleProductCount = rows.filter(
    (row) => row.state === "illegible"
  ).length

  return {
    totalProductCount: catalog.length,
    orderCount: outcomes.length,
    examined: outcomes.length > 0,
    illegibleProductCount,
    rows,
  }
}

/**
 * Exportada para reuso pelo ticket 03 (`diagnosis/lib/deriveRowForOrder.ts`):
 * o filtro por pedido precisa do MESMO cálculo de estado a partir de `kind`,
 * só que aplicado aos motivos de um pedido isolado em vez do acumulado de
 * todos — nunca uma cópia da lógica, nunca releitura de `message`.
 */
export function deriveProductExamState(
  discarded: boolean,
  reasons: readonly UnmetRequirement[]
): ProductExamState {
  if (!discarded) return "passed"

  const hasIllegibility = reasons.some(
    (reason) => reason.kind === "illegibility"
  )
  const hasLegitimateRejection = reasons.some(
    (reason) => reason.kind === "legitimateRejection"
  )

  if (hasIllegibility && hasLegitimateRejection) return "mixed"
  if (hasIllegibility) return "illegible"
  return "legitimatelyRejected"
}
