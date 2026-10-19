import { useEffect, useMemo, useState } from 'react'
import { stillCropLookupIds } from '../../lib/shippedRefs'
import { cropSourcePixels, type StillCropRect } from '../../lib/stillCrop'

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
  stillId: string
  choices: string[]
}

// Detail shapes excluded from the test — they're close-ups, not body shapes
// to identify. (e.g. "Hands" is a hand-position detail, not a shape.)
const TEST_EXCLUDE = new Set([
  'hands_push_through', // "Hands" — hand position detail
])

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

/**
 * Image with Ryan's saved crop applied (canvas clip). Same as the library.
 */
function CroppedImage({
  src,
  stillId,
  crops,
  alt,
  className,
}: {
  src: string
  stillId: string
  crops: Record<string, StillCropRect>
  alt: string
  className?: string
}) {
  const [clipped, setClipped] = useState<string | null>(null)

  const crop = useMemo(() => {
    for (const id of stillCropLookupIds(stillId)) {
      const c = crops[id]
      if (c) return c
    }
    return null
  }, [crops, stillId])

  useEffect(() => {
    if (!crop) {
      setClipped(null)
      return
    }
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
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
            if (!cancelled && blob) setClipped(URL.createObjectURL(blob))
          },
          'image/jpeg',
          0.92,
        )
      } catch {
        // fall back to the plain image
      }
    }
    img.src = src
    return () => {
      cancelled = true
    }
  }, [src, crop])

  return (
    <img
      src={clipped ?? src}
      alt={alt}
      className={className ?? 'max-h-[40vh] max-w-full rounded-2xl object-contain'}
      draggable={false}
    />
  )
}

export default function PublicShapeTest({
  token,
  onExit,
  presetName,
  libraryShapes,
  crops,
}: {
  token: string
  onExit: () => void
  presetName?: { firstName: string; lastName: string }
  libraryShapes?: LibraryShape[]
  crops?: Record<string, StillCropRect>
}) {
  const [step, setStep] = useState<'who' | 'length' | 'test' | 'done'>(
    presetName ? 'length' : 'who'
  )
  const [search, setSearch] = useState(
    presetName ? `${presetName.firstName} ${presetName.lastName}`.trim() : ''
  )
  const [matches, setMatches] = useState<{ id: string; firstName: string; lastName: string }[]>([])
  const [selected, setSelected] = useState<{ id: string; firstName: string; lastName: string } | null>(null)
  const [searching, setSearching] = useState(false)
  const [questionCount, setQuestionCount] = useState<number | 'all'>(12)
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [answers, setAnswers] = useState<string[]>([])

  const cropMap = crops ?? {}

  // Search for matching profiles as the user types (debounced).
  useEffect(() => {
    if (selected) {
      setMatches([])
      return
    }
    const q = search.trim()
    if (q.length < 2) {
      setMatches([])
      return
    }
    setSearching(true)
    const t = setTimeout(() => {
      fetch(`/api/share/find-athlete?token=${encodeURIComponent(token)}&q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          setMatches(data?.athletes ?? [])
          setSearching(false)
        })
        .catch(() => {
          setMatches([])
          setSearching(false)
        })
    }, 300)
    return () => clearTimeout(t)
  }, [search, selected, token])

  // Build questions: random selection, length based on user choice.
  // Each test shuffles anew, so repeats see different questions.
  // Detail shapes (hands, hand positions, etc.) are excluded — they're not body shapes.
  // NOTE: step is NOT in deps — questions must stay stable during the test.
  const questions: Question[] = useMemo(() => {
    try {
      const shapes = (libraryShapes ?? []).filter(
        (s) =>
          s &&
          s.id &&
          s.name &&
          s.urls &&
          s.urls.length > 0 &&
          !TEST_EXCLUDE.has(s.id) &&
          !s.name.toLowerCase().includes('hand position'),
      )
      if (shapes.length === 0) return []
      const count = questionCount === 'all' ? shapes.length : Math.min(questionCount, shapes.length)
      const pickedShapes = shuffle(shapes).slice(0, count)
      return pickedShapes.map((s) => {
        // Use the main still (index 0) — Ryan's picked representative photo.
        const imgIdx = 0
        const others = shuffle(shapes.filter((x) => x.id !== s.id))
          .slice(0, 3)
          .map((x) => x.name)
        return {
          shapeId: s.id,
          shapeName: s.name,
          imageUrl: s.urls[imgIdx] ?? '',
          stillId: s.stillIds[imgIdx] ?? `default_${s.id}_${imgIdx}`,
          choices: shuffle([s.name, ...others]),
        }
      })
    } catch {
      return []
    }
  }, [libraryShapes, questionCount])

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
        try {
          fetch(`/api/share/quiz-submit?token=${encodeURIComponent(token)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              athleteId: selected?.id ?? '',
              firstName: selected?.firstName ?? '',
              lastName: selected?.lastName ?? '',
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

  const startTest = (count: number | 'all') => {
    setQuestionCount(count)
    setIndex(0)
    setPicked(null)
    setAnswers([])
    setStep('test')
  }

  // Who's taking it: search and select an existing profile.
  if (step === 'who') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-white">
        <h1 className="text-2xl font-bold">Who's taking the test?</h1>
        <p className="mt-2 text-center text-sm text-white/60">
          Type your name and pick your profile. Your score goes to your coach.
        </p>
        {selected ? (
          <div className="mt-6 w-full max-w-xs rounded-xl border border-sky-500 bg-sky-500/10 px-4 py-3">
            <p className="font-semibold text-white">
              {selected.firstName} {selected.lastName}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelected(null)
                setSearch('')
              }}
              className="mt-1 text-xs text-sky-400"
            >
              Not you? Search again
            </button>
          </div>
        ) : (
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type your name"
              autoFocus
              className="mt-6 w-full max-w-xs rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40"
            />
            {searching && <p className="mt-2 text-xs text-white/40">Searching…</p>}
            {matches.length > 0 && (
              <div className="mt-3 w-full max-w-xs overflow-hidden rounded-xl border border-white/10">
                {matches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelected(m)}
                    className="block w-full border-b border-white/5 bg-white/5 px-4 py-3 text-left last:border-0 hover:bg-white/10"
                  >
                    <span className="font-semibold text-white">
                      {m.firstName} {m.lastName}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {!searching && search.trim().length >= 2 && matches.length === 0 && (
              <p className="mt-2 text-xs text-white/40">
                No profile found. Ask your coach to add you.
              </p>
            )}
          </>
        )}
        <button
          type="button"
          disabled={!selected}
          onClick={() => setStep('length')}
          className="mt-6 w-full max-w-xs rounded-xl bg-sky-500 py-3 font-bold text-white disabled:opacity-40"
        >
          Continue
        </button>
        <button type="button" onClick={onExit} className="mt-4 text-sm text-white/60">
          ‹ Back to library
        </button>
      </div>
    )
  }

  // How many questions?
  if (step === 'length') {
    const totalShapes = (libraryShapes ?? []).filter((s) => s.urls.length > 0).length
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-white">
        <h1 className="text-2xl font-bold">How many questions?</h1>
        <p className="mt-2 text-center text-sm text-white/60">
          {selected?.firstName}, pick your test length.
        </p>
        <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
          <button
            type="button"
            onClick={() => startTest(12)}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-4 text-left"
          >
            <span className="block text-lg font-bold">12 questions</span>
            <span className="block text-xs text-white/60">Quick test</span>
          </button>
          <button
            type="button"
            onClick={() => startTest(24)}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-4 text-left"
          >
            <span className="block text-lg font-bold">24 questions</span>
            <span className="block text-xs text-white/60">Half the shapes</span>
          </button>
          <button
            type="button"
            onClick={() => startTest('all')}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-4 text-left"
          >
            <span className="block text-lg font-bold">All {totalShapes} shapes</span>
            <span className="block text-xs text-white/60">Full test</span>
          </button>
        </div>
        <button type="button" onClick={onExit} className="mt-6 text-sm text-white/60">
          ‹ Back to library
        </button>
      </div>
    )
  }

  // Done.
  if (step === 'done') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-white">
        <h1 className="text-2xl font-bold">Done!</h1>
        <p className="mt-4 text-5xl font-bold text-sky-400">
          {score} / {questions.length}
        </p>
        <p className="mt-2 text-sm text-white/60">
          {selected?.firstName} {selected?.lastName}
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

  // Loading.
  if (!q) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-white">
        <p className="text-white/60">Loading the test…</p>
        <button type="button" onClick={onExit} className="mt-4 text-sm text-white/60">
          ‹ Back
        </button>
      </div>
    )
  }

  // Question.
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
          <CroppedImage
            src={q.imageUrl}
            stillId={q.stillId}
            crops={cropMap}
            alt="Shape"
            className="max-h-[40vh] max-w-full rounded-2xl object-contain"
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
