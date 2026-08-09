import type { ComparisonResult, ProductComparison } from "../types"

/**
 * Borda: produtos fora do denominador da taxa de sucesso. À mão. O catálogo devolveu dois
 * acessórios que não são "fone" e nunca tiveram expectativa registrada no spec do pedido —
 * ficam visíveis na grade (grupo "Fora da contagem"), mas não contam nem para acerto nem para
 * erro na taxa de sucesso.
 */

const tipoProduto = {
  requirement: "Tipo de produto",
  expected: "fone",
}

const cancelamentoRuido = {
  requirement: "Cancelamento de ruído",
  expected: "ativo",
}

const bateria = {
  requirement: "Bateria",
  expected: "mínimo 20h",
}

const preco = {
  requirement: "Preço",
  expected: "até R$ 300,00",
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
      evidence: [
        {
          ...tipoProduto,
          confirmed: true,
          foundValue: "Fones de ouvido",
          source: "productType",
          message: "'Tipo de produto' = 'Fones de ouvido' confirma 'fone'.",
        },
        {
          ...cancelamentoRuido,
          confirmed: false,
          foundValue: null,
          source: null,
          message:
            "Sem dado estruturado para confirmar 'Cancelamento de ruído'.",
        },
        {
          ...bateria,
          confirmed: false,
          foundValue: null,
          source: null,
          message:
            "Sem dado estruturado para confirmar 'Bateria' (mínimo 20h).",
        },
        {
          ...preco,
          confirmed: true,
          foundValue: "R$ 289,00",
          source: "price",
          message: "Preço R$ 289,00 dentro do limite de R$ 300,00.",
        },
      ],
    },
    after: {
      passed: true,
      correctlyClassified: true,
      evidence: [
        {
          ...tipoProduto,
          confirmed: true,
          foundValue: "Fones de ouvido",
          source: "productType",
          message: "'Tipo de produto' = 'Fones de ouvido' confirma 'fone'.",
        },
        {
          ...cancelamentoRuido,
          confirmed: true,
          foundValue: "Ativo, com captação por microfone duplo",
          source: "generated",
          message:
            "'Cancelamento de ruído' = 'Ativo, com captação por microfone duplo' confirma 'ativo'.",
        },
        {
          ...bateria,
          confirmed: true,
          foundValue: "28h",
          source: "generated",
          message: "'Bateria' = '28h' confirma o mínimo de 20h.",
        },
        {
          ...preco,
          confirmed: true,
          foundValue: "R$ 289,00",
          source: "price",
          message: "Preço R$ 289,00 dentro do limite de R$ 300,00.",
        },
      ],
    },
  },
  {
    productId: "gid://shopify/Product/9291239900001",
    handle: "capa-protetora-x1",
    title: "Capa Protetora X1",
    descriptionExcerpt: null,
    expectedToPass: null,
    before: {
      passed: false,
      correctlyClassified: null,
      evidence: [
        {
          ...tipoProduto,
          confirmed: false,
          foundValue: "Acessórios",
          source: "productType",
          message: "'Tipo de produto' = 'Acessórios' não confirma 'fone'.",
        },
        {
          ...cancelamentoRuido,
          confirmed: false,
          foundValue: null,
          source: null,
          message:
            "Sem dado estruturado para confirmar 'Cancelamento de ruído'.",
        },
        {
          ...bateria,
          confirmed: false,
          foundValue: null,
          source: null,
          message:
            "Sem dado estruturado para confirmar 'Bateria' (mínimo 20h).",
        },
        {
          ...preco,
          confirmed: true,
          foundValue: "R$ 39,00",
          source: "price",
          message: "Preço R$ 39,00 dentro do limite de R$ 300,00.",
        },
      ],
    },
    after: {
      passed: false,
      correctlyClassified: null,
      evidence: [
        {
          ...tipoProduto,
          confirmed: false,
          foundValue: "Acessórios",
          source: "productType",
          message: "'Tipo de produto' = 'Acessórios' não confirma 'fone'.",
        },
        {
          ...cancelamentoRuido,
          confirmed: false,
          foundValue: null,
          source: null,
          message:
            "Sem dado estruturado para confirmar 'Cancelamento de ruído'.",
        },
        {
          ...bateria,
          confirmed: false,
          foundValue: null,
          source: null,
          message:
            "Sem dado estruturado para confirmar 'Bateria' (mínimo 20h).",
        },
        {
          ...preco,
          confirmed: true,
          foundValue: "R$ 39,00",
          source: "price",
          message: "Preço R$ 39,00 dentro do limite de R$ 300,00.",
        },
      ],
    },
  },
  {
    productId: "gid://shopify/Product/9291239900002",
    handle: "cabo-usb-c-reforcado",
    title: "Cabo USB-C Reforçado",
    descriptionExcerpt: null,
    expectedToPass: null,
    before: {
      passed: false,
      correctlyClassified: null,
      evidence: [
        {
          ...tipoProduto,
          confirmed: false,
          foundValue: "Acessórios",
          source: "productType",
          message: "'Tipo de produto' = 'Acessórios' não confirma 'fone'.",
        },
        {
          ...cancelamentoRuido,
          confirmed: false,
          foundValue: null,
          source: null,
          message:
            "Sem dado estruturado para confirmar 'Cancelamento de ruído'.",
        },
        {
          ...bateria,
          confirmed: false,
          foundValue: null,
          source: null,
          message:
            "Sem dado estruturado para confirmar 'Bateria' (mínimo 20h).",
        },
        {
          ...preco,
          confirmed: true,
          foundValue: "R$ 59,00",
          source: "price",
          message: "Preço R$ 59,00 dentro do limite de R$ 300,00.",
        },
      ],
    },
    after: {
      passed: false,
      correctlyClassified: null,
      evidence: [
        {
          ...tipoProduto,
          confirmed: false,
          foundValue: "Acessórios",
          source: "productType",
          message: "'Tipo de produto' = 'Acessórios' não confirma 'fone'.",
        },
        {
          ...cancelamentoRuido,
          confirmed: false,
          foundValue: null,
          source: null,
          message:
            "Sem dado estruturado para confirmar 'Cancelamento de ruído'.",
        },
        {
          ...bateria,
          confirmed: false,
          foundValue: null,
          source: null,
          message:
            "Sem dado estruturado para confirmar 'Bateria' (mínimo 20h).",
        },
        {
          ...preco,
          confirmed: true,
          foundValue: "R$ 59,00",
          source: "price",
          message: "Preço R$ 59,00 dentro do limite de R$ 300,00.",
        },
      ],
    },
  },
]

export const semExpectativas: ComparisonResult = {
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
    totalClassifiedProducts: 1,
    successRate: 0,
    chosenProductTitle: null,
    justification:
      "O único candidato dentro do escopo do pedido ainda não confirma os requisitos obrigatórios com dado estruturado.",
  },
  after: {
    correctlyClassifiedCount: 1,
    totalClassifiedProducts: 1,
    successRate: 1,
    chosenProductTitle: "Aurora NC7",
    justification:
      "'Aurora NC7' passa a confirmar todos os requisitos obrigatórios depois da otimização — os outros dois " +
      "produtos do catálogo não têm expectativa registrada e ficam fora da taxa de sucesso.",
  },
  successRateDeltaCount: 1,
  successRateDelta: 1,
}
