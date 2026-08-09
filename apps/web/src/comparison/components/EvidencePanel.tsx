import type {
  DataSource,
  ProductComparison,
  RequirementEvidence,
} from "../types"
import { evidenceState, findEvidence, type EvidenceState } from "../lib/grid"

type EvidencePanelProps = {
  product: ProductComparison
  requirements: string[]
}

const SOURCE_LABELS: Record<DataSource, string> = {
  option: "opção de variante",
  metafield: "metafield",
  generated: "extraído da descrição",
  productType: "tipo de produto",
  price: "preço",
}

const STATE_STYLES: Record<EvidenceState, string> = {
  confirmed: "border-l-cv-pass text-cv-pass",
  foundNotConfirmed: "border-l-cv-warn text-cv-warn",
  notFound: "border-l-cv-line text-cv-ink-faint",
}

const STATE_DOT: Record<EvidenceState, string> = {
  confirmed: "bg-cv-pass",
  foundNotConfirmed: "bg-cv-warn",
  notFound: "bg-cv-line",
}

const STATE_LABELS: Record<EvidenceState, string> = {
  confirmed: "Confirmado",
  foundNotConfirmed: "Dado encontrado, não confirma",
  notFound: "Nenhum dado encontrado",
}

function EvidenceCell({
  evidence,
}: {
  evidence: RequirementEvidence | undefined
}) {
  if (!evidence) return <span className="text-cv-ink-faint">—</span>

  const state = evidenceState(evidence)

  return (
    <div className={`border-l-2 py-0.5 pl-3 ${STATE_STYLES[state]}`}>
      <p className="flex items-center gap-1.5 font-cv-mono text-[0.65rem] font-medium tracking-[0.08em] uppercase">
        <span
          className={`h-1.5 w-1.5 rounded-full ${STATE_DOT[state]}`}
          aria-hidden="true"
        />
        {STATE_LABELS[state]}
      </p>
      {evidence.foundValue !== null && (
        <p className="mt-1 text-sm font-medium text-cv-ink">
          {evidence.foundValue}
        </p>
      )}
      {evidence.source !== null && (
        <p className="mt-0.5 text-xs text-cv-ink-faint">
          via {SOURCE_LABELS[evidence.source]}
        </p>
      )}
    </div>
  )
}

export function EvidencePanel({ product, requirements }: EvidencePanelProps) {
  return (
    <div className="space-y-4 text-left">
      <div className="rounded-md border border-cv-line bg-cv-paper-raised">
        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 border-b border-cv-line-soft px-4 py-2">
          <span className="font-cv-mono text-[0.65rem] font-medium tracking-[0.12em] text-cv-ink-faint uppercase">
            O que o agente procurou
          </span>
          <span className="font-cv-mono text-[0.65rem] font-medium tracking-[0.12em] text-cv-ink-faint uppercase">
            Antes
          </span>
          <span className="font-cv-mono text-[0.65rem] font-medium tracking-[0.12em] text-cv-ink-faint uppercase">
            Depois
          </span>
        </div>
        <div>
          {requirements.map((requirementName, index) => {
            const before = findEvidence(product.before, requirementName)
            const after = findEvidence(product.after, requirementName)
            const expected = before?.expected ?? after?.expected ?? ""

            return (
              <div
                key={requirementName}
                className={`grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 px-4 py-3 ${
                  index > 0 ? "border-t border-cv-line-soft" : ""
                }`}
              >
                <div>
                  <p className="font-medium text-cv-ink">{requirementName}</p>
                  <p className="text-xs text-cv-ink-faint">
                    esperado: {expected}
                  </p>
                </div>
                <EvidenceCell evidence={before} />
                <EvidenceCell evidence={after} />
              </div>
            )
          })}
        </div>
      </div>
      {product.descriptionExcerpt !== null && (
        <div className="rounded-md border border-cv-warn-line bg-cv-warn-soft px-4 py-3">
          <p className="font-cv-mono text-[0.65rem] font-medium tracking-[0.1em] text-cv-warn uppercase">
            Já estava na descrição — em prosa, e a máquina não teve como
            confirmar
          </p>
          <p className="mt-1.5 font-cv-display text-sm text-cv-ink italic">
            <mark className="rounded-xs bg-cv-warn-line/60 px-0.5 text-inherit">
              {product.descriptionExcerpt}
            </mark>
          </p>
        </div>
      )}
    </div>
  )
}
