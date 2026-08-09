import { useReducer } from "react"

import { Button } from "@/components/ui/button"
import { WizardStepper } from "./WizardStepper"
import { PhaseConectar } from "./phases/PhaseConectar"
import { PhaseDefinirExame } from "./phases/PhaseDefinirExame"
import { PhaseDiagnostico } from "./phases/PhaseDiagnostico"
import { PhaseConserto } from "./phases/PhaseConserto"
import { PhasePublicar } from "./phases/PhasePublicar"
import {
  INITIAL_WIZARD_STATE,
  hasProducedInput,
  maxReachablePhase,
  wizardReducer,
  type PhaseIndex,
} from "./flow-state"

export function ExamWizard() {
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_WIZARD_STATE)

  const reachable = maxReachablePhase(state)
  const canGoBack = state.currentPhase > 1
  const canGoForward =
    state.currentPhase < 5 && hasProducedInput(state, state.currentPhase)

  function goToPhase(phase: PhaseIndex) {
    dispatch({ type: "GO_TO_PHASE", phase })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/*
        Sticky logo abaixo do header do app (h-14): os steps e a navegação
        são a orientação do lojista dentro de um fluxo de 5 fases — perdê-los
        de vista no meio de uma lista longa de pedidos (fase 2) é perder o
        "onde estou". `top-14` casa com a altura daquele header, que também é
        sticky; z-10 fica abaixo do z-20 dele para os dois se empilharem na
        ordem certa.
      */}
      <div className="sticky top-14 z-10 bg-background">
        <div className="flex flex-col gap-3 border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <WizardStepper
              currentPhase={state.currentPhase}
              isPhaseCompleted={(phase) => hasProducedInput(state, phase)}
              isPhaseReachable={(phase) => phase <= reachable}
              onSelectPhase={goToPhase}
            />
            <Button
              type="button"
              variant={state.fixtureMode ? "default" : "outline"}
              size="sm"
              aria-pressed={state.fixtureMode}
              onClick={() =>
                dispatch({
                  type: "SET_FIXTURE_MODE",
                  enabled: !state.fixtureMode,
                })
              }
            >
              Modo fixture: {state.fixtureMode ? "ligado" : "desligado"}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-3">
          <Button
            type="button"
            variant="outline"
            disabled={!canGoBack}
            onClick={() => goToPhase((state.currentPhase - 1) as PhaseIndex)}
          >
            Voltar
          </Button>
          <Button
            type="button"
            disabled={!canGoForward}
            onClick={() => goToPhase((state.currentPhase + 1) as PhaseIndex)}
          >
            Avançar
          </Button>
        </div>
      </div>

      <div className="flex-1">
        {state.currentPhase === 1 && (
          <PhaseConectar
            fixtureMode={state.fixtureMode}
            catalog={state.catalog}
            onCatalogRead={(catalog) =>
              dispatch({ type: "CATALOG_READ", catalog })
            }
          />
        )}

        {state.currentPhase === 2 && state.catalog && (
          <PhaseDefinirExame
            fixtureMode={state.fixtureMode}
            catalog={state.catalog}
            approvedOrders={state.approvedOrders}
            onOrdersApproved={(approvedOrders) =>
              dispatch({ type: "ORDERS_APPROVED", approvedOrders })
            }
          />
        )}

        {state.currentPhase === 3 && state.catalog && state.approvedOrders && (
          <PhaseDiagnostico
            fixtureMode={state.fixtureMode}
            catalog={state.catalog}
            approvedOrders={state.approvedOrders}
            diagnosis={state.diagnosis}
            onDiagnosisReady={(diagnosis) =>
              dispatch({ type: "DIAGNOSIS_READY", diagnosis })
            }
          />
        )}

        {state.currentPhase === 4 &&
          state.approvedOrders &&
          state.diagnosis && (
            <PhaseConserto
              fixtureMode={state.fixtureMode}
              approvedOrders={state.approvedOrders}
              diagnosis={state.diagnosis}
              comparison={state.comparison}
              onComparisonReady={(comparison) =>
                dispatch({ type: "COMPARISON_READY", comparison })
              }
            />
          )}

        {state.currentPhase === 5 && state.comparison && (
          <PhasePublicar
            fixtureMode={state.fixtureMode}
            comparison={state.comparison}
            submission={state.submission}
            onSubmissionReady={(submission) =>
              dispatch({ type: "SUBMISSION_READY", submission })
            }
          />
        )}
      </div>
    </div>
  )
}
