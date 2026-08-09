import {
  CheckCircle2Icon,
  AlertTriangleIcon,
  SplitIcon,
  ScaleIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { EXAM_STATE_LABELS } from "../lib/examStateLabels"
import type { ProductExamState } from "../types"

/**
 * A coluna de veredito do ticket 02 da `.scratch/catalogo-como-exame/` — os
 * quatro estados do D2 da spec, nunca dois. O rótulo fala do robô comprador
 * ("conseguiu confirmar?"), nunca de qualidade de conteúdo — é a regra dura
 * do ticket: um cabeçalho ou valor escrito em torno de "score" constrói um
 * SEO checker por acidente de copy.
 *
 * A cor segue o mesmo critério do `NatureBadge`, agora pelos tokens
 * semânticos de `index.css`: `caution` (âmbar) é reservado para os estados em
 * que a loja tem o que consertar (`illegible`, `mixed` — este último em
 * `mixed`/terracota para permanecer distinguível de `illegible` mesmo sem ler
 * o texto); `legitimatelyRejected` usa o mesmo `quiet` neutro do
 * `NatureBadge` porque não é falha da loja, é o exame funcionando corretamente.
 * `passed` é a única cor "de sucesso" da tela, porque é o único estado sem
 * nenhuma ressalva.
 */

const STATE_ICON: Record<ProductExamState, typeof CheckCircle2Icon> = {
  passed: CheckCircle2Icon,
  illegible: AlertTriangleIcon,
  mixed: SplitIcon,
  legitimatelyRejected: ScaleIcon,
}

const STATE_STYLES: Record<ProductExamState, string> = {
  passed: "border-pass-line bg-pass-soft text-pass-ink",
  illegible: "border-caution-line bg-caution-soft text-caution-ink",
  mixed: "border-mixed-line bg-mixed-soft text-mixed-ink",
  legitimatelyRejected: "border-quiet-line bg-quiet-soft text-quiet-ink",
}

export function ExamStateBadge({ state }: { state: ProductExamState }) {
  const Icon = STATE_ICON[state]

  return (
    <Badge variant="outline" className={STATE_STYLES[state]}>
      <Icon className="size-3" aria-hidden="true" />
      {EXAM_STATE_LABELS[state]}
    </Badge>
  )
}
