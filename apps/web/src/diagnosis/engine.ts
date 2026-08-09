import type { ProductCatalogContent } from "@/lib/catalog"
import type { HandwrittenOrder, UnmetRequirement } from "./types"

/**
 * Porta em TypeScript da etapa 1 (filtragem à risca) de
 * `BuyerAgentDecisionEngine.EvaluateProduct`
 * (apps/mcp-server/Tools/BuyerAgentDecisionEngine.cs) — mesma lógica,
 * mesmas frases, mesma atribuição de natureza no ponto de criação do
 * motivo. Fase 3 não precisa da etapa 2 (desempate por sinal secundário):
 * o diagnóstico não escolhe um produto vencedor, só mede quantos o agente
 * conseguiu avaliar. Zero chamada de rede — mesma propriedade do engine
 * original, o que é o que torna esta fase testável e "quase de graça"
 * (spec, "A assimetria de custo que confirma a ordem").
 */

export type CandidateProduct = {
  productId: string
  handle: string
  title: string
  price: number | null
  attributes: Record<string, string>
}

export type ProductFilterOutcome = {
  passed: boolean
  confirmedRequirements: string[]
  unmetRequirements: UnmetRequirement[]
}

const PRODUCT_TYPE_ATTRIBUTE_NAME = "Tipo de produto"
const DESCRIPTION_ATTRIBUTE_NAME = "Descrição"

/**
 * Porta de `BuyerAgentSimulatorTools.ToCandidateProduct` — mesma prioridade
 * de fontes (opção > metafield > propriedade gerada > tipo de produto >
 * descrição) e mesmo critério de preço (o menor entre as variantes com
 * preço parseável). Sem `generatedProperties` de otimização nesta fase
 * (nenhuma geração aconteceu ainda — D1), mas o campo continua no shape de
 * `ProductCatalogContent` porque a mesma leitura de catálogo é reusada nas
 * fases 3 e 4; aqui ele normalmente chega vazio.
 *
 * Diferença deliberada do C#: lá os atributos vivem num
 * `Dictionary<string,string>` com comparador `OrdinalIgnoreCase` (chaves
 * "Cor" e "cor" colapsam na mesma entrada). Um objeto JS não tem esse
 * comparador; replicar isso exigiria uma estrutura própria só para um caso
 * que não ocorre em catálogo real (duas fontes escrevendo o mesmo nome de
 * atributo com capitalização diferente). Em vez disso, a comparação
 * case-insensitive acontece na leitura (`findMatchingAttribute`), que é o
 * comportamento que os testes de fato exercitam.
 */
export function toCandidateProduct(
  product: ProductCatalogContent
): CandidateProduct {
  const attributes: Record<string, string> = {}

  for (const option of product.options) {
    attributes[option.name] = option.values.join(", ")
  }

  for (const metafield of product.metafields) {
    if (metafield.value === null || metafield.value.trim() === "") continue
    attributes[metafield.key] = metafield.value
  }

  for (const generated of product.generatedProperties) {
    if (generated.value.trim() === "") continue
    attributes[generated.name] = generated.value
  }

  if (
    product.productType !== null &&
    product.productType.trim() !== "" &&
    !(PRODUCT_TYPE_ATTRIBUTE_NAME in attributes)
  ) {
    attributes[PRODUCT_TYPE_ATTRIBUTE_NAME] = product.productType
  }

  if (
    product.descriptionHtml !== null &&
    product.descriptionHtml.trim() !== "" &&
    !(DESCRIPTION_ATTRIBUTE_NAME in attributes)
  ) {
    attributes[DESCRIPTION_ATTRIBUTE_NAME] = product.descriptionHtml
  }

  const parsedPrices = product.variants
    .map((variant) => (variant.price !== null ? Number(variant.price) : null))
    .filter(
      (price): price is number => price !== null && Number.isFinite(price)
    )
  const price = parsedPrices.length > 0 ? Math.min(...parsedPrices) : null

  return {
    productId: product.id,
    handle: product.handle,
    title: product.title,
    price,
    attributes,
  }
}

// Mesmos marcadores de negação do C# — heurística agnóstica de produto, sem
// resolução de escopo de negação além do limite da cláusula.
const NEGATION_MARKERS = ["não", "nao", "nunca", "nenhum", "nenhuma", "sem "]

// Plain substring confirms tem o mesmo falso positivo do lado C#: um valor
// que nega o requisito pode conter a palavra esperada literalmente (ex:
// "Não possui cancelamento de ruído ativo" contém "ativo"). Escopo o check
// à cláusula que contém o match (separada por . ; , :) e rejeita se houver
// marcador de negação na mesma cláusula.
function valueConfirms(actualValue: string, expectedValue: string): boolean {
  const matchIndex = actualValue
    .toLowerCase()
    .indexOf(expectedValue.toLowerCase())
  if (matchIndex < 0) return false

  let clauseStart = 0
  for (let i = matchIndex - 1; i >= 0; i--) {
    if (".;,:".includes(actualValue[i])) {
      clauseStart = i + 1
      break
    }
  }

  const clause = actualValue.slice(clauseStart).toLowerCase()
  return !NEGATION_MARKERS.some((marker) => clause.includes(marker))
}

const PORTUGUESE_STOPWORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "a",
  "o",
  "as",
  "os",
  "com",
  "para",
  "em",
  "no",
  "na",
])

function significantWords(text: string): Set<string> {
  return new Set(
    text
      .split(/[\s\-/]+/)
      .map((word) => word.trim().toLowerCase())
      .filter((word) => word.length > 2 && !PORTUGUESE_STOPWORDS.has(word))
  )
}

function overlaps(a: Set<string>, b: Set<string>): boolean {
  for (const word of a) {
    if (b.has(word)) return true
  }
  return false
}

type AttributeMatch = { key: string; value: string }

// Porta de FindMatchingAttribute: match exato (case-insensitive) primeiro;
// se não achar, cai para o fallback de palavra significativa compartilhada
// (tolera "Duração da bateria" vs "Autonomia da bateria" — risco real
// documentado no C#).
function findMatchingAttribute(
  attributes: Record<string, string>,
  requirementName: string
): AttributeMatch | null {
  const requirementLower = requirementName.toLowerCase()
  const exactKey = Object.keys(attributes).find(
    (key) => key.toLowerCase() === requirementLower
  )
  if (exactKey !== undefined) {
    return { key: exactKey, value: attributes[exactKey] }
  }

  const requirementWords = significantWords(requirementName)
  if (requirementWords.size === 0) return null

  const fallbackKey = Object.keys(attributes).find((key) =>
    overlaps(significantWords(key), requirementWords)
  )
  return fallbackKey !== undefined
    ? { key: fallbackKey, value: attributes[fallbackKey] }
    : null
}

// Porta de ExtractLeadingNumber: primeiro número (inteiro ou decimal, com
// vírgula ou ponto) da string, ou null se não houver nenhum.
function extractLeadingNumber(value: string): number | null {
  const match = /\d+(?:[.,]\d+)?/.exec(value)
  if (!match) return null

  const parsed = Number(match[0].replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
}

function formatNumber(value: number): string {
  return value.toString()
}

// Moeda em pt-BR (Intl), para casar com o resto da UI (comparison/ já
// mostra "R$ 289,00" nas fixtures) — o C# usa "C" com CultureInfo
// Invariant, que não é o mesmo texto; não há teste, no servidor ou aqui,
// que compare os dois byte a byte, e a regra dura do ticket é sobre a
// *natureza* não ser derivada da frase, não sobre casar o símbolo de moeda
// entre as duas linguagens.
const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

function formatCurrency(value: number): string {
  return CURRENCY_FORMATTER.format(value)
}

/**
 * Avalia um produto contra um pedido digitado à mão — porta de
 * `BuyerAgentDecisionEngine.EvaluateProduct`. As frases produzidas aqui são
 * as mesmas do C# (ajustadas só na formatação de moeda, ver comentário
 * acima); a natureza (`kind`) nasce emparelhada com cada frase, no mesmo
 * ponto — nenhuma camada acima deriva isso relendo `message`.
 */
export function evaluateProduct(
  product: CandidateProduct,
  order: HandwrittenOrder
): ProductFilterOutcome {
  const confirmedRequirements: string[] = []
  const unmetRequirements: UnmetRequirement[] = []

  for (const requirement of order.attributeRequirements) {
    const match = findMatchingAttribute(
      product.attributes,
      requirement.attributeName
    )

    if (match === null) {
      unmetRequirements.push({
        message: `Sem dado estruturado para confirmar '${requirement.attributeName}'.`,
        kind: "illegibility",
      })
      continue
    }

    if (!valueConfirms(match.value, requirement.expectedValue)) {
      unmetRequirements.push({
        message: `'${requirement.attributeName}' = '${match.value}' não confirma '${requirement.expectedValue}'.`,
        kind: "legitimateRejection",
      })
      continue
    }

    confirmedRequirements.push(
      `'${requirement.attributeName}' = '${match.value}'.`
    )
  }

  for (const numericRequirement of order.numericMinimumRequirements) {
    const unit = numericRequirement.unit ?? ""
    const minLabel = `${formatNumber(numericRequirement.minValue)}${unit}`
    const match = findMatchingAttribute(
      product.attributes,
      numericRequirement.attributeName
    )

    if (match === null) {
      unmetRequirements.push({
        message: `Sem dado estruturado para confirmar '${numericRequirement.attributeName}' (mínimo ${minLabel}).`,
        kind: "illegibility",
      })
      continue
    }

    const extractedValue = extractLeadingNumber(match.value)
    if (extractedValue === null) {
      unmetRequirements.push({
        message: `'${numericRequirement.attributeName}' = '${match.value}' não tem valor numérico reconhecível para confirmar o mínimo de ${minLabel}.`,
        kind: "illegibility",
      })
      continue
    }

    if (extractedValue < numericRequirement.minValue) {
      unmetRequirements.push({
        message: `'${numericRequirement.attributeName}' = '${formatNumber(extractedValue)}${unit}' abaixo do mínimo de ${minLabel}.`,
        kind: "legitimateRejection",
      })
      continue
    }

    confirmedRequirements.push(
      `'${numericRequirement.attributeName}' = '${formatNumber(extractedValue)}${unit}' (mínimo ${minLabel}).`
    )
  }

  if (order.maxPrice !== null) {
    if (product.price === null) {
      unmetRequirements.push({
        message: `Sem preço estruturado para confirmar o limite de ${formatCurrency(order.maxPrice)}.`,
        kind: "illegibility",
      })
    } else if (product.price > order.maxPrice) {
      unmetRequirements.push({
        message: `Preço ${formatCurrency(product.price)} acima do limite de ${formatCurrency(order.maxPrice)}.`,
        kind: "legitimateRejection",
      })
    } else {
      confirmedRequirements.push(
        `Preço ${formatCurrency(product.price)} dentro do limite de ${formatCurrency(order.maxPrice)}.`
      )
    }
  }

  return {
    passed: unmetRequirements.length === 0,
    confirmedRequirements,
    unmetRequirements,
  }
}
