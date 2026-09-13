import { StationSnapshot } from '../today/StationSnapshot'

type Props = {
  photoDataUrl?: string
  athleteId?: string
  name?: string
  hint?: string
  onCapture: (dataUrl: string) => void
}

export function FaceSnapshotField({ photoDataUrl, athleteId, name, hint, onCapture }: Props) {
  const who = name?.trim() || 'this name'
  return (
    <div className="rounded-2xl border border-[#6ec8d6]/50 bg-[#102028] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6ec8d6]">
        Pair this face
      </p>
      <h4 className="mt-1 text-lg font-semibold text-[var(--text)]">Snapshot for {who}</h4>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
        {hint ??
          'Take a snapshot so we can pair this face with this name. The names test uses these pictures — without a face, coaches cannot practice who is who.'}
      </p>
      <div className="mt-3">
        <StationSnapshot
          photoDataUrl={photoDataUrl}
          athleteId={athleteId}
          allowUpload
          onCapture={onCapture}
        />
      </div>
    </div>
  )
}
