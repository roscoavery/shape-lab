import type { Athlete } from '../types'

type Props = {
  athlete: Athlete
  onKeep: () => void
  onDelete: () => void
}

export function DeleteProfileAsk({ athlete, onKeep, onDelete }: Props) {
  return (
    <div className="fixed inset-0 z-[420] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--bad)]">
          Delete profile
        </p>
        <h3 className="mt-1 text-lg font-semibold">Are you sure you want to delete {athlete.name}?</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          They come off every phone and iPad on this gym link. Ryan cannot be
          deleted. This does not undo.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onKeep}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06281f]"
          >
            Keep profile
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-[var(--bad)] px-4 py-2 text-sm font-semibold text-[var(--bad)]"
          >
            Yes, delete
          </button>
        </div>
      </div>
    </div>
  )
}
