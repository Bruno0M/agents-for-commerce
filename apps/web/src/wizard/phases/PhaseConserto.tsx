import { useState } from "react"
import { CircleOffIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ComparisonView } from "@/comparison/components/ComparisonView"
import { FixtureSelector } from "@/comparison/components/FixtureSelector"
import {
  DEFAULT_FIXTURE_ID,
  FIXTURES,
  type FixtureId,
} from "@/comparison/fixtures"
import type { ComparisonResult } from "@/comparison/types"
import type { ApprovedTestOrderSet, DiagnosisResult } from "../flow-state"

type PhaseConsertoProps = {
  fixtureMode: boolean
  // Só leitura, como na fase 3 — o conjunto aprovado chega aqui inalterado
  // (D4); esta fase não tem como reescrevê-lo.
  approvedOrders: ApprovedTestOrderSet
  diagnosis: DiagnosisResult
  comparison: ComparisonResult | null
  onComparisonReady: (comparison: ComparisonResult) => void
}

/**
 * A exceção entre as fases: o componente que ela renderiza (`ComparisonView`)
 * já existe pronto e puro (ticket 04 da view-antes-depois). Uma vez que o
 * insumo é produzido, esta fase passa a renderizar SÓ `<ComparisonView
 * result={comparison} />` — nenhuma prop de wizard, nenhum callback de
 * navegação chega até ele.
 */
export function PhaseConserto({
  fixtureMode,
  approvedOrders,
  comparison,
  onComparisonReady,
}: PhaseConsertoProps) {
  const [selectedFixtureId, setSelectedFixtureId] =
    useState<FixtureId>(DEFAULT_FIXTURE_ID)

  if (comparison) {
    return <ComparisonView result={comparison} />
  }

  if (!fixtureMode) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-14">
        <div>
          <h1 className="text-xl font-semibold">Conserto</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gera conteúdo otimizado só nos produtos que falharam por
            ilegibilidade, re-simula e mostra o delta.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          O conteúdo desta fase pertence ao ticket 09 da{" "}
          <code className="text-xs">.scratch/exame-guiado/issues/</code>.
        </p>
        <Alert>
          <CircleOffIcon />
          <AlertTitle>Sem transporte</AlertTitle>
          <AlertDescription>
            Modo fixture está desligado, e o transporte do ticket 05 ainda não
            existe. Esta fase não produz insumo sem ele — ligue o modo fixture
            para seguir a demo.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const selectedFixture = FIXTURES.find(
    (fixture) => fixture.id === selectedFixtureId
  )!

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-14">
      <div>
        <h1 className="text-xl font-semibold">Conserto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gera conteúdo otimizado só nos produtos que falharam por
          ilegibilidade, re-simula e mostra o delta.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        O conteúdo desta fase pertence ao ticket 09 da{" "}
        <code className="text-xs">.scratch/exame-guiado/issues/</code>. Em modo
        fixture, escolha uma comparação de exemplo para simular o resultado.
      </p>
      <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
        Conjunto aprovado usado: {approvedOrders.id} (
        {approvedOrders.orders.length} pedidos).
      </p>
      <FixtureSelector
        selectedId={selectedFixtureId}
        onSelect={setSelectedFixtureId}
      />
      <div>
        <Button
          type="button"
          onClick={() => onComparisonReady(selectedFixture.result)}
        >
          Usar esta comparação
        </Button>
      </div>
    </div>
  )
}
