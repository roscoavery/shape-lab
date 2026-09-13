import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { rememberLocalPhoto } from '../../lib/rosterSync'
import {
  buildNamesDeck,
  findNamesGroup,
  hasAthleteFace,
  listNamesGroups,
  makeNamesQuestion,
  namesDeckLabel,
  namesReadyCount,
  requeueMiss,
  resolveNamesRoster,
  type NamesDeckItem,
  type NamesGroup,
  type NamesQuestion,
  type NamesQuizMode,
} from '../../lib/namesQuiz'
import { hardestNames, recordNamesAnswer } from '../../lib/namesMisses'
import { AthleteAvatar } from '../AthleteAvatar'
import { FaceSnapshotField } from './FaceSnapshotField'
import { NamesTestGlow } from './NamesTestGlow'

type Props = {
  athletes: Athlete[]
  signedIn: Athlete | null
  preferredGroupId?: string | null
  onClose: () => void
  onAthletesChange?: (next: Athlete[]) => void
  variant?: 'overlay' | 'page'
}

type Screen = 'pick' | 'quiz' | 'clean'

const MODES: { id: NamesQuizMode; label: string; hint: string }[] = [
  { id: 'mix', label: 'Both ways', hint: 'Every athlete as who-is-this and which-face.' },
  { id: 'who', label: 'Who is this', hint: 'Every face. Pick the name.' },
  { id: 'face', label: 'Which face', hint: 'Every name. Pick the picture.' },
]

type LogRow = {
  item: NamesDeckItem
  correct: boolean
  pickedId: string
  question: NamesQuestion
}

export function NamesQuiz({
  athletes,
  signedIn,
  preferredGroupId = null,
  onClose,
  onAthletesChange,
  variant = 'overlay',
}: Props) {
  const groups = useMemo(
    () => listNamesGroups({ athletes, coach: signedIn }),
    [athletes, signedIn],
  )
  const [groupId, setGroupId] = useState(
    () => preferredGroupId || 'desk',
  )
  const [mode, setMode] = useState<NamesQuizMode>('mix')
  const [screen, setScreen] = useState<Screen>('pick')
  const [queue, setQueue] = useState<NamesDeckItem[]>([])
  const [current, setCurrent] = useState<NamesQuestion | null>(null)
  const [serial, setSerial] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [log, setLog] = useState<LogRow[]>([])
  const [sessionMisses, setSessionMisses] = useState<string[]>([])
  const [faceFor, setFaceFor] = useState<string | null>(null)
  const [statTick, setStatTick] = useState(0)

  useEffect(() => {
    if (preferredGroupId && groups.some((g) => g.id === preferredGroupId)) {
      setGroupId(preferredGroupId)
    }
  }, [preferredGroupId, groups])

  const group = findNamesGroup(groups, groupId) ?? groups[0] ?? null
  const roster = useMemo(() => resolveNamesRoster(group, athletes), [group, athletes])
  const ready = namesReadyCount(roster)
  const missing = roster.filter((a) => !hasAthleteFace(a))
  const hard = useMemo(() => {
    void statTick
    return hardestNames(
      signedIn?.id,
      roster.filter(hasAthleteFace).map((a) => a.id),
    ).slice(0, 8)
  }, [signedIn?.id, roster, statTick])

  const showNext = (nextQueue: NamesDeckItem[], nextSerial: number) => {
    const item = nextQueue[0]
    if (!item) {
      setQueue([])
      setCurrent(null)
      setScreen('clean')
      return
    }
    const question = makeNamesQuestion(item, roster, nextSerial)
    if (!question) {
      showNext(nextQueue.slice(1), nextSerial + 1)
      return
    }
    setQueue(nextQueue)
    setCurrent(question)
    setSerial(nextSerial)
    setPicked(null)
    setScreen('quiz')
  }

  const start = () => {
    if (ready.faces < 2) return
    const deck = buildNamesDeck(roster, mode, signedIn?.id)
    setLog([])
    setSessionMisses([])
    showNext(deck, 1)
  }

  const onAnswer = (choiceId: string) => {
    if (!current || !queue[0] || picked) return
    const item = queue[0]
    const correct = choiceId === current.answerId
    if (signedIn) {
      recordNamesAnswer({ coachId: signedIn.id, athleteId: item.athleteId, correct })
      setStatTick((n) => n + 1)
    }
    setPicked(choiceId)
    setLog((prev) => [...prev, { item, correct, pickedId: choiceId, question: current }])
    if (!correct) {
      setSessionMisses((prev) =>
        prev.includes(item.athleteId) ? prev : [...prev, item.athleteId],
      )
    }
  }

  const onAdvance = () => {
    if (!current || !queue[0] || !picked) return
    const item = queue[0]
    const rest = queue.slice(1)
    const nextQueue = picked === current.answerId ? rest : requeueMiss(rest, item)
    showNext(nextQueue, serial + 1)
  }

  const saveFace = (athlete: Athlete, photoDataUrl: string) => {
    rememberLocalPhoto(athlete.id, photoDataUrl)
    onAthletesChange?.(
      athletes.map((a) => (a.id === athlete.id ? { ...a, photoDataUrl } : a)),
    )
    setFaceFor(null)
  }

  const left = queue.length
  const asked = log.length
  const missCount = log.filter((row) => !row.correct).length

  const body = (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 pb-8 pt-2">
      {screen === 'pick' && (
        <PickScreen
          groups={groups}
          group={group}
          groupId={groupId}
          onGroup={setGroupId}
          mode={mode}
          onMode={setMode}
          roster={roster}
          ready={ready}
          missing={missing}
          hard={hard}
          faceFor={faceFor}
          onFaceFor={setFaceFor}
          onSaveFace={saveFace}
          onStart={start}
        />
      )}
      {screen === 'quiz' && current && (
        <QuizScreen
          question={current}
          picked={picked}
          left={left}
          asked={asked}
          missCount={missCount}
          sessionMissNames={sessionMisses
            .map((id) => athletes.find((a) => a.id === id)?.name)
            .filter((name): name is string => Boolean(name))}
          onPick={onAnswer}
          onNext={onAdvance}
        />
      )}
      {screen === 'clean' && (
        <CleanScreen
          log={log}
          roster={roster}
          onRetry={start}
          onExit={() => setScreen('pick')}
        />
      )}
    </div>
  )

  if (variant === 'page') {
    return <section className="space-y-3">{body}</section>
  }

  return (
    <div className="fixed inset-0 z-[85] flex flex-col bg-[#071018] text-[var(--text)]">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#6ec8d6]">
            Names test
          </p>
          <p className="text-sm text-white/60">
            {group ? `${group.eyebrow} · ${group.label}` : 'Pick a group'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold"
        >
          Close
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
    </div>
  )
}

function PickScreen({
  groups,
  group,
  groupId,
  onGroup,
  mode,
  onMode,
  roster,
  ready,
  missing,
  hard,
  faceFor,
  onFaceFor,
  onSaveFace,
  onStart,
}: {
  groups: NamesGroup[]
  group: NamesGroup | null
  groupId: string
  onGroup: (id: string) => void
  mode: NamesQuizMode
  onMode: (mode: NamesQuizMode) => void
  roster: Athlete[]
  ready: { faces: number; missing: number; total: number }
  missing: Athlete[]
  hard: { athleteId: string; stat: { misses: number; hits: number } }[]
  faceFor: string | null
  onFaceFor: (id: string | null) => void
  onSaveFace: (athlete: Athlete, photo: string) => void
  onStart: () => void
}) {
  return (
    <>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6ec8d6]">
          Memorize faces
        </p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">Names test</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/65">
          Every athlete on the list. The test does not stop until you get
          them all right. Names you miss come back, and the ones you miss
          most often go first next time.
        </p>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Which group
        </p>
        <div className="mt-2 grid gap-1.5">
          {groups.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => onGroup(row.id)}
              className={`rounded-xl px-3 py-2.5 text-left ${
                groupId === row.id
                  ? 'border border-[#6ec8d6] bg-[#102028]'
                  : 'border border-white/10 bg-black/25'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6ec8d6]">
                {row.eyebrow}
              </span>
              <span className="mt-0.5 block text-sm font-bold">{row.label}</span>
              <span className="text-xs text-white/55">
                {row.athleteIds.length}{' '}
                {row.athleteIds.length === 1 ? 'athlete' : 'athletes'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          How to ask
        </p>
        <div className="mt-2 grid gap-1.5">
          {MODES.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => onMode(row.id)}
              className={`rounded-xl px-3 py-2.5 text-left ${
                mode === row.id
                  ? 'border border-[#6ec8d6] bg-[#102028]'
                  : 'border border-white/10 bg-black/25'
              }`}
            >
              <span className="block text-sm font-bold">{row.label}</span>
              <span className="text-xs text-white/55">{row.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {group && (
        <p className="text-sm text-white/70">
          {namesDeckLabel(mode, ready.faces)}
          {ready.missing > 0 ? ` · ${ready.missing} still need a snapshot` : ''}
          {ready.total ? ` · ${ready.total} on ${group.label}` : ''}.
        </p>
      )}

      {hard.length > 0 && (
        <div className="rounded-2xl border border-[#6ec8d6]/40 bg-[#102028] p-3">
          <p className="text-sm font-semibold text-[#6ec8d6]">You miss these most</p>
          <p className="mt-1 text-xs text-white/60">
            They go first. The test keeps them in the deck until you get them right.
          </p>
          <ul className="mt-2 grid gap-1.5">
            {hard.map((row) => {
              const athlete = roster.find((a) => a.id === row.athleteId)
              if (!athlete) return null
              return (
                <li key={row.athleteId} className="flex items-center gap-3">
                  <AthleteAvatar athlete={athlete} size="sm" />
                  <span className="min-w-0 flex-1 text-sm font-semibold">{athlete.name}</span>
                  <span className="text-xs text-white/50">
                    {row.stat.misses} miss{row.stat.misses === 1 ? '' : 'es'}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {missing.length > 0 && (
        <div className="rounded-2xl border border-[#d4a84a]/40 bg-[#1a160c] p-3">
          <p className="text-sm font-semibold text-[#d4a84a]">Need a snapshot</p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            The test can only ask about kids with a face. Snapshot them here
            so you can pair the picture with the name.
          </p>
          <ul className="mt-2 grid gap-2">
            {missing.map((a) => (
              <li key={a.id}>
                {faceFor === a.id ? (
                  <FaceSnapshotField
                    athleteId={a.id}
                    name={a.name}
                    onCapture={(photo) => onSaveFace(a, photo)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onFaceFor(a.id)}
                    className="flex w-full items-center gap-3 rounded-xl bg-black/30 px-3 py-2 text-left"
                  >
                    <AthleteAvatar athlete={a} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{a.name}</span>
                      <span className="text-xs text-[#6ec8d6]">Take a snapshot</span>
                    </span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ready.faces >= 2 ? (
        <NamesTestGlow
          onClick={onStart}
          title="Start names test"
          hint={`${namesDeckLabel(mode, ready.faces)} on ${group?.label ?? 'this group'}. Keeps going until every card is right.`}
          meta={hard.length ? `${hard.length} hard names first` : 'Until they are all right'}
        />
      ) : (
        <p className="rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white/65">
          Snapshot at least two athletes on this list, then the test lights up.
        </p>
      )}
    </>
  )
}

function QuizScreen({
  question: q,
  picked,
  left,
  asked,
  missCount,
  sessionMissNames,
  onPick,
  onNext,
}: {
  question: NamesQuestion
  picked: string | null
  left: number
  asked: number
  missCount: number
  sessionMissNames: string[]
  onPick: (id: string) => void
  onNext: () => void
}) {
  const locked = picked !== null
  const correct = picked === q.answerId

  return (
    <section className="rounded-2xl border border-[#6ec8d6]/35 bg-[#0d161c] p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6ec8d6]">
          {q.kind === 'who' ? 'Who is this' : 'Which face'}
        </p>
        <p className="text-xs text-white/50">
          {left} left
          {asked ? ` · ${asked} asked` : ''}
          {missCount ? ` · ${missCount} miss${missCount === 1 ? '' : 'es'}` : ''}
        </p>
      </div>
      <p className="text-2xl font-black tracking-tight">{q.prompt}</p>
      {q.kind === 'who' && q.photoUrl && (
        <img
          src={q.photoUrl}
          alt=""
          className="mx-auto mt-4 h-44 w-44 rounded-full object-cover ring-2 ring-[#6ec8d6]"
        />
      )}
      {q.kind === 'face' && q.namePrompt && (
        <p className="mt-2 text-lg font-semibold text-[#6ec8d6]">{q.namePrompt}</p>
      )}

      <div className={`mt-4 grid gap-2 ${q.kind === 'face' ? 'grid-cols-2' : ''}`}>
        {q.choices.map((c) => {
          let ring = 'border-white/10 bg-black/30'
          if (locked && c.id === q.answerId) ring = 'border-[#6ec8d6] bg-[#102820]'
          else if (locked && c.id === picked) ring = 'border-[#e06b6b] bg-[#2a1518]'
          else if (locked) ring = 'border-white/10 bg-black/20 opacity-50'
          return (
            <button
              key={c.id}
              type="button"
              disabled={locked}
              onClick={() => onPick(c.id)}
              className={`rounded-2xl border px-3 py-3 text-left ${ring}`}
            >
              {q.kind === 'face' ? (
                <span className="flex flex-col items-center gap-2">
                  {c.photoDataUrl ? (
                    <img src={c.photoDataUrl} alt="" className="h-24 w-24 rounded-full object-cover" />
                  ) : (
                    <AthleteAvatar athlete={{ name: c.label, photoDataUrl: c.photoDataUrl }} size="xl" />
                  )}
                </span>
              ) : (
                <span className="block text-base font-bold">{c.label}</span>
              )}
            </button>
          )
        })}
      </div>

      {locked && (
        <div className="mt-4 space-y-3">
          <p className={`text-sm font-bold ${correct ? 'text-[#6ec8d6]' : 'text-[#e06b6b]'}`}>
            {correct
              ? left <= 1
                ? 'Got it. That was the last one.'
                : 'Got it.'
              : 'Not that one. This name comes back until you get it.'}
          </p>
          {!correct && (
            <p className="rounded-xl bg-[#102028] px-3 py-2 text-sm text-white/75">{q.explain}</p>
          )}
          {sessionMissNames.length > 0 && (
            <p className="text-xs text-white/50">
              Working on: {sessionMissNames.slice(0, 6).join(', ')}
              {sessionMissNames.length > 6 ? ` +${sessionMissNames.length - 6}` : ''}
            </p>
          )}
          <button
            type="button"
            onClick={onNext}
            className="w-full rounded-xl bg-[#6ec8d6] px-4 py-3 text-sm font-black text-[#061418]"
          >
            {left <= 1 && correct ? 'See the clean list' : 'Next'}
          </button>
        </div>
      )}
    </section>
  )
}

function CleanScreen({
  log,
  roster,
  onRetry,
  onExit,
}: {
  log: LogRow[]
  roster: Athlete[]
  onRetry: () => void
  onExit: () => void
}) {
  const missIds = [...new Set(log.filter((row) => !row.correct).map((row) => row.item.athleteId))]
  const firstTry = log.filter((row) => row.correct).length === log.length

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[#6ec8d6] bg-[#102028] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6ec8d6]">
          Clean
        </p>
        <p className="mt-1 text-3xl font-black tracking-tight">Every name is right.</p>
        <p className="mt-2 text-sm text-white/70">
          {firstTry
            ? `First pass, all ${log.length} cards. That roster is in your head.`
            : `You finished ${log.length} cards. ${missIds.length} name${
                missIds.length === 1 ? '' : 's'
              } needed a second look — those stay at the front next time.`}
        </p>
      </div>
      {missIds.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Keep these warm</p>
          {missIds.map((id) => {
            const athlete = roster.find((a) => a.id === id)
            const times = log.filter((row) => row.item.athleteId === id && !row.correct).length
            if (!athlete) return null
            return (
              <div key={id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
                <AthleteAvatar athlete={athlete} size="md" />
                <div>
                  <p className="text-sm font-bold">{athlete.name}</p>
                  <p className="text-xs text-white/55">
                    Missed {times} time{times === 1 ? '' : 's'} tonight
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-[#6ec8d6] px-4 py-3 text-sm font-black text-[#061418]"
        >
          Run it again
        </button>
        <button
          type="button"
          onClick={onExit}
          className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold"
        >
          Pick another group
        </button>
      </div>
    </section>
  )
}
