export type TodayShortcutId =
  | 'library'
  | 'quiz'
  | 'replay'
  | 'scroll'
  | 'feed'
  | 'wins'
  | 'station'
  | 'homework'
  | 'profile'
  | 'clock'
  | 'collages'

type Props = {
  onGo: (id: TodayShortcutId) => void
  showStation?: boolean
}

const TOOLS: {
  id: TodayShortcutId
  eyebrow: string
  title: string
  hint: string
  className: string
}[] = [
  {
    id: 'library',
    eyebrow: 'Learn',
    title: 'Shape library',
    hint: 'Every still and the written standard.',
    className:
      'from-[#5cf0c8] via-[#2dd4a8] to-[#147a62] text-[#06281f] shadow-[0_16px_40px_rgba(45,212,168,0.28)]',
  },
  {
    id: 'quiz',
    eyebrow: 'Learn',
    title: 'Shape test',
    hint: 'Pictures or descriptions. Ask who is taking it first.',
    className:
      'from-[#6ee7f0] via-[#22b8c9] to-[#0d4f5c] text-[#04262c] shadow-[0_16px_40px_rgba(34,184,201,0.24)]',
  },
  {
    id: 'replay',
    eyebrow: 'Videos',
    title: 'Replay with reference',
    hint: 'Delay cam and a coach still on the same screen.',
    className:
      'from-[#f0d56e] via-[#e0b422] to-[#6a4e0d] text-[#241a05] shadow-[0_16px_40px_rgba(224,180,34,0.22)]',
  },
  {
    id: 'scroll',
    eyebrow: 'Learn',
    title: 'Reference scroll',
    hint: 'Swipe stills the way you swipe a story.',
    className:
      'from-[#c4b5fd] via-[#8b5cf6] to-[#4c1d95] text-[#14082a] shadow-[0_16px_40px_rgba(139,92,246,0.22)]',
  },
  {
    id: 'feed',
    eyebrow: 'Gym',
    title: 'Feed',
    hint: 'What the gym posted — collages and hits.',
    className:
      'from-[#fda4af] via-[#fb7185] to-[#9f1239] text-[#2a0b12] shadow-[0_16px_40px_rgba(251,113,133,0.22)]',
  },
  {
    id: 'wins',
    eyebrow: 'Gym',
    title: 'Wins',
    hint: 'Spam the little hits. Big ones can jump to the main feed.',
    className:
      'from-[#fde68a] via-[#f59e0b] to-[#92400e] text-[#2a1703] shadow-[0_16px_40px_rgba(245,158,11,0.22)]',
  },
  {
    id: 'profile',
    eyebrow: 'You',
    title: 'My profile',
    hint: 'Photo, cartwheel, twist, hand, skate stance.',
    className:
      'from-[#e9d5ff] via-[#c084fc] to-[#6b21a8] text-[#2e1065] shadow-[0_16px_40px_rgba(192,132,252,0.22)]',
  },
  {
    id: 'clock',
    eyebrow: 'Floor',
    title: 'Class clock',
    hint: 'Time a hold and log it for everyone here.',
    className:
      'from-[#3ae0c0] via-[#1fb896] to-[#0e5c4c] text-[#06281f] shadow-[0_16px_40px_rgba(45,212,168,0.22)]',
  },
  {
    id: 'collages',
    eyebrow: 'Class',
    title: 'Collages',
    hint: 'Drill boards of gym clips — play them from Today.',
    className:
      'from-[#fbcfe8] via-[#f472b6] to-[#9d174d] text-[#2a0a18] shadow-[0_16px_40px_rgba(244,114,182,0.22)]',
  },
  {
    id: 'homework',
    eyebrow: 'Practice',
    title: 'Homework',
    hint: 'Train now, pick a drill, or add an exercise.',
    className:
      'from-[#86efac] via-[#22c55e] to-[#14532d] text-[#052e16] shadow-[0_16px_40px_rgba(34,197,94,0.22)]',
  },
]

export function TodayShortcuts({ onGo, showStation = true }: Props) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Open now
        </p>
        <h3 className="mt-1 text-xl font-semibold text-[var(--text)]">Jump in</h3>
      </div>
      {showStation && (
        <button
          type="button"
          onClick={() => onGo('station')}
          className="flex w-full flex-col items-start rounded-2xl bg-gradient-to-br from-[#5cf0c8] via-[#3ae0c0] to-[#0e5c4c] px-5 py-6 text-left text-[#06281f] shadow-[0_18px_44px_rgba(45,212,168,0.32)]"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#06281f]/70">
            Class station
          </span>
          <span className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            New athlete · shape test
          </span>
          <span className="mt-2 max-w-lg text-sm font-medium text-[#06281f]/80">
            One question at a time. Name, parent phone, cartwheel leg, then the
            test. Finish later if the line moves.
          </span>
        </button>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => onGo(tool.id)}
            className={`flex min-h-[8.5rem] flex-col items-start justify-end rounded-2xl bg-gradient-to-br px-4 py-4 text-left ${tool.className}`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">
              {tool.eyebrow}
            </span>
            <span className="mt-1 text-xl font-bold tracking-tight">{tool.title}</span>
            <span className="mt-1 text-sm font-medium opacity-80">{tool.hint}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
