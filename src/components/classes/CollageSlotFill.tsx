import { useRef, useState } from 'react'
import type { GymClip } from '../../lib/gymLibrary'
import { fileToClipBlob, recordQuickClip, saveQuickClip } from '../../lib/quickClip'
import { CollageClipPicker } from './CollageClipPicker'

type Props = {
  url: string
  clipId?: string
  clips: GymClip[]
  viewerId?: string | null
  onPick: (clip: { id: string; url: string }) => void
}

export function CollageSlotFill({ url, clipId, clips, viewerId, onPick }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState<'record' | 'upload' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const putClip = async (blob: Blob, name: string) => {
    if (!viewerId) {
      setError('Unlock a profile to drop a clip into this panel.')
      return
    }
    const saved = await saveQuickClip({
      athleteId: viewerId,
      blob,
      name,
      source: 'collage',
    })
    onPick({ id: saved.id, url: saved.url })
  }

  return (
    <div className="space-y-1">
      <CollageClipPicker url={url} clipId={clipId} clips={clips} compact onPick={onPick} />
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          disabled={!viewerId || Boolean(busy)}
          onClick={() => {
            setError(null)
            setBusy('record')
            void recordQuickClip(8)
              .then((blob) => putClip(blob, 'Collage clip'))
              .catch((err) => setError(err instanceof Error ? err.message : 'Could not record.'))
              .finally(() => setBusy(null))
          }}
          className="rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-black disabled:opacity-40"
        >
          {busy === 'record' ? 'Recording…' : 'Record'}
        </button>
        <button
          type="button"
          disabled={!viewerId || Boolean(busy)}
          onClick={() => fileRef.current?.click()}
          className="rounded-md border border-white/40 px-2 py-0.5 text-[10px] font-semibold text-white disabled:opacity-40"
        >
          {busy === 'upload' ? 'Saving…' : 'From Photos'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="video/*,image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            setError(null)
            setBusy('upload')
            void fileToClipBlob(file)
              .then((blob) => putClip(blob, file.name.replace(/\.[^.]+$/, '') || 'Photo clip'))
              .catch((err) => setError(err instanceof Error ? err.message : 'Could not add that clip.'))
              .finally(() => setBusy(null))
          }}
        />
      </div>
      {error && <p className="text-[10px] text-[#ffb4b4]">{error}</p>}
    </div>
  )
}
