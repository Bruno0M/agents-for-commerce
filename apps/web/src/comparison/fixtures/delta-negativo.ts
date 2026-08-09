import type { ComparisonResult, ProductComparison } from "../types"

/**
 * Borda: uma classificação piora depois da otimização. À mão, mas grafada em cima do bug real
 * #3 do comentário de 05/08 do ticket 04 (`entrega-hackathon`) — o mesmo catálogo, antes do
 * conserto de negação ter sido aplicado à confirmação de valor. `Contains('ativo')` batia
 * dentro de 'Não possui cancelamento de ruído ativo', confirmando a característica num produto
 * que explicitamente não tem — um controle que rejeitava corretamente passa a ser aprovado por
 * engano depois da rodada.
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
    productId: "gid://shopify/Product/9291232608468",
    handle: "corvo-sport-2",
    title: "Corvo Sport 2",
    descriptionExcerpt:
      "Ele não tem cancelamento de ruído ativo, e isso foi decisão de projeto: quem corre na rua precisa ouvir o carro chegando. O isolamento é passivo, o da própria ponteira.",
    expectedToPass: false,
    before: {
      passed: false,
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
          foundValue: "R$ 189,00",
          source: "price",
          message: "Preço R$ 189,00 dentro do limite de R$ 300,00.",
        },
      ],
    },
    after: {
      passed: true,
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
          confirmed: true,
          foundValue:
            "Não possui cancelamento de ruído ativo, e isso foi decisão de projeto",
          source: "generated",
          message:
            "'Cancelamento de ruído' = 'Não possui cancelamento de ruído ativo, e isso foi decisão de projeto' " +
            "confirma 'ativo' — falso positivo: a palavra aparece dentro de uma frase que nega a característica.",
        },
        {
          ...bateria,
          confirmed: true,
          foundValue: "32h",
          source: "generated",
          message: "'Bateria' = '32h' confirma o mínimo de 20h.",
        },
        {
          ...preco,
          confirmed: true,
          foundValue: "R$ 189,00",
          source: "price",
          message: "Preço R$ 189,00 dentro do limite de R$ 300,00.",
        },
      ],
    },
  },
  {
    productId: "gid://shopify/Product/9291232641236",
    handle: "orbe-link-4",
    title: "Orbe Link 4",
    descriptionExcerpt:
      "A autonomia é de 14 horas, e a gente prefere ser honesto sobre isso: é um fone de trajeto e reunião, não de viagem longa.",
    expectedToPass: false,
    before: {
      passed: false,
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
          foundValue: "R$ 249,00",
          source: "price",
          message: "Preço R$ 249,00 dentro do limite de R$ 300,00.",
        },
      ],
    },
    after: {
      passed: false,
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
          foundValue: "Ativo (modesto)",
          source: "generated",
          message:
            "'Cancelamento de ruído' = 'Ativo (modesto)' confirma 'ativo'.",
        },
        {
          ...bateria,
          confirmed: false,
          foundValue: "14h",
          source: "generated",
          message: "'Bateria' = '14h' abaixo do mínimo de 20h.",
        },
        {
          ...preco,
          confirmed: true,
          foundValue: "R$ 249,00",
          source: "price",
          message: "Preço R$ 249,00 dentro do limite de R$ 300,00.",
        },
      ],
    },
  },
]

export const deltaNegativo: ComparisonResult = {
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
    correctlyClassifiedCount: 2,
    totalClassifiedProducts: 2,
    successRate: 1,
    chosenProductTitle: null,
    justification:
      "Nenhum produto confirmou todos os requisitos obrigatórios — os dois controles são corretamente rejeitados.",
  },
  after: {
    correctlyClassifiedCount: 1,
    totalClassifiedProducts: 2,
    successRate: 0.5,
    chosenProductTitle: "Corvo Sport 2",
    justification:
      "'Corvo Sport 2' passou a confirmar 'Cancelamento de ruído' por um falso positivo de substring: a " +
      "extração encontra a palavra 'ativo' dentro da frase que nega a característica. É regressão, não " +
      "melhoria — o produto continua sem cancelamento de ruído ativo.",
  },
  successRateDeltaCount: -1,
  successRateDelta: -0.5,
}
