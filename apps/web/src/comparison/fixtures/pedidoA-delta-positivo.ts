import type { ComparisonResult, ProductComparison } from "../types"

/**
 * O cenário do pitch: construída à mão a partir de
 * `.scratch/catalogo-demo/{comparison-pedido-a.json,catalog-antes.json}`.
 * 3 candidatos legítimos reprovam antes e passam depois; 4 controles são
 * rejeitados nas duas rodadas — e essa rejeição conta como acerto.
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
    productId: "gid://shopify/Product/9291232248020",
    handle: "vetor-studio-one",
    title: "Vetor Studio One",
    descriptionExcerpt:
      "cancelamento de ruído ativo que você liga quando o vizinho resolve furar a parede [...] a autonomia é o ponto em que ele não tem concorrente na faixa: 40 horas com o ANC ligado.",
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
          foundValue: "R$ 279,00",
          source: "price",
          message: "Preço R$ 279,00 dentro do limite de R$ 300,00.",
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
          foundValue: "Ativo (ANC)",
          source: "generated",
          message: "'Cancelamento de ruído' = 'Ativo (ANC)' confirma 'ativo'.",
        },
        {
          ...bateria,
          confirmed: true,
          foundValue: "40h",
          source: "generated",
          message: "'Bateria' = '40h' confirma o mínimo de 20h.",
        },
        {
          ...preco,
          confirmed: true,
          foundValue: "R$ 279,00",
          source: "price",
          message: "Preço R$ 279,00 dentro do limite de R$ 300,00.",
        },
      ],
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
          foundValue: "R$ 299,00",
          source: "price",
          message: "Preço R$ 299,00 dentro do limite de R$ 300,00.",
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
          foundValue: "Ativo, com três níveis e modo ambiente",
          source: "generated",
          message:
            "'Cancelamento de ruído' = 'Ativo, com três níveis e modo ambiente' confirma 'ativo'.",
        },
        {
          ...bateria,
          confirmed: true,
          foundValue: "22h",
          source: "generated",
          message: "'Bateria' = '22h' confirma o mínimo de 20h.",
        },
        {
          ...preco,
          confirmed: true,
          foundValue: "R$ 299,00",
          source: "price",
          message: "Preço R$ 299,00 dentro do limite de R$ 300,00.",
        },
      ],
    },
  },
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
          foundValue: "Não possui cancelamento ativo (isolamento passivo)",
          source: "generated",
          message:
            "'Cancelamento de ruído' = 'Não possui cancelamento ativo (isolamento passivo)' não confirma 'ativo'.",
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
  {
    productId: "gid://shopify/Product/9291232674004",
    handle: "nimbo-mini",
    title: "Nimbo Mini",
    descriptionExcerpt:
      "Pareia apertando um botão, toca por 18 horas e não pede mais nada de você [...] Não espere cancelamento de ruído ativo nem resistência à água nesta faixa.",
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
          foundValue: "R$ 149,00",
          source: "price",
          message: "Preço R$ 149,00 dentro do limite de R$ 300,00.",
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
          confirmed: false,
          foundValue: "Não possui",
          source: "generated",
          message:
            "'Cancelamento de ruído' = 'Não possui' não confirma 'ativo'.",
        },
        {
          ...bateria,
          confirmed: false,
          foundValue: "18h",
          source: "generated",
          message: "'Bateria' = '18h' abaixo do mínimo de 20h.",
        },
        {
          ...preco,
          confirmed: true,
          foundValue: "R$ 149,00",
          source: "price",
          message: "Preço R$ 149,00 dentro do limite de R$ 300,00.",
        },
      ],
    },
  },
  {
    productId: "gid://shopify/Product/9291232739540",
    handle: "vetor-reference-900",
    title: "Vetor Reference 900",
    descriptionExcerpt: null,
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
          confirmed: false,
          foundValue: "R$ 1.290,00",
          source: "price",
          message: "Preço R$ 1.290,00 acima do limite de R$ 300,00.",
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
          foundValue:
            "Ativo, com 8 microfones e ajuste automático por pressão de cabine",
          source: "generated",
          message:
            "'Cancelamento de ruído' = 'Ativo, com 8 microfones e ajuste automático por pressão de cabine' confirma 'ativo'.",
        },
        {
          ...bateria,
          confirmed: true,
          foundValue: "60h",
          source: "generated",
          message: "'Bateria' = '60h' confirma o mínimo de 20h.",
        },
        {
          ...preco,
          confirmed: false,
          foundValue: "R$ 1.290,00",
          source: "price",
          message: "Preço R$ 1.290,00 acima do limite de R$ 300,00.",
        },
      ],
    },
  },
]

export const pedidoADeltaPositivo: ComparisonResult = {
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
    correctlyClassifiedCount: 4,
    totalClassifiedProducts: 7,
    successRate: 4 / 7,
    chosenProductTitle: null,
    justification:
      "Nenhum produto do catálogo confirmou todos os requisitos obrigatórios com dado estruturado.",
  },
  after: {
    correctlyClassifiedCount: 7,
    totalClassifiedProducts: 7,
    successRate: 1,
    chosenProductTitle: "Aurora NC7",
    justification:
      "'Aurora NC7' escolhido entre 3 candidatos empatados nos requisitos obrigatórios — sem sinais secundários estruturados suficientes para desempatar por diferencial.",
  },
  successRateDeltaCount: 3,
  successRateDelta: 1 - 4 / 7,
}
