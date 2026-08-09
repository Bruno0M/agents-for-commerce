import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useApp } from "@modelcontextprotocol/ext-apps/react"
import { Loader2Icon } from "lucide-react"

import { createBridgeTransport, type ServerToolCaller } from "./bridgeTransport"
import { TransportProvider } from "./context"
import { createStandaloneTransport } from "./standalone"

/**
 * O ENTRY POINT do transporte (issue #6): o único lugar do `/web` que
 * conhece o SDK do bridge, e o único que decide qual implementação a árvore
 * inteira vai usar. Daqui para baixo só existe a interface.
 *
 * ## A detecção é explícita, e não um timeout
 *
 * O handshake do MCP App tem um teto de 15s. Esperar por ele para descobrir
 * que não há host nenhum daria 15 segundos de tela branca em todo `bun dev`
 * — que é o cenário mais comum de todos. Então a decisão vem em duas
 * camadas, e nenhuma delas espera aquele teto:
 *
 * 1. **Sem iframe, sem host.** `window.parent !== window.self` responde na
 *    hora, sem I/O nenhum: fora de um iframe não existe host para responder
 *    ao `postMessage`, ponto. Este é o caminho do `bun dev`, e ele renderiza
 *    no primeiro frame, sem nem criar o `App` do SDK.
 * 2. **Dentro de um iframe, com prazo curto.** Aí sim vale tentar o
 *    handshake — mas com um prazo nosso (`HANDSHAKE_DEADLINE_MS`) bem antes
 *    do teto do SDK. Estar num iframe não prova que o pai fala MCP; se ele
 *    não responder no prazo, a view cai para o modo avulso com um aviso
 *    visível, em vez de ficar parada.
 *
 * Nos dois casos há sempre algo desenhado na tela: nunca branco, nunca
 * spinner infinito.
 */
export function TransportGate({ children }: { children: ReactNode }) {
  // Calculado uma vez: a resposta não muda durante a sessão, e recalcular a
  // cada render trocaria a árvore montada por baixo do app.
  const [embedded] = useState(isEmbeddedInIframe)

  if (!embedded) {
    return <StandaloneGate>{children}</StandaloneGate>
  }

  return <HostedGate>{children}</HostedGate>
}

/** O prazo NOSSO para o host se manifestar. Curto de propósito: o handshake
 * é um `postMessage` entre dois frames já carregados — se o host fala MCP,
 * ele responde em milissegundos. Este prazo não existe para dar tempo ao
 * host lento, e sim para descobrir rápido que o pai não é um host. */
const HANDSHAKE_DEADLINE_MS = 2_500

const APP_INFO = { name: "agents-for-commerce-exam", version: "0.0.1" }

function isEmbeddedInIframe(): boolean {
  try {
    return window.parent !== window.self
  } catch {
    // `window.parent` inacessível só acontece com um pai de outra origem —
    // ou seja, estamos num iframe com toda a certeza.
    return true
  }
}

function StandaloneGate({ children }: { children: ReactNode }) {
  const transport = useMemo(() => createStandaloneTransport(), [])

  return <TransportProvider transport={transport}>{children}</TransportProvider>
}

/** A casca fina que fala com o SDK. Toda a decisão mora em `BridgeGate`, que
 * recebe o estado da conexão pronto — é o que torna os quatro desfechos
 * testáveis com um bridge mockado, sem host real. */
function HostedGate({ children }: { children: ReactNode }) {
  const connection = useApp({ appInfo: APP_INFO, capabilities: {} })

  return <BridgeGate connection={connection}>{children}</BridgeGate>
}

/** O que `useApp` devolve, na parte que a decisão usa. */
export type BridgeConnectionState = {
  app: ServerToolCaller | null
  isConnected: boolean
  error: Error | null
}

export function BridgeGate({
  connection,
  children,
  deadlineMs = HANDSHAKE_DEADLINE_MS,
}: {
  connection: BridgeConnectionState
  children: ReactNode
  deadlineMs?: number
}) {
  const [deadlineReached, setDeadlineReached] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDeadlineReached(true), deadlineMs)
    return () => clearTimeout(timer)
  }, [deadlineMs])

  const { app, isConnected, error } = connection
  const connected = isConnected && app !== null
  const gaveUp = !connected && (error !== null || deadlineReached)

  const bridge = useMemo(
    () => (connected && app ? createBridgeTransport(app) : null),
    [connected, app]
  )
  const fallback = useMemo(
    () => (gaveUp ? createStandaloneTransport() : null),
    [gaveUp]
  )

  if (bridge) {
    return <TransportProvider transport={bridge}>{children}</TransportProvider>
  }

  if (fallback) {
    return (
      <TransportProvider
        transport={fallback}
        notice={describeFallback(error, deadlineMs)}
      >
        {children}
      </TransportProvider>
    )
  }

  return <ConnectingScreen />
}

function describeFallback(error: Error | null, deadlineMs: number): string {
  const cause =
    error !== null
      ? `o handshake com o host falhou (${error.message})`
      : `o host não respondeu ao handshake em ${deadlineMs / 1000}s`

  return (
    `Esta tela está dentro de um iframe, mas ${cause}. ` +
    `Ela seguiu em modo avulso — o que aparece abaixo NÃO vem da loja conectada.`
  )
}

function ConnectingScreen() {
  return (
    <div
      role="status"
      className="flex min-h-svh items-center justify-center gap-2 text-sm text-muted-foreground"
    >
      <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
      Conectando ao host…
    </div>
  )
}
