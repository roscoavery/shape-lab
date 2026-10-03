/**
 * Compact glowing tour offer button — "show me how to use this."
 * Drops into any surface; opens that surface's spotlight tour.
 */
export function TourOfferButton({
  onTakeTour,
  label = '✨ Take the tour',
}: {
  onTakeTour: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onTakeTour}
      className="rounded-xl border border-[var(--accent)]/60 bg-[var(--accent)]/10 px-4 py-2 text-sm font-black text-[var(--accent)]"
      style={{
        animation: 'sl-skill-pulse 2.4s ease-in-out infinite',
        boxShadow: '0 0 18px rgba(52,211,153,0.35), 0 0 44px rgba(52,211,153,0.15)',
      }}
    >
      {label}
    </button>
  )
}
