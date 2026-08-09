import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  createBridgeTransport,
  type CallToolResultLike,
} from "./bridgeTransport"
import { createFetchTransport } from "./fetchTransport"
import { createFixtureTransport } from "./fixtureTransport"
import { createStandaloneTransport } from "./standalone"
import {
  TransportProtocolError,
  TransportToolError,
  TransportUnavailableError,
  type ExamTransport,
} from "./types"

/**
 * Os testes do módulo de transporte (issue #6). Duas coisas separadas moram
 * aqui, de propósito:
 *
 * 1. **O CONTRATO**, rodado contra cada implementação — é a garantia de que
 *    trocar de transporte não muda nada para quem chama. Nenhum componente é
 *    testado de novo por causa disso; se para cobrir uma implementação fosse
 *    preciso renderizar uma tela, o D2 da spec estaria sendo violado.
 * 2. **A TRADUÇÃO do bridge**, que é onde mora o risco de verdade: o payload
 *    do C# e os tipos do TS não são idênticos, e as diferenças (enum em
 *    PascalCase, nulo omitido, `id`/`handle` ausentes) quebram em silêncio.
 *
 * O bridge é mockado em toda parte — o handshake com um host real não é
 * automatizável e está nos critérios manuais dos tickets 01 e 07 da spec.
 */

// ---------------------------------------------------------------------------
// Payloads do servidor, na forma EXATA que o MCP serializa
// ---------------------------------------------------------------------------

/**
 * Como o SDK C# 1.2.0 devolve o retorno de uma tool: `UseStructuredContent` é
 * `false` por default, então o objeto vai como JSON dentro de UM bloco de
 * texto — não em `structuredContent`.
 */
function toolResult(payload: unknown): CallToolResultLike {
  return { content: [{ type: "text", text: JSON.stringify(payload) }] }
}

/**
 * Catálogo como `get_product_catalog` o entrega pelo bridge. Repare no que
 * NÃO está aqui: `descriptionHtml`, `vendor` e `sku` do segundo produto são
 * chaves AUSENTES, não `null` — `McpJsonUtilities.DefaultOptions` liga
 * `JsonIgnoreCondition.WhenWritingNull`. O `GET /catalog` (transporte
 * `fetch`) escreve os `null`; a tela tem de receber a mesma coisa dos dois.
 */
const SERVER_CATALOG_PAYLOAD = {
  products: [
    {
      id: "gid://shopify/Product/1",
      handle: "aurora-nc7",
      title: "Aurora NC7",
      descriptionHtml: "<p>Fone com cancelamento de ruído</p>",
      vendor: "Aurora",
      productType: "Fone de ouvido",
      status: "ACTIVE",
      tags: ["fone"],
      options: [{ name: "Cor", values: ["Preto"] }],
      variants: [
        {
          id: "gid://shopify/ProductVariant/1",
          title: "Preto",
          sku: "AUR-NC7",
          price: "899.00",
          availableForSale: true,
          inventoryQuantity: 4,
          selectedOptions: [{ name: "Cor", value: "Preto" }],
        },
      ],
      metafields: [
        {
          namespace: "custom",
          key: "bateria_horas",
          value: "30",
          type: "number_integer",
        },
      ],
      hasSchemaOrgMarkup: true,
      generatedProperties: [{ name: "Bateria", value: "30h" }],
    },
    {
      // Produto "pelado": todo campo anulável do C# saiu do JSON.
      id: "gid://shopify/Product/2",
      handle: "corvo-sport-2",
      title: "Corvo Sport 2",
      status: "ACTIVE",
      tags: [],
      options: [],
      variants: [
        {
          id: "gid://shopify/ProductVariant/2",
          title: "Único",
          availableForSale: false,
          selectedOptions: [],
        },
      ],
      metafields: [],
      hasSchemaOrgMarkup: false,
      generatedProperties: [],
    },
  ],
  reachedProductLimit: false,
  productLimit: 50,
}

/**
 * O MESMO catálogo, como o `GET /catalog` o entrega. A rota é uma minimal
 * API comum e usa a serialização default do ASP.NET, que NÃO liga
 * `WhenWritingNull`: aqui todo nulo está escrito.
 *
 * As duas constantes existindo lado a lado são o ponto: o mesmo catálogo
 * chega em DOIS formatos de fio diferentes, e a tela recebe um só. É por
 * isso que o teste de contrato acima roda a mesma asserção sobre os dois.
 */
const ASPNET_CATALOG_PAYLOAD = {
  ...SERVER_CATALOG_PAYLOAD,
  products: [
    { ...SERVER_CATALOG_PAYLOAD.products[0], onlineStoreUrl: null },
    {
      ...SERVER_CATALOG_PAYLOAD.products[1],
      descriptionHtml: null,
      vendor: null,
      productType: null,
      onlineStoreUrl: null,
      variants: [
        {
          ...SERVER_CATALOG_PAYLOAD.products[1].variants[0],
          sku: null,
          price: null,
          inventoryQuantity: null,
        },
      ],
    },
  ],
}

/** Como `generate_test_orders` responde — sem `id` em pedido nenhum. */
const SERVER_ORDERS_PAYLOAD = {
  orders: [
    {
      order: "quero um fone com pelo menos 20h de bateria",
      expectsValidMatch: true,
      constraintAxis: "restritivo",
      rationale: "testa requisito numérico estruturado",
    },
    {
      order: "quero um fone bom para corrida",
      expectsValidMatch: false,
      constraintAxis: "poucas-restricoes",
      rationale: "testa pedido vago",
    },
  ],
  catalogSummary: {
    productCount: 2,
    productTypes: ["Fone de ouvido"],
    vendors: ["Aurora"],
    titles: ["Aurora NC7", "Corvo Sport 2"],
    minPrice: 899,
    // maxPrice ausente de propósito: mesmo motivo dos campos do produto.
  },
}

/**
 * Como `simulate_buyer_agent` responde. Dois detalhes que o transporte tem
 * de resolver: `kind` vem em PascalCase, e `product` NÃO tem `handle`.
 */
const SERVER_SIMULATION_PAYLOAD = {
  filterOutcomes: [
    {
      product: {
        productId: "gid://shopify/Product/1",
        title: "Aurora NC7",
        price: 899,
      },
      passed: true,
      confirmedRequirements: ["Bateria de 30h atende o mínimo de 20h"],
      unmetRequirements: [],
    },
    {
      product: { productId: "gid://shopify/Product/2", title: "Corvo Sport 2" },
      passed: false,
      confirmedRequirements: [],
      unmetRequirements: [
        { message: "Nenhum dado estruturado de bateria", kind: "Illegibility" },
        { message: "Preço acima do limite", kind: "LegitimateRejection" },
      ],
    },
  ],
  passedCandidates: [],
  chosenProduct: null,
  justification: "…",
}

/** O bridge mockado: responde por nome de tool e registra o que foi chamado. */
function createFakeBridge(
  responses: Partial<Record<string, CallToolResultLike>> = {}
) {
  const calls: { name: string; arguments?: Record<string, unknown> }[] = []

  return {
    calls,
    callServerTool: vi.fn(
      async (params: { name: string; arguments?: Record<string, unknown> }) => {
        calls.push(params)
        const response = responses[params.name]
        if (!response) throw new Error(`tool inesperada: ${params.name}`)
        return response
      }
    ),
  }
}

function createWiredBridge() {
  return createFakeBridge({
    get_product_catalog: toolResult(SERVER_CATALOG_PAYLOAD),
    generate_test_orders: toolResult(SERVER_ORDERS_PAYLOAD),
    simulate_buyer_agent: toolResult(SERVER_SIMULATION_PAYLOAD),
  })
}

// ---------------------------------------------------------------------------
// 1. O contrato, igual para toda implementação
// ---------------------------------------------------------------------------

const catalogReaders: { name: string; create: () => ExamTransport }[] = [
  { name: "fixture", create: () => createFixtureTransport({ delayMs: 0 }) },
  { name: "bridge", create: () => createBridgeTransport(createWiredBridge()) },
  {
    name: "fetch",
    create: () => createFetchTransport({ baseUrl: "http://mcp.test" }),
  },
]

describe("ExamTransport — o contrato que toda implementação cumpre", () => {
  describe.each(catalogReaders)("$name", ({ name, create }) => {
    beforeEach(() => {
      // Só o transporte `fetch` usa isto; os outros dois não podem tocar em
      // rede, e o próprio mock serve de sensor disso (ver o teste do bridge
      // logo abaixo).
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(JSON.stringify(ASPNET_CATALOG_PAYLOAD)))
      )
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it("se identifica pelo `kind`", () => {
      expect(create().kind).toBe(name)
    })

    it("devolve um catálogo com a forma de ProductCatalogReadResult", async () => {
      const result = await create().readCatalog()

      expect(Array.isArray(result.products)).toBe(true)
      expect(result.products.length).toBeGreaterThan(0)
      expect(typeof result.reachedProductLimit).toBe("boolean")
      expect(typeof result.productLimit).toBe("number")

      for (const product of result.products) {
        expect(typeof product.id).toBe("string")
        expect(typeof product.handle).toBe("string")
        expect(typeof product.title).toBe("string")
        // Campo anulável é sempre `string | null` — nunca `undefined`, em
        // nenhuma implementação. É a diferença de serialização que o
        // bridgeTransport reidrata.
        expect(
          product.descriptionHtml === null ||
            typeof product.descriptionHtml === "string"
        ).toBe(true)
        expect(
          product.vendor === null || typeof product.vendor === "string"
        ).toBe(true)
        expect(Array.isArray(product.variants)).toBe(true)
      }
    })
  })

  // O exame em si só existe em dois transportes — o `fetch` não roda tool que
  // gasta crédito de LLM, por desenho (ver `fetchTransport.ts`), e isso é
  // afirmado no bloco dele mais abaixo.
  describe.each([
    { name: "fixture", create: () => createFixtureTransport({ delayMs: 0 }) },
    {
      name: "bridge",
      create: () => createBridgeTransport(createWiredBridge()),
    },
  ])("$name — exame ponta a ponta", ({ create }) => {
    it("todo pedido tem id e texto, e todo desfecho aponta para um pedido existente", async () => {
      const transport = create()
      const { products } = await transport.readCatalog()

      const generation = await transport.writeTestOrders(products)
      expect(generation.orders.length).toBeGreaterThan(0)
      for (const order of generation.orders) {
        expect(order.id).not.toBe("")
        expect(order.text).not.toBe("")
      }

      // Ids únicos: sem isso, o filtro por pedido e a perda silenciosa
      // atribuiriam desfechos ao pedido errado.
      const ids = generation.orders.map((order) => order.id)
      expect(new Set(ids).size).toBe(ids.length)

      const batch = await transport.runBuyerAgent(products, generation.orders)
      expect(batch.totalProductCount).toBe(products.length)
      expect(batch.outcomes.length).toBe(generation.orders.length)

      for (const outcome of batch.outcomes) {
        expect(ids).toContain(outcome.orderId)
        for (const product of outcome.products) {
          expect(typeof product.handle).toBe("string")
          for (const requirement of product.unmetRequirements) {
            expect(["illegibility", "legitimateRejection"]).toContain(
              requirement.kind
            )
          }
        }
      }
    })
  })
})

// ---------------------------------------------------------------------------
// 2. O transporte do Studio
// ---------------------------------------------------------------------------

describe("bridgeTransport — as tools pelo host, sem rede", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("não faz NENHUMA requisição de rede — só callServerTool", async () => {
    const networkCall = vi.fn()
    vi.stubGlobal("fetch", networkCall)

    const bridge = createWiredBridge()
    const transport = createBridgeTransport(bridge)

    const { products } = await transport.readCatalog()
    const generation = await transport.writeTestOrders(products)
    await transport.runBuyerAgent(products, generation.orders)

    expect(networkCall).not.toHaveBeenCalled()
    expect(bridge.callServerTool).toHaveBeenCalled()
  })

  it("chama as tools pelos nomes que o mcp-server publica", async () => {
    const bridge = createWiredBridge()
    const transport = createBridgeTransport(bridge)

    const { products } = await transport.readCatalog()
    const generation = await transport.writeTestOrders(products)
    await transport.runBuyerAgent(products, generation.orders)

    expect(bridge.calls.map((call) => call.name)).toEqual([
      "get_product_catalog",
      "generate_test_orders",
      // Uma chamada de simulação POR PEDIDO — a tool recebe um
      // `naturalLanguageOrder` de cada vez.
      "simulate_buyer_agent",
      "simulate_buyer_agent",
    ])

    expect(bridge.calls[1].arguments).toEqual({ catalog: products })
    expect(bridge.calls[2].arguments).toEqual({
      naturalLanguageOrder: generation.orders[0].text,
      catalog: products,
    })
  })

  it("reidrata como null os campos que a serialização do MCP omitiu", async () => {
    const transport = createBridgeTransport(createWiredBridge())

    const { products } = await transport.readCatalog()
    const pelado = products[1]

    expect(pelado.descriptionHtml).toBeNull()
    expect(pelado.vendor).toBeNull()
    expect(pelado.productType).toBeNull()
    expect(pelado.onlineStoreUrl).toBeNull()
    expect(pelado.variants[0].sku).toBeNull()
    expect(pelado.variants[0].price).toBeNull()
    expect(pelado.variants[0].inventoryQuantity).toBeNull()
  })

  it("traduz o enum PascalCase do C# para o vocabulário camelCase da tela", async () => {
    const transport = createBridgeTransport(createWiredBridge())

    const { products } = await transport.readCatalog()
    const generation = await transport.writeTestOrders(products)
    const batch = await transport.runBuyerAgent(products, generation.orders)

    const descartado = batch.outcomes[0].products[1]
    expect(descartado.unmetRequirements.map((r) => r.kind)).toEqual([
      "illegibility",
      "legitimateRejection",
    ])
  })

  it("EXPLODE em vez de adivinhar quando o `kind` do motivo é desconhecido", async () => {
    // A natureza do motivo é a métrica de topo do projeto. Um default
    // silencioso aqui classificaria a loja inteira errado sem nenhum
    // sintoma — por isso o transporte prefere falhar visivelmente.
    const bridge = createFakeBridge({
      get_product_catalog: toolResult(SERVER_CATALOG_PAYLOAD),
      generate_test_orders: toolResult(SERVER_ORDERS_PAYLOAD),
      simulate_buyer_agent: toolResult({
        filterOutcomes: [
          {
            product: {
              productId: "gid://shopify/Product/1",
              title: "Aurora NC7",
            },
            passed: false,
            confirmedRequirements: [],
            unmetRequirements: [{ message: "?", kind: "SomethingElse" }],
          },
        ],
      }),
    })
    const transport = createBridgeTransport(bridge)

    const { products } = await transport.readCatalog()
    const generation = await transport.writeTestOrders(products)

    await expect(
      transport.runBuyerAgent(products, generation.orders)
    ).rejects.toBeInstanceOf(TransportProtocolError)
  })

  it("dá id a cada pedido, que o C# não devolve, e o usa para atribuir os desfechos", async () => {
    const transport = createBridgeTransport(createWiredBridge())

    const { products } = await transport.readCatalog()
    const generation = await transport.writeTestOrders(products)

    expect(generation.orders.map((order) => order.id)).toEqual([
      "pedido-1",
      "pedido-2",
    ])

    const batch = await transport.runBuyerAgent(products, generation.orders)
    expect(batch.outcomes.map((outcome) => outcome.orderId)).toEqual([
      "pedido-1",
      "pedido-2",
    ])
  })

  it("cruza o handle a partir do catálogo, porque o veredito do C# não traz", async () => {
    const transport = createBridgeTransport(createWiredBridge())

    const { products } = await transport.readCatalog()
    const generation = await transport.writeTestOrders(products)
    const batch = await transport.runBuyerAgent(products, generation.orders)

    expect(batch.outcomes[0].products.map((p) => p.handle)).toEqual([
      "aurora-nc7",
      "corvo-sport-2",
    ])
  })

  it("lê o resultado de `structuredContent` quando o servidor manda por lá", async () => {
    const bridge = createFakeBridge({
      get_product_catalog: { structuredContent: SERVER_CATALOG_PAYLOAD },
    })

    const result = await createBridgeTransport(bridge).readCatalog()
    expect(result.products).toHaveLength(2)
  })

  it("erro de tool vira TransportToolError com a mensagem do servidor", async () => {
    const bridge = createFakeBridge({
      get_product_catalog: {
        isError: true,
        content: [
          {
            type: "text",
            text: "O catálogo informado está vazio — nada para ler.",
          },
        ],
      },
    })

    await expect(createBridgeTransport(bridge).readCatalog()).rejects.toThrow(
      "O catálogo informado está vazio — nada para ler."
    )
    await expect(
      createBridgeTransport(bridge).readCatalog()
    ).rejects.toBeInstanceOf(TransportToolError)
  })

  it("resposta vazia e resposta que não é JSON viram TransportProtocolError", async () => {
    const semConteudo = createFakeBridge({ get_product_catalog: {} })
    await expect(
      createBridgeTransport(semConteudo).readCatalog()
    ).rejects.toBeInstanceOf(TransportProtocolError)

    const naoJson = createFakeBridge({
      get_product_catalog: {
        content: [{ type: "text", text: "<html>502</html>" }],
      },
    })
    await expect(
      createBridgeTransport(naoJson).readCatalog()
    ).rejects.toBeInstanceOf(TransportProtocolError)
  })

  it("falha de transporte do host sobe como está, sem virar erro de protocolo", async () => {
    const bridge = {
      callServerTool: vi.fn(async () => {
        throw new Error("Request timed out")
      }),
    }

    await expect(createBridgeTransport(bridge).readCatalog()).rejects.toThrow(
      "Request timed out"
    )
  })
})

// ---------------------------------------------------------------------------
// 3. O transporte do front avulso
// ---------------------------------------------------------------------------

describe("fetchTransport — o front avulso", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("lê o catálogo do GET /catalog do mcp-server", async () => {
    // Tipo declarado no `vi.fn<...>` (e não nos parâmetros) para o
    // `mock.calls` ficar tipado sem parâmetro sobrando — é a URL chamada
    // que este teste afirma.
    const fetchMock = vi.fn<
      (input: string, init?: RequestInit) => Promise<Response>
    >(async () => new Response(JSON.stringify(ASPNET_CATALOG_PAYLOAD)))
    vi.stubGlobal("fetch", fetchMock)

    const result = await createFetchTransport({
      baseUrl: "http://mcp.test/",
    }).readCatalog()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe("http://mcp.test/catalog")
    expect(result.products).toHaveLength(2)
  })

  it("resposta não-ok vira mensagem com o status, não uma promessa pendurada", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("nope", { status: 502, statusText: "Bad Gateway" })
      )
    )

    await expect(
      createFetchTransport({ baseUrl: "http://mcp.test" }).readCatalog()
    ).rejects.toThrow(/502/)
  })

  it("servidor fora do ar vira mensagem que diz onde ele foi procurado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch")
      })
    )

    await expect(
      createFetchTransport({ baseUrl: "http://mcp.test" }).readCatalog()
    ).rejects.toThrow(/http:\/\/mcp\.test/)
  })

  it("não roda o exame — e diz por quê, em vez de estourar um 401", async () => {
    const transport = createFetchTransport({ baseUrl: "http://mcp.test" })

    await expect(transport.writeTestOrders([])).rejects.toBeInstanceOf(
      TransportUnavailableError
    )
    await expect(transport.runBuyerAgent([], [])).rejects.toThrow(
      /generate_test_orders|simulate_buyer_agent/
    )
    await expect(transport.runBuyerAgent([], [])).rejects.toThrow(/Studio/)
  })
})

// ---------------------------------------------------------------------------
// 4. A escolha do modo avulso
// ---------------------------------------------------------------------------

describe("createStandaloneTransport — qual modo avulso", () => {
  it("é fixture por default — o `bun dev` continua funcionando como antes", () => {
    expect(createStandaloneTransport({}).kind).toBe("fixture")
    expect(
      createStandaloneTransport({ VITE_EXAM_TRANSPORT: "fixture" }).kind
    ).toBe("fixture")
  })

  it("vira fetch quando pedido explicitamente", () => {
    expect(
      createStandaloneTransport({ VITE_EXAM_TRANSPORT: "fetch" }).kind
    ).toBe("fetch")
  })

  it("valor desconhecido cai para fixture, mas reclama alto", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(
      createStandaloneTransport({ VITE_EXAM_TRANSPORT: "bridge" }).kind
    ).toBe("fixture")
    expect(consoleError).toHaveBeenCalled()

    consoleError.mockRestore()
  })
})
