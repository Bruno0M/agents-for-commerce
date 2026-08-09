import type { ComparisonResult } from "@/comparison/types"
import type { SubmissionState } from "../flow-state"
import { PhasePlaceholder } from "./PhasePlaceholder"

type PhasePublicarProps = {
  fixtureMode: boolean
  comparison: ComparisonResult
  submission: SubmissionState | null
  onSubmissionReady: (submission: SubmissionState) => void
}

export function PhasePublicar({
  fixtureMode,
  comparison,
  submission,
  onSubmissionReady,
}: PhasePublicarProps) {
  return (
    <PhasePlaceholder
      title="Publicar"
      description="Envia os itens consertados para aprovação humana no Task Board."
      ownerTicket="10"
      fixtureMode={fixtureMode}
      produced={submission !== null}
      producedSummary={
        submission
          ? `${submission.items.length} itens enviados. Estado: aguardando revisão.`
          : undefined
      }
      produceButtonLabel="Simular envio de exemplo"
      onProduce={() =>
        onSubmissionReady({
          items: comparison.products.map((product) => ({
            productId: product.productId,
            status: "pending",
          })),
        })
      }
    />
  )
}
