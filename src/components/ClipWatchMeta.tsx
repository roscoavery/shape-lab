import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useGymLibrary } from '../lib/gymLibrary'
import { saveClipMeta } from '../lib/clipMeta'
import { isCoachProfile, isGymAdmin } from '../lib/profileRole'
import { useClipLoopsOptional } from '../lib/clipLoops'
import { ShareReference } from './share/ShareReference'
import { clipShareDraft } from '../lib/shareReference'
import type { Athlete } from '../types'

type ClipEditValue = {
  viewer: Athlete | null
  athletes: Athlete[]
}

const ClipEditCtx = createContext<ClipEditValue>({ viewer: null, athletes: [] })

export function ClipEditProvider({
  viewer,
  athletes = [],
  children,
}: {
  viewer: Athlete | null
  athletes?: Athlete[]
  children: ReactNode
}) {
  return <ClipEditCtx.Provider value={{ viewer, athletes }}>{children}</ClipEditCtx.Provider>
}

export function useClipEditor(): ClipEditValue {
  return useContext(ClipEditCtx)
}

type Props = {
  url: string
  viewer?: Athlete | null
}

export function ClipWatchMeta({ url, viewer }: Props) {
  const ctx = useClipEditor()
  const who = viewer ?? ctx.viewer
  const { clipForUrl, nameForUrl, refresh } = useGymLibrary()
  const clip = clipForUrl(url)
  const gymAdmin = isGymAdmin(who)
  const coach = isCoachProfile(who)
  const loops = useClipLoopsOptional()
  const loop = loops?.getActive(url) ?? null
  const [name, setName] = useState(clip?.name || nameForUrl(url))
  const [tags, setTags] = useState((clip?.keywords ?? []).join(', '))
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const canEdit = Boolean(who && (gymAdmin || coach) && url)
  const title = clip?.name || nameForUrl(url) || 'Reference clip'
  const share = url ? (
    <ShareReference
      viewer={who}
      variant="compact"
      draft={
        loop
          ? clipShareDraft(`${title} · ${loop.name}`, url, loop.a, loop.b)
          : clipShareDraft(title, url)
      }
    />
  ) : null

  useEffect(() => {
    setName(clip?.name || nameForUrl(url))
    setTags((clip?.keywords ?? []).join(', '))
  }, [url, clip?.name, clip?.keywords, nameForUrl])

  if (!canEdit) {
    return (
      <div className="space-y-2">
        {clip?.name ? (
          <p className="truncate text-xs text-[var(--muted)]">{clip.name}</p>
        ) : null}
        {share}
      </div>
    )
  }

  const save = async () => {
    if (!who) return
    setBusy(true)
    setNote(null)
    const saved = await saveClipMeta(
      url,
      { name, keywords: tags },
      {
        gymEditor: gymAdmin,
        personalEditor: coach && !gymAdmin,
        profileId: who.id,
      },
    )
    setBusy(false)
    if (!saved.ok) {
      setNote(saved.reason)
      return
    }
    setNote('Saved the name and tags on this gym link.')
    void refresh()
  }

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        Reel name
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name this reel"
        className="h-10 w-full rounded-md border border-white/10 bg-[#0d1218] px-2 text-sm"
      />
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Tags — handstand, round-off,…"
        className="h-10 w-full rounded-md border border-white/10 bg-[#0d1218] px-2 text-sm"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[#06281f] disabled:opacity-50"
      >
        {busy ? 'Saving…' : gymAdmin ? 'Save gym name' : 'Save my name / tags'}
      </button>
      {note && <p className="text-[11px] text-[var(--muted)]">{note}</p>}
      {share}
    </div>
  )
}
