import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  BridgeGate,
  TransportGate,
  type BridgeConnectionState,
} from "./TransportGate"
import { useExamTransport, useTransportNotice } from "./context"

/**
 * A escolha do transporte no entry point (issue #6). O que estes testes
 * protegem é o critério "detecta a ausência de host e cai para o modo avulso
 * sem tela branca e sem esperar o timeout" — que é uma regra sobre TEMPO,
 * não sobre aparência, e por isso é testável sem host nenhum.
 *
 * O handshake de verdade não está aqui: ele depende do host real e a
 * verificação é manual, pela aba UI da Connection (D5 da spec).
 */

/** Uma sonda: mostra qual transporte venceu e o aviso, se houver. */
function TransportProbe() {
  const transport = useExamTransport()
  const notice = useTransportNotice()

  return (
    <div>
      <span data-testid="kind">{transport.kind}</span>
      <span data-testid="notice">{notice ?? "sem aviso"}</span>
    </div>
  )
}

const NOT_CONNECTED: BridgeConnectionState = {
  app: null,
  isConnected: false,
  error: null,
}

afterEach(() => {
  vi.useRealTimers()
})

describe("TransportGate — fora de iframe", () => {
  it("renderiza no primeiro frame, em modo avulso, sem passar por 'conectando'", () => {
    // jsdom roda a página como top-level: `window.parent === window.self`,
    // exatamente o caso do `bun dev`. Sem `await`, sem `waitFor`: se o
    // conteúdo não estivesse aí no primeiro render, isto falharia.
    render(
      <TransportGate>
        <TransportProbe />
      </TransportGate>
    )

    expect(screen.getByTestId("kind")).toHaveTextContent("fixture")
    expect(screen.queryByText(/Conectando/)).not.toBeInTheDocument()
  })
})

describe("BridgeGate — dentro de iframe", () => {
  it("usa o bridge quando o handshake completa", () => {
    const app = { callServerTool: vi.fn() }

    render(
      <BridgeGate connection={{ app, isConnected: true, error: null }}>
        <TransportProbe />
      </BridgeGate>
    )

    expect(screen.getByTestId("kind")).toHaveTextContent("bridge")
    expect(screen.getByTestId("notice")).toHaveTextContent("sem aviso")
  })

  it("enquanto espera, mostra 'conectando' — nunca tela branca", () => {
    const { container } = render(
      <BridgeGate connection={NOT_CONNECTED}>
        <TransportProbe />
      </BridgeGate>
    )

    expect(screen.getByRole("status")).toHaveTextContent("Conectando ao host")
    expect(container.textContent).not.toBe("")
    expect(screen.queryByTestId("kind")).not.toBeInTheDocument()
  })

  it("handshake com erro cai para o avulso na hora, sem esperar prazo nenhum", () => {
    render(
      <BridgeGate
        connection={{
          app: null,
          isConnected: false,
          error: new Error("host recusou a conexão"),
        }}
      >
        <TransportProbe />
      </BridgeGate>
    )

    expect(screen.getByTestId("kind")).toHaveTextContent("fixture")
    expect(screen.getByTestId("notice")).toHaveTextContent(
      "host recusou a conexão"
    )
  })

  it("host mudo cai para o avulso no PRAZO NOSSO, muito antes dos 15s do SDK", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    render(
      <BridgeGate connection={NOT_CONNECTED} deadlineMs={2_500}>
        <TransportProbe />
      </BridgeGate>
    )

    expect(screen.getByRole("status")).toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(2_500)

    await waitFor(() =>
      expect(screen.getByTestId("kind")).toHaveTextContent("fixture")
    )
    // O aviso é o que impede alguém de apresentar dado de exemplo achando
    // que veio da loja conectada.
    expect(screen.getByTestId("notice")).toHaveTextContent(
      /não respondeu ao handshake/
    )
  })
})
