import { useEffect, useState } from 'react'
import { cuesForNote, saveNoteCue } from '../../lib/noteCues'
import { SkillPicker, emptySkillTopic, type SkillTopic } from './SkillPicker'

type Props = {
  placeholder?: string
  /** When the coach already picked a hold skill, start the note on that same skill. */
  preset?: SkillTopic
  coachId?: string | null
  onAdd: (text: string, topic: SkillTopic) => void
}

export function LessonNoteBar({
  placeholder = 'What should they remember?',
  preset,
  coachId = null,
  onAdd,
}: Props) {
  const [text, setText] = useState('')
  const [topic, setTopic] = useState<SkillTopic>(preset ?? emptySkillTopic())
  const [cueTick, setCueTick] = useState(0)

  useEffect(() => {
    if (!preset?.label.trim()) return
    setTopic((cur) => (cur.label.trim() ? cur : preset))
  }, [preset])

  const label = topic.label.trim()
  const cues = label ? cuesForNote(topic, coachId) : []
  void cueTick

  const file = (line: string) => {
    const next = line.trim()
    if (!next || !label) return
    onAdd(next, { ...topic, label })
  }

  const submit = () => {
    const next = text.trim()
    if (!next || !label) return
    file(next)
    setText('')
  }

  const keepCue = (line: string) => {
    saveNoteCue(coachId, topic, line)
    setCueTick((n) => n + 1)
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <SkillPicker value={topic} onChange={setTopic} label="Note is for" coachId={coachId} />
      <div className="flex flex-wrap gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="min-w-[12rem] flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
        />
        <div className="flex flex-col gap-1.5 self-end">
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent-dim)] px-3 py-2 text-sm font-semibold text-white"
          >
            Save note
          </button>
          {text.trim() && label && (
            <button
              type="button"
              className="text-xs underline text-[var(--muted)]"
              onClick={() => {
                keepCue(text)
                file(text)
                setText('')
              }}
            >
              Save and keep as a cue
            </button>
          )}
        </div>
      </div>
      {label && cues.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
            Tap a correction to file it
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {cues.map((c) => (
              <button
                key={`${c.source}:${c.text}`}
                type="button"
                onClick={() => file(c.text)}
                className="rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2.5 text-left text-sm leading-snug hover:border-[var(--accent-dim)]"
              >
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {c.source === 'yours' ? 'Your cue' : 'Shape cue'}
                </span>
                {c.text}
              </button>
            ))}
          </div>
        </div>
      )}
      {label && cues.length === 0 && (
        <p className="text-xs text-[var(--muted)]">
          No saved cues for this skill yet. Type one and tap “Save and keep as a
          cue” so you can tap it next time.
        </p>
      )}
      {!label && (
        <p className="text-xs text-[var(--muted)]">
          Pick the shape first. Then tap a cue under the box — or type a new one.
        </p>
      )}
    </form>
  )
}
