import { FIXTURES, type FixtureId } from "../fixtures"

type FixtureSelectorProps = {
  selectedId: FixtureId
  onSelect: (id: FixtureId) => void
}

export function FixtureSelector({
  selectedId,
  onSelect,
}: FixtureSelectorProps) {
  return (
    <div className="fixed top-4 right-4 z-10 flex items-center gap-2 rounded-md border border-cv-line bg-cv-paper-raised/95 px-3 py-2 text-sm shadow-sm backdrop-blur-sm">
      <label
        htmlFor="fixture-select"
        className="font-cv-mono text-[0.65rem] font-medium tracking-[0.12em] text-cv-ink-faint uppercase"
      >
        Fixture
      </label>
      <select
        id="fixture-select"
        value={selectedId}
        onChange={(event) => onSelect(event.target.value as FixtureId)}
        className="cursor-pointer rounded-sm border border-cv-line bg-cv-paper-raised px-2 py-1 text-cv-ink transition-colors hover:border-cv-ink-faint focus-visible:outline-2 focus-visible:outline-cv-accent"
      >
        {FIXTURES.map((fixture) => (
          <option key={fixture.id} value={fixture.id}>
            {fixture.label}
          </option>
        ))}
      </select>
    </div>
  )
}
