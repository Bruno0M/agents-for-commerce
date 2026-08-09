/**
 * Os tipos do catálogo — cópia fiel, campo a campo, dos records C# de
 * `apps/mcp-server/Tools/CatalogReadTools.cs`.
 *
 * Este arquivo NÃO fala rede. Até a issue #6 ele também guardava o
 * `fetchCatalog` que chamava `GET /catalog`; aquela função virou a
 * implementação `fetch` da interface de transporte e mora em
 * `@/transport/fetchTransport`. Os tipos ficaram porque são comuns aos três
 * transportes — quem só precisa da FORMA do catálogo importa daqui e não
 * arrasta nenhuma decisão de origem do dado junto.
 */

export interface ProductOptionContent {
  name: string
  values: string[]
}

export interface ProductSelectedOption {
  name: string
  value: string
}

export interface ProductVariantContent {
  id: string
  title: string
  sku: string | null
  price: string | null
  availableForSale: boolean
  inventoryQuantity: number | null
  selectedOptions: ProductSelectedOption[]
}

export interface ProductMetafieldContent {
  namespace: string
  key: string
  value: string | null
  type: string | null
}

export interface GeneratedAdditionalProperty {
  name: string
  value: string
}

export interface ProductCatalogContent {
  id: string
  handle: string
  title: string
  descriptionHtml: string | null
  vendor: string | null
  productType: string | null
  status: string
  tags: string[]
  onlineStoreUrl: string | null
  options: ProductOptionContent[]
  variants: ProductVariantContent[]
  metafields: ProductMetafieldContent[]
  hasSchemaOrgMarkup: boolean
  generatedProperties: GeneratedAdditionalProperty[]
}

export interface ProductCatalogReadResult {
  products: ProductCatalogContent[]
  reachedProductLimit: boolean
  productLimit: number
}
