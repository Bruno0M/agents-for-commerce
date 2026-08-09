import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CircleOffIcon } from "lucide-react"

type PhasePlaceholderProps = {
  title: string
  description: string
  ownerTicket: string
  fixtureMode: boolean
  produced: boolean
  producedSummary?: string
  produceButtonLabel: string
  onProduce: () => void
}

/**
 * Casca comum às fases 1, 2, 3 e 5: título, o que a fase fará, de quem é o
 * ticket dono do conteúdo real, e (só em modo fixture) a ação que produz o
 * insumo local. A fase 4 não usa isto — ela já tem um componente pronto
 * (`ComparisonView`) para renderizar de verdade.
 */
export function PhasePlaceholder({
  title,
  description,
  ownerTicket,
  fixtureMode,
  produced,
  producedSummary,
  produceButtonLabel,
  onProduce,
}: PhasePlaceholderProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-14">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <p className="text-sm text-muted-foreground">
        O conteúdo desta fase pertence ao ticket {ownerTicket} da{" "}
        <code className="text-xs">.scratch/exame-guiado/issues/</code>.
      </p>

      {produced && producedSummary && (
        <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
          {producedSummary}
        </p>
      )}

      {!produced && fixtureMode && (
        <div>
          <Button type="button" onClick={onProduce}>
            {produceButtonLabel}
          </Button>
        </div>
      )}

      {!produced && !fixtureMode && (
        <Alert>
          <CircleOffIcon />
          <AlertTitle>Sem transporte</AlertTitle>
          <AlertDescription>
            Modo fixture está desligado, e o transporte do ticket 05 ainda não
            existe. Esta fase não produz insumo sem ele — ligue o modo fixture
            para seguir a demo.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
