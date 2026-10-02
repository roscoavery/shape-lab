import { useState } from 'react'
import { LabGameShell, type LabGameResult } from './LabGameShell'
import { CUE_QUEST_ITEMS, type CueQuestItem } from '../../../data/arcade/cueQuestPack'

const ROUNDS = 5
const POINTS = 100

/** Fisher-Yates shuffle. */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Prompt = {
  item: CueQuestItem
  options: CueQuestItem[]
}

export function CueQuestGame({ onExit }: { onExit: () => void }) {
  return (
    <LabGameShell
      gameId="cue-quest"
      title="Cue Quest"
      tagline="Read the coach's cue — name the shape it belongs to."
      rules={
        <>
          <p>
            You get <strong>5 cues</strong> per round, pulled from the shape
            library. Read each cue and pick the shape it belongs to.
          </p>
          <p className="mt-2">
            <strong>{POINTS} points</strong> for every correct first guess. Tap
            an answer to see whether you were right and why the cue matters.
          </p>
        </>
      }
      whatPracticed="Connecting coaching cues to the shapes and body positions they fix — the language coaches use on the floor."
      onExit={onExit}
    >
      {({ finish }) => <CueQuestPlay onFinish={finish} />}
    </LabGameShell>
  )
}

function CueQuestPlay({ onFinish }: { onFinish: (r: LabGameResult) => void }) {
  const [prompts] = useState<Prompt[]>(() => {
    const picks = shuffled(CUE_QUEST_ITEMS).slice(0, ROUNDS)
    return picks.map((item) => ({
      item,
      options: shuffled([
        item,
        ...shuffled(CUE_QUEST_ITEMS.filter((x) => x.shapeId !== item.shapeId)).slice(0, 2),
      ]),
    }))
  })
  const [index, setIndex] = useState(0)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)

  const prompt = prompts[index]
  const answered = pickedId !== null
  const isCorrect = pickedId === prompt.item.shapeId

  const answer = (shapeId: string) => {
    if (answered) return
    setPickedId(shapeId)
    if (shapeId === prompt.item.shapeId) {
      setScore((s) => s + POINTS)
      setCorrect((c) => c + 1)
    }
  }

  const next = () => {
    if (index + 1 >= prompts.length) {
      onFinish({ score, total: ROUNDS * POINTS, detail: `${correct} of ${ROUNDS} cues matched` })
    } else {
      setIndex((i) => i + 1)
      setPickedId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Cue {index + 1} of {prompts.length}
        </p>
        <p className="font-mono text-sm font-black tabular-nums text-[var(--accent)]">{score} pts</p>
      </div>

      <blockquote className="rounded-2xl border border-white/10 bg-black/30 p-5 text-lg font-semibold leading-relaxed text-[var(--text)]">
        “{prompt.item.cue}”
      </blockquote>

      <div className="flex flex-col gap-2">
        {prompt.options.map((opt) => {
          const isPick = pickedId === opt.shapeId
          const isAnswer = opt.shapeId === prompt.item.shapeId
          const style = !answered
            ? 'border-white/10 bg-white/5 active:bg-white/10'
            : isAnswer
              ? 'border-emerald-400/60 bg-emerald-400/15'
              : isPick
                ? 'border-red-400/60 bg-red-400/15'
                : 'border-white/10 bg-white/5 opacity-50'
          return (
            <button
              key={opt.shapeId}
              type="button"
              onClick={() => answer(opt.shapeId)}
              disabled={answered}
              className={`rounded-2xl border px-4 py-3 text-left text-base font-semibold ${style}`}
            >
              {opt.shapeName}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p
            className={`text-sm font-black uppercase tracking-wider ${
              isCorrect ? 'text-emerald-300' : 'text-red-300'
            }`}
          >
            {isCorrect ? 'Correct' : 'Not quite'}
          </p>
          {!isCorrect && (
            <p className="text-sm text-white/70">
              That cue belongs to <strong className="text-[var(--text)]">{prompt.item.shapeName}</strong>.
            </p>
          )}
          <p className="text-sm leading-relaxed text-white/60">{prompt.item.why}</p>
          <button
            type="button"
            onClick={next}
            className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-black"
          >
            {index + 1 >= prompts.length ? 'See results' : 'Next cue'}
          </button>
        </div>
      )}
    </div>
  )
}
