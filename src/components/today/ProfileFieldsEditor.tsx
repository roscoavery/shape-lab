import type { Athlete } from '../../types'
import { StationSnapshot } from './StationSnapshot'
import { CoachPicker } from '../CoachPicker'
import { profileRole } from '../../lib/profileRole'

type TwistDirection = NonNullable<Athlete['twistDirection']>
type DominantHand = NonNullable<Athlete['dominantHand']>
type SkateStance = NonNullable<Athlete['skateStance']>

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

type Props = {
  athlete: Athlete
  onChange: (next: Athlete) => void
  showPhoto?: boolean
  athletes?: Athlete[]
}

/** Owner-only edits for photo and intake answers. Same fields as the shape-test line. */
export function ProfileFieldsEditor({
  athlete,
  onChange,
  showPhoto = true,
  athletes = [],
}: Props) {
  const patch = (next: Partial<Athlete>) => onChange({ ...athlete, ...next })

  return (
    <div className="flex flex-col gap-6">
      {profileRole(athlete) === 'athlete' && athletes.length > 0 && (
        <CoachPicker
          athletes={athletes}
          selected={athlete.worksWithCoachIds ?? []}
          excludeId={athlete.id}
          onChange={(worksWithCoachIds) => patch({ worksWithCoachIds })}
        />
      )}
      {showPhoto && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Profile photo</h3>
          <p className="text-xs text-[var(--muted)]">
            Take a snapshot or upload. This is the pic everyone sees on your page.
          </p>
          <StationSnapshot
            photoDataUrl={athlete.photoDataUrl}
            allowUpload
            onCapture={(photoDataUrl) => patch({ photoDataUrl })}
          />
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Which way do you cartwheel?</h3>
        <div className="grid gap-2">
          <Choice
            value="left"
            current={athlete.cartwheelLeg}
            label="Left leg forward"
            onPick={(cartwheelLeg) => patch({ cartwheelLeg })}
          />
          <Choice
            value="right"
            current={athlete.cartwheelLeg}
            label="Right leg forward"
            onPick={(cartwheelLeg) => patch({ cartwheelLeg })}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Which one is harder?</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice
            value="hollow"
            current={athlete.harderShape}
            label="Hollow"
            onPick={(harderShape) => patch({ harderShape })}
          />
          <Choice
            value="superman"
            current={athlete.harderShape}
            label="Superman"
            onPick={(harderShape) => patch({ harderShape })}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">How hard is a fully open shoulder?</h3>
        <p className="text-xs text-[var(--muted)]">1 is easy. 5 is “I cannot get there yet.”</p>
        <div className="grid grid-cols-5 gap-2">
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => patch({ openShoulderHardness: n })}
              className={`h-12 rounded-2xl text-lg font-bold ${
                athlete.openShoulderHardness === n
                  ? 'bg-[var(--accent)] text-[#06281f]'
                  : 'bg-white/8'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Which way do you twist?</h3>
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
              current={athlete.twistDirection}
              label={label}
              onPick={(twistDirection: TwistDirection) =>
                patch({
                  twistDirection,
                  twistBetterSide:
                    twistDirection === 'both' ? athlete.twistBetterSide : undefined,
                })
              }
            />
          ))}
        </div>
        {athlete.twistDirection === 'both' && (
          <div className="grid gap-2">
            <p className="text-xs text-[var(--muted)]">Which is your better side?</p>
            <Choice
              value="left"
              current={athlete.twistBetterSide}
              label="Left is better"
              onPick={(twistBetterSide) => patch({ twistBetterSide })}
            />
            <Choice
              value="right"
              current={athlete.twistBetterSide}
              label="Right is better"
              onPick={(twistBetterSide) => patch({ twistBetterSide })}
            />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Dominant hand</h3>
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
              current={athlete.dominantHand}
              label={label}
              onPick={(dominantHand: DominantHand) => patch({ dominantHand })}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Which way would you ride a skateboard?</h3>
        <div className="grid gap-2">
          <Choice
            value="regular"
            current={athlete.skateStance}
            label="Regular"
            hint="Left foot forward"
            onPick={(skateStance: SkateStance) => patch({ skateStance })}
          />
          <Choice
            value="goofy"
            current={athlete.skateStance}
            label="Goofy"
            hint="Right foot forward"
            onPick={(skateStance: SkateStance) => patch({ skateStance })}
          />
        </div>
      </section>
    </div>
  )
}
