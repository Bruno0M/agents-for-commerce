import type { ProductExamState } from "../types"

/**
 * O rótulo de cada um dos quatro estados do D2 — texto único, reusado pelo
 * badge (`components/ExamStateBadge.tsx`) e pelo dropdown de filtro por
 * estado (`components/CatalogExamControls.tsx`, ticket 03). Vive num módulo
 * próprio, fora de `ExamStateBadge.tsx`, porque um arquivo de componente que
 * exporta constante além do componente quebra o fast refresh
 * (`react-refresh/only-export-components` do eslint) — a mesma regra que já
 * vale para o resto do projeto (ver `components/ui/*`, que tem esse erro
 * pré-existente por não seguir essa separação).
 */
export const EXAM_STATE_LABELS: Record<ProductExamState, string> = {
  passed: "Confirmou tudo",
  illegible: "Não confirmou",
  mixed: "Confirmou em parte",
  legitimatelyRejected: "Não atende",
}
