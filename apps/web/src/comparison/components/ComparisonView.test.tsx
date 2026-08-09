import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ComparisonView } from "./ComparisonView"
import { pedidoADeltaPositivo } from "../fixtures/pedidoA-delta-positivo"
import { pedidoADeltaZero } from "../fixtures/pedidoA-delta-zero"
import { nenhumPassou } from "../fixtures/nenhum-passou"
import { deltaNegativo } from "../fixtures/delta-negativo"
import { semExpectativas } from "../fixtures/sem-expectativas"

describe("ComparisonView", () => {
  it("shows the delta and both success rates from the fixture", () => {
    render(<ComparisonView result={pedidoADeltaPositivo} />)

    expect(screen.getByText("4/7")).toBeInTheDocument()
    expect(screen.getByText("7/7")).toBeInTheDocument()
    expect(screen.getByText("+3")).toBeInTheDocument()
  })

  it("groups products by expectation and shows price as a grid column", () => {
    render(<ComparisonView result={pedidoADeltaPositivo} />)

    expect(screen.getByText("Deviam passar")).toBeInTheDocument()
    expect(screen.getByText("Deviam ser rejeitados")).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Preço" })
    ).toBeInTheDocument()
  })

  it("presents a control rejected in both rounds as a correct classification, not a failure", () => {
    render(<ComparisonView result={pedidoADeltaPositivo} />)

    const controlRow = screen.getByRole("row", { name: /Corvo Sport 2/ })
    expect(
      within(controlRow).getByText("Acertou nas duas rodadas")
    ).toBeInTheDocument()
  })

  it("shows the row transition for a legitimate candidate that fails before and passes after", () => {
    render(<ComparisonView result={pedidoADeltaPositivo} />)

    const candidateRow = screen.getByRole("row", { name: /Aurora NC7/ })
    expect(
      within(candidateRow).getByText("Errou antes, acertou depois")
    ).toBeInTheDocument()
  })

  it("expands a row's evidence panel on click, without navigating away", () => {
    render(<ComparisonView result={pedidoADeltaPositivo} />)

    expect(
      screen.queryByText("O que o agente procurou")
    ).not.toBeInTheDocument()

    const candidateRow = screen.getByRole("row", { name: /Aurora NC7/ })
    fireEvent.click(within(candidateRow).getByRole("button"))

    expect(screen.getByText("O que o agente procurou")).toBeInTheDocument()
    expect(screen.getByText(/Quero um fone bluetooth/)).toBeInTheDocument()
  })

  it("shows the found value and the non-technical data origin for a product when its row is expanded", () => {
    render(<ComparisonView result={pedidoADeltaPositivo} />)

    const candidateRow = screen.getByRole("row", { name: /Aurora NC7/ })
    fireEvent.click(within(candidateRow).getByRole("button"))

    expect(
      screen.getByText("Ativo, com captação por microfone duplo")
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/via extraído da descrição/).length
    ).toBeGreaterThan(0)
    expect(screen.getAllByText(/via tipo de produto/).length).toBeGreaterThan(0)
  })

  it("presents 'no data found' and 'found but doesn't confirm' as visually distinct states", () => {
    render(<ComparisonView result={pedidoADeltaPositivo} />)

    const controlRow = screen.getByRole("row", { name: /Corvo Sport 2/ })
    fireEvent.click(within(controlRow).getByRole("button"))

    expect(
      screen.getAllByText("Nenhum dado encontrado").length
    ).toBeGreaterThan(0)
    expect(
      screen.getByText("Dado encontrado, não confirma")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Não possui cancelamento ativo (isolamento passivo)")
    ).toBeInTheDocument()
  })

  it("shows the description excerpt with a label explaining what it proves", () => {
    render(<ComparisonView result={pedidoADeltaPositivo} />)

    const candidateRow = screen.getByRole("row", { name: /Aurora NC7/ })
    fireEvent.click(within(candidateRow).getByRole("button"))

    expect(
      screen.getByText(
        "Já estava na descrição — em prosa, e a máquina não teve como confirmar"
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Colocamos captação por microfone duplo/)
    ).toBeInTheDocument()
  })
})

describe("ComparisonView with edge-case fixtures", () => {
  it("renders the full grid for the delta-zero fixture without an error state", () => {
    render(<ComparisonView result={pedidoADeltaZero} />)

    expect(screen.getAllByText("4/7")).toHaveLength(2)
    expect(screen.getByText("0")).toBeInTheDocument()
    expect(screen.getByRole("row", { name: /Aurora NC7/ })).toBeInTheDocument()
    expect(screen.queryByText(/^erro$/i)).not.toBeInTheDocument()
  })

  it("highlights a requirement column that fails for every product in both rounds", () => {
    render(<ComparisonView result={pedidoADeltaZero} />)

    expect(
      screen.getByRole("columnheader", { name: /Tipo de produto/ })
    ).toHaveAttribute(
      "title",
      "Falha em todos os produtos nas duas rodadas — provável bug de extração, não catálogo fraco."
    )
  })

  it("renders the full grid for the delta-negativo fixture and shows the regressed row", () => {
    render(<ComparisonView result={deltaNegativo} />)

    expect(screen.getByText("-1")).toBeInTheDocument()
    const regressedRow = screen.getByRole("row", { name: /Corvo Sport 2/ })
    expect(
      within(regressedRow).getByText("Acertava antes, errou depois")
    ).toBeInTheDocument()
  })

  it("explains when no product passed in either round instead of only showing red", () => {
    render(<ComparisonView result={nenhumPassou} />)

    expect(
      screen.getByText(
        /Nenhum produto confirmou todos os requisitos obrigatórios/
      )
    ).toBeInTheDocument()
  })

  it("does not show the no-pass explanation when at least one product passes", () => {
    render(<ComparisonView result={pedidoADeltaPositivo} />)

    expect(
      screen.queryByText(
        /Nenhum produto confirmou todos os requisitos obrigatórios/
      )
    ).not.toBeInTheDocument()
  })

  it("keeps products without a registered expectation out of the success-rate denominator", () => {
    render(<ComparisonView result={semExpectativas} />)

    expect(screen.getByText("0/1")).toBeInTheDocument()
    expect(screen.getByText("1/1")).toBeInTheDocument()
    expect(screen.getByText("Fora da contagem")).toBeInTheDocument()
    expect(
      screen.getByRole("row", { name: /Capa Protetora X1/ })
    ).toBeInTheDocument()
  })
})
