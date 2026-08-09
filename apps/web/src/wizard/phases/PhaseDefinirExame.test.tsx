import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PhaseDefinirExame } from "./PhaseDefinirExame"
import type { ApprovedTestOrderSet } from "../flow-state"
import type { ProductCatalogReadResult } from "@/lib/catalog"

const CATALOG: ProductCatalogReadResult = {
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

/**
 * Gerar entrega o conjunto direto ao wizard (não há mais etapa de aprovar),
 * e a fase só renderiza a ficha a partir de `approvedOrders`. Então o helper
 * captura o conjunto gerado e re-renderiza com ele, que é o que o
 * `ExamWizard` faz de verdade via reducer.
 */
function renderGenerated() {
  const onOrdersApproved = vi.fn()
  const { rerender } = render(
    <PhaseDefinirExame
      fixtureMode
      catalog={CATALOG}
      approvedOrders={null}
      onOrdersApproved={onOrdersApproved}
    />
  )
  fireEvent.click(screen.getByRole("button", { name: "Gerar pedidos de exemplo" }))

  const generated: ApprovedTestOrderSet = onOrdersApproved.mock.calls[0][0]
  rerender(
    <PhaseDefinirExame
      fixtureMode
      catalog={CATALOG}
      approvedOrders={generated}
      onOrdersApproved={onOrdersApproved}
    />
  )
}

describe("PhaseDefinirExame", () => {
  it("shows the alert instead of a generate button when fixture mode is off and nothing was approved yet", () => {
    render(
      <PhaseDefinirExame
        fixtureMode={false}
        catalog={CATALOG}
        approvedOrders={null}
        onOrdersApproved={vi.fn()}
      />
    )

    expect(screen.getByText("Sem transporte")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Gerar pedidos de exemplo" })
    ).not.toBeInTheDocument()
  })

  it("renders the four fields of every generated order: text, rationale, axis badge and match expectation", () => {
    renderGenerated()

    const cards = screen.getAllByTestId("order-card")
    expect(cards).toHaveLength(4)

    // Pedido 1: texto, rationale ("Testa: ..."), badge do eixo, selo positivo.
    const firstCard = cards[0]
    expect(
      within(firstCard).getByText(/Quero um fone bluetooth/)
    ).toBeInTheDocument()
    expect(within(firstCard).getByText(/Testa:/)).toBeInTheDocument()
    expect(within(firstCard).getByText("Contraste")).toBeInTheDocument()
    expect(
      within(firstCard).getByText("Espera resposta válida")
    ).toBeInTheDocument()
  })

  it("marks the expectsValidMatch: false order as a deliberate control, not a defect, with its reason explained", () => {
    renderGenerated()

    const cards = screen.getAllByTestId("order-card")
    const controlCard = cards.find(
      (card) => card.getAttribute("data-expects-valid-match") === "false"
    )
    expect(controlCard).toBeTruthy()

    expect(
      within(controlCard!).getByText(/Controle — espera NÃO ter resposta/)
    ).toBeInTheDocument()
    expect(
      within(controlCard!).getAllByText(/resultado certo/).length
    ).toBeGreaterThan(0)
    expect(
      within(controlCard!).getByText(/não defeito do gerador/)
    ).toBeInTheDocument()

    // Nenhum outro card usa a mesma redação de controle.
    const positiveCards = cards.filter((card) => card !== controlCard)
    for (const card of positiveCards) {
      expect(
        within(card).queryByText(/Controle — espera NÃO ter resposta/)
      ).not.toBeInTheDocument()
    }
  })

  it("shows the aggregated catalog summary panel, explicit that descriptions never entered the call", () => {
    renderGenerated()

    expect(screen.getByText("O modelo viu")).toBeInTheDocument()
    expect(
      screen.getByText(/2 produtos.*Fone de ouvido.*Aurora, Corvo/)
    ).toBeInTheDocument()
    expect(screen.getByText(/Sem descrições/)).toBeInTheDocument()
  })

  it("hands the generated set straight to the wizard — there is no separate approval step", () => {
    const onOrdersApproved = vi.fn()
    render(
      <PhaseDefinirExame
        fixtureMode
        catalog={CATALOG}
        approvedOrders={null}
        onOrdersApproved={onOrdersApproved}
      />
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Gerar pedidos de exemplo" })
    )

    expect(onOrdersApproved).toHaveBeenCalledTimes(1)
    const approved: ApprovedTestOrderSet = onOrdersApproved.mock.calls[0][0]
    expect(approved.orders).toHaveLength(4)
    expect(approved.catalogSummary.productCount).toBe(2)
    expect(
      screen.queryByRole("button", { name: /Aprovar/ })
    ).not.toBeInTheDocument()
  })

  it("once generated, re-renders the same set read-only without a way to regenerate", () => {
    const approvedOrders: ApprovedTestOrderSet = {
      id: "fixture-approved-orders-1",
      orders: [
        {
          id: "pedido-1",
          naturalLanguageOrder: "Quero um fone bluetooth com ANC até R$400",
          expectsValidMatch: true,
          constraintAxis: "contraste",
          rationale: "Testa contraste.",
        },
      ],
      catalogSummary: {
        productCount: 1,
        productTypes: ["Fone de ouvido"],
        vendors: ["Aurora"],
        titles: ["Aurora NC7"],
        minPrice: 399,
        maxPrice: 399,
      },
    }

    render(
      <PhaseDefinirExame
        fixtureMode
        catalog={CATALOG}
        approvedOrders={approvedOrders}
        onOrdersApproved={vi.fn()}
      />
    )

    expect(
      screen.getByText(/Conjunto do exame: fixture-approved-orders-1/)
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Gerar pedidos de exemplo" })
    ).not.toBeInTheDocument()
  })
})
