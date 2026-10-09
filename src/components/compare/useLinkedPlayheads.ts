import { useEffect } from 'react'

/**
 * Ties two video playheads together (Compare tool link button).
 *
 * When linked:
 * - Engaging the link pulls the later playhead back to the earlier one, so
 *   both videos start the linked session from the same moment.
 * - Pressing play on one starts the other; pausing one pauses the other.
 *
 * Scrub sync is NOT done here: scrubbing is driven directly by the parent
 * via onScrub callbacks (ComparePanel), which set the other video's
 * currentTime synchronously in the same pointermove. The old seeked-event
 * approach lagged and fought during rapid scrubbing.
 *
 * A `syncing` flag prevents feedback loops on play/pause.
 */
export function useLinkedPlayheads(
  a: HTMLVideoElement | null,
  b: HTMLVideoElement | null,
  linked: boolean,
) {
  useEffect(() => {
    if (!linked || !a || !b) return
    let syncing = false

    const releaseSoon = () => {
      window.setTimeout(() => {
        syncing = false
      }, 120)
    }

    /** Clamp a target time into a video's known duration. */
    const clampTime = (v: HTMLVideoElement, t: number) => {
      const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0
      return dur > 0 ? Math.max(0, Math.min(dur, t)) : t
    }

    // On engage, pull the later playhead back to the earlier one so both
    // videos start the linked session from the same moment.
    const startA = a.currentTime
    const startB = b.currentTime
    if (
      Number.isFinite(startA) &&
      Number.isFinite(startB) &&
      Math.abs(startA - startB) > 0.05
    ) {
      syncing = true
      try {
        if (startA > startB) {
          a.currentTime = clampTime(a, startB)
        } else {
          b.currentTime = clampTime(b, startA)
        }
      } catch {
        /* not seekable right now */
      }
      releaseSoon()
    }

    const linkPlay = (to: HTMLVideoElement) => {
      if (syncing || !to.paused) return
      syncing = true
      void to.play().catch(() => {})
      releaseSoon()
    }
    const linkPause = (to: HTMLVideoElement) => {
      if (syncing || to.paused) return
      syncing = true
      to.pause()
      releaseSoon()
    }

    const onPlayA = () => linkPlay(b)
    const onPlayB = () => linkPlay(a)
    const onPauseA = () => linkPause(b)
    const onPauseB = () => linkPause(a)

    a.addEventListener('play', onPlayA)
    b.addEventListener('play', onPlayB)
    a.addEventListener('pause', onPauseA)
    b.addEventListener('pause', onPauseB)
    return () => {
      a.removeEventListener('play', onPlayA)
      b.removeEventListener('play', onPlayB)
      a.removeEventListener('pause', onPauseA)
      b.removeEventListener('pause', onPauseB)
    }
  }, [a, b, linked])
}
