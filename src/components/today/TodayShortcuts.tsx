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
    className: 'sl-tile sl-tile-mint shadow-[0_16px_40px_rgba(45,212,168,0.28)]',
  },
  {
    id: 'quiz',
    eyebrow: 'Learn',
    title: 'Shape test',
    hint: 'Pictures or descriptions. Ask who is taking it first.',
    className: 'sl-tile sl-tile-cyan shadow-[0_16px_40px_rgba(34,184,201,0.24)]',
  },
  {
    id: 'replay',
    eyebrow: 'Videos',
    title: 'Replay with reference',
    hint: 'Delay cam and a coach still on the same screen.',
    className: 'sl-tile sl-tile-gold shadow-[0_16px_40px_rgba(224,180,34,0.22)]',
  },
  {
    id: 'scroll',
    eyebrow: 'Videos',
    title: 'Reference scroll',
    hint: 'Swipe stills the way you swipe a story. Also under Videos.',
    className: 'sl-tile sl-tile-violet shadow-[0_16px_40px_rgba(139,92,246,0.22)]',
  },
  {
    id: 'feed',
    eyebrow: 'Gym',
    title: 'Feed',
    hint: 'What the gym posted — collages and hits.',
    className: 'sl-tile sl-tile-rose shadow-[0_16px_40px_rgba(251,113,133,0.22)]',
  },
  {
    id: 'wins',
    eyebrow: 'Gym',
    title: 'Wins',
    hint: 'Spam the little hits. Big ones can jump to the main feed.',
    className: 'sl-tile sl-tile-amber shadow-[0_16px_40px_rgba(245,158,11,0.22)]',
  },
  {
    id: 'profile',
    eyebrow: 'You',
    title: 'My profile',
    hint: 'Photo, cartwheel, twist, hand, skate stance.',
    className: 'sl-tile sl-tile-gold shadow-[0_0_28px_rgba(245,197,66,0.55)]',
  },
  {
    id: 'clock',
    eyebrow: 'Floor',
    title: 'Class clock',
    hint: 'Time a hold and log it for everyone here.',
    className: 'sl-tile sl-tile-mint shadow-[0_16px_40px_rgba(45,212,168,0.22)]',
  },
  {
    id: 'collages',
    eyebrow: 'Class',
    title: 'Collages',
    hint: 'Drill boards of gym clips — play them from Today.',
    className: 'sl-tile sl-tile-pink shadow-[0_16px_40px_rgba(244,114,182,0.22)]',
  },
  {
    id: 'homework',
    eyebrow: 'Practice',
    title: 'Homework',
    hint: 'Train now, pick a drill, or add an exercise.',
    className: 'sl-tile sl-tile-green shadow-[0_16px_40px_rgba(34,197,94,0.22)]',
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
          className="sl-btn-mint rounded-2xl px-5 py-6 shadow-[0_18px_44px_rgba(45,212,168,0.32)]"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#06281f]/70">
            Class station
          </span>
          <span className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            New athlete · shape test
          </span>
          <span className="mt-2 max-w-lg text-sm font-medium text-[#06281f]/80">
            One question at a time. Name, parent phone, cartwheel leg, then the
            test. Finish later on any screen — next rotation picks up the same
            answers.
          </span>
        </button>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => onGo(tool.id)}
            className={tool.className}
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
