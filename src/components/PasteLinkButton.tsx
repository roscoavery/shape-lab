type Props = {
  onOpen: () => void
  variant?: 'default' | 'ig'
}

/**
 * Opens whatever video link is on the clipboard straight in the share
 * player. The flow for coaches: copy a reel link in Instagram, open
 * ShapeLab, tap this. (iOS cannot route a shared link into the home
 * screen web app, so the clipboard is the bridge.)
 */
export function PasteLinkButton({ onOpen, variant = 'default' }: Props) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open copied link"
      title="Open the video link you copied"
      className={
        variant === 'ig'
          ? 'relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--text)]'
          : 'relative flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-[var(--text)]'
      }
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className={variant === 'ig' ? 'h-6 w-6' : 'h-3.5 w-3.5'}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
        />
      </svg>
      {variant === 'default' && <span>Open link</span>}
    </button>
  )
}
