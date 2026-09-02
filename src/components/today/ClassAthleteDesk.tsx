import { useEffect, useState } from 'react'
import type { Athlete } from '../../types'
import { AthleteName } from '../AthleteAvatar'
import { AthleteProfileCard } from '../AthleteProfileCard'
import { addCoachNotesToAthletes } from '../../lib/athleteNotes'
import { logClassSkillForAthlete } from '../../lib/classSessionLog'
import { publishTextPostResult } from '../../lib/feedPosts'
import { coachShareLabel } from '../../lib/coachShare'

type Props = {
  athletes: Athlete[]
  present: Athlete[]
  coach: Athlete
  className?: string
  meetingId?: string
  lessonId?: string
  onAthletesChange: (next: Athlete[]) => void
  title?: string
  hint?: string
}

export function ClassAthleteDesk({
  athletes,
  present,
  coach,
  className,
  meetingId,
  lessonId,
  onAthletesChange,
  title = 'Notes for who is here',
  hint = 'Tap an athlete. Their answers, old notes, and wins show up. Write the next one.',
}: Props) {
  const [picked, setPicked] = useState<string | null>(present[0]?.id ?? null)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    if (picked && !present.some((a) => a.id === picked)) {
      setPicked(present[0]?.id ?? null)
    }
  }, [present.map((a) => a.id).join('|'), picked])

  const selected = present.find((a) => a.id === picked) ?? athletes.find((a) => a.id === picked)

  const saveNote = (text: string) => {
    if (!selected) return
    onAthletesChange(
      addCoachNotesToAthletes(athletes, [selected.id], {
        author: coach,
        text,
        meetingId,
        lessonId,
        className,
      }),
    )
    setFlash(`Saved note on ${selected.name}.`)
  }

  const saveWin = async (text: string, big: boolean) => {
    if (!selected) return
    logClassSkillForAthlete({
      athleteId: selected.id,
      text,
      className,
      meetingId,
    })
    await publishTextPostResult({
      authorId: selected.id,
      caption: text,
      taggedIds: [selected.id],
      channels: big ? ['wins', 'gym'] : ['wins'],
      sharedById: coach.id,
      sharedByName: coachShareLabel(coach),
    })
    onAthletesChange(
      addCoachNotesToAthletes(athletes, [selected.id], {
        author: coach,
        text: `Win · ${text}`,
        meetingId,
        lessonId,
        className,
        topicLabel: 'Win',
      }),
    )
    setFlash(
      big
        ? `Logged a win for ${selected.name} on Wins and the gym feed.`
        : `Logged a win for ${selected.name}.`,
    )
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        Working now
      </p>
      <h3 className="mt-1 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-white/60">{hint}</p>

      {present.length === 0 ? (
        <p className="mt-3 text-sm text-white/55">
          Add someone to tonight&apos;s list so notes have a name to land on.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {present.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setPicked(a.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                picked === a.id
                  ? 'bg-[var(--accent)] text-[#06281f]'
                  : 'bg-white/10 text-white/80'
              }`}
            >
              <AthleteName athlete={a} size="xs" />
            </button>
          ))}
        </div>
      )}

      {flash && (
        <p className="mt-3 text-sm font-semibold text-[var(--accent)]">{flash}</p>
      )}

      {selected && (
        <div className="mt-4">
          <AthleteProfileCard
            athlete={selected}
            viewer={coach}
            athletes={athletes}
            variant="embed"
            onAthleteChange={(next) =>
              onAthletesChange(athletes.map((a) => (a.id === next.id ? next : a)))
            }
            onAddNote={saveNote}
            onAddWin={(text, big) => void saveWin(text, big)}
          />
        </div>
      )}
    </section>
  )
}
