import { useEffect, useState } from 'react'
import { takeMobileSearchJump } from '../../lib/mobileSearchNav'
import { CoachEdProvider, useCoachEd } from './CoachEdContext'
import { AdminTools } from './AdminTools'
import { ConditionCardView } from './ConditionCardView'
import { ConditionLibrary } from './ConditionLibrary'
import { InjuryResponse } from './InjuryResponse'
import { LessonView } from './LessonView'
import { ProgressView } from './ProgressView'
import { QuickReference } from './QuickReference'
import { EducationalNote } from './SafetyBanner'
import { StudyHome, type StudyRoute } from './StudyView'
import { useLessons } from './useLessons'

type Segment = 'study' | 'reference' | 'response' | 'progress'

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'study', label: 'Study' },
  { id: 'reference', label: 'Quick reference' },
  { id: 'response', label: 'Injury response' },
  { id: 'progress', label: 'Progress' },
]

const SEGMENT_KEY = 'shape-lab.coachEd.segment.v1'

function initialRoute(): { segment: Segment; lessonId?: string } {
  const jump = takeMobileSearchJump('coachEd')
  if (jump && jump.kind === 'coachEd') return { segment: jump.segment, lessonId: jump.lessonId }
  return { segment: initialSegment() }
}

function initialSegment(): Segment {
  try {
    const v = sessionStorage.getItem(SEGMENT_KEY) as Segment | null
    if (v && SEGMENTS.some((s) => s.id === v)) return v
  } catch {
    /* private mode */
  }
  return 'study'
}

type Detail = { kind: 'condition'; id: string } | { kind: 'lesson'; id: string } | { kind: 'library' } | null

function Shell() {
  const ctx = useCoachEd()
  const lessons = useLessons()
  const [start] = useState(initialRoute)
  const [segment, setSegment] = useState<Segment>(start.segment)
  const [stack, setStack] = useState<Detail[]>(() => (start.lessonId ? [{ kind: 'lesson', id: start.lessonId }] : []))
  const detail: Detail = stack.length ? stack[stack.length - 1] : null
  const push = (d: Detail) => setStack((cur) => [...cur, d])
  const back = () => setStack((cur) => cur.slice(0, -1))
  const [route, setRoute] = useState<StudyRoute>('home')

  useEffect(() => {
    try {
      sessionStorage.setItem(SEGMENT_KEY, segment)
    } catch {
      /* private mode */
    }
  }, [segment])

  const go = (s: Segment) => {
    setSegment(s)
    setStack([])
    window.scrollTo({ top: 0 })
  }
  const openCondition = (id: string) => {
    push({ kind: 'condition', id })
    window.scrollTo({ top: 0 })
  }
  const openLesson = (id: string) => {
    if (segment !== 'study' && segment !== 'response') setSegment('study')
    push({ kind: 'lesson', id })
    window.scrollTo({ top: 0 })
  }

  if (ctx.loadError && !ctx.state) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-10 text-center">
        <p className="text-base font-semibold">Coach education is for coaches and gym admin.</p>
        <p className="text-sm text-[var(--muted)]">{ctx.loadError}</p>
        <button type="button" onClick={() => void ctx.reload()} className="rounded-full border border-white/20 px-5 py-2 text-sm">
          Try again
        </button>
      </div>
    )
  }

  const lesson = detail?.kind === 'lesson' ? lessons?.find((l) => l.id === detail.id) : undefined

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-24">
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">Coach education</p>
        <h2 className="text-2xl font-semibold leading-tight">Injury science, movement, and stretching</h2>
      </header>

      <nav
        aria-label="Coach education sections"
        className="sticky top-0 z-20 -mx-1 flex gap-1 rounded-2xl bg-[#0d1218]/95 p-1 backdrop-blur"
      >
        {SEGMENTS.map((s) => {
          const on = segment === s.id
          const emergency = s.id === 'response'
          return (
            <button
              key={s.id}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => go(s.id)}
              className={`min-h-[2.75rem] flex-1 rounded-xl px-2 text-[13px] font-semibold leading-tight ${
                on
                  ? emergency
                    ? 'bg-red-500 text-white'
                    : 'bg-[var(--panel)] text-[var(--text)] shadow-[0_1px_0_rgba(255,255,255,0.08)]'
                  : emergency
                    ? 'text-red-300'
                    : 'text-[var(--muted)]'
              }`}
            >
              {s.label}
            </button>
          )
        })}
      </nav>

      {detail?.kind === 'condition' ? (
        <ConditionCardView conditionId={detail.id} onOpen={openCondition} onBack={back} />
      ) : detail?.kind === 'lesson' ? (
        lesson ? (
          <LessonView lesson={lesson} onBack={back} onOpenCondition={openCondition} />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--muted)]">Loading</p>
        )
      ) : segment === 'study' ? (
        detail?.kind === 'library' ? (
          <div className="space-y-3">
            <button type="button" onClick={back} className="text-sm text-[var(--accent)]">
              &larr; Study
            </button>
            <ConditionLibrary onOpen={openCondition} />
          </div>
        ) : (
          <StudyHome lessons={lessons} onLesson={openLesson} onLibrary={() => push({ kind: 'library' })} route={route} setRoute={setRoute} />
        )
      ) : segment === 'reference' ? (
        <QuickReference onOpen={openCondition} />
      ) : segment === 'response' ? (
        <InjuryResponse onOpenCondition={openCondition} onOpenLesson={openLesson} />
      ) : (
        <ProgressView>{ctx.isAdmin ? <AdminTools /> : null}</ProgressView>
      )}

      {segment !== 'response' && segment !== 'progress' && !detail && <EducationalNote />}
    </div>
  )
}

export default function CoachEdPanel() {
  return (
    <CoachEdProvider>
      <Shell />
    </CoachEdProvider>
  )
}
