import type { ProductCatalogReadResult } from "@/lib/catalog"
import { PhasePlaceholder } from "./PhasePlaceholder"

// Catálogo mínimo de exemplo — só para liberar o avanço em modo fixture.
// O wizard não passou pelo transporte da issue #6 de propósito: ele está
// em vias de ser aposentado (ticket 08 da `catalogo-como-exame`), e a tela
// que consome transporte de verdade é a `CatalogPage`. Quem religar este
// fluxo troca este bloco por `useExamTransport().readCatalog()`.
const FIXTURE_CATALOG: ProductCatalogReadResult = {
  products: [
    {
      id: "gid://shopify/Product/1",
      handle: "aurora-nc7",
      title: "Aurora NC7",
      descriptionHtml: null,
      vendor: "Aurora",
      productType: "Fone de ouvido",
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
      id: "gid://shopify/Product/2",
      handle: "corvo-sport-2",
      title: "Corvo Sport 2",
      descriptionHtml: null,
      vendor: "Corvo",
      productType: "Fone de ouvido",
      status: "ACTIVE",
      tags: [],
      onlineStoreUrl: null,
      options: [],
      variants: [],
      metafields: [],
      hasSchemaOrgMarkup: false,
      generatedProperties: [],
    },
  ],
  reachedProductLimit: false,
  productLimit: 250,
}

type PhaseConectarProps = {
  fixtureMode: boolean
  catalog: ProductCatalogReadResult | null
  onCatalogRead: (catalog: ProductCatalogReadResult) => void
}

export function PhaseConectar({
  fixtureMode,
  catalog,
  onCatalogRead,
}: PhaseConectarProps) {
  return (
    <PhasePlaceholder
      title="Conectar"
      description="Lê o catálogo inteiro da loja configurada."
      ownerTicket="05"
      fixtureMode={fixtureMode}
      produced={catalog !== null}
      producedSummary={
        catalog
          ? `Catálogo lido: ${catalog.products.length} produtos.`
          : undefined
      }
      produceButtonLabel="Usar catálogo de exemplo"
      onProduce={() => onCatalogRead(FIXTURE_CATALOG)}
    />
  )
}
