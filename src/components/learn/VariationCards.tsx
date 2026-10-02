import type { ShapeVariation } from '../../config/unifiedSkillSeed'

/**
 * Arch / hollow variation progression cards — easiest first, each with a
 * still from the shape library when one is mapped. Variations without a
 * mapped still show an explicit placeholder so the gap is visible.
 */
export function VariationCards({
  arch,
  hollow,
  intro,
  getStillUrl,
  onOpenShape,
}: {
  arch: ShapeVariation[]
  hollow: ShapeVariation[]
  intro?: string
  getStillUrl: (shapeId: string) => string | null
  onOpenShape?: (shapeId: string) => void
}) {
  return (
    <div>
      {intro && <p className="mt-1 text-sm text-[var(--text)]">{intro}</p>}
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <VariationGroup
          title="Arch, easiest first"
          variations={arch}
          getStillUrl={getStillUrl}
          onOpenShape={onOpenShape}
        />
        <VariationGroup
          title="Hollow, easiest first"
          variations={hollow}
          getStillUrl={getStillUrl}
          onOpenShape={onOpenShape}
        />
      </div>
    </div>
  )
}

function VariationGroup({
  title,
  variations,
  getStillUrl,
  onOpenShape,
}: {
  title: string
  variations: ShapeVariation[]
  getStillUrl: (shapeId: string) => string | null
  onOpenShape?: (shapeId: string) => void
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
        {title}
      </p>
      <ol className="mt-2 flex flex-col gap-2">
        {variations.map((v, i) => (
          <VariationCard
            key={v.name}
            v={v}
            index={i}
            getStillUrl={getStillUrl}
            onOpenShape={onOpenShape}
          />
        ))}
      </ol>
    </div>
  )
}

function VariationCard({
  v,
  index,
  getStillUrl,
  onOpenShape,
}: {
  v: ShapeVariation
  index: number
  getStillUrl: (shapeId: string) => string | null
  onOpenShape?: (shapeId: string) => void
}) {
  const url = v.shapeId ? getStillUrl(v.shapeId) : null
  const name = v.shapeId && onOpenShape ? (
    <button
      type="button"
      onClick={() => onOpenShape(v.shapeId!)}
      className="text-left text-sm font-semibold text-[var(--text)] underline decoration-[var(--accent)]/40 underline-offset-2 hover:decoration-[var(--accent)]"
    >
      {v.name}
    </button>
  ) : (
    <span className="text-sm font-semibold text-[var(--text)]">{v.name}</span>
  )

  return (
    <li className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-2">
      <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-[#0d1218]">
        {url ? (
          <img
            src={url}
            alt={`${v.name} reference`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center px-1 text-center text-[9px] font-semibold uppercase tracking-wide text-white/35">
            No still yet
          </span>
        )}
        <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] font-black text-white">
          {index + 1}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        {name}
        {v.detail && (
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">{v.detail}</p>
        )}
      </div>
    </li>
  )
}
