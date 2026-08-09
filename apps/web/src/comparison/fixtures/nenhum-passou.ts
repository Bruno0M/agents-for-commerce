import type {
  ComparisonResult,
  ProductComparison,
  RequirementEvidence,
} from "../types"

/**
 * Borda: nenhum produto confirma nada em nenhuma rodada — simula uma integração de catálogo
 * fora do ar (nenhum atributo estruturado volta, nem preço). À mão, sem origem em dado real.
 * Existe para provar que a tela explica esse estado em vez de só mostrar vermelho.
 */

function unconfirmed(
  requirement: string,
  expected: string
): RequirementEvidence {
  return {
    requirement,
    expected,
    confirmed: false,
    foundValue: null,
    source: null,
    message:
      "Catálogo fora do ar nesta rodada: nenhum atributo estruturado foi retornado.",
  }
}

function emptyEvidence(): RequirementEvidence[] {
  return [
    unconfirmed("Tipo de produto", "fone"),
    unconfirmed("Cancelamento de ruído", "ativo"),
    unconfirmed("Bateria", "mínimo 20h"),
    unconfirmed("Preço", "até R$ 300,00"),
  ]
}

const products: ProductComparison[] = [
  {
    productId: "gid://shopify/Product/9291231854804",
    handle: "aurora-nc7",
    title: "Aurora NC7",
    descriptionExcerpt:
      "Colocamos captação por microfone duplo no mesmo padrão de modelos três vezes mais caros, e o silêncio aparece no primeiro segundo [...] O estojo recarrega o fone quase três vezes, o que na prática dá 28 horas longe da tomada.",
    expectedToPass: true,
    before: {
      passed: false,
      correctlyClassified: false,
      evidence: emptyEvidence(),
    },
    after: {
      passed: false,
      correctlyClassified: false,
      evidence: emptyEvidence(),
    },
  },
  {
    productId: "gid://shopify/Product/9291232248020",
    handle: "vetor-studio-one",
    title: "Vetor Studio One",
    descriptionExcerpt:
      "cancelamento de ruído ativo que você liga quando o vizinho resolve furar a parede [...] a autonomia é o ponto em que ele não tem concorrente na faixa: 40 horas com o ANC ligado.",
    expectedToPass: true,
    before: {
      passed: false,
      correctlyClassified: false,
      evidence: emptyEvidence(),
    },
    after: {
      passed: false,
      correctlyClassified: false,
      evidence: emptyEvidence(),
    },
  },
  {
    productId: "gid://shopify/Product/9291232379092",
    handle: "halo-air-pro",
    title: "Halo Air Pro",
    descriptionExcerpt:
      "O cancelamento de ruído ativo tem três níveis e um modo ambiente que deixa a voz do atendente passar sem tirar o fone [...] São 22 horas contando o estojo.",
    expectedToPass: true,
    before: {
      passed: false,
      correctlyClassified: false,
      evidence: emptyEvidence(),
    },
    after: {
      passed: false,
      correctlyClassified: false,
      evidence: emptyEvidence(),
    },
  },
]

export const nenhumPassou: ComparisonResult = {
  naturalLanguageOrder:
    "Quero um fone bluetooth com cancelamento de ruído ativo, até R$ 300, e que a bateria dure pelo menos 20 horas.",
  requirements: [
    { name: "Tipo de produto", expected: "fone" },
    { name: "Cancelamento de ruído", expected: "ativo" },
    { name: "Bateria", expected: "mínimo 20h" },
  ],
  maxPrice: 300,
  products,
  before: {
    correctlyClassifiedCount: 0,
    totalClassifiedProducts: 3,
    successRate: 0,
    chosenProductTitle: null,
    justification:
      "Nenhum produto confirmou nenhum requisito nesta rodada — o catálogo não retornou nenhum atributo estruturado, nem preço.",
  },
  after: {
    correctlyClassifiedCount: 0,
    totalClassifiedProducts: 3,
    successRate: 0,
    chosenProductTitle: null,
    justification:
      "Nenhum produto confirmou nenhum requisito nesta rodada também — a falha é de integração com o catálogo, não de conteúdo.",
  },
  successRateDeltaCount: 0,
  successRateDelta: 0,
}
