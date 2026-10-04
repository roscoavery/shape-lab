import { useEffect } from 'react'

/**
 * Ties two video playheads together (Compare tool link button).
 *
 * When linked:
 * - Engaging the link pulls the later playhead back to the earlier one, so
 *   both videos start the linked session from the same moment.
 * - Scrubbing one video moves the other by the same delta in seconds
 *   (not the same percentage — clips have different durations). Deltas are
 *   clamped at each video's duration.
 * - Pressing play on one starts the other; pausing one pauses the other.
 *
 * A `syncing` flag plus a minimum-delta threshold prevents feedback loops:
 * the follower's own `seeked` event computes a ~zero delta and does nothing.
 */
export function useLinkedPlayheads(
  a: HTMLVideoElement | null,
  b: HTMLVideoElement | null,
  linked: boolean,
) {
  useEffect(() => {
    if (!linked || !a || !b) return
    let syncing = false
    let lastA = a.currentTime
    let lastB = b.currentTime

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
          const target = clampTime(a, startB)
          a.currentTime = target
          lastA = target
        } else {
          const target = clampTime(b, startA)
          b.currentTime = target
          lastB = target
        }
      } catch {
        /* not seekable right now */
      }
      releaseSoon()
    }

    /** Scrub on `from` moves `to` by the same seconds delta. */
    const linkSeek = (
      from: HTMLVideoElement,
      to: HTMLVideoElement,
      getLast: () => number,
      setLast: (n: number) => void,
    ) => {
      if (syncing) return
      const delta = from.currentTime - getLast()
      setLast(from.currentTime)
      if (Math.abs(delta) < 0.004) return
      const dur = Number.isFinite(to.duration) && to.duration > 0 ? to.duration : 0
      const target = dur > 0 ? Math.max(0, Math.min(dur, to.currentTime + delta)) : to.currentTime + delta
      if (Math.abs(to.currentTime - target) < 0.03) {
        setLast(to.currentTime)
        return
      }
      syncing = true
      try {
        to.currentTime = target
      } catch {
        /* not seekable right now */
      }
      setLast(target)
      releaseSoon()
    }

    const onSeekedA = () => linkSeek(a, b, () => lastA, (n) => { lastA = n })
    const onSeekedB = () => linkSeek(b, a, () => lastB, (n) => { lastB = n })

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

    a.addEventListener('seeked', onSeekedA)
    b.addEventListener('seeked', onSeekedB)
    a.addEventListener('play', onPlayA)
    b.addEventListener('play', onPlayB)
    a.addEventListener('pause', onPauseA)
    b.addEventListener('pause', onPauseB)
    return () => {
      a.removeEventListener('seeked', onSeekedA)
      b.removeEventListener('seeked', onSeekedB)
      a.removeEventListener('play', onPlayA)
      b.removeEventListener('play', onPlayB)
      a.removeEventListener('pause', onPauseA)
      b.removeEventListener('pause', onPauseB)
    }
  }, [a, b, linked])
}
