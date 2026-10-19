import { useMemo, useState } from 'react'

type LibraryShape = {
  id: string
  name: string
  urls: string[]
  stillIds: string[]
}

type Question = {
  shapeId: string
  shapeName: string
  imageUrl: string
  choices: string[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]!
    a[i] = a[j]!
    a[j] = tmp
  }
  return a
}

export default function PublicShapeTest({
  token,
  onExit,
  presetName,
  libraryShapes,
}: {
  token: string
  onExit: () => void
  presetName?: { firstName: string; lastName: string }
  libraryShapes?: LibraryShape[]
}) {
  const [step, setStep] = useState<'who' | 'test' | 'done'>(presetName ? 'test' : 'who')
  const [firstName, setFirstName] = useState(presetName?.firstName ?? '')
  const [lastName, setLastName] = useState(presetName?.lastName ?? '')
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [answers, setAnswers] = useState<string[]>([])
  const [saved, setSaved] = useState(false)

  // Build 10 questions from library shapes.
  const questions: Question[] = useMemo(() => {
    try {
      const shapes = (libraryShapes ?? []).filter(
        (s) => s && s.id && s.name && s.urls && s.urls.length > 0,
      )
      if (shapes.length === 0) return []
      const pickedShapes = shuffle(shapes).slice(0, 10)
      return pickedShapes.map((s) => {
        const imgIdx = Math.floor(Math.random() * s.urls.length)
        const others = shuffle(shapes.filter((x) => x.id !== s.id))
          .slice(0, 3)
          .map((x) => x.name)
        return {
          shapeId: s.id,
          shapeName: s.name,
          imageUrl: s.urls[imgIdx] ?? '',
          choices: shuffle([s.name, ...others]),
        }
      })
    } catch {
      return []
    }
  }, [libraryShapes])

  const q = questions[index]
  const score = answers.filter((a, i) => a === questions[i]?.shapeName).length

  const submitAnswer = (choice: string) => {
    if (picked || !q) return
    setPicked(choice)
    const next = [...answers, choice]
    setAnswers(next)
    setTimeout(() => {
      if (index + 1 >= questions.length) {
        setStep('done')
        // Submit score to server.
        try {
          fetch(`/api/share/quiz-submit?token=${encodeURIComponent(token)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              score: next.filter((a, i) => a === questions[i]?.shapeName).length,
              total: questions.length,
              answers: next,
            }),
          }).catch(() => {})
        } catch {
          // ignore
        }
      } else {
        setIndex(index + 1)
        setPicked(null)
      }
    }, 600)
  }

  // Name entry step.
  if (step === 'who') {
    const ready = firstName.trim().length > 0 && lastName.trim().length > 0
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-white">
        <h1 className="text-2xl font-bold">Who's taking the test?</h1>
        <p className="mt-2 text-center text-sm text-white/60">
          Type your name so your coach knows whose score this is.
        </p>
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name"
          className="mt-6 w-full max-w-xs rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40"
        />
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last name"
          className="mt-3 w-full max-w-xs rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40"
        />
        <button
          type="button"
          disabled={!ready}
          onClick={() => setStep('test')}
          className="mt-6 w-full max-w-xs rounded-xl bg-sky-500 py-3 font-bold text-white disabled:opacity-40"
        >
          Start test
        </button>
        <button
          type="button"
          onClick={onExit}
          className="mt-4 text-sm text-white/60"
        >
          ‹ Back to library
        </button>
      </div>
    )
  }

  // Done step.
  if (step === 'done') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-white">
        <h1 className="text-2xl font-bold">Done!</h1>
        <p className="mt-4 text-5xl font-bold text-sky-400">
          {score} / {questions.length}
        </p>
        <p className="mt-2 text-sm text-white/60">
          {firstName} {lastName}
        </p>
        <button
          type="button"
          onClick={onExit}
          className="mt-8 w-full max-w-xs rounded-xl bg-sky-500 py-3 font-bold text-white"
        >
          Back to library
        </button>
      </div>
    )
  }

  // Loading (no questions yet).
  if (!q) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-white">
        <p className="text-white/60">Loading the test…</p>
        <button
          type="button"
          onClick={onExit}
          className="mt-4 text-sm text-white/60"
        >
          ‹ Back
        </button>
      </div>
    )
  }

  // Test question.
  return (
    <div className="flex min-h-dvh flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 pt-4">
        <button type="button" onClick={onExit} className="text-sm text-white/60">
          ‹ Exit
        </button>
        <p className="text-sm text-white/60">
          {index + 1} / {questions.length}
        </p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <p className="mb-4 text-lg font-semibold">What shape is this?</p>
        {q.imageUrl ? (
          <img
            src={q.imageUrl}
            alt="Shape"
            className="max-h-[40vh] max-w-full rounded-2xl object-contain"
            draggable={false}
          />
        ) : (
          <div className="flex h-48 w-48 items-center justify-center rounded-2xl bg-white/10">
            <span className="text-white/40">No image</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 px-6 pb-8">
        {q.choices.map((choice) => {
          const isPicked = picked === choice
          const isCorrect = choice === q.shapeName
          let cls = 'border-white/20 bg-white/10'
          if (picked) {
            if (isCorrect) cls = 'border-green-500 bg-green-500/20'
            else if (isPicked) cls = 'border-red-500 bg-red-500/20'
          }
          return (
            <button
              key={choice}
              type="button"
              onClick={() => submitAnswer(choice)}
              disabled={!!picked}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold ${cls}`}
            >
              {choice}
            </button>
          )
        })}
      </div>
    </div>
  )
}
