export type DataSource =
  "option" | "metafield" | "generated" | "productType" | "price"

export type RequirementEvidence = {
  /** "Cancelamento de ruído" — o que o agente procurou */
  requirement: string
  expected: string
  confirmed: boolean
  foundValue: string | null
  source: DataSource | null
  message: string
}

export type RoundOutcome = {
  passed: boolean
  /** null quando não há expectativa registrada */
  correctlyClassified: boolean | null
  /** um por requisito, na mesma ordem em todos os produtos */
  evidence: RequirementEvidence[]
}

export type ProductComparison = {
  productId: string
  handle: string
  title: string
  /** o trecho onde a informação já estava — a prova */
  descriptionExcerpt: string | null
  expectedToPass: boolean | null
  before: RoundOutcome
  after: RoundOutcome
}

export type RoundSummary = {
  correctlyClassifiedCount: number
  totalClassifiedProducts: number
  successRate: number
  chosenProductTitle: string | null
  justification: string
}

export type ComparisonResult = {
  naturalLanguageOrder: string
  requirements: { name: string; expected: string }[]
  maxPrice: number | null
  products: ProductComparison[]
  before: RoundSummary
  after: RoundSummary
  successRateDeltaCount: number
  successRateDelta: number
}
