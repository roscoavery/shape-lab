type Props = {
  drillName: string
  onContinue: () => void
  onBack: () => void
}

export function WristPrepNotice({ drillName, onContinue, onBack }: Props) {
  return (
    <div className="rounded-xl border border-[var(--warn)]/50 bg-[#2a2312] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--warn)]">
        Wrist preparation first
      </p>
      <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">
        Warm your wrists before {drillName}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        Rainbow and long-bridge work loads the wrists in a stretched position.
        Circle them, rock on all fours, and open the palms on the mat until they
        feel ready. Skip this and the shoulders and wrists pay for it later.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--text)]">
        <li>30–45 seconds of easy wrist circles each way</li>
        <li>Palms down, then palms up, gentle rocks</li>
        <li>Stop if something sharp shows up — that is not the work today</li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06281f]"
        >
          Wrists are ready — continue
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-[var(--panel-border)] px-4 py-2 text-sm"
        >
          Pick something else
        </button>
      </div>
    </div>
  )
}
