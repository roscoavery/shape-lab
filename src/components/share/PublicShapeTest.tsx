import { useMemo, useState } from 'react'
import { SHAPES } from '../../config/shapes'
import { shippedFileList, stillCropLookupIds } from '../../lib/shippedRefs'
import { SHIPPED_STILL_CROPS, mergeStillCrops } from '../../lib/shippedStillCrops'
import { cropSourcePixels, type StillCropRect } from '../../lib/stillCrop'

const STUDY_EXCLUDE = new Set([
  'arms_down',
  'arms_forward',
  'arms_vertical',
  'zombie_arms',
  'bridge',
])

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

type TestQuestion = {
  shapeId: string
  shapeName: string
  imageUrl: string
  stillId: string
  choices: string[]
}

function buildQuestions(
  shapes: { id: string; name: string }[],
  count = 10,
): TestQuestion[] {
  const picked = shuffle(shapes).slice(0, Math.min(count, shapes.length))
  return picked.map((s) => {
    const files = shippedFileList(s.id)
    const fileIdx = Math.floor(Math.random() * files.length)
    const file = files[fileIdx]!
    const others = shuffle(shapes.filter((x) => x.id !== s.id))
      .slice(0, 3)
      .map((x) => x.name)
    const choices = shuffle([s.name, ...others])
    return {
      shapeId: s.id,
      shapeName: s.name,
      imageUrl: `/references/${file}`,
      stillId: `default_${s.id}_${fileIdx}`,
      choices,
    }
  })
}

function CroppedImage({
  src,
  stillId,
  crops,
  alt,
}: {
  src: string
  stillId: string
  crops: Record<string, StillCropRect>
  alt: string
}) {
  const [clipped, setClipped] = useState<string | null>(null)

  const crop = useMemo(() => {
    for (const id of stillCropLookupIds(stillId)) {
      const c = crops[id]
      if (c) return c
    }
    return null
  }, [crops, stillId])

  useState(() => {
    if (!crop) return
    const img = new Image()
    img.onload = () => {
      try {
        const { sx, sy, sw, sh } = cropSourcePixels(crop, img.naturalWidth, img.naturalHeight)
        const canvas = document.createElement('canvas')
        canvas.width = sw
        canvas.height = sh
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
        canvas.toBlob(
          (blob) => {
            if (blob) setClipped(URL.createObjectURL(blob))
          },
          'image/jpeg',
          0.92,
        )
      } catch {
        // fall back
      }
    }
    img.src = src
  })

  return (
    <img
      src={clipped ?? src}
      alt={alt}
      className="max-h-full max-w-full rounded-2xl object-contain"
      draggable={false}
    />
  )
}

export default function PublicShapeTest({
  token,
  onExit,
  presetName,
}: {
  token: string
  onExit: () => void
  presetName?: { firstName: string; lastName: string }
}) {
  const [step, setStep] = useState<'who' | 'test' | 'done'>(presetName ? 'test' : 'who')
  const [firstName, setFirstName] = useState(presetName?.firstName ?? '')
  const [lastName, setLastName] = useState(presetName?.lastName ?? '')
  const [crops, setCrops] = useState<Record<string, StillCropRect>>(() => ({
    ...SHIPPED_STILL_CROPS,
  }))
  const [questions] = useState(() => {
    const shapes = SHAPES.filter(
      (s) => !STUDY_EXCLUDE.has(s.id) && shippedFileList(s.id).length > 0,
    )
    return buildQuestions(shapes)
  })
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [answers, setAnswers] = useState<string[]>([])
  const [saved, setSaved] = useState(false)

  // Load crops
  useState(() => {
    fetch(`/api/share/library?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.crops && typeof data.crops === 'object') {
          setCrops(mergeStillCrops(SHIPPED_STILL_CROPS, data.crops))
        }
      })
      .catch(() => {})
  })

  const q = questions[index]
  const score = answers.filter((a, i) => a === questions[i]?.shapeName).length

  const submitAnswer = (choice: string) => {
    if (picked) return
    setPicked(choice)
    const next = [...answers, choice]
    setAnswers(next)
  }

  const next = () => {
    if (index + 1 >= questions.length) {
      // Save the result
      const finalAnswers = answers
      const finalScore = finalAnswers.filter((a, i) => a === questions[i]?.shapeName).length
      fetch(`/api/share/quiz-submit?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          score: finalScore,
          total: questions.length,
          answers: questions.map((qq, i) => ({
            shape: qq.shapeName,
            picked: finalAnswers[i] ?? '(no answer)',
            correct: finalAnswers[i] === qq.shapeName,
          })),
        }),
      })
        .then(() => setSaved(true))
        .catch(() => setSaved(false))
      setStep('done')
    } else {
      setIndex(index + 1)
      setPicked(null)
    }
  }

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
          className="mt-6 h-12 w-full max-w-xs rounded-xl border border-white/15 bg-white/5 px-4 text-white placeholder:text-white/30"
        />
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last name"
          className="mt-3 h-12 w-full max-w-xs rounded-xl border border-white/15 bg-white/5 px-4 text-white placeholder:text-white/30"
        />
        <button
          type="button"
          disabled={!ready}
          onClick={() => setStep('test')}
          className="mt-6 h-12 w-full max-w-xs rounded-xl bg-sky-500 text-base font-bold text-white disabled:opacity-40"
        >
          Start the test
        </button>
        <button
          type="button"
          onClick={onExit}
          className="mt-3 text-sm text-white/50"
        >
          Back to studying
        </button>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-white">
        <h1 className="text-2xl font-bold">Done!</h1>
        <p className="mt-3 text-5xl font-black">
          {score} / {questions.length}
        </p>
        <p className="mt-2 text-center text-sm text-white/60">
          {firstName} {lastName}, your score was
          {saved ? ' saved.' : ' could not be saved. Show this screen to your coach.'}
        </p>
        <div className="mt-6 w-full max-w-xs space-y-2">
          {questions.map((qq, i) => {
            const a = answers[i]
            const correct = a === qq.shapeName
            return (
              <div
                key={i}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  correct
                    ? 'border-green-500/40 bg-green-500/10'
                    : 'border-red-500/40 bg-red-500/10'
                }`}
              >
                <div className="font-semibold">{qq.shapeName}</div>
                {!correct && <div className="text-white/60">You picked: {a}</div>}
              </div>
            )
          })}
        </div>
        <button
          type="button"
          onClick={onExit}
          className="mt-6 h-12 w-full max-w-xs rounded-xl bg-white/10 text-base font-bold text-white"
        >
          Back to studying
        </button>
      </div>
    )
  }

  if (!q) return null

  return (
    <div className="flex min-h-dvh flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 pt-4">
        <span className="text-sm text-white/60">
          {index + 1} / {questions.length}
        </span>
        <button type="button" onClick={onExit} className="text-sm text-white/60">
          Exit
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-4">
        <CroppedImage src={q.imageUrl} stillId={q.stillId} crops={crops} alt="What shape is this?" />
      </div>
      <div className="px-6 pb-8">
        <p className="mb-3 text-center text-lg font-semibold">What shape is this?</p>
        <div className="space-y-2">
          {q.choices.map((choice) => {
            const isPicked = picked === choice
            const isCorrect = choice === q.shapeName
            let cls = 'border-white/15 bg-white/5'
            if (picked) {
              if (isCorrect) cls = 'border-green-500 bg-green-500/20'
              else if (isPicked) cls = 'border-red-500 bg-red-500/20'
            }
            return (
              <button
                key={choice}
                type="button"
                disabled={!!picked}
                onClick={() => submitAnswer(choice)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-base font-semibold ${cls} disabled:opacity-100`}
              >
                {choice}
              </button>
            )
          })}
        </div>
        {picked && (
          <button
            type="button"
            onClick={next}
            className="mt-4 h-12 w-full rounded-xl bg-sky-500 text-base font-bold text-white"
          >
            {index + 1 >= questions.length ? 'See my score' : 'Next'}
          </button>
        )}
      </div>
    </div>
  )
}
