import { useState } from 'react'
import type { Athlete } from '../../types'
import { ProfileFieldsEditor } from './ProfileFieldsEditor'

type Props = {
  athlete: Athlete
  onClose: () => void
  onSave: (athlete: Athlete) => void
}

/** Kept for older imports. Today → My profile now uses AthleteProfileCard. */
export function MyProfile({ athlete, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<Athlete>(athlete)
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#07110e] text-[var(--text)]">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          My profile
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold"
        >
          Close
        </button>
      </header>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 overflow-y-auto px-4 pb-10">
        <ProfileFieldsEditor athlete={draft} onChange={setDraft} />
        <button
          type="button"
          onClick={() => onSave(draft)}
          className="h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[#06281f]"
        >
          Save profile
        </button>
      </div>
    </div>
  )
}
