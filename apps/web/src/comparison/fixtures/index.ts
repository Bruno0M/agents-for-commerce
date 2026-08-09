import type { ComparisonResult } from "../types"
import { pedidoADeltaPositivo } from "./pedidoA-delta-positivo"
import { pedidoADeltaZero } from "./pedidoA-delta-zero"
import { nenhumPassou } from "./nenhum-passou"
import { deltaNegativo } from "./delta-negativo"
import { semExpectativas } from "./sem-expectativas"

export type FixtureId =
  | "pedidoA-delta-positivo"
  | "pedidoA-delta-zero"
  | "nenhum-passou"
  | "delta-negativo"
  | "sem-expectativas"

export type Fixture = {
  id: FixtureId
  label: string
  result: ComparisonResult
}

export const FIXTURES: Fixture[] = [
  {
    id: "pedidoA-delta-positivo",
    label: "Pedido A — delta positivo (pitch)",
    result: pedidoADeltaPositivo,
  },
  {
    id: "pedidoA-delta-zero",
    label: "Pedido A — delta zero (estado real)",
    result: pedidoADeltaZero,
  },
  {
    id: "nenhum-passou",
    label: "Nenhum produto passa",
    result: nenhumPassou,
  },
  {
    id: "delta-negativo",
    label: "Delta negativo (regressão)",
    result: deltaNegativo,
  },
  {
    id: "sem-expectativas",
    label: "Produtos sem expectativa registrada",
    result: semExpectativas,
  },
]

export const DEFAULT_FIXTURE_ID: FixtureId = "pedidoA-delta-positivo"
