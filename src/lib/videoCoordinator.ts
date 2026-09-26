/**
 * One video plays at a time: whichever registered <video> is closest to the
 * middle of the screen plays, the rest pause. Components opt in by calling
 * registerCenterPlay(el); the returned function unregisters.
 *
 * User taps win: if the user presses play on a video, it becomes the chosen
 * one until they scroll it away or press pause.
 */

const entries = new Map<HTMLVideoElement, { ratio: number }>()
let chosenByUser: HTMLVideoElement | null = null
let raf = 0
let io: IntersectionObserver | null = null

function viewportCenterY(): number {
  return window.innerHeight / 2
}

function distanceFromCenter(el: HTMLVideoElement): number {
  const r = el.getBoundingClientRect()
  const elCenter = r.top + r.height / 2
  return Math.abs(elCenter - viewportCenterY())
}

function scheduleUpdate() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    update()
  })
}

function update() {
  // Drop dead elements.
  for (const el of entries.keys()) {
    if (!el.isConnected) {
      entries.delete(el)
      if (chosenByUser === el) chosenByUser = null
    }
  }
  if (entries.size === 0) return

  let target: HTMLVideoElement | null = null

  // Honor an explicit user choice while it is still on screen.
  if (chosenByUser && entries.has(chosenByUser)) {
    const r = chosenByUser.getBoundingClientRect()
    const onScreen = r.bottom > 0 && r.top < window.innerHeight
    if (onScreen && !chosenByUser.paused) {
      target = chosenByUser
    } else {
      chosenByUser = null
    }
  }

  // Otherwise: closest to the middle of the screen wins.
  if (!target) {
    let bestDist = Infinity
    for (const [el, info] of entries) {
      if (info.ratio <= 0) continue
      if (!el.paused && chosenByUser === el) {
        target = el
        break
      }
      const d = distanceFromCenter(el)
      if (d < bestDist) {
        bestDist = d
        target = el
      }
    }
  }

  for (const el of entries.keys()) {
    if (el === target) {
      if (el.paused && el.getAttribute('src')) {
        el.play().catch(() => {})
      }
    } else if (!el.paused) {
      el.pause()
    }
  }
}

function ensureObserver() {
  if (io || typeof IntersectionObserver === 'undefined') return
  io = new IntersectionObserver(
    (list) => {
      for (const e of list) {
        const el = e.target as HTMLVideoElement
        if (!entries.has(el)) continue
        if (e.isIntersecting) {
          entries.set(el, { ratio: e.intersectionRatio })
        } else {
          entries.set(el, { ratio: 0 })
        }
      }
      scheduleUpdate()
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  )
  window.addEventListener('scroll', scheduleUpdate, { passive: true })
  window.addEventListener('resize', scheduleUpdate)
}

/** Register a video for center-play coordination. Returns an unregister fn. */
export function registerCenterPlay(el: HTMLVideoElement): () => void {
  ensureObserver()
  entries.set(el, { ratio: 0 })
  io?.observe(el)
  scheduleUpdate()
  return () => {
    entries.delete(el)
    io?.unobserve(el)
    if (chosenByUser === el) chosenByUser = null
  }
}

/** Call when the user presses play: this video wins until they scroll away. */
export function noteUserPlay(el: HTMLVideoElement) {
  if (!entries.has(el)) return
  chosenByUser = el
  scheduleUpdate()
}

/** Call when the user presses pause: release the manual choice. */
export function noteUserPause(el: HTMLVideoElement) {
  if (chosenByUser === el) chosenByUser = null
}

/**
 * When the user taps an embed iframe (YouTube / TikTok), the window blurs —
 * pause every coordinated native video so it doesn't play under the embed.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('blur', () => {
    for (const el of entries.keys()) {
      if (!el.paused) el.pause()
    }
    chosenByUser = null
  })
}
