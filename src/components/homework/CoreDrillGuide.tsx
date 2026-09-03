import { useState } from 'react'
import type { HomeworkItem, ReferencePhoto, ShapeDef } from '../../types'
import { getShape } from '../../config/shapes'
import { ReferenceStill } from '../ReferenceStill'

type Step = {
  shapeId: string
  title: string
  cue: string
}

function stepsFor(item: HomeworkItem): Step[] {
  const hollow =
    item.autoKey === 'hollow' ||
    item.shapeId === 'hollow_arms_down' ||
    item.shapeId === 'hollow_arms_up' ||
    item.shapeId === 'hollow'
  if (hollow) {
    const holdId = item.shapeId === 'hollow_arms_up' ? 'hollow_arms_up' : 'hollow_arms_down'
    return [
      { shapeId: 'seated_pike', title: 'Pike', cue: 'Zombie arms. Start sitting.' },
      {
        shapeId: holdId,
        title: holdId === 'hollow_arms_up' ? 'Hollow · arms up' : 'Hollow',
        cue: 'Inch back. Low back down. Then feet off.',
      },
    ]
  }
  const shape = getShape(item.shapeId)
  return [
    {
      shapeId: item.shapeId,
      title: shape?.name ?? item.shapeId,
      cue: shortCue(item, shape),
    },
  ]
}

function shortCue(item: HomeworkItem, shape?: ShapeDef): string {
  const tip = shape?.tips?.[0]
  if (tip && tip.length < 80) return tip
  const note = item.notes?.split(/(?<=\.)\s/)[0]
  if (note) return note
  return shape?.description ?? ''
}

function fullCopy(item: HomeworkItem, shape?: ShapeDef): string[] {
  const lines: string[] = []
  if (item.notes?.trim()) lines.push(item.notes.trim())
  if (shape?.bodyPosition?.trim()) lines.push(shape.bodyPosition.trim())
  for (const tip of shape?.tips ?? []) {
    if (tip.trim() && !lines.includes(tip.trim())) lines.push(tip.trim())
  }
  return lines
}

type Props = {
  item: HomeworkItem
  photos: ReferencePhoto[]
}

export function CoreDrillGuide({ item, photos }: Props) {
  const [open, setOpen] = useState(false)
  const shape = getShape(item.shapeId)
  const steps = stepsFor(item)
  const more = fullCopy(item, shape)
  const multi = steps.length > 1

  return (
    <div className="mb-2">
      <div className={`grid gap-2 ${multi ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {steps.map((step, i) => (
          <figure key={`${step.shapeId}-${i}`} className="overflow-hidden rounded-xl bg-[#0d1218]">
            <div className="relative aspect-[4/3] bg-black">
              {multi ? (
                <span className="absolute left-2 top-2 z-10 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                  {i + 1}
                </span>
              ) : null}
              <ReferenceStill
                shapeId={step.shapeId}
                photos={photos}
                alt={step.title}
                className="h-full w-full object-contain"
                emptyLabel={step.title}
              />
            </div>
            <figcaption className="px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                {step.title}
              </p>
              <p className="mt-0.5 text-sm font-medium leading-snug text-white">{step.cue}</p>
            </figcaption>
          </figure>
        ))}
      </div>
      {more.length > 0 ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs font-semibold text-[var(--accent)]"
          >
            {open ? 'Show less' : 'Show more'}
          </button>
          {open ? (
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-white/75">
              {more.map((line) => (
                <p key={line.slice(0, 48)}>{line}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
