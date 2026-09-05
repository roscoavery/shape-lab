/**
 * Full-screen still or clip viewer. Tap the dark area or Close to leave.
 */

type Props = {
  src: string
  kind: 'image' | 'video'
  alt?: string
  onClose: () => void
}

export function MediaLightbox({ src, kind, alt = '', onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[240] flex flex-col bg-black/94"
      role="dialog"
      aria-modal="true"
      aria-label={alt || (kind === 'video' ? 'Video' : 'Photo')}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white">
        <p className="min-w-0 truncate text-sm font-semibold">{alt || (kind === 'video' ? 'Clip' : 'Still')}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold"
        >
          Close
        </button>
      </div>
      <button
        type="button"
        className="flex min-h-0 flex-1 items-center justify-center px-3 pb-6"
        onClick={onClose}
        aria-label="Close full screen"
      >
        {kind === 'video' ? (
          <video
            src={src}
            controls
            autoPlay
            playsInline
            className="max-h-full max-w-full"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
        )}
      </button>
    </div>
  )
}
