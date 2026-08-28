type Props = {
  on: boolean
  onClick: () => void
  label: string
  compact?: boolean
  fill?: boolean
  className?: string
}

export function FavoriteStar({ on, onClick, label, compact = false, fill = false, className = '' }: Props) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={on ? 'Remove from favorites' : 'Add to favorites'}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className={`shrink-0 rounded ${
        compact ? 'px-1 py-0 text-sm leading-none' : 'px-1.5 py-1 text-base leading-none'
      } ${
        on
          ? 'text-[#f5d76e]'
          : fill
            ? 'text-white/45 hover:text-white'
            : 'text-[var(--muted)] hover:text-[var(--text)]'
      } ${className}`}
    >
      {on ? '★' : '☆'}
    </button>
  )
}
