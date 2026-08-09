import { fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PhaseDiagnostico } from "./PhaseDiagnostico"
import type { ApprovedTestOrderSet, DiagnosisResult } from "../flow-state"
import type { ProductCatalogReadResult } from "@/lib/catalog"
import { aggregateDiagnosis } from "@/diagnosis/aggregate"
import {
  lojaRealSemGabaritoCatalog,
  lojaRealSemGabaritoOrders,
} from "@/diagnosis/fixtures/loja-real-sem-gabarito"

const APPROVED_ORDERS: ApprovedTestOrderSet = {
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
    productCount: 2,
    productTypes: ["Fone de ouvido"],
    vendors: ["Aurora", "Corvo"],
    titles: ["Aurora NC7", "Corvo Sport 2"],
    minPrice: null,
    maxPrice: null,
  },
}

const BARE_CATALOG: ProductCatalogReadResult = {
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

describe("PhaseDiagnostico — pedido digitado à mão contra o catálogo cru", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Critério de aceite: nenhuma chamada de geração de conteúdo (nem
    // nenhuma chamada de rede nenhuma) acontece nesta fase — a simulação é
    // cálculo puro no navegador.
    fetchSpy = vi.spyOn(globalThis, "fetch")
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it("roda um pedido digitado à mão (sem modo fixture) contra o catálogo cru e produz a contagem de topo", () => {
    const onDiagnosisReady = vi.fn()
    render(
      <PhaseDiagnostico
        fixtureMode={false}
        catalog={BARE_CATALOG}
        approvedOrders={APPROVED_ORDERS}
        diagnosis={null}
        onDiagnosisReady={onDiagnosisReady}
      />
    )

    // Sem modo fixture, o botão de exemplo não existe — só o formulário manual.
    expect(
      screen.queryByRole("button", { name: "Rodar diagnóstico de exemplo" })
    ).not.toBeInTheDocument()

    const editor = screen.getByTestId("order-editor")
    // O pedido nasce sem nenhuma linha de requisito — "Requisito" adiciona a
    // primeira antes de poder preenchê-la.
    fireEvent.click(within(editor).getByRole("button", { name: /Requisito/ }))
    fireEvent.change(
      within(editor).getByPlaceholderText("Nome (ex: Cancelamento de ruído)"),
      { target: { value: "Tipo de produto" } }
    )
    fireEvent.change(
      within(editor).getByPlaceholderText("Valor esperado (ex: ativo)"),
      { target: { value: "fone" } }
    )

    fireEvent.click(screen.getByRole("button", { name: "Rodar diagnóstico" }))

    expect(onDiagnosisReady).toHaveBeenCalledTimes(1)
    const result: DiagnosisResult = onDiagnosisReady.mock.calls[0][0]
    expect(result.totalProductCount).toBe(2)
    // Os dois produtos do catálogo cru confirmam "Tipo de produto" = "Fone
    // de ouvido" — nenhum é descartado por este pedido.
    expect(result.illegibleProductCount).toBe(0)

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("desabilita 'Rodar diagnóstico' até que algum pedido tenha ao menos um requisito", () => {
    render(
      <PhaseDiagnostico
        fixtureMode={false}
        catalog={BARE_CATALOG}
        approvedOrders={APPROVED_ORDERS}
        diagnosis={null}
        onDiagnosisReady={vi.fn()}
      />
    )

    expect(
      screen.getByRole("button", { name: "Rodar diagnóstico" })
    ).toBeDisabled()
  })

  it("em modo fixture, o botão de exemplo roda o diagnóstico de verdade (não números chumbados)", () => {
    const onDiagnosisReady = vi.fn()
    render(
      <PhaseDiagnostico
        fixtureMode
        catalog={BARE_CATALOG}
        approvedOrders={APPROVED_ORDERS}
        diagnosis={null}
        onDiagnosisReady={onDiagnosisReady}
      />
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Rodar diagnóstico de exemplo" })
    )

    expect(onDiagnosisReady).toHaveBeenCalledTimes(1)
    const result: DiagnosisResult = onDiagnosisReady.mock.calls[0][0]
    // Catálogo sem nenhum dado além do tipo de produto — os dois produtos
    // são descartados por ilegibilidade (sem ANC estruturado, sem preço).
    expect(result.totalProductCount).toBe(2)
    expect(result.illegibleProductCount).toBe(2)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe("PhaseDiagnostico — resultado, contra a fixture 'loja real sem gabarito'", () => {
  const diagnosis = aggregateDiagnosis(
    lojaRealSemGabaritoCatalog.products,
    lojaRealSemGabaritoOrders
  )

  function renderResult() {
    render(
      <PhaseDiagnostico
        fixtureMode={false}
        catalog={lojaRealSemGabaritoCatalog}
        approvedOrders={APPROVED_ORDERS}
        diagnosis={diagnosis}
        onDiagnosisReady={vi.fn()}
      />
    )
  }

  it("mostra a contagem de topo e o escopo (loja inteira, N pedidos) sem nenhum percentual", () => {
    renderResult()

    expect(
      screen.getByText("Produtos que o agente nem conseguiu avaliar")
    ).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText(/de 7/)).toBeInTheDocument()
    expect(
      screen.getByText(/catálogo inteiro \(7 produtos\)/)
    ).toBeInTheDocument()
    expect(screen.getByText(/contra 2 pedidos digitados/)).toBeInTheDocument()

    // A ausência do percentual é explícita — a tela chega a dizer, em texto,
    // que não é um "0%" mudo (não apenas omitir o número em silêncio).
    expect(
      screen.getByText(/Sem percentual de classificação/)
    ).toBeInTheDocument()
    expect(screen.getByText(/não é um "0%"/)).toBeInTheDocument()
  })

  it("mostra a frase exata do motivo, com a natureza visualmente distinguível — sem inferir da string", () => {
    renderResult()

    const auroraCard = screen
      .getByText("Aurora NC7")
      .closest('[data-testid="discarded-product-card"]')
    expect(auroraCard).toBeTruthy()
    expect(
      within(auroraCard as HTMLElement).getByText(
        "Sem dado estruturado para confirmar 'Cancelamento de ruído'."
      )
    ).toBeInTheDocument()
    // As duas ocorrências de "Ilegibilidade" nesse card (uma por motivo).
    expect(
      within(auroraCard as HTMLElement).getAllByText("Ilegibilidade").length
    ).toBeGreaterThan(0)
    expect(
      within(auroraCard as HTMLElement).queryByText("Rejeição legítima")
    ).not.toBeInTheDocument()
  })

  it("rejeição legítima pura aparece com texto explícito de que não é falha da loja", () => {
    renderResult()

    const nebulaCard = screen
      .getByText("Fone Nebula Pro")
      .closest('[data-testid="discarded-product-card"]')
    expect(nebulaCard).toBeTruthy()
    expect(nebulaCard).toHaveAttribute("data-discard-group", "legitimateOnly")
    expect(
      within(nebulaCard as HTMLElement).getByText(/não é falha da loja/)
    ).toBeInTheDocument()
  })

  it("produto de motivo misto aparece distinto e com nota de que o conserto não recupera a venda", () => {
    renderResult()

    const corvoCard = screen
      .getByText("Corvo Sport 2")
      .closest('[data-testid="discarded-product-card"]')
    expect(corvoCard).toBeTruthy()
    expect(corvoCard).toHaveAttribute("data-discard-group", "mixed")
    expect(
      within(corvoCard as HTMLElement).getByText("Ilegibilidade")
    ).toBeInTheDocument()
    expect(
      within(corvoCard as HTMLElement).getByText("Rejeição legítima")
    ).toBeInTheDocument()
    expect(
      within(corvoCard as HTMLElement).getByText(/conserto não recupera/)
    ).toBeInTheDocument()
  })

  it("um produto de controle que confirma tudo nunca aparece na lista de descartados", () => {
    renderResult()

    expect(screen.queryByText("Fone Zenith Air")).not.toBeInTheDocument()
  })

  it("dedupe: o motivo repetido em dois pedidos aparece uma vez só no card do produto", () => {
    renderResult()

    const tenisCard = screen
      .getByText("Tênis Runner X")
      .closest('[data-testid="discarded-product-card"]')
    expect(tenisCard).toBeTruthy()
    expect(
      within(tenisCard as HTMLElement).getAllByText(
        "'Tipo de produto' = 'Tênis de corrida' não confirma 'fone'."
      )
    ).toHaveLength(1)
  })
})
