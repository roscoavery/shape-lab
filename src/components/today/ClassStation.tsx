import { useMemo, useState, type ReactNode } from 'react'
import type { Athlete } from '../../types'
import { createId } from '../../lib/storage'
import { mergeShapeTests, takeGuestGrades } from '../../lib/quizGrades'
import { profileRole } from '../../lib/profileRole'
import {
  displayPersonName,
  forgetQuizGuest,
  loadQuizGuests,
  loadStationDrafts,
  namesMatch,
  removeStationDraft,
  splitPersonName,
  upsertStationDraft,
  type DominantHand,
  type HarderShape,
  type OpenShoulderHardness,
  type SkateStance,
  type StationDraft,
  type StationStep,
  type TwistDirection,
} from '../../lib/classStation'
import { AthleteName } from '../AthleteAvatar'
import { StationSnapshot } from './StationSnapshot'
import {
  loadGuestParks,
  makeShapeTestPark,
  parkPhaseLabel,
} from '../../lib/shapeTestPark'

type Props = {
  athletes: Athlete[]
  onClose: () => void
  onSaveAthlete: (athlete: Athlete, mode: 'create' | 'update') => void
  onStartShapeTest: (athlete: Athlete) => void
}

const STEPS: StationStep[] = [
  'who',
  'parentPhone',
  'cartwheel',
  'harder',
  'shoulder',
  'twist',
  'twistBetter',
  'hand',
  'skate',
  'photo',
  'done',
]

function emptyDraft(): StationDraft {
  return {
    id: createId('stn'),
    firstName: '',
    lastName: '',
    step: 'who',
    updatedAt: new Date().toISOString(),
  }
}

function stepIndex(step: StationStep): number {
  return Math.max(0, STEPS.indexOf(step))
}

export function ClassStation({ athletes, onClose, onSaveAthlete, onStartShapeTest }: Props) {
  const [draft, setDraft] = useState<StationDraft>(emptyDraft)
  const [drafts, setDrafts] = useState(loadStationDrafts)
  const [guests, setGuests] = useState(loadQuizGuests)
  const [whoMode, setWhoMode] = useState<'pick' | 'type'>('pick')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [filter, setFilter] = useState('')

  const roster = useMemo(
    () => athletes.filter((a) => profileRole(a) === 'athlete' || !a.role),
    [athletes],
  )

  const q = filter.trim().toLowerCase()
  const visibleRoster = roster.filter((a) => !q || a.name.toLowerCase().includes(q))
  const visibleDrafts = drafts.filter((d) => {
    const name = displayPersonName(d.firstName, d.lastName).toLowerCase()
    return !q || name.includes(q)
  })
  const visibleGuests = guests.filter((g) => {
    const name = displayPersonName(g.firstName, g.lastName).toLowerCase()
    const already = roster.some((a) => namesMatch(a, g.firstName, g.lastName))
    return !already && (!q || name.includes(q))
  })

  const persist = (next: StationDraft) => {
    const saved = { ...next, updatedAt: new Date().toISOString() }
    setDraft(saved)
    setDrafts(upsertStationDraft(saved))
    if (stationHasAnswers(saved)) commitAthlete(saved)
    return saved
  }

  const go = (step: StationStep, patch: Partial<StationDraft> = {}) => {
    persist({ ...draft, ...patch, step })
  }

  const pickName = (firstName: string, lastName: string, athleteId?: string) => {
    const existing = athleteId
      ? athletes.find((a) => a.id === athleteId)
      : roster.find((a) => namesMatch(a, firstName, lastName))
    persist({
      ...draft,
      firstName,
      lastName,
      athleteId: existing?.id,
      parentPhone: draft.parentPhone || existing?.parentPhone,
      email: draft.email || existing?.email,
      phone: draft.phone || existing?.phone,
      cartwheelLeg: draft.cartwheelLeg || existing?.cartwheelLeg,
      harderShape: draft.harderShape || existing?.harderShape,
      openShoulderHardness: draft.openShoulderHardness ?? existing?.openShoulderHardness,
      twistDirection: draft.twistDirection || existing?.twistDirection,
      twistBetterSide: draft.twistBetterSide || existing?.twistBetterSide,
      dominantHand: draft.dominantHand || existing?.dominantHand,
      skateStance: draft.skateStance || existing?.skateStance,
      photoDataUrl: draft.photoDataUrl || existing?.photoDataUrl,
      step: 'parentPhone',
    })
  }

  const commitAthlete = (from: StationDraft = draft): Athlete => {
    const name = displayPersonName(from.firstName, from.lastName)
    const existing =
      (from.athleteId ? athletes.find((a) => a.id === from.athleteId) : undefined) ??
      roster.find((a) => namesMatch(a, from.firstName, from.lastName))
    const athlete: Athlete = {
      ...(existing ?? {
        id: createId('ath'),
        name,
        createdAt: new Date().toISOString(),
      }),
      name,
      firstName: from.firstName.trim(),
      lastName: from.lastName.trim(),
      parentPhone: from.parentPhone || existing?.parentPhone,
      email: from.email || existing?.email,
      phone: from.phone || existing?.phone,
      cartwheelLeg: from.cartwheelLeg ?? existing?.cartwheelLeg,
      harderShape: from.harderShape ?? existing?.harderShape,
      openShoulderHardness: from.openShoulderHardness ?? existing?.openShoulderHardness,
      role: existing?.role ?? 'athlete',
      photoDataUrl: from.photoDataUrl || existing?.photoDataUrl,
      twistDirection: from.twistDirection || existing?.twistDirection,
      twistBetterSide: from.twistBetterSide || existing?.twistBetterSide,
      dominantHand: from.dominantHand || existing?.dominantHand,
      skateStance: from.skateStance || existing?.skateStance,
      shapeTests: mergeShapeTests(
        existing?.shapeTests,
        takeGuestGrades(from.firstName, from.lastName),
      ),
    }
    onSaveAthlete(athlete, existing ? 'update' : 'create')
    setGuests(forgetQuizGuest(from.firstName, from.lastName))
    if (from.athleteId !== athlete.id) {
      const withId = { ...from, athleteId: athlete.id, updatedAt: new Date().toISOString() }
      setDraft(withId)
      setDrafts(upsertStationDraft(withId))
    }
    return athlete
  }

  const idx = stepIndex(draft.step)
  const progress = `${idx + 1} / ${STEPS.length}`
  const typedName = Boolean(first.trim() && last.trim())
  const draftNamed = Boolean(draft.firstName.trim() && draft.lastName.trim())
  const canPark = draftNamed || typedName

  const leave = () => {
    if (typedName && (!draftNamed || draft.step === 'who')) {
      persist({
        ...draft,
        firstName: first.trim(),
        lastName: last.trim(),
        step: draft.step === 'who' ? 'parentPhone' : draft.step,
      })
    } else if (draftNamed) {
      persist(draft)
    }
    onClose()
  }

  const parkedRoster = roster.filter((a) => {
    if (!a.shapeTestPark) return false
    const alreadyDraft = drafts.some(
      (d) =>
        (d.athleteId && d.athleteId === a.id) ||
        namesMatch(a, d.firstName, d.lastName),
    )
    return !alreadyDraft
  })
  const guestParks = loadGuestParks().filter((g) => {
    const onRoster = roster.some((a) => namesMatch(a, g.firstName, g.lastName))
    const alreadyDraft = drafts.some((d) => namesMatch(d, g.firstName, g.lastName))
    return !onRoster && !alreadyDraft
  })

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#07110e] text-[var(--text)]">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Class station · {progress}
          </p>
          <p className="text-sm text-white/60">
            {draft.firstName
              ? displayPersonName(draft.firstName, draft.lastName)
              : 'One question at a time'}
          </p>
        </div>
        <div className="flex gap-2">
          {canPark && (
            <button
              type="button"
              onClick={leave}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold"
            >
              Finish later
            </button>
          )}
          <button
            type="button"
            onClick={() => (canPark ? leave() : onClose())}
            className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col justify-center px-4 pb-10">
        {draft.step === 'who' && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Who is this?</h2>
              <p className="mt-2 text-sm text-white/65">
                Pick a name from last cycle, or type first and last so we do
                not mix two kids up.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWhoMode('pick')}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                  whoMode === 'pick' ? 'bg-[var(--accent)] text-[#06281f]' : 'bg-white/10'
                }`}
              >
                Pick a name
              </button>
              <button
                type="button"
                onClick={() => setWhoMode('type')}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                  whoMode === 'type' ? 'bg-[var(--accent)] text-[#06281f]' : 'bg-white/10'
                }`}
              >
                New name
              </button>
            </div>

            {whoMode === 'pick' ? (
              <>
                <input
                  className="h-12 rounded-xl border border-white/10 bg-black/30 px-3"
                  placeholder="Search a name…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                  {parkedRoster
                    .filter((a) => !q || a.name.toLowerCase().includes(q))
                    .map((a) => (
                      <button
                        key={`park-${a.id}`}
                        type="button"
                        onClick={() => onStartShapeTest(a)}
                        className="flex w-full items-center justify-between rounded-2xl border border-[var(--accent)]/40 bg-[#102820] px-4 py-3 text-left"
                      >
                        <span>
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                            Finish later · {parkPhaseLabel(a.shapeTestPark!)}
                          </span>
                          <span className="text-lg font-semibold">
                            <AthleteName athlete={a} size="md" />
                          </span>
                        </span>
                        <span className="text-xs text-white/50">Continue</span>
                      </button>
                    ))}
                  {guestParks
                    .filter((g) => {
                      const name = displayPersonName(g.firstName, g.lastName).toLowerCase()
                      return !q || name.includes(q)
                    })
                    .map((g) => (
                      <button
                        key={`gpark-${g.firstName}-${g.lastName}`}
                        type="button"
                        onClick={() =>
                          onStartShapeTest({
                            id: '',
                            name: displayPersonName(g.firstName, g.lastName),
                            firstName: g.firstName,
                            lastName: g.lastName,
                            createdAt: g.park.updatedAt,
                            shapeTestPark: g.park,
                          })
                        }
                        className="flex w-full items-center justify-between rounded-2xl border border-[var(--accent)]/40 bg-[#102820] px-4 py-3 text-left"
                      >
                        <span>
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                            Finish later · {parkPhaseLabel(g.park)}
                          </span>
                          <span className="text-lg font-semibold">
                            {displayPersonName(g.firstName, g.lastName)}
                          </span>
                        </span>
                        <span className="text-xs text-white/50">Continue</span>
                      </button>
                    ))}
                  {visibleDrafts.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDraft(d)}
                      className="flex w-full items-center justify-between rounded-2xl border border-[var(--accent)]/40 bg-[#102820] px-4 py-3 text-left"
                    >
                      <span>
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                          Finish later
                        </span>
                        <span className="text-lg font-semibold">
                          {displayPersonName(d.firstName, d.lastName)}
                        </span>
                      </span>
                      <span className="text-xs text-white/50">Continue</span>
                    </button>
                  ))}
                  {visibleGuests.map((g) => (
                    <button
                      key={`${g.firstName}-${g.lastName}`}
                      type="button"
                      onClick={() => pickName(g.firstName, g.lastName)}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left"
                    >
                      <span>
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/45">
                          Took the shape test
                        </span>
                        <span className="text-lg font-semibold">
                          {displayPersonName(g.firstName, g.lastName)}
                        </span>
                      </span>
                      <span className="text-xs text-white/50">Use name</span>
                    </button>
                  ))}
                  {visibleRoster.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        const parts = splitPersonName(a.name)
                        pickName(a.firstName || parts.firstName, a.lastName || parts.lastName, a.id)
                      }}
                      className="flex w-full items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-lg font-semibold"
                    >
                      <AthleteName athlete={a} size="md" />
                    </button>
                  ))}
                  {visibleDrafts.length + visibleGuests.length + visibleRoster.length === 0 && (
                    <p className="text-sm text-white/55">No names yet. Type a new one.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  autoFocus
                  className="h-14 rounded-2xl border border-white/10 bg-black/30 px-4 text-lg"
                  placeholder="First name"
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                />
                <input
                  className="h-14 rounded-2xl border border-white/10 bg-black/30 px-4 text-lg"
                  placeholder="Last name"
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                />
                <button
                  type="button"
                  disabled={!first.trim() || !last.trim()}
                  onClick={() => pickName(first.trim(), last.trim())}
                  className="h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[#06281f] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {draft.step === 'parentPhone' && (
          <Question
            title="Mom or dad’s phone"
            hint="So we can tell the right parent whose kid this is."
            onBack={() => go('who')}
          >
            <input
              autoFocus
              inputMode="tel"
              className="h-14 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-lg"
              placeholder="Parent phone"
              value={draft.parentPhone ?? ''}
              onChange={(e) => persist({ ...draft, parentPhone: e.target.value })}
            />
            <button
              type="button"
              disabled={!draft.parentPhone?.trim()}
              onClick={() => go('cartwheel')}
              className="h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[#06281f] disabled:opacity-40"
            >
              Next
            </button>
          </Question>
        )}

        {draft.step === 'cartwheel' && (
          <Question
            title="Which way do you cartwheel?"
            hint="Which leg goes forward."
            onBack={() => go('parentPhone')}
          >
            <div className="grid gap-3">
              {(
                [
                  ['left', 'Left leg forward'],
                  ['right', 'Right leg forward'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => go('harder', { cartwheelLeg: id })}
                  className="h-20 rounded-2xl bg-white/8 text-xl font-semibold hover:bg-[var(--accent)] hover:text-[#06281f]"
                >
                  {label}
                </button>
              ))}
            </div>
          </Question>
        )}

        {draft.step === 'harder' && (
          <Question
            title="Which one is harder?"
            hint="Hollow or Superman — tap the one that feels tougher."
            onBack={() => go('cartwheel')}
          >
            <div className="grid gap-3">
              {(
                [
                  ['hollow', 'Hollow'],
                  ['superman', 'Superman'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => go('shoulder', { harderShape: id as HarderShape })}
                  className="h-20 rounded-2xl bg-white/8 text-xl font-semibold hover:bg-[var(--accent)] hover:text-[#06281f]"
                >
                  {label}
                </button>
              ))}
            </div>
          </Question>
        )}

        {draft.step === 'shoulder' && (
          <Question
            title="How hard is a fully open shoulder?"
            hint="1 is easy. 5 is “I cannot get there yet.”"
            onBack={() => go('harder')}
          >
            <div className="grid grid-cols-5 gap-2">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => go('twist', { openShoulderHardness: n as OpenShoulderHardness })}
                  className="h-20 rounded-2xl bg-white/8 text-2xl font-bold hover:bg-[var(--accent)] hover:text-[#06281f]"
                >
                  {n}
                </button>
              ))}
            </div>
          </Question>
        )}

        {draft.step === 'twist' && (
          <Question
            title="Which way do you twist?"
            hint="Left, right, both ways, or not yet."
            onBack={() => go('shoulder')}
          >
            <div className="grid gap-3">
              {(
                [
                  ['left', 'Left'],
                  ['right', 'Right'],
                  ['both', 'I can twist both ways'],
                  ['not_yet', "I'm not twisting yet"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    id === 'both'
                      ? go('twistBetter', { twistDirection: id })
                      : go('hand', { twistDirection: id as TwistDirection, twistBetterSide: undefined })
                  }
                  className="h-16 rounded-2xl bg-white/8 text-xl font-semibold hover:bg-[var(--accent)] hover:text-[#06281f]"
                >
                  {label}
                </button>
              ))}
            </div>
          </Question>
        )}

        {draft.step === 'twistBetter' && (
          <Question
            title="Which is your better side?"
            hint="You can twist both ways — pick the stronger one."
            onBack={() => go('twist')}
          >
            <div className="grid gap-3">
              {(
                [
                  ['left', 'Left is better'],
                  ['right', 'Right is better'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => go('hand', { twistBetterSide: id })}
                  className="h-20 rounded-2xl bg-white/8 text-xl font-semibold hover:bg-[var(--accent)] hover:text-[#06281f]"
                >
                  {label}
                </button>
              ))}
            </div>
          </Question>
        )}

        {draft.step === 'hand' && (
          <Question
            title="Dominant hand?"
            hint="Writing or throwing hand. Ambidextrous is fine."
            onBack={() => go(draft.twistDirection === 'both' ? 'twistBetter' : 'twist')}
          >
            <div className="grid gap-3">
              {(
                [
                  ['right', 'Right'],
                  ['left', 'Left'],
                  ['ambidextrous', 'Ambidextrous'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => go('skate', { dominantHand: id as DominantHand })}
                  className="h-16 rounded-2xl bg-white/8 text-xl font-semibold hover:bg-[var(--accent)] hover:text-[#06281f]"
                >
                  {label}
                </button>
              ))}
            </div>
          </Question>
        )}

        {draft.step === 'skate' && (
          <Question
            title="Which way would you ride a skateboard?"
            hint="Regular is left foot forward. Goofy is right foot forward."
            onBack={() => go('hand')}
          >
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => go('photo', { skateStance: 'regular' as SkateStance })}
                className="h-20 rounded-2xl bg-white/8 text-left px-4 text-xl font-semibold hover:bg-[var(--accent)] hover:text-[#06281f]"
              >
                Regular
                <span className="mt-1 block text-sm font-medium opacity-70">Left foot forward</span>
              </button>
              <button
                type="button"
                onClick={() => go('photo', { skateStance: 'goofy' as SkateStance })}
                className="h-20 rounded-2xl bg-white/8 text-left px-4 text-xl font-semibold hover:bg-[var(--accent)] hover:text-[#06281f]"
              >
                Goofy
                <span className="mt-1 block text-sm font-medium opacity-70">Right foot forward</span>
              </button>
            </div>
          </Question>
        )}

        {draft.step === 'photo' && (
          <Question
            title="Quick snapshot?"
            hint="Optional. Opens this iPad’s camera so we can tell two kids with the same first name apart."
            onBack={() => go('skate')}
          >
            <StationSnapshot
              photoDataUrl={draft.photoDataUrl}
              onCapture={(photoDataUrl) => persist({ ...draft, photoDataUrl })}
            />
            <button
              type="button"
              onClick={() => go('done')}
              className="h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[#06281f]"
            >
              {draft.photoDataUrl ? 'Use this photo' : 'Skip'}
            </button>
          </Question>
        )}

        {draft.step === 'done' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-bold tracking-tight">
              {displayPersonName(draft.firstName, draft.lastName)} is ready
            </h2>
            <p className="text-sm text-white/65">
              Start the shape test now, or leave this name on Finish later for
              the next cycle.
            </p>
            <button
              type="button"
              onClick={() => {
                const athlete = commitAthlete()
                const parked = {
                  ...athlete,
                  shapeTestPark: makeShapeTestPark('intake'),
                }
                onSaveAthlete(parked, 'update')
                setDrafts(removeStationDraft(draft.id))
                onStartShapeTest(parked)
              }}
              className="h-16 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[#06281f]"
            >
              Start shape test
            </button>
            <button
              type="button"
              onClick={leave}
              className="h-14 rounded-2xl border border-white/15 text-base font-semibold"
            >
              Finish later
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Question({
  title,
  hint,
  onBack,
  children,
}: {
  title: string
  hint: string
  onBack: () => void
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm text-white/65">{hint}</p>
      </div>
      {children}
      <button type="button" onClick={onBack} className="self-start text-sm text-white/50 underline">
        Back
      </button>
    </div>
  )
}

function stationHasAnswers(draft: StationDraft): boolean {
  return Boolean(draft.firstName.trim() && draft.lastName.trim())
}

