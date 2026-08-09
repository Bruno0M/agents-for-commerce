import type { ComparisonResult, ProductComparison } from "../types"

/**
 * O estado real que o comentário de 05/08 do ticket 04 (`entrega-hackathon`) registrou na
 * primeira execução do pedido A: delta zero por desalinhamento de vocabulário entre chamadas de
 * LLM independentes. O JSON salvo em `.scratch/catalogo-demo/comparison-pedido-a.json` já é a
 * rodada CORRIGIDA (delta +3, a mesma que `pedidoA-delta-positivo.ts` usa) — o bug foi
 * consertado antes da rodada final ser congelada. Esta fixture reconstrói a rodada anterior à
 * correção a partir da descrição textual do comentário, reaproveitando produto, handle e
 * descriptionExcerpt reais do mesmo catálogo.
 *
 * Dois problemas bloqueiam os 3 candidatos legítimos na rodada "depois":
 *  1. 'Tipo de produto' herdou 'bluetooth' da frase do pedido e passou a exigir 'fone
 *     bluetooth' — nenhum tipo estruturado do catálogo contém essa palavra.
 *  2. O pedido extraiu o requisito como 'Duração da bateria'; a geração de conteúdo produziu o
 *     atributo como 'Autonomia da bateria' — nomes diferentes do mesmo dado, casamento por
 *     igualdade exata nunca bate.
 *
 * A extração de requisito roda uma única vez e vale para as duas rodadas, então o problema 1
 * já derruba 'Tipo de produto' também na rodada "antes" — sem mudar o resultado da rodada
 * (os candidatos já falhavam ali por falta de dado estruturado em outros requisitos).
 * `source` e `descriptionExcerpt` continuam preenchidos à mão porque o servidor ainda não os
 * produz (achado registrado na 05).
 */

const tipoProduto = {
  requirement: "Tipo de produto",
  expected: "fone bluetooth",
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

const TIPO_PRODUTO_MESSAGE =
  "'Tipo de produto' = 'Fones de ouvido' não confirma 'fone bluetooth' — o requisito herdou " +
  "'bluetooth' da frase do pedido, e nenhum tipo estruturado do catálogo contém essa palavra."

const BATERIA_ANTES_MESSAGE =
  "Sem dado estruturado para confirmar 'Bateria' (mínimo 20h)."

const BATERIA_DEPOIS_MESSAGE =
  "'Bateria' não confirma: o pedido extraiu o requisito como 'Duração da bateria', e a geração " +
  "de conteúdo produziu o atributo como 'Autonomia da bateria' — nomes diferentes, mesmo dado, " +
  "nunca comparados."

function tipoProdutoEvidence() {
  return {
    ...tipoProduto,
    confirmed: false,
    foundValue: "Fones de ouvido",
    source: "productType" as const,
    message: TIPO_PRODUTO_MESSAGE,
  }
}

function bateriaAntesEvidence() {
  return {
    ...bateria,
    confirmed: false,
    foundValue: null,
    source: null,
    message: BATERIA_ANTES_MESSAGE,
  }
}

function bateriaDepoisEvidence() {
  return {
    ...bateria,
    confirmed: false,
    foundValue: null,
    source: null,
    message: BATERIA_DEPOIS_MESSAGE,
  }
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
        tipoProdutoEvidence(),
        {
          ...cancelamentoRuido,
          confirmed: false,
          foundValue: null,
          source: null,
          message:
            "Sem dado estruturado para confirmar 'Cancelamento de ruído'.",
        },
        bateriaAntesEvidence(),
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
      passed: false,
      correctlyClassified: false,
      evidence: [
        tipoProdutoEvidence(),
        {
          ...cancelamentoRuido,
          confirmed: true,
          foundValue: "Ativo, com captação por microfone duplo",
          source: "generated",
          message:
            "'Cancelamento de ruído' = 'Ativo, com captação por microfone duplo' confirma 'ativo'.",
        },
        bateriaDepoisEvidence(),
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
        tipoProdutoEvidence(),
        {
          ...cancelamentoRuido,
          confirmed: false,
          foundValue: null,
          source: null,
          message:
            "Sem dado estruturado para confirmar 'Cancelamento de ruído'.",
        },
        bateriaAntesEvidence(),
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
      passed: false,
      correctlyClassified: false,
      evidence: [
        tipoProdutoEvidence(),
        {
          ...cancelamentoRuido,
          confirmed: true,
          foundValue: "Ativo (ANC)",
          source: "generated",
          message: "'Cancelamento de ruído' = 'Ativo (ANC)' confirma 'ativo'.",
        },
        bateriaDepoisEvidence(),
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
        tipoProdutoEvidence(),
        {
          ...cancelamentoRuido,
          confirmed: false,
          foundValue: null,
          source: null,
          message:
            "Sem dado estruturado para confirmar 'Cancelamento de ruído'.",
        },
        bateriaAntesEvidence(),
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
      passed: false,
      correctlyClassified: false,
      evidence: [
        tipoProdutoEvidence(),
        {
          ...cancelamentoRuido,
          confirmed: true,
          foundValue: "Ativo, com três níveis e modo ambiente",
          source: "generated",
          message:
            "'Cancelamento de ruído' = 'Ativo, com três níveis e modo ambiente' confirma 'ativo'.",
        },
        bateriaDepoisEvidence(),
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
        tipoProdutoEvidence(),
        {
          ...cancelamentoRuido,
          confirmed: false,
          foundValue: null,
          source: null,
          message:
            "Sem dado estruturado para confirmar 'Cancelamento de ruído'.",
        },
        bateriaAntesEvidence(),
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
        tipoProdutoEvidence(),
        {
          ...cancelamentoRuido,
          confirmed: false,
          foundValue: "Não possui cancelamento ativo (isolamento passivo)",
          source: "generated",
          message:
            "'Cancelamento de ruído' = 'Não possui cancelamento ativo (isolamento passivo)' não confirma 'ativo'.",
        },
        bateriaDepoisEvidence(),
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
        tipoProdutoEvidence(),
        {
          ...cancelamentoRuido,
          confirmed: false,
          foundValue: null,
          source: null,
          message:
            "Sem dado estruturado para confirmar 'Cancelamento de ruído'.",
        },
        bateriaAntesEvidence(),
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
        tipoProdutoEvidence(),
        {
          ...cancelamentoRuido,
          confirmed: true,
          foundValue: "Ativo (modesto)",
          source: "generated",
          message:
            "'Cancelamento de ruído' = 'Ativo (modesto)' confirma 'ativo'.",
        },
        bateriaDepoisEvidence(),
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
        tipoProdutoEvidence(),
        {
          ...cancelamentoRuido,
          confirmed: false,
          foundValue: null,
          source: null,
          message:
            "Sem dado estruturado para confirmar 'Cancelamento de ruído'.",
        },
        bateriaAntesEvidence(),
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
        tipoProdutoEvidence(),
        {
          ...cancelamentoRuido,
          confirmed: false,
          foundValue: "Não possui",
          source: "generated",
          message:
            "'Cancelamento de ruído' = 'Não possui' não confirma 'ativo'.",
        },
        bateriaDepoisEvidence(),
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
        tipoProdutoEvidence(),
        {
          ...cancelamentoRuido,
          confirmed: false,
          foundValue: null,
          source: null,
          message:
            "Sem dado estruturado para confirmar 'Cancelamento de ruído'.",
        },
        bateriaAntesEvidence(),
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
        tipoProdutoEvidence(),
        {
          ...cancelamentoRuido,
          confirmed: true,
          foundValue:
            "Ativo, com 8 microfones e ajuste automático por pressão de cabine",
          source: "generated",
          message:
            "'Cancelamento de ruído' = 'Ativo, com 8 microfones e ajuste automático por pressão de cabine' confirma 'ativo'.",
        },
        bateriaDepoisEvidence(),
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

export const pedidoADeltaZero: ComparisonResult = {
  naturalLanguageOrder:
    "Quero um fone bluetooth com cancelamento de ruído ativo, até R$ 300, e que a bateria dure pelo menos 20 horas.",
  requirements: [
    { name: "Tipo de produto", expected: "fone bluetooth" },
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
    correctlyClassifiedCount: 4,
    totalClassifiedProducts: 7,
    successRate: 4 / 7,
    chosenProductTitle: null,
    justification:
      "Nenhum produto confirmou 'Tipo de produto' ou 'Bateria' na rodada depois: 'Tipo de produto' herdou " +
      "'bluetooth' da extração do pedido e não bate com nenhum tipo estruturado do catálogo; 'Bateria' foi " +
      "extraída como 'Duração da bateria' no pedido e gerada como 'Autonomia da bateria' no conteúdo — nomes " +
      "diferentes, mesmo dado, nunca comparados.",
  },
  successRateDeltaCount: 0,
  successRateDelta: 0,
}
