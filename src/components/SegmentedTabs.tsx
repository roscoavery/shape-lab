type Tab<T extends string> = {
  id: T
  label: string
}

type Props<T extends string> = {
  value: T
  onChange: (id: T) => void
  tabs: Tab<T>[]
  /** Optional badge on a tab id, e.g. unsaved count. */
  badges?: Partial<Record<T, string | number | true>>
}

export function SegmentedTabs<T extends string>({
  value,
  onChange,
  tabs,
  badges,
}: Props<T>) {
  return (
    <div
      role="tablist"
      className="flex gap-0.5 overflow-x-auto rounded-xl bg-[#0d1218] p-1"
    >
      {tabs.map((tab) => {
        const on = value === tab.id
        const badge = badges?.[tab.id]
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tab.id)}
            className={`relative shrink-0 rounded-lg px-3 py-1.5 text-sm transition ${
              on
                ? 'bg-[var(--panel)] font-semibold text-[var(--text)] shadow-[0_1px_0_rgba(255,255,255,0.06)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {tab.label}
            {badge === true ? (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            ) : badge ? (
              <span className="ml-1.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-[#06281f]">
                {badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
