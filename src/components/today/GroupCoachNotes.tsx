import { useState } from 'react'
import type { Athlete } from '../../types'
import { addCoachNotesToAthletes } from '../../lib/athleteNotes'
import { AthleteSearchField } from './AthleteSearchField'
import { AthleteName } from '../AthleteAvatar'

type Props = {
  athletes: Athlete[]
  pool?: Athlete[]
  coach: Athlete
  onAthletesChange: (next: Athlete[]) => void
}

/** Search one athlete, write a note. Does not dump the group roster. */
export function GroupCoachNotes({ athletes, pool, coach, onAthletesChange }: Props) {
  const [query, setQuery] = useState('')
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [flash, setFlash] = useState<string | null>(null)
  const picked = athletes.find((a) => a.id === pickedId) ?? null
  const latest = picked?.coachNotes?.[0]

  const save = () => {
    if (!picked || !text.trim()) return
    onAthletesChange(
      addCoachNotesToAthletes(athletes, [picked.id], {
        author: coach,
        text: text.trim(),
        className: 'School / camp',
        audience: 'coach',
      }),
    )
    setFlash(`Note saved on ${picked.name.split(' ')[0]}.`)
    setText('')
  }

  return (
    <section className="mt-3 rounded-2xl border border-[var(--panel-border)] bg-[#121820] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        Coach notes
      </p>
      <h4 className="mt-1 text-lg font-semibold">Write a note</h4>
      <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
        Search who you are watching. Notes stay on their profile.
      </p>
      {picked ? (
        <div className="mt-3 rounded-xl bg-[#0d1218] p-3">
          <div className="flex items-center justify-between gap-2">
            <AthleteName athlete={picked} nameClassName="font-semibold" />
            <button
              type="button"
              className="text-xs font-semibold text-[var(--muted)]"
              onClick={() => {
                setPickedId(null)
                setQuery('')
                setText('')
              }}
            >
              Change
            </button>
          </div>
          {latest && (
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Last: {latest.text}</p>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={800}
            placeholder="What you noticed, a grouping, a cue…"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={!text.trim()}
            onClick={save}
            className="sl-btn-mint sl-center mt-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-40"
          >
            Save note
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <AthleteSearchField
            athletes={pool ?? athletes}
            query={query}
            onQuery={setQuery}
            onPick={(row) => {
              setPickedId(row.id)
              setQuery('')
              setFlash(null)
            }}
            placeholder="Search who this note is for"
          />
        </div>
      )}
      {flash && <p className="mt-2 text-sm font-semibold text-[var(--accent)]">{flash}</p>}
    </section>
  )
}
