import { useEffect, useState } from 'react'
import { listCollages } from '../../lib/collages'
import { listFeedPosts, postOnChannel } from '../../lib/feedPosts'
import { listIgStills } from '../../lib/igStills'
import { hydrateIgStills } from '../../lib/igStillStore'
import { useGymLibrary } from '../../lib/gymLibrary'
import { listPublicDrills } from '../../lib/coachContentStore'
import { clipShareDraft, referenceShareUrl } from '../../lib/shareReference'
import type { ReferencePhoto } from '../../types'

export type SharePick = { url: string; title: string }

type Props = {
  onPick: (pick: SharePick) => void
  photos?: ReferencePhoto[]
}

export function MessageSharePicker({ onPick, photos = [] }: Props) {
  const { clips } = useGymLibrary()
  const [tab, setTab] = useState<'clip' | 'still' | 'drill' | 'collage' | 'win' | 'link'>('clip')
  const [collages, setCollages] = useState<{ id: string; name: string }[]>([])
  const [wins, setWins] = useState<{ id: string; caption: string }[]>([])
  const [stills, setStills] = useState(listIgStills(photos))
  const [link, setLink] = useState('')
  const drills = listPublicDrills()

  useEffect(() => {
    void listCollages().then((rows) => setCollages(rows.map((c) => ({ id: c.id, name: c.name }))))
    void listFeedPosts().then((posts) =>
      setWins(
        posts
          .filter((p) => postOnChannel(p, 'wins'))
          .slice(0, 12)
          .map((p) => ({ id: p.id, caption: p.caption || 'Win' })),
      ),
    )
    void hydrateIgStills().then((ig) => setStills(listIgStills([...photos, ...ig])))
  }, [photos])

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-1">
        {(
          [
            ['clip', 'Reel'],
            ['still', 'Still'],
            ['drill', 'Drill'],
            ['collage', 'Collage'],
            ['win', 'Win'],
            ['link', 'Link'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-2 py-0.5 text-[11px] ${
              tab === id
                ? 'bg-[var(--accent-dim)] font-semibold text-white'
                : 'border border-[var(--panel-border)] text-[var(--muted)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'clip' && (
        <select
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm"
          defaultValue=""
          onChange={(e) => {
            const clip = clips.find((c) => c.id === e.target.value)
            if (!clip) return
            const draft = clipShareDraft(clip.name, clip.url)
            onPick({ url: referenceShareUrl(draft) || clip.url, title: clip.name })
            e.target.value = ''
          }}
        >
          <option value="">Share a gym reel…</option>
          {clips.slice(0, 80).map((c) => (
            <option key={c.id} value={c.id}>
              {c.collectionName} · {c.name}
            </option>
          ))}
        </select>
      )}
      {tab === 'still' && (
        <select
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm"
          defaultValue=""
          onChange={(e) => {
            const still = stills.find((s) => s.id === e.target.value)
            if (!still) return
            onPick({
              url: `shape-lab:still/${still.id}`,
              title: still.label || still.customName || 'IG still',
            })
            e.target.value = ''
          }}
        >
          <option value="">Share an IG still…</option>
          {stills.slice(0, 40).map((s) => (
            <option key={s.id} value={s.id}>
              {s.label || s.customName || s.shapeId}
            </option>
          ))}
        </select>
      )}
      {tab === 'drill' && (
        <select
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm"
          defaultValue=""
          onChange={(e) => {
            const drill = drills.find((d) => d.id === e.target.value)
            if (!drill) return
            onPick({ url: `shape-lab:drill/${drill.id}`, title: drill.title })
            e.target.value = ''
          }}
        >
          <option value="">Share a drill…</option>
          {drills.slice(0, 60).map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      )}
      {tab === 'collage' && (
        <select
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm"
          defaultValue=""
          onChange={(e) => {
            const board = collages.find((c) => c.id === e.target.value)
            if (!board) return
            onPick({ url: `shape-lab:collage/${board.id}`, title: board.name })
            e.target.value = ''
          }}
        >
          <option value="">Share a collage…</option>
          {collages.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      {tab === 'win' && (
        <select
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm"
          defaultValue=""
          onChange={(e) => {
            const win = wins.find((w) => w.id === e.target.value)
            if (!win) return
            onPick({ url: `shape-lab:win/${win.id}`, title: win.caption.slice(0, 80) })
            e.target.value = ''
          }}
        >
          <option value="">Share a win…</option>
          {wins.map((w) => (
            <option key={w.id} value={w.id}>
              {w.caption.slice(0, 60)}
            </option>
          ))}
        </select>
      )}
      {tab === 'link' && (
        <div className="flex gap-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://…"
            className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              const u = link.trim()
              if (!u) return
              onPick({ url: u, title: u.replace(/^https?:\/\//, '').slice(0, 40) })
              setLink('')
            }}
            className="rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold"
          >
            Attach
          </button>
        </div>
      )}
    </div>
  )
}
