import type { HomeworkItem } from '../../types'
import { homeworkTitle, homeworkTrackMode, isSequenceHomework } from '../../lib/homeworkLabel'
import { getCatalogItem } from '../../config/homeworkCatalog'

type Group = {
  title: string
  hint: string
  items: HomeworkItem[]
}

type Props = {
  assigned: HomeworkItem[]
  core: HomeworkItem[]
  strength: HomeworkItem[]
  other: HomeworkItem[]
  onPick: (item: HomeworkItem) => void
  onAddHomework?: () => void
}

function Card({
  item,
  onPick,
}: {
  item: HomeworkItem
  onPick: (item: HomeworkItem) => void
}) {
  const mode = homeworkTrackMode(item)
  const cat = getCatalogItem(item.catalogId ?? item.shapeId)
  const kind = isSequenceHomework(item)
    ? 'Class flow'
    : mode === 'reps'
      ? 'Reps'
      : mode === 'hold_or_reps'
        ? 'Hold or reps'
        : 'Hold'
  return (
    <button
      type="button"
      onClick={() => onPick(item)}
      className="flex w-full flex-col items-start rounded-xl border border-[var(--panel-border)] bg-[#121820] px-3 py-3 text-left hover:border-[var(--accent)]/50"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        {kind}
      </span>
      <span className="mt-0.5 text-base font-semibold text-[var(--text)]">
        {homeworkTitle(item)}
      </span>
      {item.grip ? (
        <span className="mt-0.5 text-xs text-[var(--muted)]">Grip: {item.grip}</span>
      ) : null}
      {cat ? (
        <span className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{cat.notes}</span>
      ) : item.notes ? (
        <span className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{item.notes}</span>
      ) : null}
    </button>
  )
}

export function TrainPicker({ assigned, core, strength, other, onPick, onAddHomework }: Props) {
  const groups: Group[] = [
    {
      title: 'Coach assigned',
      hint: 'Your coach put these on the list. You can still pick something else.',
      items: assigned,
    },
    {
      title: 'Core drills',
      hint: 'The four holds that stay on every profile.',
      items: core,
    },
    {
      title: 'Rep work',
      hint: 'Push-ups, pull-ups, v-ups, bridges, back extensions — log reps and quality reps.',
      items: strength,
    },
    {
      title: 'Also on your list',
      hint: 'Shapes and skills you added.',
      items: other,
    },
  ].filter((g) => g.items.length > 0)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Homework
        </p>
        <h3 className="text-xl font-semibold text-[var(--text)]">What do you want to train?</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Assigned work is here if you have it. Core drills are always an option.
          Nothing auto-starts a class flow.
        </p>
      </div>
      {groups.map((group) => (
        <section key={group.title} className="flex flex-col gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              {group.title}
            </p>
            <p className="text-xs text-[var(--muted)]">{group.hint}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((item) => (
              <Card key={item.id} item={item} onPick={onPick} />
            ))}
          </div>
          {group.title === 'Core drills' && onAddHomework ? (
            <button
              type="button"
              onClick={onAddHomework}
              className="mt-1 text-left text-sm font-semibold text-[var(--accent)] underline"
            >
              Want something else? Add homework — other exercises
            </button>
          ) : null}
        </section>
      ))}
    </div>
  )
}
