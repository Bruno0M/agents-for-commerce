import type {
  ProductComparison,
  RequirementEvidence,
  RoundOutcome,
} from "../types"

/**
 * Cor significa acerto de classificação, não "passou". Um controle rejeitado
 * corretamente nas duas rodadas é "correct", não "incorrect".
 */
export type Verdict = "correct" | "incorrect" | "neutral"

export function verdictFromRound(round: RoundOutcome): Verdict {
  if (round.correctlyClassified === null) return "neutral"
  return round.correctlyClassified ? "correct" : "incorrect"
}

export type RowVerdict =
  "corrected" | "regressed" | "stayedCorrect" | "stayedIncorrect" | "outOfCount"

export function classifyRowVerdict(product: ProductComparison): RowVerdict {
  const { before, after } = product

  if (
    before.correctlyClassified === null ||
    after.correctlyClassified === null
  ) {
    return "outOfCount"
  }
  if (before.correctlyClassified && after.correctlyClassified)
    return "stayedCorrect"
  if (!before.correctlyClassified && after.correctlyClassified)
    return "corrected"
  if (before.correctlyClassified && !after.correctlyClassified)
    return "regressed"
  return "stayedIncorrect"
}

export function findEvidence(
  round: RoundOutcome,
  requirementName: string
): RequirementEvidence | undefined {
  return round.evidence.find(
    (evidence) => evidence.requirement === requirementName
  )
}

/**
 * "Não achei" e "achei e não confirma" são dois consertos diferentes para o
 * lojista, então precisam de um estado distinto — não dá para colapsar os
 * dois em `!confirmed`.
 */
export type EvidenceState = "confirmed" | "notFound" | "foundNotConfirmed"

export function evidenceState(evidence: RequirementEvidence): EvidenceState {
  if (evidence.confirmed) return "confirmed"
  return evidence.foundValue === null ? "notFound" : "foundNotConfirmed"
}

export type ProductGroup = "shouldPass" | "shouldReject" | "outOfCount"

export function groupByExpectation(
  products: ProductComparison[]
): Record<ProductGroup, ProductComparison[]> {
  return {
    shouldPass: products.filter((product) => product.expectedToPass === true),
    shouldReject: products.filter(
      (product) => product.expectedToPass === false
    ),
    outOfCount: products.filter((product) => product.expectedToPass === null),
  }
}

export function requirementColumns(products: ProductComparison[]): string[] {
  return products[0]
    ? products[0].before.evidence.map((evidence) => evidence.requirement)
    : []
}

/**
 * Uma coluna que nunca confirma, em nenhum produto, em nenhuma rodada, quase sempre é bug de
 * extração — não catálogo pobre. É o sinal que a tela precisa nomear de relance no cabeçalho.
 */
export function alwaysFailingRequirements(
  products: ProductComparison[]
): string[] {
  if (products.length === 0) return []

  return requirementColumns(products).filter((requirementName) =>
    products.every((product) => {
      const before = findEvidence(product.before, requirementName)
      const after = findEvidence(product.after, requirementName)
      return before?.confirmed === false && after?.confirmed === false
    })
  )
}

export function noProductPassedEitherRound(
  products: ProductComparison[]
): boolean {
  if (products.length === 0) return false
  return products.every(
    (product) => !product.before.passed && !product.after.passed
  )
}
