import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ExamWizard } from "./ExamWizard"

function advanceButton() {
  return screen.getByRole("button", { name: "Avançar" })
}

function backButton() {
  return screen.getByRole("button", { name: "Voltar" })
}

function stepButton(title: string) {
  return screen.getByRole("button", { name: new RegExp(title) })
}

describe("ExamWizard", () => {
  it("blocks advancing while the current phase has not produced its input", () => {
    render(<ExamWizard />)

    expect(advanceButton()).toBeDisabled()
  })

  it("unlocks advancing once the current phase produces its input", () => {
    render(<ExamWizard />)

    expect(advanceButton()).toBeDisabled()

    fireEvent.click(
      screen.getByRole("button", { name: "Usar catálogo de exemplo" })
    )

    expect(advanceButton()).toBeEnabled()
  })

  it("allows going back and does not discard what a later phase already produced", () => {
    render(<ExamWizard />)

    // Fase 1 -> produz catálogo -> avança
    fireEvent.click(
      screen.getByRole("button", { name: "Usar catálogo de exemplo" })
    )
    fireEvent.click(advanceButton())

    // Fase 2 -> gera os pedidos de exemplo e revisa a ficha
    fireEvent.click(
      screen.getByRole("button", { name: "Gerar pedidos de exemplo" })
    )
    expect(
      screen.getByText(/Conjunto do exame: fixture-approved-orders/)
    ).toBeInTheDocument()

    // Volta para a fase 1 — livre, mesmo com a fase 2 já tendo produzido
    fireEvent.click(backButton())
    expect(screen.getByText("Catálogo lido: 2 produtos.")).toBeInTheDocument()

    // Avança de novo: o insumo da fase 2 continua lá, sem precisar reproduzir
    fireEvent.click(advanceButton())
    expect(
      screen.getByText(/Conjunto do exame: fixture-approved-orders/)
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Gerar pedidos de exemplo" })
    ).not.toBeInTheDocument()
  })

  it("marks completed phases and the current phase in the stepper", () => {
    render(<ExamWizard />)

    expect(stepButton("Conectar")).toHaveAttribute("data-state", "current")
    expect(stepButton("Conectar")).toHaveAttribute("aria-current", "step")
    expect(stepButton("Definir o exame")).toHaveAttribute(
      "data-state",
      "upcoming"
    )
    expect(stepButton("Definir o exame")).toBeDisabled()
    expect(stepButton("Definir o exame")).toHaveAttribute(
      "aria-disabled",
      "true"
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Usar catálogo de exemplo" })
    )
    fireEvent.click(advanceButton())

    expect(stepButton("Conectar")).toHaveAttribute("data-state", "completed")
    expect(stepButton("Definir o exame")).toHaveAttribute(
      "data-state",
      "current"
    )
    expect(stepButton("Definir o exame")).toBeEnabled()
    // A fase 3 ainda não é alcançável — a fase 2 não produziu insumo ainda.
    expect(stepButton("Diagnóstico")).toBeDisabled()
  })

  it("is walkable end to end, from phase 1 to phase 5, in fixture mode", () => {
    render(<ExamWizard />)

    // Fixture mode está ligado por padrão (sem servidor no ar).
    expect(
      screen.getByRole("button", { name: /Modo fixture: ligado/ })
    ).toBeInTheDocument()

    // Fase 1 — Conectar
    fireEvent.click(
      screen.getByRole("button", { name: "Usar catálogo de exemplo" })
    )
    fireEvent.click(advanceButton())

    // Fase 2 — Definir o exame
    fireEvent.click(
      screen.getByRole("button", { name: "Gerar pedidos de exemplo" })
    )
    fireEvent.click(advanceButton())

    // Fase 3 — Diagnóstico
    fireEvent.click(
      screen.getByRole("button", { name: "Rodar diagnóstico de exemplo" })
    )
    fireEvent.click(advanceButton())

    // Fase 4 — Conserto: escolhe uma fixture de comparação de verdade
    fireEvent.click(
      screen.getByRole("button", { name: "Usar esta comparação" })
    )
    // O ComparisonView de verdade renderizou (fixture padrão: pedido A, delta positivo)
    expect(screen.getByText("+3")).toBeInTheDocument()
    fireEvent.click(advanceButton())

    // Fase 5 — Publicar
    fireEvent.click(
      screen.getByRole("button", { name: "Simular envio de exemplo" })
    )
    expect(
      screen.getByText(/itens enviados. Estado: aguardando revisão\./)
    ).toBeInTheDocument()
  })

  it("passes the approved order set from phase 2 to phases 3 and 4 as the same unit, never regenerated", () => {
    render(<ExamWizard />)

    fireEvent.click(
      screen.getByRole("button", { name: "Usar catálogo de exemplo" })
    )
    fireEvent.click(advanceButton())

    fireEvent.click(
      screen.getByRole("button", { name: "Gerar pedidos de exemplo" })
    )
    const approvedSummary = screen.getByText(
      /Conjunto do exame: fixture-approved-orders-\d+/
    ).textContent
    const approvedId = approvedSummary?.match(
      /fixture-approved-orders-\d+/
    )?.[0]
    expect(approvedId).toBeTruthy()

    fireEvent.click(advanceButton())

    // Fase 3 mostra o mesmo id, sem que nada nesta fase o tenha regerado.
    expect(
      screen.getByText(new RegExp(`conjunto ${approvedId} contra a loja`))
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("button", { name: "Rodar diagnóstico de exemplo" })
    )
    fireEvent.click(advanceButton())

    // Fase 4 recebeu a mesma unidade, sem regenerar.
    expect(
      screen.getByText(new RegExp(`Conjunto aprovado usado: ${approvedId}`))
    ).toBeInTheDocument()
  })
})
