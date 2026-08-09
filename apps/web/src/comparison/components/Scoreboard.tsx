import type { ComparisonResult } from "../types"

type ScoreboardProps = {
  before: ComparisonResult["before"]
  after: ComparisonResult["after"]
  successRateDeltaCount: ComparisonResult["successRateDeltaCount"]
}

function fraction(round: ComparisonResult["before"]) {
  return `${round.correctlyClassifiedCount}/${round.totalClassifiedProducts}`
}

function signed(count: number) {
  return count > 0 ? `+${count}` : `${count}`
}

function chosenLabel(chosenProductTitle: string | null) {
  return chosenProductTitle ?? "nenhum"
}

const DELTA_STYLES = {
  positive: { text: "text-cv-pass", wash: "from-cv-pass-soft" },
  negative: { text: "text-cv-fail", wash: "from-cv-fail-soft" },
  flat: { text: "text-cv-neutral", wash: "from-cv-neutral-soft" },
} as const

export function Scoreboard({
  before,
  after,
  successRateDeltaCount,
}: ScoreboardProps) {
  const tone =
    successRateDeltaCount > 0
      ? "positive"
      : successRateDeltaCount < 0
        ? "negative"
        : "flat"
  const { text, wash } = DELTA_STYLES[tone]

  return (
    <section className="relative -mx-6 overflow-hidden border-y border-cv-line px-6 py-14 text-center sm:py-16">
      <div
        className={`pointer-events-none absolute inset-0 bg-radial ${wash} via-transparent to-transparent opacity-70`}
        aria-hidden="true"
      />

      <div className="relative">
        <p className="font-cv-mono text-[0.7rem] font-medium tracking-[0.2em] text-cv-ink-faint uppercase">
          Produtos que o robô confirmou
        </p>

        <div className="mt-5 flex items-baseline justify-center gap-3 sm:gap-4">
          <span className="flex flex-col items-end gap-1">
            <span className="font-cv-mono text-[0.65rem] tracking-[0.15em] text-cv-ink-faint uppercase">
              Antes
            </span>
            <span className="font-cv-display text-2xl text-cv-ink-soft sm:text-3xl">
              {fraction(before)}
            </span>
          </span>
          <span className="mb-1 text-xl text-cv-ink-faint" aria-hidden="true">
            →
          </span>
          <span className="flex flex-col items-start gap-1">
            <span className="font-cv-mono text-[0.65rem] tracking-[0.15em] text-cv-ink-faint uppercase">
              Depois
            </span>
            <span className="font-cv-display text-2xl text-cv-ink sm:text-3xl">
              {fraction(after)}
            </span>
          </span>
        </div>

        <p
          className={`mt-2 font-cv-display text-7xl leading-none font-semibold sm:text-8xl ${text}`}
        >
          {signed(successRateDeltaCount)}
        </p>

        <div className="mx-auto mt-8 h-px w-16 bg-cv-line" aria-hidden="true" />

        <p className="mt-6 text-sm text-cv-ink-soft">
          Produto escolhido —{" "}
          <span className="font-cv-mono text-xs text-cv-ink-faint uppercase">
            antes
          </span>{" "}
          <span className="font-medium text-cv-ink">
            {chosenLabel(before.chosenProductTitle)}
          </span>
          <span className="mx-2 text-cv-ink-faint">·</span>
          <span className="font-cv-mono text-xs text-cv-ink-faint uppercase">
            depois
          </span>{" "}
          <span className="font-medium text-cv-ink">
            {chosenLabel(after.chosenProductTitle)}
          </span>
        </p>
      </div>
    </section>
  )
}
