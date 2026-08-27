import { useState } from 'react'
import {
  downloadFlowPack,
  shareToInstagramStory,
  storyCaption,
} from '../lib/flowShare'
import { markFlowSharedWithCoach } from '../lib/storage'
import type { Athlete, FlowRunReport } from '../types'

type Props = {
  report: FlowRunReport
  athlete?: Athlete | null
  onUpdated?: (report: FlowRunReport) => void
  compact?: boolean
}

export function FlowShareActions({ report, athlete, onUpdated, compact }: Props) {
  const [flash, setFlash] = useState<string | null>(null)

  const note = (msg: string) => {
    setFlash(msg)
    window.setTimeout(() => setFlash(null), 3200)
  }

  const download = async () => {
    const result = await downloadFlowPack(report, athlete)
    note(
      result.video
        ? 'Downloaded video + analysis.'
        : 'Downloaded analysis. No video on this run (keep the camera on next time).',
    )
  }

  const shareStory = async () => {
    const result = await shareToInstagramStory(report, athlete)
    if (result === 'shared') note('Share sheet opened. Caption is copied — pick Instagram Stories.')
    else if (result === 'downloaded')
      note('Video and analysis downloaded. Caption copied. Instagram should open — add the video to your Story.')
    else note('Caption ready, but there is no video to share yet.')
  }

  const sendCoach = () => {
    const next = markFlowSharedWithCoach(report.id)
    if (next) {
      onUpdated?.(next)
      note('Marked for Ryan. Open Athletes to see the coach inbox. Also download and DM the video if you are not on this same device.')
    } else {
      note('Could not mark this run.')
    }
  }

  const btn = compact
    ? 'rounded-md border border-[var(--panel-border)] px-2 py-1 text-[11px]'
    : 'rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm'

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void download()} className={btn}>
          Download video + analysis
        </button>
        <button type="button" onClick={() => void shareStory()} className={btn}>
          Share to Instagram Story
        </button>
        <button type="button" onClick={sendCoach} className={btn}>
          {report.sharedWithCoachAt ? 'Sent to Ryan' : 'Send to Ryan'}
        </button>
      </div>
      {!compact && (
        <p className="mt-1.5 text-[11px] leading-snug text-[var(--muted)]">
          Instagram does not let a website auto-post your Story. We save the clip, copy this
          caption, and open Instagram so you can drop it on your Story. Caption:{' '}
          <span className="text-[var(--text)]">{storyCaption(report, athlete).split('\n')[0]}</span>
        </p>
      )}
      {flash && <p className="mt-1 text-[11px] text-[var(--accent)]">{flash}</p>}
    </div>
  )
}
