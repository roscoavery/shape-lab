type Props = {
  count: number
  onLog: () => void
  onSkip: () => void
  onStay: () => void
}

export function EndClassPrompt({ count, onLog, onSkip, onStay }: Props) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1218] p-4 text-[var(--text)]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          End class
        </p>
        <h3 className="mt-1 text-lg font-semibold">Log class nights?</h3>
        <p className="mt-2 text-sm text-white/70">
          {count === 0
            ? 'Nobody is marked here tonight. Ending without logging leaves Class nights unchanged. You can still assign homework.'
            : `Log class for the ${count} athlete${count === 1 ? '' : 's'} marked here? That writes Class nights on their profiles. Homework is separate.`}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={count === 0}
            onClick={onLog}
            className="h-12 rounded-xl bg-[var(--accent)] text-sm font-bold text-[#06281f] disabled:opacity-40"
          >
            Log class for everyone here
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="h-12 rounded-xl border border-white/15 text-sm font-semibold"
          >
            End without logging
          </button>
          <button
            type="button"
            onClick={onStay}
            className="h-10 text-sm text-white/55 underline"
          >
            Stay in class
          </button>
        </div>
      </div>
    </div>
  )
}
