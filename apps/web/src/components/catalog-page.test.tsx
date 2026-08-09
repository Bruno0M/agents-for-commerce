import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CatalogPage } from "./catalog-page"
import * as runSimulationAgentLib from "@/diagnosis/lib/runSimulationAgent"
import { simulationAgentNormalScenario } from "@/diagnosis/fixtures/simulationAgentPayloads"
import type {
  BuyerAgentSimulationBatchResult,
  TestOrderGenerationResult,
} from "@/diagnosis/types"

const RUN_BUTTON_NAME = "Rodar Agente de Simulação"

/**
 * Mocka as duas etapas com o mesmo cenário congelado que o agente A já
 * verificou (`simulationAgentNormalScenario`) — a mistura dos quatro
 * estados, com os 4 pedidos fixos da rodada (os dois de
 * `loja-real-sem-gabarito.ts` mais os dois que fecham o conjunto de eixos).
 * Resolve na hora (sem os atrasos artificiais de `runSimulationAgent.ts`),
 * para os testes que só querem o resultado final não precisarem esperar
 * 2.3s reais.
 */
function mockNormalScenario() {
  vi.spyOn(
    runSimulationAgentLib.runSimulationAgent,
    "writeTestOrders"
  ).mockResolvedValue(simulationAgentNormalScenario.testOrderGeneration)
  vi.spyOn(
    runSimulationAgentLib.runSimulationAgent,
    "runBuyerAgent"
  ).mockResolvedValue(simulationAgentNormalScenario.simulationBatch)
}

/** O fluxo completo do botão único: um clique, sem passo intermediário. */
async function runSimulationAndWait() {
  mockNormalScenario()
  fireEvent.click(screen.getByRole("button", { name: RUN_BUTTON_NAME }))
  await waitFor(() =>
    expect(screen.queryByText("Não examinado")).not.toBeInTheDocument()
  )
}

function setStateFilter(state: string) {
  fireEvent.change(screen.getByLabelText("Estado"), { target: { value: state } })
}

function setOrderFilter(orderId: string) {
  fireEvent.change(screen.getByLabelText("Pedido"), { target: { value: orderId } })
}

function setSearch(term: string) {
  fireEvent.change(screen.getByLabelText("Buscar por título ou handle"), {
    target: { value: term },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("CatalogPage — resultado do exame (botão único já rodou)", () => {
  it("shows 'not examined' explicitly in the strip before running", () => {
    render(<CatalogPage />)

    expect(screen.getByText("Não examinado")).toBeInTheDocument()
    expect(screen.getByText(/Escopo pronto: 7 produtos/)).toBeInTheDocument()
  })

  it("shows the declared-scope metric in the strip after the simulation runs", async () => {
    render(<CatalogPage />)

    await runSimulationAndWait()

    expect(
      screen.getByText(/Escopo: catálogo inteiro \(7 produtos\)/)
    ).toBeInTheDocument()
    expect(screen.getByText(/simulado contra 4 pedido/)).toBeInTheDocument()
  })

  it("shows a passed product as a row with the confirmed verdict, not an absence", async () => {
    render(<CatalogPage />)
    await runSimulationAndWait()

    const passedRow = screen.getByRole("row", { name: /Fone Zenith Air/ })
    expect(within(passedRow).getByText("Confirmou tudo")).toBeInTheDocument()
  })

  it("distinguishes all four verdict states by accessible text", async () => {
    render(<CatalogPage />)
    await runSimulationAndWait()

    // ilegibilidade pura
    expect(
      within(screen.getByRole("row", { name: /Aurora NC7/ })).getByText(
        "Não confirmou"
      )
    ).toBeInTheDocument()

    // motivo misto
    expect(
      within(screen.getByRole("row", { name: /Corvo Sport 2/ })).getByText(
        "Confirmou em parte"
      )
    ).toBeInTheDocument()

    // rejeição legítima pura
    expect(
      within(screen.getByRole("row", { name: /Fone Nebula Pro/ })).getByText(
        "Não atende"
      )
    ).toBeInTheDocument()

    // passou em todos os pedidos
    expect(
      within(screen.getByRole("row", { name: /Fone Zenith Air/ })).getByText(
        "Confirmou tudo"
      )
    ).toBeInTheDocument()
  })

  it("shows the reason with the engine's exact phrase, unchanged", async () => {
    render(<CatalogPage />)
    await runSimulationAndWait()

    const rejectedRow = screen.getByRole("row", { name: /Fone Nebula Pro/ })
    expect(
      within(rejectedRow).getByText(
        /Preço R\$\s*279,00 acima do limite de R\$\s*250,00/
      )
    ).toBeInTheDocument()
  })

  it("does not show 'score' anywhere on the screen, before or after the simulation", async () => {
    const { container } = render(<CatalogPage />)
    expect(container.textContent?.toLowerCase()).not.toContain("score")

    await runSimulationAndWait()
    expect(container.textContent?.toLowerCase()).not.toContain("score")
  })

  it("renders rows in the declared default order: silent loss desc, then fewer distinct illegibility reasons, then title", async () => {
    render(<CatalogPage />)
    await runSimulationAndWait()

    const titles = screen
      .getAllByRole("row")
      .slice(1) // pula o cabeçalho
      .map((row) => within(row).getAllByRole("cell")[0].textContent)

    expect(titles).toEqual([
      "Aurora NC7",
      "Capa Protetora X1",
      "Corvo Sport 2",
      "Tênis Runner X",
      "Fone Nebula Pro",
      "Fone Zenith Air",
      "Fone Compacto Lite",
    ])
  })

  it("shows the default sort criterion on screen, not only in the code", async () => {
    render(<CatalogPage />)
    await runSimulationAndWait()

    expect(
      screen.getByText(/perda silenciosa \(maior primeiro\)/)
    ).toBeInTheDocument()
  })

  it("shows the silent-loss count on the row itself, next to the product", async () => {
    render(<CatalogPage />)
    await runSimulationAndWait()

    const auroraRow = screen.getByRole("row", { name: /Aurora NC7/ })
    expect(within(auroraRow).getByText(/3 de 4 pedidos/)).toBeInTheDocument()
  })

  it("[invariante do ticket 03] filtrar não muda o número da faixa de placar — só a loja inteira aparece ali", async () => {
    const { container } = render(<CatalogPage />)
    await runSimulationAndWait()

    const scoreboardNumber = () =>
      container.querySelector(".text-5xl")?.textContent

    const before = scoreboardNumber()
    expect(before).toBe("1")

    setSearch("um produto que não existe em lugar nenhum")
    expect(scoreboardNumber()).toBe(before)

    setSearch("")
    setStateFilter("passed")
    expect(scoreboardNumber()).toBe(before)
  })

  it("filtra por cada um dos quatro estados", async () => {
    render(<CatalogPage />)
    await runSimulationAndWait()

    setStateFilter("passed")
    expect(screen.getByRole("row", { name: /Fone Zenith Air/ })).toBeInTheDocument()
    expect(screen.queryByRole("row", { name: /Aurora NC7/ })).not.toBeInTheDocument()

    setStateFilter("illegible")
    expect(screen.getByRole("row", { name: /Aurora NC7/ })).toBeInTheDocument()
    expect(
      screen.queryByRole("row", { name: /Fone Zenith Air/ })
    ).not.toBeInTheDocument()

    setStateFilter("mixed")
    expect(screen.getByRole("row", { name: /Corvo Sport 2/ })).toBeInTheDocument()
    expect(screen.queryByRole("row", { name: /Aurora NC7/ })).not.toBeInTheDocument()

    setStateFilter("legitimatelyRejected")
    expect(
      screen.getByRole("row", { name: /Fone Nebula Pro/ })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("row", { name: /Corvo Sport 2/ })
    ).not.toBeInTheDocument()
  })

  it("busca por título", async () => {
    render(<CatalogPage />)
    await runSimulationAndWait()

    setSearch("Aurora")

    expect(screen.getByRole("row", { name: /Aurora NC7/ })).toBeInTheDocument()
    expect(
      screen.queryByRole("row", { name: /Fone Nebula Pro/ })
    ).not.toBeInTheDocument()
  })

  it("busca por handle", async () => {
    render(<CatalogPage />)
    await runSimulationAndWait()

    setSearch("fone-nebula-pro")

    expect(
      screen.getByRole("row", { name: /Fone Nebula Pro/ })
    ).toBeInTheDocument()
    expect(screen.queryByRole("row", { name: /Aurora NC7/ })).not.toBeInTheDocument()
  })

  it("filtro por pedido torna o par A/B demonstrável: mesmo produto ✅ num pedido e ⭕ noutro", async () => {
    render(<CatalogPage />)
    await runSimulationAndWait()

    setOrderFilter("pedido-fone-completo")
    expect(
      screen.queryByRole("row", { name: /Fone Nebula Pro/ })
    ).not.toBeInTheDocument()

    setOrderFilter("pedido-fone-viagem")
    const row = screen.getByRole("row", { name: /Fone Nebula Pro/ })
    expect(within(row).getByText("Não atende")).toBeInTheDocument()
  })

  it("o estado vazio de um filtro diz o que foi filtrado — não é a mesma tela do catálogo vazio", async () => {
    render(<CatalogPage />)
    await runSimulationAndWait()

    setSearch("produto que não existe em lugar nenhum")

    expect(
      screen.getByText("Nenhum produto corresponde aos filtros")
    ).toBeInTheDocument()
    expect(
      screen.getByText(/busca "produto que não existe em lugar nenhum"/)
    ).toBeInTheDocument()
    expect(screen.queryByText("Nenhum produto ativo")).not.toBeInTheDocument()
  })

  it("limpa os filtros pelo botão da tela vazia de filtro", async () => {
    render(<CatalogPage />)
    await runSimulationAndWait()

    setSearch("produto que não existe em lugar nenhum")
    expect(
      screen.getByText("Nenhum produto corresponde aos filtros")
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }))

    expect(screen.getByRole("row", { name: /Aurora NC7/ })).toBeInTheDocument()
    expect(
      screen.queryByText("Nenhum produto corresponde aos filtros")
    ).not.toBeInTheDocument()
  })

  it("não abre nenhum dialog só de rodar a simulação, sem clicar em linha nenhuma", async () => {
    render(<CatalogPage />)
    await runSimulationAndWait()

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("CatalogPage — drill-down de produto (ticket 05, catalogo-como-exame)", () => {
  it("clicar num produto ilegível abre o dialog com o breakdown por pedido e a ausência explícita de 'depois'", async () => {
    render(<CatalogPage />)
    await runSimulationAndWait()

    fireEvent.click(screen.getByRole("button", { name: "Aurora NC7" }))

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Produto atual")).toBeInTheDocument()
    expect(within(dialog).getByText("Após melhoria")).toBeInTheDocument()
    expect(
      within(dialog).getByText(/ainda não passou pelo conserto/)
    ).toBeInTheDocument()
  })

  it("clicar num produto que passou em todos os pedidos mostra os requisitos confirmados, sem coluna 'depois'", async () => {
    render(<CatalogPage />)
    await runSimulationAndWait()

    fireEvent.click(screen.getByRole("button", { name: "Fone Zenith Air" }))

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Produto atual")).toBeInTheDocument()
    expect(within(dialog).queryByText("Após melhoria")).not.toBeInTheDocument()
    expect(
      within(dialog).queryByText(/ainda não passou pelo conserto/)
    ).not.toBeInTheDocument()
  })

  it("clicar num produto rejeitado legitimamente mostra a nota de que nenhuma ação de conserto se aplica", async () => {
    render(<CatalogPage />)
    await runSimulationAndWait()

    fireEvent.click(screen.getByRole("button", { name: "Fone Nebula Pro" }))

    const dialog = await screen.findByRole("dialog")
    expect(
      within(dialog).getByText(/nenhuma ação de conserto se aplica/)
    ).toBeInTheDocument()
    expect(within(dialog).queryByText("Após melhoria")).not.toBeInTheDocument()
  })

  it("fechar o dialog remove ele do documento", async () => {
    render(<CatalogPage />)
    await runSimulationAndWait()

    fireEvent.click(screen.getByRole("button", { name: "Aurora NC7" }))
    const dialog = await screen.findByRole("dialog")

    fireEvent.click(within(dialog).getByRole("button", { name: /close/i }))

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
  })

  it("produto ainda não examinado não vira botão — não há nada pra abrir antes do exame rodar", () => {
    render(<CatalogPage />)

    expect(
      screen.queryByRole("button", { name: "Aurora NC7" })
    ).not.toBeInTheDocument()
    expect(screen.getByText("Aurora NC7")).toBeInTheDocument()
  })
})

describe("CatalogPage — botão único 'Rodar Agente de Simulação'", () => {
  it("um único clique preenche a tela ponta a ponta, sem aprovar nem editar nada", async () => {
    render(<CatalogPage />)

    expect(
      screen.getByRole("button", { name: RUN_BUTTON_NAME })
    ).toBeInTheDocument()

    await runSimulationAndWait()

    expect(
      screen.getByRole("row", { name: /Aurora NC7/ })
    ).toBeInTheDocument()
    // Nada de sheet/modal, nada de OrderEditor, nada de aprovação — o
    // desenho antigo (ticket 04) morreu por completo.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryAllByTestId("order-editor")).toHaveLength(0)
    expect(
      screen.queryByRole("button", { name: /Aprovar/ })
    ).not.toBeInTheDocument()
  })

  it("antes de rodar, a faixa de pedidos diz que ainda não há pedidos", () => {
    render(<CatalogPage />)

    expect(screen.getByText(/Ainda não há pedidos/)).toBeInTheDocument()
  })

  it("mostra a etapa 1 (escrevendo os pedidos) com o escopo declarado, e o botão fica desabilitado", async () => {
    let resolveWrite!: (value: TestOrderGenerationResult) => void
    vi.spyOn(
      runSimulationAgentLib.runSimulationAgent,
      "writeTestOrders"
    ).mockImplementation(
      () => new Promise((resolve) => (resolveWrite = resolve))
    )
    vi.spyOn(
      runSimulationAgentLib.runSimulationAgent,
      "runBuyerAgent"
    ).mockResolvedValue(simulationAgentNormalScenario.simulationBatch)

    render(<CatalogPage />)
    fireEvent.click(screen.getByRole("button", { name: RUN_BUTTON_NAME }))

    const progress = await screen.findByRole("status")
    expect(progress).toHaveTextContent(
      "Escrevendo os pedidos de teste sobre 7 produtos"
    )
    expect(screen.getByRole("button", { name: RUN_BUTTON_NAME })).toBeDisabled()

    resolveWrite(simulationAgentNormalScenario.testOrderGeneration)
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument())
  })

  it("mostra a etapa 2 (rodando o agente) já com os pedidos da etapa 1 visíveis — antes do resultado chegar", async () => {
    let resolveWrite!: (value: TestOrderGenerationResult) => void
    vi.spyOn(
      runSimulationAgentLib.runSimulationAgent,
      "writeTestOrders"
    ).mockImplementation(
      () => new Promise((resolve) => (resolveWrite = resolve))
    )

    let resolveRun!: (value: BuyerAgentSimulationBatchResult) => void
    vi.spyOn(
      runSimulationAgentLib.runSimulationAgent,
      "runBuyerAgent"
    ).mockImplementation(
      () => new Promise((resolve) => (resolveRun = resolve))
    )

    render(<CatalogPage />)
    fireEvent.click(screen.getByRole("button", { name: RUN_BUTTON_NAME }))

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Escrevendo os pedidos de teste sobre 7 produtos"
      )
    )

    resolveWrite(simulationAgentNormalScenario.testOrderGeneration)

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Rodando o agente comprador contra 4 pedidos e 7 produtos"
      )
    )

    // A etapa 1 já resolveu (o painel sabe quantos pedidos existem) mesmo
    // com o resultado do exame ainda em voo — a faixa de pedidos não
    // desenha mais os cartões (removido a pedido do dono do projeto, ver
    // `.scratch/catalogo-como-exame/issues/04-...md`), então a evidência de
    // que a etapa 1 chegou é o próprio texto de contagem.
    const panel = screen.getByTestId("catalog-exam-orders-panel")
    expect(
      within(panel).getByText(/4 pedidos gerados nesta rodada/)
    ).toBeInTheDocument()

    resolveRun(simulationAgentNormalScenario.simulationBatch)
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument())
  })

  it("falha na etapa 1 (escrever os pedidos) mostra estado de erro visível, com retentativa — não tela branca nem spinner infinito", async () => {
    vi.spyOn(runSimulationAgentLib.runSimulationAgent, "writeTestOrders")
      .mockRejectedValueOnce(new Error("Falha simulada ao escrever pedidos"))
      .mockResolvedValueOnce(simulationAgentNormalScenario.testOrderGeneration)
    vi.spyOn(
      runSimulationAgentLib.runSimulationAgent,
      "runBuyerAgent"
    ).mockResolvedValue(simulationAgentNormalScenario.simulationBatch)

    render(<CatalogPage />)
    fireEvent.click(screen.getByRole("button", { name: RUN_BUTTON_NAME }))

    expect(
      await screen.findByText("Não foi possível escrever os pedidos de teste")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Falha simulada ao escrever pedidos")
    ).toBeInTheDocument()
    // Não é tela branca: a tabela crua continua no ar.
    expect(screen.getByText("Aurora NC7")).toBeInTheDocument()
    // A etapa 1 falhou antes de produzir pedido nenhum.
    expect(screen.getByText(/Ainda não há pedidos/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }))

    await waitFor(() =>
      expect(
        screen.queryByText("Não foi possível escrever os pedidos de teste")
      ).not.toBeInTheDocument()
    )
    expect(screen.queryByText("Não examinado")).not.toBeInTheDocument()
  })

  it("falha na etapa 2 (rodar o agente) mostra estado de erro visível, mantendo os pedidos da etapa 1 auditáveis", async () => {
    vi.spyOn(
      runSimulationAgentLib.runSimulationAgent,
      "writeTestOrders"
    ).mockResolvedValue(simulationAgentNormalScenario.testOrderGeneration)
    vi.spyOn(runSimulationAgentLib.runSimulationAgent, "runBuyerAgent")
      .mockRejectedValueOnce(new Error("Falha simulada ao rodar o agente"))
      .mockResolvedValueOnce(simulationAgentNormalScenario.simulationBatch)

    render(<CatalogPage />)
    fireEvent.click(screen.getByRole("button", { name: RUN_BUTTON_NAME }))

    expect(
      await screen.findByText("Não foi possível rodar o agente comprador")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Falha simulada ao rodar o agente")
    ).toBeInTheDocument()
    // Os pedidos da etapa 1 (que teve sucesso) continuam contabilizados
    // mesmo com a etapa 2 falha — o dado não desaparece com o erro, só os
    // cartões não são mais desenhados (removido a pedido do dono do
    // projeto, ver `.scratch/catalogo-como-exame/issues/04-...md`).
    expect(
      screen.getByText(/4 pedidos gerados nesta rodada/)
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }))

    await waitFor(() =>
      expect(
        screen.queryByText("Não foi possível rodar o agente comprador")
      ).not.toBeInTheDocument()
    )
    expect(screen.queryByText("Não examinado")).not.toBeInTheDocument()
  })

  it("a tela declara que o exame não gera conteúdo nenhum", () => {
    render(<CatalogPage />)

    expect(
      screen.getByText(/Rodar o exame não gera conteúdo nenhum/)
    ).toBeInTheDocument()
  })

  it("não existe mais o toggle de modo fixture — o catálogo é sempre a fixture", () => {
    render(<CatalogPage />)

    expect(
      screen.queryByRole("button", { name: /Modo fixture/ })
    ).not.toBeInTheDocument()
  })
})
