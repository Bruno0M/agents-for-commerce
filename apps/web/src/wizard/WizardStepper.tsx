import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { PHASES, type PhaseIndex } from "./flow-state"

type WizardStepperProps = {
  currentPhase: PhaseIndex
  isPhaseCompleted: (phase: PhaseIndex) => boolean
  isPhaseReachable: (phase: PhaseIndex) => boolean
  onSelectPhase: (phase: PhaseIndex) => void
}

export function WizardStepper({
  currentPhase,
  isPhaseCompleted,
  isPhaseReachable,
  onSelectPhase,
}: WizardStepperProps) {
  return (
    <ol
      className="flex flex-1 items-center gap-1"
      aria-label="Fases do exame guiado"
    >
      {PHASES.map((phase, index) => {
        const completed = isPhaseCompleted(phase.index)
        const current = phase.index === currentPhase
        const reachable = isPhaseReachable(phase.index)

        return (
          <li key={phase.index} className="flex flex-1 items-center gap-1">
            <button
              type="button"
              disabled={!reachable}
              aria-disabled={!reachable}
              aria-current={current ? "step" : undefined}
              data-state={
                completed ? "completed" : current ? "current" : "upcoming"
              }
              onClick={() => onSelectPhase(phase.index)}
              className={cn(
                "flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                current && "border-primary bg-primary/10 font-medium",
                !current &&
                  completed &&
                  "border-border bg-muted/50 text-foreground",
                !current &&
                  !completed &&
                  reachable &&
                  "border-border text-muted-foreground hover:bg-muted/40",
                !reachable &&
                  "cursor-not-allowed border-border text-muted-foreground/50"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-xs",
                  completed &&
                    "border-primary bg-primary text-primary-foreground",
                  !completed && current && "border-primary text-primary",
                  !completed &&
                    !current &&
                    "border-border text-muted-foreground"
                )}
              >
                {completed ? <CheckIcon className="size-3" /> : phase.index}
              </span>
              <span className="truncate">{phase.title}</span>
            </button>
            {index < PHASES.length - 1 && (
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
