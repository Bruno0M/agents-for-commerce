import type { ProductExamRow } from "../types"

/**
 * A ordenação padrão da tabela do catálogo — ticket 03 da
 * `.scratch/catalogo-como-exame/issues/`, D4 da spec. "Ordenar" sem critério
 * declarado vira alfabético, e alfabético não responde à pergunta do
 * lojista ("por qual produto eu começo?"). O critério é:
 *
 * 1) PERDA SILENCIOSA DECRESCENTE (`silentLossCount`). "Em quantos pedidos
 *    aprovados este produto foi descartado por ilegibilidade" — a promessa
 *    da ferramenta expressa por linha. O produto que mais vende no escuro
 *    vem primeiro, porque é o que mais vale consertar.
 *
 * 2) DESEMPATE POR CONSERTABILIDADE — DEGRADADO DE PROPÓSITO. O critério
 *    real (D4 da spec) é: quando `descriptionExcerpt` existir, o produto
 *    cuja informação JÁ ESTÁ NA PROSA da descrição vem primeiro — conserto
 *    de alta confiança, e a prova de que o produto nunca foi ruim, só
 *    ilegível. Esse campo é produzido pelo ticket 08 do `exame-guiado`
 *    (`.scratch/exame-guiado/issues/08-evidencia-estruturada-source-e-excerto.md`),
 *    cujo `Status` continua `ready-for-agent` — aberto — e hoje
 *    `descriptionExcerpt` só existe em `comparison/types.ts`; nunca chegou
 *    ao contrato do exame (`ProductExamRow`). Enquanto ele não existir aqui,
 *    o desempate DEGRADA para menor número de motivos DISTINTOS DE
 *    ILEGIBILIDADE primeiro — menos campos faltando, conserto mais barato.
 *    Isto é uma degradação DELIBERADA, registrada como decisão, não um
 *    acidente: quando o ticket 08 fechar e `descriptionExcerpt` chegar a
 *    `ProductExamRow`, este critério é o primeiro a trocar de lugar.
 *
 * 3) DESEMPATE FINAL POR TÍTULO, DEPOIS `productId` — só para determinismo
 *    (a ordenação precisa produzir sempre a mesma sequência para o mesmo
 *    conjunto de linhas); não carrega juízo nenhum sobre o produto.
 *
 * "Pior produto primeiro" (mais motivos, ou o estado mais grave) seria a
 * ordenação intuitiva, e é a errada: ela põe no topo o produto que nenhum
 * pedido testou a fundo, não o que mais vale consertar. Ordena-se por
 * RETORNO DO CONSERTO. Efeito colateral que vale registrar: com essa ordem,
 * as cinco primeiras linhas da fixture já SÃO o pitch, sem curadoria manual.
 */
export const CATALOG_EXAM_SORT_DESCRIPTION =
  "perda silenciosa (maior primeiro) · desempate: menos motivos de ilegibilidade"

function illegibilityReasonCount(row: ProductExamRow): number {
  return row.reasons.filter((reason) => reason.kind === "illegibility").length
}

function compareCatalogExamRows(a: ProductExamRow, b: ProductExamRow): number {
  if (a.silentLossCount !== b.silentLossCount) {
    return b.silentLossCount - a.silentLossCount
  }

  const aIllegibilityCount = illegibilityReasonCount(a)
  const bIllegibilityCount = illegibilityReasonCount(b)
  if (aIllegibilityCount !== bIllegibilityCount) {
    return aIllegibilityCount - bIllegibilityCount
  }

  const titleComparison = a.title.localeCompare(b.title, "pt-BR")
  if (titleComparison !== 0) return titleComparison

  return a.productId.localeCompare(b.productId)
}

/** Devolve uma cópia nova, ordenada — nunca muta `rows`. */
export function sortCatalogExamRows(
  rows: ProductExamRow[]
): ProductExamRow[] {
  return [...rows].sort(compareCatalogExamRows)
}
