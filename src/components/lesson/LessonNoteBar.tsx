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
  const [filed, setFiled] = useState<string | null>(null)
  const [filedKey, setFiledKey] = useState<string | null>(null)

  useEffect(() => {
    if (!preset?.label.trim()) return
    setTopic((cur) => (cur.label.trim() ? cur : preset))
  }, [preset])

  const [cueQuery, setCueQuery] = useState('')
  const [showAllCues, setShowAllCues] = useState(false)
  const label = topic.label.trim()
  const cues = label ? cuesForNote(topic, coachId) : []
  const yours = cues.filter((c) => c.source === 'yours')
  const shapeCues = cues.filter((c) => c.source === 'shape')
  const q = cueQuery.trim().toLowerCase()
  const filtered = q
    ? cues.filter((c) => c.text.toLowerCase().includes(q))
    : [...yours, ...shapeCues.slice(0, showAllCues ? shapeCues.length : 3)]
  void cueTick

  const file = (line: string, key?: string) => {
    const next = line.trim()
    if (!next || !label) return
    onAdd(next, { ...topic, label })
    setFiled(next)
    setFiledKey(key ?? next)
    window.setTimeout(() => {
      setFiled((cur) => (cur === next ? null : cur))
      setFiledKey((cur) => (cur === (key ?? next) ? null : cur))
    }, 2800)
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
          {filed && (
            <p className="mt-2 rounded-lg border border-[var(--accent)]/50 bg-[#102820] px-3 py-2 text-sm font-semibold text-[var(--accent)]">
              Filed — {filed}
            </p>
          )}
          <input
            className="mt-2 h-10 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
            placeholder="Search a correction…"
            value={cueQuery}
            onChange={(e) => setCueQuery(e.target.value)}
          />
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filtered.map((c) => {
              const key = `${c.source}:${c.text}`
              const justFiled = filedKey === key
              return (
              <button
                key={key}
                type="button"
                onClick={() => file(c.text, key)}
                className={`rounded-lg border px-3 py-2.5 text-left text-sm leading-snug ${
                  justFiled
                    ? 'border-[var(--accent)] bg-[#102820] ring-1 ring-[var(--accent)]'
                    : 'border-[var(--panel-border)] bg-[#121820] hover:border-[var(--accent-dim)]'
                }`}
              >
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {justFiled ? 'Filed' : c.source === 'yours' ? 'Your cue' : 'Shape cue'}
                </span>
                {c.text}
              </button>
              )
            })}
          </div>
          {!q && !showAllCues && shapeCues.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllCues(true)}
              className="mt-2 text-xs font-semibold text-[var(--accent)] underline"
            >
              More corrections ({shapeCues.length - 3})
            </button>
          )}
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
