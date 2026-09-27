/**
 * CoachInterviewPanel — admin tabs for the Coach Interview.
 *
 * "Edit answers" is the interview editor (Ryan's workspace).
 * "Preview as parent" is the read-only Parent Guide exactly as parents see it.
 * The two are separate views — editing and previewing never mix.
 */
import { useState } from 'react'
import { CoachInterview } from './CoachInterview'
import { InterviewParentPreview } from './InterviewParentPreview'

export function CoachInterviewPanel() {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')

  return (
    <div className="grid gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('edit')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === 'edit'
              ? 'bg-[var(--accent)] text-[#061418]'
              : 'border border-[var(--panel-border)] text-[var(--muted)]'
          }`}
        >
          Edit answers
        </button>
        <button
          type="button"
          onClick={() => setTab('preview')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === 'preview'
              ? 'bg-[var(--accent)] text-[#061418]'
              : 'border border-[var(--panel-border)] text-[var(--muted)]'
          }`}
        >
          Preview as parent
        </button>
      </div>
      {tab === 'edit' ? <CoachInterview /> : <InterviewParentPreview />}
    </div>
  )
}
