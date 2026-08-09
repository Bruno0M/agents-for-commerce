import type { ProductCatalogContent } from "@/lib/catalog"
import { evaluateProduct, toCandidateProduct } from "../engine"
import type {
  BuyerAgentOrderOutcome,
  BuyerAgentSimulationBatchResult,
  GeneratedTestOrder,
  HandwrittenOrder,
  TestOrderCatalogSummary,
  TestOrderGenerationResult,
} from "../types"
import {
  lojaRealSemGabaritoCatalog,
  lojaRealSemGabaritoOrders,
} from "./loja-real-sem-gabarito"

/**
 * Os payloads mockados do botão único "Rodar Agente de Simulação" — o dado
 * que `runSimulationAgent` (`../lib/runSimulationAgent.ts`) devolve enquanto
 * não existe transporte para `generate_test_orders`/`simulate_buyer_agent`
 * de verdade. Três cenários, no formato exato dos dois contratos de
 * `types.ts` (`TestOrderGenerationResult`, `BuyerAgentSimulationBatchResult`):
 *
 * - `simulationAgentNormalScenario` — a mistura dos quatro estados do D2,
 *   com pelo menos um `mixed` e um `legitimatelyRejected`, com 4 pedidos
 *   fixos (o default de `DefaultOrderCount` em `TestOrderGenerationTools.cs`)
 *   cobrindo o conjunto fechado dos quatro eixos de restrição
 *   (`contraste`, `requisito-em-prosa`, `poucas-restricoes`, `restritivo`) e
 *   com pelo menos um pedido `expectsValidMatch: false` (regra 2
 *   anti-circularidade do D2 do `.scratch/exame-guiado/spec.md`).
 * - `simulationAgentNoPassScenario` — nenhum produto passa (um pedido
 *   deliberadamente impossível).
 * - `simulationAgentFailureScenario` — não é um payload de sucesso: é o
 *   catálogo mais as mensagens de erro que `runSimulationAgent` usa quando
 *   o cenário de falha é forçado (ver o módulo em `../lib/`).
 *
 * O catálogo é sempre `lojaRealSemGabaritoCatalog` (`loja-real-sem-gabarito.ts`)
 * — é o catálogo que `catalog-page.tsx` carrega em modo fixture, então
 * qualquer fixture nova daqui bate produto a produto com o que a tela já
 * mostra, sem precisar inventar um segundo catálogo de demo.
 *
 * DECISÃO DE MODELAGEM — como os vereditos da etapa 2 foram obtidos: em vez
 * de transcrever à mão os motivos de descarte de 7 produtos × N pedidos
 * (frágil e fácil de dessincronizar do engine na primeira mudança de frase),
 * este arquivo RODA o mesmo `evaluateProduct`/`toCandidateProduct` de
 * `../engine.ts` sobre pedidos estruturados equivalentes aos pedidos em
 * prosa abaixo, e congela o resultado nas constantes exportadas. É a mesma
 * recomendação do ticket desta etapa: "derivar o conteúdo inicial rodando a
 * agregação existente sobre esse catálogo e congelar o resultado". O pedido
 * estruturado (`HandwrittenOrder`) nunca é exportado — é andaime só deste
 * arquivo, apagado pelo escopo do módulo; o contrato exportado
 * (`GeneratedTestOrder`) não tem `attributeRequirements` nem
 * `numericMinimumRequirements`, exatamente como o servidor devolveria (a
 * etapa de extração de requisitos é interna à etapa 2, nunca visível aqui).
 */

const catalog = lojaRealSemGabaritoCatalog.products

/** Um cenário completo de sucesso: o catálogo mais os dois payloads mockados
 * (etapa 1 e etapa 2) que `runSimulationAgent` devolveria para ele. */
type SimulationAgentScenarioFixture = {
  catalog: ProductCatalogContent[]
  testOrderGeneration: TestOrderGenerationResult
  simulationBatch: BuyerAgentSimulationBatchResult
}

/**
 * Porta local, só para fixture, de `TestOrderGenerationTools.SummarizeCatalog`
 * (C#) — mesmas quatro fontes (tipos, marcas, títulos, faixa de preço), só
 * para o resumo que as três fixtures abaixo expõem não ser digitado à mão e
 * arriscar divergir do catálogo real. Não é reusada fora deste arquivo: a
 * versão que importa (a que roda contra o catálogo de verdade) é
 * responsabilidade do servidor, nunca desta etapa (D5 da spec
 * `catalogo-como-exame`, "nada muda no servidor").
 */
function summarizeCatalog(
  products: typeof catalog
): TestOrderCatalogSummary {
  const productTypes = Array.from(
    new Set(
      products
        .map((product) => product.productType)
        .filter((type): type is string => !!type && type.trim() !== "")
    )
  ).sort((a, b) => a.localeCompare(b))

  const vendors = Array.from(
    new Set(
      products
        .map((product) => product.vendor)
        .filter((vendor): vendor is string => !!vendor && vendor.trim() !== "")
    )
  ).sort((a, b) => a.localeCompare(b))

  const titles = products.map((product) => product.title)

  const prices = products
    .flatMap((product) => product.variants)
    .map((variant) => (variant.price !== null ? Number(variant.price) : null))
    .filter(
      (price): price is number => price !== null && Number.isFinite(price)
    )

  return {
    productCount: products.length,
    productTypes,
    vendors,
    titles,
    minPrice: prices.length > 0 ? Math.min(...prices) : null,
    maxPrice: prices.length > 0 ? Math.max(...prices) : null,
  }
}

const catalogSummary = summarizeCatalog(catalog)

/** Roda `evaluateProduct` do engine local contra o catálogo inteiro, um
 * `BuyerAgentOrderOutcome` por pedido estruturado — a "congelagem" descrita
 * no comentário do topo. */
function buildOutcomes(
  structuredOrders: HandwrittenOrder[]
): BuyerAgentOrderOutcome[] {
  const candidates = catalog.map(toCandidateProduct)

  return structuredOrders.map((order) => ({
    orderId: order.id,
    products: candidates.map((candidate) => {
      const result = evaluateProduct(candidate, order)
      return {
        productId: candidate.productId,
        handle: candidate.handle,
        title: candidate.title,
        passed: result.passed,
        confirmedRequirements: result.confirmedRequirements,
        unmetRequirements: result.unmetRequirements,
      }
    }),
  }))
}

// --- Cenário 1: normal — a mistura dos quatro estados, 4 pedidos fixos -----
//
// Os dois primeiros pedidos reusam, de propósito, os dois de
// `loja-real-sem-gabarito.ts`: o comentário daquele arquivo já documenta,
// produto a produto, que o par produz ilegibilidade pura (Aurora NC7),
// rejeição legítima pura (Fone Nebula Pro — só falha por preço no pedido de
// viagem, depois de confirmar TUDO no pedido completo: é o par A/B que prova
// que a rejeição foi do requisito, não do produto), motivo misto (Corvo
// Sport 2, Tênis Runner X, Capa Protetora X1, Fone Compacto Lite) e o
// controle que sempre passa (Fone Zenith Air). `text` é literalmente o
// `label` daqueles pedidos — já era prosa em primeira pessoa, escrita para
// leitura humana; não muda para virar um "pedido em linguagem natural"
// mockado.
//
// Os dois pedidos abaixo (3 e 4) completam o lote para o default real de 4
// pedidos por rodada (`TestOrderGenerationTools.DefaultOrderCount`) e fecham
// o conjunto dos quatro eixos que ainda faltavam:
//
// - Pedido 3 (`requisito-em-prosa`) pede a bateria em linguagem coloquial
//   ("aguenta o dia inteiro") em vez do nome exato do campo estruturado
//   (`Bateria`) — o mesmo requisito que o pedido 1 já testa, mas isolado, e
//   com `attributeName: "Duração da bateria"` para exercitar o fallback de
//   palavra significativa de `findMatchingAttribute` (`../engine.ts`) em vez
//   do match exato.
// - Pedido 4 (`restritivo`) empilha cancelamento de ruído ativo, bateria
//   mínima e um teto de preço apertado. `expectsValidMatch: false` é a
//   crença do gerador — que só vê o resumo agregado do catálogo
//   (`catalogSummary`, nunca dados estruturados) — de que nenhum produto
//   sobrevive às três exigências juntas. A avaliação real (rodada abaixo)
//   revela um único vencedor por uma margem mínima (Fone Zenith Air: 24h de
//   bateria exatos, R$229 dentro do teto de R$239) — o gerador não tinha
//   como prever isso sem ver os dados estruturados, e é exatamente esse tipo
//   de furo que o exame existe para expor. `expectsValidMatch` é campo
//   informativo (mostrado ao lojista), nunca validado contra o resultado
//   real em código algum — ver o uso em `CatalogExamOrdersPanel.tsx`.
//
// A escolha dos limiares do pedido 4 (bateria ≥24h, preço ≤R$239) não é
// arbitrária: preserva o Fone Zenith Air como único produto que confirma os
// quatro pedidos sem nenhum motivo de descarte (controle "passed" do lote) e
// preserva a Aurora NC7 como o único produto de ilegibilidade PURA — um
// teto de preço mais apertado (ex: R$230) rejeitaria a Aurora por preço
// (R$239) e a tornaria `mixed`, derrubando o estado `illegible` da mistura.

const thirdStructuredOrder: HandwrittenOrder = {
  id: "pedido-fone-bateria-dia-inteiro",
  label:
    "Quero um fone com bateria que aguente o dia inteiro, tipo mais de 20 horas rodando sem recarregar.",
  attributeRequirements: [],
  numericMinimumRequirements: [
    { attributeName: "Duração da bateria", minValue: 20, unit: "h" },
  ],
  maxPrice: null,
}

const fourthStructuredOrder: HandwrittenOrder = {
  id: "pedido-fone-tudo-ou-nada",
  label:
    "Só compro se tiver cancelamento de ruído ativo, bateria de pelo menos 24 horas e custar até R$239.",
  attributeRequirements: [
    { attributeName: "Cancelamento de ruído", expectedValue: "ativo" },
  ],
  numericMinimumRequirements: [
    { attributeName: "Bateria", minValue: 24, unit: "h" },
  ],
  maxPrice: 239,
}

const normalStructuredOrders: HandwrittenOrder[] = [
  lojaRealSemGabaritoOrders[0],
  lojaRealSemGabaritoOrders[1],
  thirdStructuredOrder,
  fourthStructuredOrder,
]

const normalOrders: GeneratedTestOrder[] = [
  {
    id: lojaRealSemGabaritoOrders[0].id, // "pedido-fone-completo"
    text: lojaRealSemGabaritoOrders[0].label,
    expectsValidMatch: true, // Fone Zenith Air e Fone Nebula Pro confirmam tudo
    constraintAxis: "contraste",
    rationale:
      "Testa cancelamento de ruído, bateria mínima e preço juntos — e é o pedido que faz o Fone Nebula Pro VENCER (confirma tudo), enquanto o pedido de viagem abaixo o rejeita só por preço. O contraste prova que a rejeição é do requisito, não do produto.",
  },
  {
    id: lojaRealSemGabaritoOrders[1].id, // "pedido-fone-viagem"
    text: lojaRealSemGabaritoOrders[1].label,
    expectsValidMatch: true, // Aurora NC7, Corvo Sport 2 e Fone Zenith Air confirmam
    constraintAxis: "poucas-restricoes",
    rationale:
      "Pedido deliberadamente enxuto (só categoria e preço, sem bateria nem cancelamento de ruído) para alargar o desempate entre vários candidatos possíveis — e para o Fone Nebula Pro, que venceu o pedido acima, ser rejeitado aqui só por preço.",
  },
  {
    id: thirdStructuredOrder.id, // "pedido-fone-bateria-dia-inteiro"
    text: thirdStructuredOrder.label,
    expectsValidMatch: true, // Fone Nebula Pro e Fone Zenith Air confirmam a bateria
    constraintAxis: "requisito-em-prosa",
    rationale:
      "A duração da bateria aparece em linguagem cotidiana ('aguenta o dia inteiro'), nunca como o nome exato de um campo estruturado — testa se o requisito, enterrado numa frase de comprador real, ainda é comparável a 'Bateria' sem virar uma lista de sinônimos exata. Quem não tem o dado estruturado (Aurora NC7, Corvo Sport 2, Tênis Runner X, Capa Protetora X1) fica ilegível aqui, não rejeitado.",
  },
  {
    id: fourthStructuredOrder.id, // "pedido-fone-tudo-ou-nada"
    text: fourthStructuredOrder.label,
    expectsValidMatch: false, // o gerador, só com o resumo agregado, não espera sobrevivente
    constraintAxis: "restritivo",
    rationale:
      "Empilha três exigências ao mesmo tempo (cancelamento ativo, bateria mínima, preço apertado) — o controle 'restritivo' do lote. O gerador não viu dado estruturado nenhum ao escrever isto, só o resumo agregado do catálogo; é o tipo de pedido que tipicamente não sobra ninguém, embora o exame por si só seja quem decide, não o gerador.",
  },
]

export const simulationAgentNormalScenario: SimulationAgentScenarioFixture = {
  catalog,
  testOrderGeneration: {
    catalogSummary,
    orders: normalOrders,
  },
  simulationBatch: {
    totalProductCount: catalog.length,
    outcomes: buildOutcomes(normalStructuredOrders),
  },
}

// --- Cenário 2: nenhum produto passou ---------------------------------------
//
// Um único pedido deliberadamente impossível (preço máximo de R$1) — nenhum
// produto do catálogo tem preço estruturado abaixo disso, e o único sem
// preço nenhum (Capa Protetora X1) é descartado por ilegibilidade em vez de
// rejeição legítima. O resultado é "zero linhas `passed`" sem precisar de um
// catálogo diferente — é o mesmo catálogo, só um exame mais severo.

const noPassStructuredOrder: HandwrittenOrder = {
  id: "pedido-impossivel",
  label: "Quero um fone por R$1,00, não ligo pra mais nada.",
  attributeRequirements: [],
  numericMinimumRequirements: [],
  maxPrice: 1,
}

const noPassOrders: GeneratedTestOrder[] = [
  {
    id: noPassStructuredOrder.id,
    text: noPassStructuredOrder.label,
    expectsValidMatch: false,
    constraintAxis: "restritivo",
    rationale:
      "Controle do lote: nenhum produto do catálogo deveria atender a este preço — prova que 'nenhum produto passou' é um resultado honesto do exame sobre a loja, não um bug no agregador.",
  },
]

export const simulationAgentNoPassScenario: SimulationAgentScenarioFixture = {
  catalog,
  testOrderGeneration: {
    catalogSummary,
    orders: noPassOrders,
  },
  simulationBatch: {
    totalProductCount: catalog.length,
    outcomes: buildOutcomes([noPassStructuredOrder]),
  },
}

// --- Cenário 3: falha --------------------------------------------------------
//
// Não é um payload de sucesso — não há `TestOrderGenerationResult` nem
// `BuyerAgentSimulationBatchResult` aqui. É o catálogo (para quem quiser
// chamar `runSimulationAgent` com `scenario: "failure"` e um catálogo
// coerente) mais as duas mensagens de erro que cada etapa rejeita com — uma
// por tool espelhada (`generate_test_orders` / `simulate_buyer_agent`),
// porque a falha real pode acontecer em qualquer uma das duas chamadas de
// rede, não só na segunda.

export const simulationAgentFailureScenario = {
  catalog,
  writeTestOrdersErrorMessage:
    "Não foi possível escrever os pedidos de teste: falha simulada do transporte (AI Gateway indisponível).",
  runBuyerAgentErrorMessage:
    "Não foi possível rodar o agente comprador: falha simulada do transporte (AI Gateway indisponível).",
}
