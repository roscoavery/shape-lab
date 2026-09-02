import { useState } from 'react'
import type { Athlete } from '../../types'
import { AthleteAvatar } from '../AthleteAvatar'
import { StationSnapshot } from './StationSnapshot'

type TwistDirection = NonNullable<Athlete['twistDirection']>
type DominantHand = NonNullable<Athlete['dominantHand']>
type SkateStance = NonNullable<Athlete['skateStance']>

type Props = {
  athlete: Athlete
  onClose: () => void
  onSave: (athlete: Athlete) => void
}

const CHOICE =
  'h-14 rounded-2xl border px-4 text-left text-base font-semibold transition'

function Choice<T extends string>({
  value,
  current,
  label,
  hint,
  onPick,
}: {
  value: T
  current?: T
  label: string
  hint?: string
  onPick: (value: T) => void
}) {
  const on = current === value
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      className={`${CHOICE} ${
        on
          ? 'border-[var(--accent)] bg-[#102820] text-[var(--accent)]'
          : 'border-white/10 bg-white/5 text-[var(--text)] hover:border-white/25'
      }`}
    >
      <span className="block">{label}</span>
      {hint && <span className="block text-xs font-medium opacity-70">{hint}</span>}
    </button>
  )
}

export function MyProfile({ athlete, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<Athlete>(athlete)
  const [saved, setSaved] = useState(false)

  const patch = (next: Partial<Athlete>) => {
    setDraft((prev) => ({ ...prev, ...next }))
    setSaved(false)
  }

  const save = () => {
    onSave(draft)
    setSaved(true)
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#07110e] text-[var(--text)]">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            My profile
          </p>
          <p className="truncate text-sm text-white/60">{draft.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold"
        >
          Close
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 overflow-y-auto px-4 pb-10">
        <section className="flex flex-col items-center gap-3">
          <AthleteAvatar athlete={draft} size="lg" />
          <h2 className="text-2xl font-bold tracking-tight">{draft.name}</h2>
          <p className="text-center text-sm text-white/60">
            Add a pic or take a snapshot. Same questions as the new-athlete
            line, plus twist, hand, and skate stance — those go into Research.
          </p>
          <StationSnapshot
            photoDataUrl={draft.photoDataUrl}
            allowUpload
            onCapture={(photoDataUrl) => patch({ photoDataUrl })}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">Which way do you cartwheel?</h3>
          <p className="text-sm text-white/55">Which leg goes forward.</p>
          <div className="grid gap-2">
            <Choice
              value="left"
              current={draft.cartwheelLeg}
              label="Left leg forward"
              onPick={(cartwheelLeg) => patch({ cartwheelLeg })}
            />
            <Choice
              value="right"
              current={draft.cartwheelLeg}
              label="Right leg forward"
              onPick={(cartwheelLeg) => patch({ cartwheelLeg })}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">Which one is harder?</h3>
          <p className="text-sm text-white/55">Hollow or Superman.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Choice
              value="hollow"
              current={draft.harderShape}
              label="Hollow"
              onPick={(harderShape) => patch({ harderShape })}
            />
            <Choice
              value="superman"
              current={draft.harderShape}
              label="Superman"
              onPick={(harderShape) => patch({ harderShape })}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">How hard is a fully open shoulder?</h3>
          <p className="text-sm text-white/55">1 is easy. 5 is “I cannot get there yet.”</p>
          <div className="grid grid-cols-5 gap-2">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => patch({ openShoulderHardness: n })}
                className={`h-14 rounded-2xl text-xl font-bold ${
                  draft.openShoulderHardness === n
                    ? 'bg-[var(--accent)] text-[#06281f]'
                    : 'bg-white/8'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">Which way do you twist?</h3>
          <div className="grid gap-2">
            {(
              [
                ['left', 'Left'],
                ['right', 'Right'],
                ['both', 'I can twist both ways'],
                ['not_yet', "I'm not twisting yet"],
              ] as const
            ).map(([id, label]) => (
              <Choice
                key={id}
                value={id}
                current={draft.twistDirection}
                label={label}
                onPick={(twistDirection: TwistDirection) =>
                  patch({
                    twistDirection,
                    twistBetterSide:
                      twistDirection === 'both' ? draft.twistBetterSide : undefined,
                  })
                }
              />
            ))}
          </div>
          {draft.twistDirection === 'both' && (
            <div className="grid gap-2">
              <p className="text-sm text-white/55">Which is your better side?</p>
              <Choice
                value="left"
                current={draft.twistBetterSide}
                label="Left is better"
                onPick={(twistBetterSide) => patch({ twistBetterSide })}
              />
              <Choice
                value="right"
                current={draft.twistBetterSide}
                label="Right is better"
                onPick={(twistBetterSide) => patch({ twistBetterSide })}
              />
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">Dominant hand</h3>
          <div className="grid gap-2">
            {(
              [
                ['right', 'Right'],
                ['left', 'Left'],
                ['ambidextrous', 'Ambidextrous'],
              ] as const
            ).map(([id, label]) => (
              <Choice
                key={id}
                value={id}
                current={draft.dominantHand}
                label={label}
                onPick={(dominantHand: DominantHand) => patch({ dominantHand })}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">Which way would you ride a skateboard?</h3>
          <div className="grid gap-2">
            <Choice
              value="regular"
              current={draft.skateStance}
              label="Regular"
              hint="Left foot forward"
              onPick={(skateStance: SkateStance) => patch({ skateStance })}
            />
            <Choice
              value="goofy"
              current={draft.skateStance}
              label="Goofy"
              hint="Right foot forward"
              onPick={(skateStance: SkateStance) => patch({ skateStance })}
            />
          </div>
        </section>

        <button
          type="button"
          onClick={save}
          className="h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[#06281f]"
        >
          {saved ? 'Saved' : 'Save profile'}
        </button>
        {saved && (
          <p className="text-center text-sm text-[var(--accent)]">
            Saved on this profile and sent to Research.
          </p>
        )}
      </div>
    </div>
  )
}
