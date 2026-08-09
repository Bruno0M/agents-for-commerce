import type { ComparisonResult } from "../types"

type HeaderProps = {
  naturalLanguageOrder: ComparisonResult["naturalLanguageOrder"]
  requirements: ComparisonResult["requirements"]
  maxPrice: ComparisonResult["maxPrice"]
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function Header({
  naturalLanguageOrder,
  requirements,
  maxPrice,
}: HeaderProps) {
  return (
    <header>
      <p className="font-cv-mono text-[0.7rem] font-medium tracking-[0.2em] text-cv-ink-faint uppercase">
        O pedido do comprador
      </p>
      <p className="mt-3 font-cv-display text-2xl leading-snug text-cv-ink italic sm:text-3xl">
        <span aria-hidden="true" className="text-cv-accent">
          &ldquo;
        </span>
        {naturalLanguageOrder}
        <span aria-hidden="true" className="text-cv-accent">
          &rdquo;
        </span>
      </p>
      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-cv-line pt-4">
        {requirements.map((requirement) => (
          <li
            key={requirement.name}
            className="flex items-baseline gap-1.5 text-sm"
          >
            <span className="text-cv-ink-soft">{requirement.name}</span>
            <span className="text-cv-ink-faint">=</span>
            <span className="font-cv-mono font-medium text-cv-ink">
              {requirement.expected}
            </span>
          </li>
        ))}
        {maxPrice !== null && (
          <li className="flex items-baseline gap-1.5 text-sm">
            <span className="text-cv-ink-soft">Preço</span>
            <span className="text-cv-ink-faint">≤</span>
            <span className="font-cv-mono font-medium text-cv-ink">
              {currency.format(maxPrice)}
            </span>
          </li>
        )}
      </ul>
    </header>
  )
}
