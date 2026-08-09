import type { ProductCatalogContent } from "@/lib/catalog"
import { evaluateProduct, toCandidateProduct } from "./engine"
import type {
  DiagnosisResult,
  DiscardedProduct,
  HandwrittenOrder,
  UnmetRequirement,
} from "./types"

/**
 * Roda todos os pedidos digitados contra o catálogo inteiro e agrega os
 * descartes por produto. Duas decisões de modelagem que o ticket 06 da
 * `.scratch/exame-guiado/issues/` deixa em aberto para quem implementar
 * resolver — resolvidas aqui, com o porquê:
 *
 * 1) DEDUPLICAÇÃO POR (PRODUTO, MOTIVO). A simulação roda por pedido contra
 *    o catálogo inteiro; um produto pode ser descartado por mais de um
 *    pedido do lote — às vezes pelo MESMO motivo (dois pedidos que exigem a
 *    mesma cor produzem, no mesmo produto sem cor estruturada, a mesma
 *    frase "Sem dado estruturado para confirmar 'Cor'."). Sem deduplicar, a
 *    contagem infla com o tamanho do lote de pedidos em vez de medir a
 *    loja — o número deixaria de responder "quantos produtos são
 *    invisíveis" e passaria a responder "quantas vezes um produto invisível
 *    apareceu". A chave de dedup é a frase (`message`) dentro do mesmo
 *    produto: duas frases iguais colapsam numa linha; frases diferentes —
 *    mesmo que venham do mesmo pedido ou de pedidos diferentes — ficam
 *    lado a lado, porque são motivos distintos.
 *
 * 2) PRODUTO DE MOTIVO MISTO FICA FORA DO NÚMERO DE TOPO, MAS NÃO SOME DA
 *    LISTA. Se um produto acumula, entre os pedidos, tanto um motivo de
 *    ilegibilidade quanto um de rejeição legítima, consertar o conteúdo (o
 *    `--fix` da fase 4) não recupera essa venda: o produto continua sendo
 *    rejeitado, só que agora por um motivo que é correto — o pedido exigia
 *    algo que o produto de fato não tem. A métrica de topo existe para
 *    responder "quantas vendas o conserto de conteúdo pode recuperar", e um
 *    produto de motivo misto não é uma delas — contá-lo inflaria a promessa
 *    do número. Por isso só entra em `illegibleProductCount` o produto cujos
 *    motivos são TODOS ilegibilidade. O produto de motivo misto continua em
 *    `discardedProducts`, com os dois motivos visíveis e
 *    `onlyIllegibilityReasons: false` — a UI o distingue visualmente, não o
 *    esconde nem o mistura com o grupo "ilegibilidade pura".
 */
export function aggregateDiagnosis(
  catalog: ProductCatalogContent[],
  orders: HandwrittenOrder[]
): DiagnosisResult {
  const candidates = catalog.map(toCandidateProduct)

  const entriesByProductId = new Map<
    string,
    { handle: string; title: string; reasonsByMessage: Map<string, UnmetRequirement> }
  >()

  for (const order of orders) {
    for (const candidate of candidates) {
      const outcome = evaluateProduct(candidate, order)
      if (outcome.passed) continue

      let entry = entriesByProductId.get(candidate.productId)
      if (!entry) {
        entry = {
          handle: candidate.handle,
          title: candidate.title,
          reasonsByMessage: new Map(),
        }
        entriesByProductId.set(candidate.productId, entry)
      }

      for (const reason of outcome.unmetRequirements) {
        entry.reasonsByMessage.set(reason.message, reason)
      }
    }
  }

  const discardedProducts: DiscardedProduct[] = Array.from(
    entriesByProductId.entries()
  ).map(([productId, entry]) => {
    const reasons = Array.from(entry.reasonsByMessage.values())
    return {
      productId,
      handle: entry.handle,
      title: entry.title,
      reasons,
      onlyIllegibilityReasons: reasons.every(
        (reason) => reason.kind === "illegibility"
      ),
    }
  })

  const illegibleProductCount = discardedProducts.filter(
    (product) => product.onlyIllegibilityReasons
  ).length

  return {
    totalProductCount: catalog.length,
    orderCount: orders.length,
    illegibleProductCount,
    discardedProducts,
  }
}
