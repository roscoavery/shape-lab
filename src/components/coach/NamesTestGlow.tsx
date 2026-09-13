type Props = {
  onClick: () => void
  title?: string
  hint?: string
  meta?: string
  compact?: boolean
}

export function NamesTestGlow({
  onClick,
  title = 'Names test',
  hint = 'Who is this? Which face is this name? Practice any class, camp, or school.',
  meta,
  compact = false,
}: Props) {
  if (compact) {
    return (
      <button type="button" onClick={onClick} className="sl-names-glow sl-left px-3 py-2.5">
        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#6ec8d6]">
          Memorize faces
        </span>
        <span className="mt-0.5 block text-sm font-bold text-[var(--text)]">{title}</span>
        {meta && <span className="mt-0.5 block text-xs text-[var(--muted)]">{meta}</span>}
      </button>
    )
  }

  return (
    <button type="button" onClick={onClick} className="sl-names-glow sl-left px-4 py-4">
      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#6ec8d6]">
        Coach tool · glow
      </span>
      <span className="mt-1 block text-2xl font-black tracking-tight text-[var(--text)]">{title}</span>
      <span className="mt-1.5 block max-w-lg text-sm leading-relaxed text-[var(--muted)]">{hint}</span>
      {meta && (
        <span className="mt-2 inline-flex rounded-full bg-[#6ec8d6] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#061418]">
          {meta}
        </span>
      )}
    </button>
  )
}
