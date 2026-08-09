import type { ProductCatalogReadResult } from "@/lib/catalog"
import type { HandwrittenOrder } from "../types"

/**
 * A fixture que o critério de aceite do ticket 06 pede: uma "loja real sem
 * gabarito". Diferença deliberada de todas as fixtures de `comparison/`
 * (`pedidoA-delta-positivo` e companhia): aquelas nasceram do
 * `catalogo-demo/spec.md`, com `expectedOutcomes` curado produto a produto
 * — a fase 3 não tem esse conceito (não há "antes/depois" aqui, só a loja
 * como está), e fora da demo curada nenhuma loja real chega com gabarito.
 * Este catálogo não declara nenhuma expectativa; a tela e os testes rodam
 * inteiramente sobre a contagem de ilegibilidade, sem percentual de
 * classificação correta em lugar nenhum — porque não haveria contra o que
 * comparar.
 *
 * Os sete produtos, com os dois pedidos abaixo, cobrem os três estados que
 * `aggregateDiagnosis` pode produzir para um produto, mais o caso de
 * controle (produto que nunca aparece na lista):
 *
 * - `Aurora NC7`      — ilegibilidade pura (a prosa da descrição já tem a
 *                        resposta; nenhum campo estruturado confirma).
 * - `Corvo Sport 2`   — motivo misto (sem bateria estruturada = ilegível; o
 *                        cancelamento de ruído estruturado nega o pedido =
 *                        rejeição legítima).
 * - `Tênis Runner X`  — motivo misto, categoria errada.
 * - `Capa Protetora X1` — motivo misto, acessório sem preço nem specs.
 * - `Fone Nebula Pro` — rejeição legítima pura (só falha por preço no
 *                        segundo pedido; tudo o resto está estruturado).
 * - `Fone Compacto Lite` — motivo misto (bateria estruturada mas abaixo do
 *                        mínimo = legítimo; cancelamento sem dado = ilegível).
 * - `Fone Zenith Air` — controle: confirma tudo nos dois pedidos, nunca
 *                        aparece em `discardedProducts`.
 */

export const lojaRealSemGabaritoCatalog: ProductCatalogReadResult = {
  products: [
    {
      id: "gid://shopify/Product/9401",
      handle: "aurora-nc7",
      title: "Aurora NC7",
      descriptionHtml:
        "<p>Uma escuta silenciosa que aparece no primeiro segundo. O estojo recarrega o fone quase três vezes, o que dá 28 horas longe da tomada, e o cancelamento de ruído ativo bloqueia o barulho do metrô.</p>",
      vendor: "Aurora",
      productType: "Fone de ouvido",
      status: "ACTIVE",
      tags: [],
      onlineStoreUrl: null,
      options: [{ name: "Cor", values: ["Preto"] }],
      variants: [
        {
          id: "gid://shopify/ProductVariant/1",
          title: "Preto",
          sku: "AUR-NC7-PT",
          price: "239.00",
          availableForSale: true,
          inventoryQuantity: 12,
          selectedOptions: [{ name: "Cor", value: "Preto" }],
        },
      ],
      metafields: [],
      hasSchemaOrgMarkup: false,
      generatedProperties: [],
    },
    {
      id: "gid://shopify/Product/9402",
      handle: "corvo-sport-2",
      title: "Corvo Sport 2",
      descriptionHtml:
        "<p>Feito para treino. Resiste a suor e chuva leve. Não possui cancelamento de ruído ativo — o foco aqui é ouvir o ambiente durante a corrida.</p>",
      vendor: "Corvo",
      productType: "Fone de ouvido",
      status: "ACTIVE",
      tags: [],
      onlineStoreUrl: null,
      options: [],
      variants: [
        {
          id: "gid://shopify/ProductVariant/2",
          title: "Único",
          sku: "COR-SPT2",
          price: "199.00",
          availableForSale: true,
          inventoryQuantity: 30,
          selectedOptions: [],
        },
      ],
      metafields: [
        {
          namespace: "custom",
          key: "Cancelamento de ruído",
          value: "Não possui cancelamento de ruído ativo",
          type: "single_line_text_field",
        },
      ],
      hasSchemaOrgMarkup: false,
      generatedProperties: [],
    },
    {
      id: "gid://shopify/Product/9403",
      handle: "tenis-runner-x",
      title: "Tênis Runner X",
      descriptionHtml:
        "<p>Amortecimento leve para corrida de rua, indicado para pisada neutra.</p>",
      vendor: "Runner",
      productType: "Tênis de corrida",
      status: "ACTIVE",
      tags: [],
      onlineStoreUrl: null,
      options: [],
      variants: [
        {
          id: "gid://shopify/ProductVariant/3",
          title: "Único",
          sku: "RUN-X",
          price: "459.00",
          availableForSale: true,
          inventoryQuantity: 8,
          selectedOptions: [],
        },
      ],
      metafields: [
        {
          namespace: "custom",
          key: "Tipo de pisada",
          value: "Neutra",
          type: "single_line_text_field",
        },
      ],
      hasSchemaOrgMarkup: false,
      generatedProperties: [],
    },
    {
      id: "gid://shopify/Product/9404",
      handle: "capa-protetora-x1",
      title: "Capa Protetora X1",
      descriptionHtml: null,
      vendor: "Genérica",
      productType: "Acessórios",
      status: "ACTIVE",
      tags: [],
      onlineStoreUrl: null,
      options: [],
      variants: [],
      metafields: [],
      hasSchemaOrgMarkup: false,
      generatedProperties: [],
    },
    {
      id: "gid://shopify/Product/9405",
      handle: "fone-nebula-pro",
      title: "Fone Nebula Pro",
      descriptionHtml:
        "<p>Referência da linha: cancelamento de ruído ativo com três níveis e bateria de 32 horas.</p>",
      vendor: "Nebula",
      productType: "Fone de ouvido",
      status: "ACTIVE",
      tags: [],
      onlineStoreUrl: null,
      options: [{ name: "Cor", values: ["Preto", "Branco"] }],
      variants: [
        {
          id: "gid://shopify/ProductVariant/4",
          title: "Preto",
          sku: "NEB-PRO-PT",
          price: "279.00",
          availableForSale: true,
          inventoryQuantity: 5,
          selectedOptions: [{ name: "Cor", value: "Preto" }],
        },
      ],
      metafields: [
        {
          namespace: "custom",
          key: "Bateria",
          value: "32 horas",
          type: "single_line_text_field",
        },
        {
          namespace: "custom",
          key: "Cancelamento de ruído",
          value: "Ativo com três níveis",
          type: "single_line_text_field",
        },
      ],
      hasSchemaOrgMarkup: false,
      generatedProperties: [],
    },
    {
      id: "gid://shopify/Product/9406",
      handle: "fone-compacto-lite",
      title: "Fone Compacto Lite",
      descriptionHtml:
        "<p>Compacto para levar na bolsa. Dura o dia todo em uso moderado.</p>",
      vendor: "Lite",
      productType: "Fone de ouvido",
      status: "ACTIVE",
      tags: [],
      onlineStoreUrl: null,
      options: [],
      variants: [
        {
          id: "gid://shopify/ProductVariant/5",
          title: "Único",
          sku: "LITE-CMP",
          price: "899.00",
          availableForSale: true,
          inventoryQuantity: 3,
          selectedOptions: [],
        },
      ],
      metafields: [
        {
          namespace: "custom",
          key: "Bateria",
          value: "10 horas",
          type: "single_line_text_field",
        },
      ],
      hasSchemaOrgMarkup: false,
      generatedProperties: [],
    },
    {
      id: "gid://shopify/Product/9407",
      handle: "fone-zenith-air",
      title: "Fone Zenith Air",
      descriptionHtml:
        "<p>O modelo mais equilibrado da loja: leve, com boa bateria e cancelamento de ruído ativo.</p>",
      vendor: "Zenith",
      productType: "Fone de ouvido",
      status: "ACTIVE",
      tags: [],
      onlineStoreUrl: null,
      options: [{ name: "Cor", values: ["Preto"] }],
      variants: [
        {
          id: "gid://shopify/ProductVariant/6",
          title: "Preto",
          sku: "ZEN-AIR-PT",
          price: "229.00",
          availableForSale: true,
          inventoryQuantity: 20,
          selectedOptions: [{ name: "Cor", value: "Preto" }],
        },
      ],
      metafields: [
        {
          namespace: "custom",
          key: "Bateria",
          value: "24 horas",
          type: "single_line_text_field",
        },
        {
          namespace: "custom",
          key: "Cancelamento de ruído",
          value: "Ativo, cancelamento híbrido",
          type: "single_line_text_field",
        },
      ],
      hasSchemaOrgMarkup: false,
      generatedProperties: [],
    },
  ],
  reachedProductLimit: false,
  productLimit: 250,
}

/**
 * Dois pedidos digitados à mão (ver comentário em `../types.ts` sobre por
 * que "digitado à mão" neste ticket é digitado já como requisito
 * estruturado). Os dois compartilham o requisito "Tipo de produto = fone" —
 * de propósito, para que o teste de dedup da agregação (decisão 1 do
 * ticket 06) tenha um caso realista: o mesmo produto fora de categoria gera
 * a MESMA frase de rejeição nos dois pedidos, e ela precisa colapsar numa
 * linha só.
 */
export const lojaRealSemGabaritoOrders: HandwrittenOrder[] = [
  {
    id: "pedido-fone-completo",
    label:
      "Quero um fone bluetooth com cancelamento de ruído ativo, até R$300, e bateria de pelo menos 20 horas.",
    attributeRequirements: [
      { attributeName: "Tipo de produto", expectedValue: "fone" },
      { attributeName: "Cancelamento de ruído", expectedValue: "ativo" },
    ],
    numericMinimumRequirements: [
      { attributeName: "Bateria", minValue: 20, unit: "h" },
    ],
    maxPrice: 300,
  },
  {
    id: "pedido-fone-viagem",
    label: "Fone para viagem, sem restrição de bateria, até R$250.",
    attributeRequirements: [
      { attributeName: "Tipo de produto", expectedValue: "fone" },
    ],
    numericMinimumRequirements: [],
    maxPrice: 250,
  },
]
