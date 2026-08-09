import type {
  ProductCatalogContent,
  ProductCatalogReadResult,
} from "@/lib/catalog"
import type {
  BuyerAgentOrderOutcome,
  GeneratedTestOrder,
  SimulatedProductOutcome,
  TestOrderConstraintAxis,
  TestOrderGenerationResult,
  UnmetRequirement,
  UnmetRequirementKind,
} from "@/diagnosis/types"
import {
  TransportProtocolError,
  TransportToolError,
  type ExamTransport,
  type ExamTransportCallOptions,
} from "./types"

/**
 * O transporte do STUDIO (D1 da spec `web-como-view-do-studio`) — o `/web`
 * rodando dentro do iframe da view, chamando as tools do próprio
 * `mcp-server` pelo bridge do host.
 *
 * **Nenhuma linha aqui faz requisição de rede.** Não há `fetch`, não há
 * `XMLHttpRequest`, não há WebSocket — e sob a CSP default do Studio
 * (`connect-src 'none'`, `default-src 'none'`) nem haveria como. O que sai
 * daqui é `app.callServerTool({ name, arguments })`, que vira um
 * `postMessage` para o host; quem fala com o `mcp-server` é o Studio, com as
 * credenciais que a Connection já guarda. É por isso que o bearer token não
 * precisa existir dentro do bundle.
 *
 * ## O que este módulo traduz, e por que precisa traduzir
 *
 * O C# e o TypeScript não descrevem o mesmo payload por acaso: os tipos de
 * `@/diagnosis/types` são cópia campo a campo dos records C#. Mas três
 * diferenças REAIS sobreviveram, e são exatamente o trabalho deste arquivo.
 * As três foram confirmadas rodando `JsonSerializer.Serialize(..., McpJsonUtilities.DefaultOptions)`
 * — as opções que o SDK 1.2.0 usa para serializar retorno de tool — e não
 * deduzidas do C#:
 *
 * 1. **Enum vira string PascalCase.** `UnmetRequirementKind.Illegibility`
 *    sai como `"Illegibility"`, não `"illegibility"`. O TS usa camelCase
 *    (`"illegibility" | "legitimateRejection"`). Errar isso não quebra nada
 *    visivelmente — só faz a métrica de topo do produto inteiro (produtos
 *    ilegíveis) classificar tudo errado, em silêncio. Por isso
 *    `parseUnmetRequirementKind` ACEITA as duas grafias e **explode** em
 *    qualquer terceira, em vez de cair num default.
 * 2. **Propriedade nula é OMITIDA.** `McpJsonUtilities.DefaultOptions` liga
 *    `JsonIgnoreCondition.WhenWritingNull`, então `descriptionHtml: null`
 *    chega como chave AUSENTE. O `GET /catalog` do transporte `fetch` usa a
 *    serialização default do ASP.NET, que ESCREVE o `null`. Os dois
 *    transportes têm de entregar a mesma coisa para a tela, então aqui
 *    `?? null` é obrigatório, não defensivo.
 * 3. **Falta o que o C# não tem.** `GeneratedTestOrder` (C#) não tem `id` e
 *    `BuyerCandidateProduct` não tem `handle`. Ver `toTestOrders` e
 *    `toOrderOutcome` para de onde cada um sai.
 */
export function createBridgeTransport(caller: ServerToolCaller): ExamTransport {
  return {
    kind: "bridge",

    async readCatalog(options) {
      const payload = await callTool(
        caller,
        "get_product_catalog",
        {},
        CATALOG_TIMEOUT_MS,
        options
      )
      return toCatalogReadResult(payload)
    },

    async writeTestOrders(catalog, options) {
      const payload = await callTool(
        caller,
        "generate_test_orders",
        { catalog },
        LLM_TOOL_TIMEOUT_MS,
        options
      )
      return toTestOrderGenerationResult(payload)
    },

    async runBuyerAgent(catalog, orders, options) {
      const handleByProductId = new Map(
        catalog.map((product) => [product.id, product.handle])
      )

      // Uma chamada POR PEDIDO — é assim que a tool é: `simulate_buyer_agent`
      // recebe UM `naturalLanguageOrder`. Em paralelo, e não em série, porque
      // o custo é idêntico (cada pedido é simulado exatamente uma vez de um
      // jeito ou de outro) e o usuário está olhando um spinner só: em série,
      // 4 pedidos × uma chamada de LLM cada empilhariam os tempos.
      const outcomes = await Promise.all(
        orders.map(async (order) => {
          const payload = await callTool(
            caller,
            "simulate_buyer_agent",
            { naturalLanguageOrder: order.text, catalog },
            LLM_TOOL_TIMEOUT_MS,
            options
          )
          return toOrderOutcome(payload, order.id, handleByProductId)
        })
      )

      return { totalProductCount: catalog.length, outcomes }
    },
  }
}

/**
 * O pedaço do `App` do `@modelcontextprotocol/ext-apps` de que este módulo
 * depende — só `callServerTool`, declarado estruturalmente.
 *
 * Escrito à mão em vez de `import type { App }` por dois motivos: o
 * transporte passa a ser testável com um bridge mockado de três linhas (é
 * critério de aceite da issue #6), e o SDK fica confinado ao entry point
 * (`TransportGate.tsx`), que é o único lugar que deveria conhecê-lo. Um
 * `App` de verdade satisfaz esta interface — `TransportGate` passa o dele
 * direto, e o compilador confere.
 */
export type ServerToolCaller = {
  callServerTool(
    params: { name: string; arguments?: Record<string, unknown> },
    options?: { timeout?: number; signal?: AbortSignal }
  ): Promise<CallToolResultLike>
}

/** O `CallToolResult` do MCP, na parte que nos interessa. */
export type CallToolResultLike = {
  content?: unknown
  structuredContent?: unknown
  isError?: boolean
}

/** Leitura de catálogo não passa por LLM nenhum — se demorar isso, quebrou. */
const CATALOG_TIMEOUT_MS = 30_000

/** `generate_test_orders` e `simulate_buyer_agent` fazem uma chamada de LLM
 * cada (o `AiGatewayClient` do C# tem ele próprio 60s de teto). Um timeout
 * curto aqui abortaria uma chamada que o servidor JÁ pagou. */
const LLM_TOOL_TIMEOUT_MS = 120_000

async function callTool(
  caller: ServerToolCaller,
  name: string,
  args: Record<string, unknown>,
  timeout: number,
  options: ExamTransportCallOptions = {}
): Promise<unknown> {
  const result = await caller.callServerTool(
    { name, arguments: args },
    { timeout, signal: options.signal }
  )

  // O SDK distingue os dois: falha de TRANSPORTE (host recusou, timeout,
  // conexão caiu) vem como exceção e sobe daqui sem tratamento; falha de
  // EXECUÇÃO da tool vem como resultado com `isError`. A segunda é a que o
  // `McpException` do C# produz, e a mensagem dele é a que a tela mostra.
  if (result?.isError) {
    throw new TransportToolError(
      "bridge",
      name,
      readTextContent(result) ??
        `A tool \`${name}\` falhou no servidor sem devolver mensagem.`
    )
  }

  if (isRecord(result?.structuredContent)) {
    return result.structuredContent
  }

  // Caminho normal do SDK C# 1.2.0: `UseStructuredContent` é `false` por
  // default, então o retorno da tool chega como UM bloco de texto com o JSON
  // dentro — não como `structuredContent`.
  const text = readTextContent(result)
  if (text === null) {
    throw new TransportProtocolError(
      "bridge",
      `A tool \`${name}\` respondeu sem conteúdo — nem \`structuredContent\`, nem bloco de texto.`
    )
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new TransportProtocolError(
      "bridge",
      `A tool \`${name}\` respondeu um texto que não é JSON: ${truncate(text)}`
    )
  }
}

/** Concatena os blocos `type: "text"` do resultado, ou `null` se não houver. */
function readTextContent(
  result: CallToolResultLike | undefined
): string | null {
  if (!Array.isArray(result?.content)) return null

  const parts = result.content
    .filter(
      (block): block is { type: string; text: string } =>
        isRecord(block) &&
        block.type === "text" &&
        typeof block.text === "string"
    )
    .map((block) => block.text)

  return parts.length > 0 ? parts.join("") : null
}

function toCatalogReadResult(payload: unknown): ProductCatalogReadResult {
  const raw = expectRecord(payload, "get_product_catalog")
  const products = expectArray(raw.products, "get_product_catalog", "products")

  return {
    products: products.map((product, index) =>
      toProduct(product, `get_product_catalog.products[${index}]`)
    ),
    reachedProductLimit: raw.reachedProductLimit === true,
    productLimit: typeof raw.productLimit === "number" ? raw.productLimit : 0,
  }
}

/**
 * Reidrata os `null` que a serialização do MCP omitiu (ver o item 2 do
 * cabeçalho). Sem isto, `descriptionHtml` chegaria `undefined` pelo bridge e
 * `null` pelo `fetch` — a tela veria dois catálogos de formatos diferentes
 * dependendo de onde está rodando, que é precisamente o que a interface de
 * transporte existe para impedir.
 */
function toProduct(payload: unknown, path: string): ProductCatalogContent {
  const raw = expectRecord(payload, path)

  return {
    id: expectString(raw.id, path, "id"),
    handle: expectString(raw.handle, path, "handle"),
    title: expectString(raw.title, path, "title"),
    descriptionHtml: nullableString(raw.descriptionHtml),
    vendor: nullableString(raw.vendor),
    productType: nullableString(raw.productType),
    status: typeof raw.status === "string" ? raw.status : "ACTIVE",
    tags: toStringArray(raw.tags),
    onlineStoreUrl: nullableString(raw.onlineStoreUrl),
    options: asArray(raw.options).map((option) => {
      const o = expectRecord(option, `${path}.options[]`)
      return {
        name: expectString(o.name, path, "options[].name"),
        values: toStringArray(o.values),
      }
    }),
    variants: asArray(raw.variants).map((variant) => {
      const v = expectRecord(variant, `${path}.variants[]`)
      return {
        id: expectString(v.id, path, "variants[].id"),
        title: expectString(v.title, path, "variants[].title"),
        sku: nullableString(v.sku),
        price: nullableString(v.price),
        availableForSale: v.availableForSale === true,
        inventoryQuantity:
          typeof v.inventoryQuantity === "number" ? v.inventoryQuantity : null,
        selectedOptions: asArray(v.selectedOptions).map((selected) => {
          const s = expectRecord(
            selected,
            `${path}.variants[].selectedOptions[]`
          )
          return {
            name: expectString(
              s.name,
              path,
              "variants[].selectedOptions[].name"
            ),
            value: expectString(
              s.value,
              path,
              "variants[].selectedOptions[].value"
            ),
          }
        }),
      }
    }),
    metafields: asArray(raw.metafields).map((metafield) => {
      const m = expectRecord(metafield, `${path}.metafields[]`)
      return {
        namespace: expectString(m.namespace, path, "metafields[].namespace"),
        key: expectString(m.key, path, "metafields[].key"),
        value: nullableString(m.value),
        type: nullableString(m.type),
      }
    }),
    hasSchemaOrgMarkup: raw.hasSchemaOrgMarkup === true,
    generatedProperties: asArray(raw.generatedProperties).map((property) => {
      const p = expectRecord(property, `${path}.generatedProperties[]`)
      return {
        name: expectString(p.name, path, "generatedProperties[].name"),
        value: expectString(p.value, path, "generatedProperties[].value"),
      }
    }),
  }
}

function toTestOrderGenerationResult(
  payload: unknown
): TestOrderGenerationResult {
  const raw = expectRecord(payload, "generate_test_orders")
  const summary = expectRecord(
    raw.catalogSummary,
    "generate_test_orders.catalogSummary"
  )

  return {
    catalogSummary: {
      productCount:
        typeof summary.productCount === "number" ? summary.productCount : 0,
      productTypes: toStringArray(summary.productTypes),
      vendors: toStringArray(summary.vendors),
      titles: toStringArray(summary.titles),
      minPrice: nullableNumber(summary.minPrice),
      maxPrice: nullableNumber(summary.maxPrice),
    },
    orders: toTestOrders(
      expectArray(raw.orders, "generate_test_orders", "orders")
    ),
  }
}

/**
 * De onde sai o `id` que o C# não manda (item 3 do cabeçalho).
 * `GeneratedTestOrder` (C#) não tem identificador porque a tool devolve o
 * lote inteiro numa resposta só. A tela precisa de um: é por ele que o
 * veredito da etapa 2 é atribuído de volta ao pedido que o produziu (filtro
 * por pedido, drill-down, perda silenciosa). `@/diagnosis/types` já previa
 * essa decisão e deixava em aberto "o servidor passa a devolvê-lo ou o
 * cliente gera um". Como esta issue não mexe no servidor, o cliente gera —
 * pela POSIÇÃO no lote, que é estável dentro de uma rodada (é a mesma lista,
 * na mesma ordem, que segue para a etapa 2) e legível quando aparece na tela.
 */
function toTestOrders(payload: unknown[]): GeneratedTestOrder[] {
  return payload.map((entry, index) => {
    const raw = expectRecord(entry, `generate_test_orders.orders[${index}]`)
    return {
      id: `pedido-${index + 1}`,
      text: expectString(raw.order, "generate_test_orders.orders[]", "order"),
      expectsValidMatch: raw.expectsValidMatch === true,
      constraintAxis: parseConstraintAxis(raw.constraintAxis),
      rationale: typeof raw.rationale === "string" ? raw.rationale : "",
    }
  })
}

/**
 * O resultado de UMA `simulate_buyer_agent` (`BuyerAgentSimulationResult` no
 * C#), achatado no que a tela consome. Só `filterOutcomes` atravessa:
 * `passedCandidates` é um subconjunto dele, e `chosenProduct`/`justification`
 * são o desempate por diferenciais — informação de "qual produto o agente
 * comprou", que não é o que este exame mede (ele mede o que o agente não
 * conseguiu sequer avaliar).
 *
 * `handle` não existe em `BuyerCandidateProduct` (item 3 do cabeçalho), e a
 * tela precisa dele (busca por handle, drill-down). Ele vem do catálogo que
 * ESTA MESMA chamada mandou para o servidor, cruzado por `productId` — não
 * de uma segunda leitura, que poderia ser de um catálogo diferente.
 */
function toOrderOutcome(
  payload: unknown,
  orderId: string,
  handleByProductId: Map<string, string>
): BuyerAgentOrderOutcome {
  const raw = expectRecord(payload, "simulate_buyer_agent")
  const outcomes = expectArray(
    raw.filterOutcomes,
    "simulate_buyer_agent",
    "filterOutcomes"
  )

  const products: SimulatedProductOutcome[] = outcomes.map((entry, index) => {
    const path = `simulate_buyer_agent.filterOutcomes[${index}]`
    const outcome = expectRecord(entry, path)
    const product = expectRecord(outcome.product, `${path}.product`)
    const productId = expectString(product.productId, path, "product.productId")

    return {
      productId,
      handle: handleByProductId.get(productId) ?? "",
      title: expectString(product.title, path, "product.title"),
      passed: outcome.passed === true,
      confirmedRequirements: toStringArray(outcome.confirmedRequirements),
      unmetRequirements: asArray(outcome.unmetRequirements).map((requirement) =>
        toUnmetRequirement(requirement, `${path}.unmetRequirements[]`)
      ),
    }
  })

  return { orderId, products }
}

function toUnmetRequirement(payload: unknown, path: string): UnmetRequirement {
  const raw = expectRecord(payload, path)
  return {
    message: expectString(raw.message, path, "message"),
    kind: parseUnmetRequirementKind(raw.kind, path),
  }
}

/**
 * A tradução que não pode errar em silêncio. O C# manda `"Illegibility"` /
 * `"LegitimateRejection"` (enum do System.Text.Json, PascalCase); o TS usa
 * `"illegibility"` / `"legitimateRejection"`. As duas grafias são aceitas —
 * são a MESMA informação, e uma mudança de política de serialização do SDK
 * não deveria derrubar a view. Qualquer outra coisa **explode**: um default
 * silencioso aqui faria a contagem de produtos ilegíveis — o número de topo
 * do projeto inteiro — mentir sem nenhum sintoma.
 */
function parseUnmetRequirementKind(
  raw: unknown,
  path: string
): UnmetRequirementKind {
  if (typeof raw === "string") {
    const normalized = raw.toLowerCase()
    if (normalized === "illegibility") return "illegibility"
    if (normalized === "legitimaterejection") return "legitimateRejection"
  }

  throw new TransportProtocolError(
    "bridge",
    `${path}.kind veio como ${JSON.stringify(raw)} — esperado "Illegibility" ou ` +
      `"LegitimateRejection". A natureza do motivo decide a métrica de topo, ` +
      `então esta resposta é descartada em vez de classificada errado.`
  )
}

/** Mesmo espírito de `parseUnmetRequirementKind`, para o vocabulário fechado
 * de eixos (`AxisContraste` e irmãos em `TestOrderGenerationTools.cs`) — que
 * o C# já emite em minúsculas, por ser `const string` e não enum. */
function parseConstraintAxis(raw: unknown): TestOrderConstraintAxis {
  if (
    raw === "contraste" ||
    raw === "requisito-em-prosa" ||
    raw === "poucas-restricoes" ||
    raw === "restritivo"
  ) {
    return raw
  }

  throw new TransportProtocolError(
    "bridge",
    `generate_test_orders devolveu constraintAxis ${JSON.stringify(raw)}, fora ` +
      `dos quatro eixos declarados por TestOrderGenerationTools.cs.`
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TransportProtocolError(
      "bridge",
      `${path} deveria ser um objeto, veio ${describeType(value)}.`
    )
  }
  return value
}

function expectArray(value: unknown, path: string, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new TransportProtocolError(
      "bridge",
      `${path}.${field} deveria ser uma lista, veio ${describeType(value)}.`
    )
  }
  return value
}

function expectString(value: unknown, path: string, field: string): string {
  if (typeof value !== "string") {
    throw new TransportProtocolError(
      "bridge",
      `${path}.${field} deveria ser texto, veio ${describeType(value)}.`
    )
  }
  return value
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function toStringArray(value: unknown): string[] {
  return asArray(value).filter(
    (item): item is string => typeof item === "string"
  )
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null
}

function describeType(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined (chave ausente)"
  if (Array.isArray(value)) return "uma lista"
  return typeof value
}

function truncate(text: string): string {
  return text.length > 200 ? `${text.slice(0, 200)}…` : text
}
