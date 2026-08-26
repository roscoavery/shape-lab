/**
 * Instagram post/reel via Instagram's public embed.
 *
 * Instagram will not give us a real <video> (no scrub / slow-mo), and their
 * player often tries to send you to instagram.com to watch a second time.
 * We keep you here: sandbox blocks leaving this tab, Play again remounts the
 * embed, and Loop (on by default) remounts when Instagram navigates the iframe
 * after the clip ends.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { parseInstagramUrl } from '../../lib/clipStore'

/** Ignore iframe loads during Instagram's own first-paint redirects. */
const STARTUP_MS = 2500

export function InstagramEmbed({ url }: { url: string }) {
  const parsed = parseInstagramUrl(url)
  const [generation, setGeneration] = useState(0)
  const [loop, setLoop] = useState(true)
  const mountedAtRef = useRef(0)
  const loopRef = useRef(loop)
  loopRef.current = loop

  const replay = useCallback(() => {
    // Stamp now synchronously so the replacement iframe's first load is not
    // treated as Instagram navigating away (useEffect would be too late).
    mountedAtRef.current = Date.now()
    setGeneration((g) => g + 1)
  }, [])

  useEffect(() => {
    mountedAtRef.current = Date.now()
    setGeneration(0)
  }, [url])

  if (!parsed) {
    return (
      <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
        Couldn't parse that Instagram link. Expected a post/reel URL like
        https://www.instagram.com/reel/ABC123/
      </p>
    )
  }

  const embedSrc = `https://www.instagram.com/${parsed.type}/${parsed.code}/embed/captioned/`

  const onFrameLoad = () => {
    if (!loopRef.current) return
    if (Date.now() - mountedAtRef.current < STARTUP_MS) return
    // A load after the clip has been showing usually means Instagram navigated
    // the iframe toward instagram.com (their "play again"). Restart the embed.
    replay()
  }

  const btn =
    'rounded-md border border-[var(--panel-border)] px-2.5 py-1 text-sm hover:bg-[#243040]'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onClick={replay} className={btn}>
          Play again
        </button>
        <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <input
            type="checkbox"
            checked={loop}
            onChange={(e) => setLoop(e.target.checked)}
          />
          Loop in this app
        </label>
        <span className="text-xs text-[var(--muted)]">
          stays here — Instagram will try to send you out to replay
        </span>
      </div>
      <iframe
        key={`${parsed.code}-${generation}`}
        src={`${embedSrc}?s=${generation}`}
        title="Instagram post"
        loading="eager"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={onFrameLoad}
        className="h-[min(720px,80vh)] w-full rounded-lg border border-[var(--panel-border)] bg-white"
      />
      <p className="rounded-lg border border-[var(--warn)]/40 bg-[#2a2312] px-3 py-2 text-xs leading-relaxed text-[var(--warn)]">
        Public reels play here. <strong className="text-[var(--text)]">Play again</strong> restarts
        the embed without opening Instagram. <strong className="text-[var(--text)]">Loop in this
        app</strong> does the same when Instagram tries to leave after the clip. No frame scrub or
        slow-mo — upload a file for that. Reels with copyrighted audio may still only say “Watch on
        Instagram”; Instagram blocks those from playing outside their app.
      </p>
    </div>
  )
}
