import { AlertTriangleIcon, ScaleIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { UnmetRequirementKind } from "../types"

/**
 * A distinção visual entre ilegibilidade e rejeição legítima — o critério de
 * aceite mais importante do ticket 06 ("a distinção fica clara na tela, não
 * só no dado"). Deliberadamente NÃO usa a mesma cor de alerta para as duas:
 * ilegibilidade é o problema que esta ferramenta existe para expor (tom de
 * atenção, `caution`/âmbar — a loja tem o que consertar); rejeição legítima é
 * comportamento correto do exame (tom neutro, `quiet` — nada para a loja
 * consertar aqui, o produto de fato não atende).
 */

const NATURE_LABELS: Record<UnmetRequirementKind, string> = {
  illegibility: "Ilegibilidade",
  legitimateRejection: "Rejeição legítima",
}

const NATURE_STYLES: Record<UnmetRequirementKind, string> = {
  illegibility: "border-caution-line bg-caution-soft text-caution-ink",
  legitimateRejection: "border-quiet-line bg-quiet-soft text-quiet-ink",
}

export function NatureBadge({ kind }: { kind: UnmetRequirementKind }) {
  const Icon = kind === "illegibility" ? AlertTriangleIcon : ScaleIcon

  return (
    <Badge variant="outline" className={NATURE_STYLES[kind]}>
      <Icon className="size-3" aria-hidden="true" />
      {NATURE_LABELS[kind]}
    </Badge>
  )
}
