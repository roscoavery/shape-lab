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
}[] = [
  {
    id: 'library',
    eyebrow: 'Learn',
    title: 'Shape library',
    hint: 'Every still and the written standard.',
  },
  {
    id: 'quiz',
    eyebrow: 'Learn',
    title: 'Shape test',
    hint: 'Pictures or descriptions. Ask who is taking it first.',
  },
  {
    id: 'replay',
    eyebrow: 'Videos',
    title: 'Replay with reference',
    hint: 'Delay cam and a coach still on the same screen.',
  },
  {
    id: 'scroll',
    eyebrow: 'Videos',
    title: 'Reference scroll',
    hint: 'Swipe stills the way you swipe a story.',
  },
  {
    id: 'feed',
    eyebrow: 'Gym',
    title: 'Feed',
    hint: 'What the gym posted — collages and hits.',
  },
  {
    id: 'wins',
    eyebrow: 'Gym',
    title: 'Wins',
    hint: 'Spam the little hits. Big ones can jump to the feed.',
  },
  {
    id: 'profile',
    eyebrow: 'You',
    title: 'My profile',
    hint: 'Photo, cartwheel, twist, hand, skate.',
  },
  {
    id: 'clock',
    eyebrow: 'Floor',
    title: 'Class clock',
    hint: 'Time a hold and log it for everyone here.',
  },
  {
    id: 'collages',
    eyebrow: 'Class',
    title: 'Collages',
    hint: 'Drill boards of gym clips.',
  },
  {
    id: 'homework',
    eyebrow: 'Practice',
    title: 'Homework',
    hint: 'Train now, pick a drill, or add an exercise.',
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
        <button type="button" onClick={() => onGo('station')} className="sl-card sl-card-lg">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Class station
          </span>
          <span className="mt-1 block text-xl font-semibold tracking-tight sm:text-2xl">
            New athlete · shape test
          </span>
          <span className="mt-1.5 block max-w-lg text-sm text-[var(--muted)]">
            Name, parent phone, cartwheel, then the test. Finish later on any screen.
          </span>
        </button>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <button key={tool.id} type="button" onClick={() => onGo(tool.id)} className="sl-card">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {tool.eyebrow}
            </span>
            <span className="mt-1 block text-lg font-semibold tracking-tight">{tool.title}</span>
            <span className="mt-1 block text-sm text-[var(--muted)]">{tool.hint}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
