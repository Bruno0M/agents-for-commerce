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

const MCP_SERVER_URL =
  import.meta.env.VITE_MCP_SERVER_URL ?? "http://localhost:6142"

export async function fetchCatalog(
  signal?: AbortSignal,
): Promise<ProductCatalogReadResult> {
  const response = await fetch(`${MCP_SERVER_URL}/catalog`, { signal })

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar o catálogo (${response.status} ${response.statusText})`,
    )
  }

  return response.json() as Promise<ProductCatalogReadResult>
}
