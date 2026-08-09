/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from "react"

import type { ExamTransport } from "./types"

/**
 * O transporte escolhido, disponível para a árvore inteira.
 *
 * A escolha acontece UMA vez, no entry point (`TransportGate.tsx`). Daqui
 * para baixo nenhum componente sabe qual implementação está ativa: ele pede
 * `useExamTransport()` e chama os três métodos da interface. É o que torna o
 * `/web` uma árvore de componentes só, com o transporte trocando embaixo —
 * em vez de um fork da tela por ambiente (D2 da spec).
 *
 * `notice` é o único vazamento deliberado: quando o entry point TENTOU o
 * bridge e caiu para o modo avulso, a tela precisa dizer isso em vez de
 * fingir que está tudo normal com dados de exemplo.
 */
type TransportContextValue = {
  transport: ExamTransport
  notice: string | null
}

const TransportContext = createContext<TransportContextValue | undefined>(
  undefined
)

export function TransportProvider({
  transport,
  notice = null,
  children,
}: {
  transport: ExamTransport
  notice?: string | null
  children: ReactNode
}) {
  // A identidade do valor não pode trocar a cada render: a leitura do
  // catálogo é um efeito com `[transport]` na lista de dependências, e um
  // objeto novo por render viraria um loop de leitura infinito.
  const value = useMemo(() => ({ transport, notice }), [transport, notice])

  return (
    <TransportContext.Provider value={value}>
      {children}
    </TransportContext.Provider>
  )
}

export function useExamTransport(): ExamTransport {
  return useTransportContext().transport
}

/** O aviso de fallback, ou `null` quando o transporte ativo é o que se
 * pretendia usar. */
export function useTransportNotice(): string | null {
  return useTransportContext().notice
}

function useTransportContext(): TransportContextValue {
  const context = useContext(TransportContext)

  // Sem default silencioso de propósito: um componente montado fora do
  // provider cairia no transporte de fixture sem ninguém perceber, e a tela
  // mostraria dados de exemplo dentro do Studio como se fossem da loja.
  if (context === undefined) {
    throw new Error(
      "useExamTransport precisa de um <TransportProvider> acima — o transporte é escolhido uma vez, no entry point (TransportGate)."
    )
  }

  return context
}
