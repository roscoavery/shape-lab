import { useEffect, useMemo, useState } from 'react'
import { LabGameShell } from './LabGameShell'
import { BoutClock, useCountdown } from './ManualSim'
import { TEAM_POWER_UP_CIRCUITS, type PowerUpTask } from '../../../data/arcade/teamPowerUpPack'
import { CUE_QUEST_ITEMS, type CueQuestItem } from '../../../data/arcade/cueQuestPack'
import { COACHES_EYE_SCENARIOS, type CoachesEyeScenario } from '../../../data/arcade/coachesEyePack'

const ENERGY_PER_TASK = 25

export function TeamPowerUpGame({ onExit }: { onExit: () => void }) {
  return (
    <LabGameShell
      gameId="team-power-up"
      title="Team Power Up"
      tagline="One robot, one team — every task done well charges it up."
      rules={
        <>
          <p>
            Pick a circuit of 4–6 tasks that alternate thinking and moving, then take turns — one
            active player at a time, rotating through the team.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Knowledge tasks:</strong> match a coach cue to its shape, or pick what a
              coach would focus on first. You get the explanation either way.
            </li>
            <li>
              <strong>Move tasks:</strong> short, low-risk shape holds with a timer. A partner
              confirms it — "Done" banks the energy, "Not quite" just means try again.
            </li>
            <li>
              <strong>Every completed task = 25 energy</strong> for the shared robot — equal for
              everyone, so nobody can dominate. Skip any task, no penalty.
            </li>
          </ul>
          <p className="mt-2 font-semibold text-[var(--text)]">
            Score completion, not speed or max effort. Rest whenever you need — it never penalizes
            the team.
          </p>
        </>
      }
      whatPracticed="Powering through fundamentals together — every task done well moves the whole team."
      onExit={onExit}
    >
      {({ finish }) => <TeamPowerUpPlay onFinish={finish} />}
    </LabGameShell>
  )
}

function TeamPowerUpPlay({
  onFinish,
}: {
  onFinish: (r: { score: number; total: number; detail?: string }) => void
}) {
  const [names, setNames] = useState<string[]>(['', ''])
  const [circuitId, setCircuitId] = useState(TEAM_POWER_UP_CIRCUITS[0].id)
  const [started, setStarted] = useState(false)
  const [taskIdx, setTaskIdx] = useState(0)
  const [energyByPlayer, setEnergyByPlayer] = useState<number[]>([])

  const circuit = TEAM_POWER_UP_CIRCUITS.find((c) => c.id === circuitId) ?? TEAM_POWER_UP_CIRCUITS[0]
  const players = names.map((n, i) => n.trim() || `Player ${i + 1}`)
  const totalEnergy = energyByPlayer.reduce((a, b) => a + b, 0)
  const maxEnergy = circuit.tasks.length * ENERGY_PER_TASK

  const validNames = names.filter((n) => n.trim()).length >= 2

  const begin = () => {
    if (!validNames) return
    setEnergyByPlayer(players.map(() => 0))
    setTaskIdx(0)
    setStarted(true)
  }

  const completeTask = (energy: number) => {
    const p = taskIdx % players.length
    setEnergyByPlayer((e) => e.map((v, i) => (i === p ? v + energy : v)))
    if (taskIdx + 1 >= circuit.tasks.length) {
      const finalTotal = totalEnergy + energy
      onFinish({
        score: finalTotal,
        total: maxEnergy,
        detail: `${finalTotal} energy banked by ${players.length} teammates — no rankings, all contributors`,
      })
      return
    }
    setTaskIdx(taskIdx + 1)
  }

  if (!started) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Teammates ({names.length})
            </p>
            <div className="flex gap-3">
              {names.length < 4 && (
                <button type="button" onClick={() => setNames([...names, ''])} className="text-xs font-semibold text-[var(--accent)]">
                  + Add
                </button>
              )}
              {names.length > 2 && (
                <button type="button" onClick={() => setNames(names.slice(0, -1))} className="text-xs font-semibold text-white/50">
                  Remove
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {names.map((n, i) => (
              <input
                key={i}
                value={n}
                onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={`Teammate ${i + 1} — name, nickname, or color`}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-semibold"
              />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Circuit</p>
          <select
            value={circuitId}
            onChange={(e) => setCircuitId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base font-semibold"
          >
            {TEAM_POWER_UP_CIRCUITS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.tasks.length} tasks
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-white/45">
            Knowledge and movement alternate, so there is natural rest built in.
          </p>
        </div>
        <button
          type="button"
          disabled={!validNames}
          onClick={begin}
          className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black disabled:opacity-40"
        >
          Power up the robot
        </button>
      </div>
    )
  }

  const task = circuit.tasks[taskIdx]
  const activePlayer = players[taskIdx % players.length]

  return (
    <div className="flex flex-col gap-4">
      <RobotBar pct={Math.round((totalEnergy / maxEnergy) * 100)} />
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>
          Task {taskIdx + 1} of {circuit.tasks.length} · {circuit.name}
        </span>
        <span className="font-semibold text-[var(--accent)]">{activePlayer}'s turn</span>
      </div>
      <div key={task.id}>
        {task.kind === 'knowledge' ? (
          <KnowledgeCard task={task} onDone={() => completeTask(ENERGY_PER_TASK)} onSkip={() => completeTask(0)} />
        ) : (
          <MoveCard task={task} onDone={() => completeTask(ENERGY_PER_TASK)} onSkip={() => completeTask(0)} />
        )}
      </div>
    </div>
  )
}

function RobotBar({ pct }: { pct: number }) {
  const eyeFill = 0.25 + 0.75 * (pct / 100)
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 48 48" className="h-10 w-10 shrink-0" role="img" aria-label="Team robot">
          <line x1="24" y1="8" x2="24" y2="14" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
          <circle cx="24" cy="7" r="3" fill="var(--accent)" opacity={eyeFill} />
          <rect x="8" y="14" width="32" height="28" rx="8" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
          <circle cx="18" cy="26" r="4" fill="var(--accent)" opacity={eyeFill} />
          <circle cx="30" cy="26" r="4" fill="var(--accent)" opacity={eyeFill} />
          <rect x="17" y="33" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.3)" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Team robot charge</p>
          <div className="mt-1 h-4 overflow-hidden rounded-full bg-black/50">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className="font-mono text-lg font-black tabular-nums">{pct}%</span>
      </div>
    </div>
  )
}

function SkipButton({ onSkip }: { onSkip: () => void }) {
  return (
    <button type="button" onClick={onSkip} className="text-xs font-semibold text-white/40 underline underline-offset-2">
      Skip — no penalty
    </button>
  )
}

function KnowledgeCard({ task, onDone, onSkip }: { task: PowerUpTask & { kind: 'knowledge' }; onDone: () => void; onSkip: () => void }) {
  if (task.source.pack === 'cue') {
    const item = CUE_QUEST_ITEMS.find((i) => i.id === task.source.refId) ?? CUE_QUEST_ITEMS[0]
    return <CueCard item={item} title={task.title} onDone={onDone} onSkip={onSkip} />
  }
  const scenario = COACHES_EYE_SCENARIOS.find((s) => s.id === task.source.refId) ?? COACHES_EYE_SCENARIOS[0]
  return <EyeCard scenario={scenario} title={task.title} onDone={onDone} onSkip={onSkip} />
}

function CueCard({
  item,
  title,
  onDone,
  onSkip,
}: {
  item: CueQuestItem
  title: string
  onDone: () => void
  onSkip: () => void
}) {
  const [answered, setAnswered] = useState(false)
  const options = useMemo(() => {
    const others = CUE_QUEST_ITEMS.filter((i) => i.shapeName !== item.shapeName)
    const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, 2)
    return [...shuffled.map((i) => i.shapeName), item.shapeName].sort(() => Math.random() - 0.5)
  }, [item])
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/25 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{title}</p>
      <p className="text-base font-semibold italic text-white/90">"{item.cue}"</p>
      <div className="flex flex-col gap-2">
        {options.map((name) => {
          const right = name === item.shapeName
          let cls = 'border-white/10 bg-white/5 text-white/85'
          if (answered) {
            if (right) cls = 'border-emerald-400/60 bg-emerald-400/15 text-emerald-100'
            else cls = 'border-white/10 bg-black/25 text-white/40'
          }
          return (
            <button
              key={name}
              type="button"
              disabled={answered}
              onClick={() => setAnswered(true)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold ${cls}`}
            >
              {name}
            </button>
          )
        })}
      </div>
      {answered ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-relaxed text-white/70">{item.why}</p>
          <p className="text-sm font-semibold text-[var(--accent)]">+{ENERGY_PER_TASK} energy banked</p>
          <button type="button" onClick={onDone} className="rounded-2xl bg-[var(--accent)] px-6 py-3 text-base font-black text-black">
            Next task
          </button>
        </div>
      ) : (
        <SkipButton onSkip={onSkip} />
      )}
    </div>
  )
}

function EyeCard({
  scenario,
  title,
  onDone,
  onSkip,
}: {
  scenario: CoachesEyeScenario
  title: string
  onDone: () => void
  onSkip: () => void
}) {
  const [answered, setAnswered] = useState<number | null>(null)
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/25 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {title} — {scenario.title}
      </p>
      <p className="text-sm leading-relaxed text-white/80">{scenario.context}</p>
      <p className="text-sm font-semibold">{scenario.question}</p>
      <div className="flex flex-col gap-2">
        {scenario.options.map((opt, i) => {
          const right = scenario.accepted.includes(i)
          let cls = 'border-white/10 bg-white/5 text-white/85'
          if (answered !== null) {
            if (right) cls = 'border-emerald-400/60 bg-emerald-400/15 text-emerald-100'
            else cls = 'border-white/10 bg-black/25 text-white/40'
          }
          return (
            <button
              key={i}
              type="button"
              disabled={answered !== null}
              onClick={() => setAnswered(i)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold ${cls}`}
            >
              {opt}
            </button>
          )
        })}
      </div>
      {answered !== null ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-relaxed text-white/70">{scenario.rationale}</p>
          <p className="text-sm font-semibold text-[var(--accent)]">+{ENERGY_PER_TASK} energy banked</p>
          <button type="button" onClick={onDone} className="rounded-2xl bg-[var(--accent)] px-6 py-3 text-base font-black text-black">
            Next task
          </button>
        </div>
      ) : (
        <SkipButton onSkip={onSkip} />
      )}
    </div>
  )
}

function MoveCard({ task, onDone, onSkip }: { task: PowerUpTask & { kind: 'move' }; onDone: () => void; onSkip: () => void }) {
  const seconds = task.source.seconds
  const { left, running, start, reset } = useCountdown(seconds)
  const [phase, setPhase] = useState<'ready' | 'holding' | 'judge'>('ready')
  const [retried, setRetried] = useState(false)

  useEffect(() => {
    if (phase === 'holding' && left === 0 && !running) setPhase('judge')
  }, [left, running, phase])

  const begin = () => {
    reset()
    setPhase('holding')
    start()
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/25 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Move task</p>
      <p className="text-base font-bold">{task.title}</p>
      <p className="text-sm leading-relaxed text-white/65">{task.detail}</p>

      {phase === 'ready' && (
        <div className="flex flex-col gap-3">
          {retried && <p className="text-sm text-white/55">No stress — catch your breath and go again when ready.</p>}
          <button type="button" onClick={begin} className="rounded-2xl bg-[var(--accent)] px-6 py-3 text-base font-black text-black">
            Start {seconds}-second hold
          </button>
          <SkipButton onSkip={onSkip} />
        </div>
      )}

      {phase === 'holding' && (
        <div className="flex flex-col items-center gap-3 py-2">
          <BoutClock left={left} urgentAt={3} />
          <p className="text-xs text-white/50">Hold the shape — {task.source.shapeName}</p>
        </div>
      )}

      {phase === 'judge' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-white/75">How did the hold look?</p>
          <button type="button" onClick={onDone} className="rounded-2xl bg-[var(--accent)] px-6 py-3 text-base font-black text-black">
            Done — partner confirms (+{ENERGY_PER_TASK})
          </button>
          <button
            type="button"
            onClick={() => {
              setRetried(true)
              setPhase('ready')
            }}
            className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white/75"
          >
            Not quite — try again
          </button>
          <SkipButton onSkip={onSkip} />
        </div>
      )}
    </div>
  )
}

