import { useState } from "react"
import type {
  ComparisonResult,
  ProductComparison,
  RoundOutcome,
} from "../types"
import {
  alwaysFailingRequirements,
  classifyRowVerdict,
  findEvidence,
  groupByExpectation,
  requirementColumns,
  verdictFromRound,
  type ProductGroup,
  type RowVerdict,
  type Verdict,
} from "../lib/grid"
import { EvidencePanel } from "./EvidencePanel"

type RequirementsGridProps = {
  products: ComparisonResult["products"]
}

const GROUP_ORDER: ProductGroup[] = ["shouldPass", "shouldReject", "outOfCount"]

const GROUP_LABELS: Record<ProductGroup, string> = {
  shouldPass: "Deviam passar",
  shouldReject: "Deviam ser rejeitados",
  outOfCount: "Fora da contagem",
}

const ROW_VERDICT_LABELS: Record<RowVerdict, string> = {
  corrected: "Errou antes, acertou depois",
  regressed: "Acertava antes, errou depois",
  stayedCorrect: "Acertou nas duas rodadas",
  stayedIncorrect: "Errou nas duas rodadas",
  outOfCount: "Sem expectativa registrada",
}

const VERDICT_STYLES: Record<Verdict, string> = {
  correct: "border-cv-pass-line bg-cv-pass-soft text-cv-pass",
  incorrect: "border-cv-fail-line bg-cv-fail-soft text-cv-fail",
  neutral: "border-cv-neutral-line bg-cv-neutral-soft text-cv-neutral",
}

const ROW_BADGE_DOT: Record<Verdict, string> = {
  correct: "bg-cv-pass",
  incorrect: "bg-cv-fail",
  neutral: "bg-cv-neutral",
}

function rowVerdictTone(verdict: RowVerdict): Verdict {
  if (verdict === "outOfCount") return "neutral"
  if (verdict === "regressed" || verdict === "stayedIncorrect")
    return "incorrect"
  return "correct"
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 8.5L6.5 11.5L12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 4L12 12M12 4L4 12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="11"
      height="11"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 1.5L15 13.5H1L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M8 6.2V9.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11.4" r="0.9" fill="currentColor" />
    </svg>
  )
}

type MarkerProps = {
  round: RoundOutcome
  requirementName: string
  roundLabel: string
}

function Marker({ round, requirementName, roundLabel }: MarkerProps) {
  const evidence = findEvidence(round, requirementName)
  if (!evidence) return null

  const verdict = verdictFromRound(round)
  const symbolLabel = evidence.confirmed ? "passou" : "rejeitou"

  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-sm border ${VERDICT_STYLES[verdict]}`}
      title={`${roundLabel}: ${evidence.message}`}
      aria-label={`${roundLabel}: ${symbolLabel}`}
    >
      {evidence.confirmed ? <CheckIcon /> : <CrossIcon />}
    </span>
  )
}

type ProductRowProps = {
  product: ProductComparison
  requirements: string[]
  isExpanded: boolean
  onToggle: () => void
}

function panelId(productId: string): string {
  return `evidence-panel-${productId}`
}

function ProductRow({
  product,
  requirements,
  isExpanded,
  onToggle,
}: ProductRowProps) {
  const verdict = classifyRowVerdict(product)
  const tone = rowVerdictTone(verdict)

  const rowBg = isExpanded
    ? "bg-cv-accent-soft/40"
    : "bg-cv-paper-raised group-hover:bg-cv-paper"
  const trBg = isExpanded ? "bg-cv-accent-soft/40" : "hover:bg-cv-paper"

  return (
    <tr
      className={`group border-b border-cv-line-soft transition-colors ${trBg}`}
    >
      <th
        scope="row"
        className={`sticky left-0 z-[1] px-3 py-2.5 text-left align-top font-normal whitespace-nowrap transition-colors ${rowBg}`}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={panelId(product.productId)}
          className="group/btn -m-1 rounded-sm p-1 text-left transition-colors focus-visible:outline-2 focus-visible:outline-cv-accent"
        >
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-[10px] text-cv-ink-faint transition-transform duration-200 group-hover/btn:text-cv-ink-soft"
              style={{ transform: isExpanded ? "rotate(90deg)" : "none" }}
              aria-hidden="true"
            >
              ▸
            </span>
            <span className="font-medium text-cv-ink group-hover/btn:underline">
              {product.title}
            </span>
          </div>
          <span
            className={`mt-1.5 inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[0.7rem] font-medium ${VERDICT_STYLES[tone]}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${ROW_BADGE_DOT[tone]}`}
              aria-hidden="true"
            />
            {ROW_VERDICT_LABELS[verdict]}
          </span>
        </button>
      </th>
      {requirements.map((requirementName) => (
        <td key={requirementName} className="px-2 py-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <Marker
              round={product.before}
              requirementName={requirementName}
              roundLabel="Antes"
            />
            <Marker
              round={product.after}
              requirementName={requirementName}
              roundLabel="Depois"
            />
          </div>
        </td>
      ))}
    </tr>
  )
}

type EvidencePanelRowProps = {
  product: ProductComparison
  requirements: string[]
  columnCount: number
}

function EvidencePanelRow({
  product,
  requirements,
  columnCount,
}: EvidencePanelRowProps) {
  return (
    <tr id={panelId(product.productId)}>
      <td
        colSpan={columnCount + 1}
        className="border-b border-cv-line-soft bg-cv-accent-soft/40 px-3 py-4"
      >
        <EvidencePanel product={product} requirements={requirements} />
      </td>
    </tr>
  )
}

type GroupHeaderRowProps = {
  label: string
  columnCount: number
}

function GroupHeaderRow({ label, columnCount }: GroupHeaderRowProps) {
  return (
    <tr>
      <td colSpan={columnCount + 1} className="bg-cv-paper px-3 pt-5 pb-2">
        <div className="flex items-center gap-3">
          <span className="font-cv-mono text-[0.7rem] font-medium tracking-[0.15em] text-cv-ink-faint uppercase">
            {label}
          </span>
          <span className="h-px flex-1 bg-cv-line-soft" aria-hidden="true" />
        </div>
      </td>
    </tr>
  )
}

export function RequirementsGrid({ products }: RequirementsGridProps) {
  const [expandedProductId, setExpandedProductId] = useState<string | null>(
    null
  )
  const requirements = requirementColumns(products)
  const groups = groupByExpectation(products)
  const flaggedRequirements = new Set(alwaysFailingRequirements(products))

  function toggle(productId: string) {
    setExpandedProductId((current) =>
      current === productId ? null : productId
    )
  }

  return (
    <section className="mt-4">
      <div className="overflow-x-auto rounded-md border border-cv-line bg-cv-paper-raised shadow-[0_1px_2px_rgba(32,28,21,0.04)]">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-cv-line">
              <th
                scope="col"
                className="sticky left-0 z-[1] bg-cv-paper-raised px-3 py-2.5 text-left font-cv-mono text-[0.7rem] font-medium tracking-[0.1em] text-cv-ink-faint uppercase"
              >
                Produto
              </th>
              {requirements.map((requirementName) => {
                const isFlagged = flaggedRequirements.has(requirementName)

                return (
                  <th
                    key={requirementName}
                    scope="col"
                    className={`px-2 py-2.5 text-center font-medium whitespace-nowrap ${
                      isFlagged
                        ? "border-b-2 border-cv-warn bg-cv-warn-soft text-cv-warn"
                        : "text-cv-ink-soft"
                    }`}
                    title={
                      isFlagged
                        ? "Falha em todos os produtos nas duas rodadas — provável bug de extração, não catálogo fraco."
                        : undefined
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      {requirementName}
                      {isFlagged && <WarningIcon />}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {GROUP_ORDER.flatMap((group) => {
              const groupProducts = groups[group]
              if (groupProducts.length === 0) return []

              return [
                <GroupHeaderRow
                  key={`${group}-header`}
                  label={GROUP_LABELS[group]}
                  columnCount={requirements.length}
                />,
                ...groupProducts.flatMap((product) => {
                  const isExpanded = product.productId === expandedProductId
                  const rows = [
                    <ProductRow
                      key={product.productId}
                      product={product}
                      requirements={requirements}
                      isExpanded={isExpanded}
                      onToggle={() => toggle(product.productId)}
                    />,
                  ]
                  if (isExpanded) {
                    rows.push(
                      <EvidencePanelRow
                        key={`${product.productId}-panel`}
                        product={product}
                        requirements={requirements}
                        columnCount={requirements.length}
                      />
                    )
                  }
                  return rows
                }),
              ]
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
