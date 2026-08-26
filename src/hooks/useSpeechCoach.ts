/**
 * On-device voice coaching.
 *
 * ChatGPT Cove is not available in the browser. We pick the most natural
 * English voice the OS/browser ships and speak a bit slower than default.
 *
 * Two channels:
 *   speakEvent — hits, hold-complete, next-shape (queued; does not cut a sentence)
 *   speakCue   — close / almost / corrections (queued, lightly throttled)
 *
 * Only skip / reset / pause cancel speech. Everything else waits its turn so
 * the coach can finish the cue before saying the next line.
 */

import { useCallback, useEffect, useRef } from 'react'

const CUE_THROTTLE_MS = 2200

/** Voice says the correction, not a protractor reading. */
function stripDegreeSpeak(text: string): string {
  let s = text.replace(/\{delta\}/gi, '')
  s = s.replace(/\(\s*[-+]?\d+(?:\.\d+)?\s*°?\s*\)/g, '')
  s = s.replace(/[-+]?\d+(?:\.\d+)?\s*°/g, '')
  s = s.replace(/\s*°/g, '')
  s = s.replace(/\s+off vertical/gi, '')
  s = s.replace(/\s{2,}/g, ' ')
  s = s.replace(/\s+([.,!?;:])/g, '$1')
  s = s.replace(/[—–-]\s*$/g, '')
  s = s.replace(/\s+\./g, '.')
  return s.replace(/\s+/g, ' ').trim()
}

type SpeechJob = {
  text: string
  rate: number
  pitch: number
}

function voiceScore(v: SpeechSynthesisVoice): number {
  const n = `${v.name} ${v.lang}`.toLowerCase()
  if (!/^en\b/.test(v.lang.toLowerCase()) && !n.includes('en-')) return 0
  let s = 12
  if (n.includes('natural') || n.includes('neural') || n.includes('online')) s += 42
  if (n.includes('google') && (n.includes('us') || n.includes('en-us'))) s += 38
  if (n.includes('google uk') || n.includes('en-gb')) s += 28
  if (n.includes('samantha') || n.includes('karen') || n.includes('moira') || n.includes('tessa'))
    s += 34
  if (n.includes('daniel') || n.includes('aaron') || n.includes('nicky')) s += 30
  if (n.includes('aria') || n.includes('jenny') || n.includes('guy') || n.includes('sara')) s += 32
  if (n.includes('siri') || n.includes('enhanced') || n.includes('premium')) s += 30
  if (n.includes('microsoft') && n.includes('english')) s += 18
  if (v.localService === false) s += 10
  if (n.includes('compact') || n.includes('eloquence') || n.includes('espeak') || n.includes('pico'))
    s -= 30
  if (n.includes('fred') || n.includes('albert') || n.includes('whisper') || n.includes('zarvox'))
    s -= 24
  return s
}

function pickNaturalVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null
  const ranked = [...voices].sort((a, b) => voiceScore(b) - voiceScore(a))
  return ranked[0] && voiceScore(ranked[0]) > 0 ? ranked[0] : (ranked[0] ?? null)
}

const HIT_FIRST = [
  (name: string) => `Yes, that's a ${name}.`,
  (name: string) => `Yep, there's the ${name}.`,
  (name: string) => `Yes — that's the ${name}.`,
  (name: string) => `Nice, that's a ${name}.`,
]

const HIT_AGAIN = [
  (name: string) => `Back in it — that's a ${name}.`,
  (name: string) => `Yes, that's the ${name} again.`,
  (name: string) => `You found it — that's a ${name}.`,
  (name: string) => `Yep, there's the ${name} again.`,
]

const CLOSE_PREFIX = ['Close.', 'Almost.', 'Nearly there.']
const LOST_PREFIX = ['You lost it.', 'Almost had it.', 'It slipped.']

export function holdPrompt(seconds: number): string {
  if (seconds <= 1.05) return 'Hit it and keep it for a beat.'
  if (seconds <= 3.05) return "I'll count 3, 2, 1."
  const n = Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(1)
  return `Hold ${n} seconds.`
}

export function useSpeechCoach(enabled: boolean) {
  const lastCueRef = useRef<string | null>(null)
  const lastCueAt = useRef(0)
  const hitIdx = useRef(0)
  const againIdx = useRef(0)
  const closeIdx = useRef(0)
  const lostIdx = useRef(0)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const queueRef = useRef<SpeechJob[]>([])
  const speakingRef = useRef(false)
  const supported =
    typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'

  useEffect(() => {
    if (!supported) return
    const refresh = () => {
      voiceRef.current = pickNaturalVoice()
    }
    refresh()
    window.speechSynthesis.addEventListener('voiceschanged', refresh)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh)
  }, [supported])

  const ensureVoice = useCallback(() => {
    if (!voiceRef.current) voiceRef.current = pickNaturalVoice()
    return voiceRef.current
  }, [])

  const pumpRef = useRef<() => void>(() => {})

  const pump = useCallback(() => {
    if (!supported || speakingRef.current) return
    const next = queueRef.current.shift()
    if (!next) return
    const voice = ensureVoice()
    const u = new SpeechSynthesisUtterance(next.text)
    u.lang = voice?.lang || 'en-US'
    if (voice) u.voice = voice
    u.rate = next.rate
    u.pitch = next.pitch
    u.volume = 1
    speakingRef.current = true
    const done = () => {
      speakingRef.current = false
      pumpRef.current()
    }
    u.onend = done
    u.onerror = done
    try {
      window.speechSynthesis.speak(u)
    } catch {
      speakingRef.current = false
    }
  }, [supported, ensureVoice])

  pumpRef.current = pump

  const enqueue = useCallback(
    (text: string, opts: { rate: number; pitch: number; interrupt?: boolean }) => {
      if (!enabled || !supported || !text.trim()) return
      const spoken = stripDegreeSpeak(text.trim())
      if (!spoken) return
      const job: SpeechJob = { text: spoken, rate: opts.rate, pitch: opts.pitch }
      if (opts.interrupt) {
        queueRef.current = [job]
        speakingRef.current = false
        try {
          window.speechSynthesis.cancel()
        } catch {
          /* ignore */
        }
        window.setTimeout(() => pump(), 40)
        return
      }
      if (queueRef.current.length >= 4) queueRef.current.pop()
      queueRef.current.push(job)
      pump()
    },
    [enabled, supported, pump],
  )

  const speakEvent = useCallback(
    (text: string, interrupt = false) => {
      enqueue(text, { rate: 0.94, pitch: 1.06, interrupt })
    },
    [enqueue],
  )

  const speakCue = useCallback(
    (text: string) => {
      if (!text.trim()) return
      const cleaned = stripDegreeSpeak(text.trim())
      if (!cleaned) return
      const now = Date.now()
      if (cleaned === lastCueRef.current && now - lastCueAt.current < CUE_THROTTLE_MS) return
      if (now - lastCueAt.current < 900) return
      lastCueRef.current = cleaned
      lastCueAt.current = now
      enqueue(cleaned, { rate: 0.92, pitch: 1.04, interrupt: false })
    },
    [enqueue],
  )

  /** Corrections / homework still call this. */
  const speak = speakCue

  const speakHit = useCallback(
    (shapeName: string, again: boolean) => {
      if (!shapeName) return
      const line = again
        ? HIT_AGAIN[againIdx.current++ % HIT_AGAIN.length]!(shapeName)
        : HIT_FIRST[hitIdx.current++ % HIT_FIRST.length]!(shapeName)
      speakEvent(line)
    },
    [speakEvent],
  )

  const speakClose = useCallback(
    (cue: string | null) => {
      const prefix = CLOSE_PREFIX[closeIdx.current++ % CLOSE_PREFIX.length]!
      const extra = cue && !cue.toLowerCase().startsWith('excellent') ? ` ${cue}` : ''
      speakCue(`${prefix}${extra}`)
    },
    [speakCue],
  )

  const speakLost = useCallback(
    (cue: string | null) => {
      const prefix = LOST_PREFIX[lostIdx.current++ % LOST_PREFIX.length]!
      const extra = cue && !cue.toLowerCase().startsWith('excellent') ? ` ${cue}` : ' Find it again.'
      speakEvent(`${prefix}${extra}`)
    },
    [speakEvent],
  )

  const reset = useCallback(() => {
    lastCueRef.current = null
    lastCueAt.current = 0
    queueRef.current = []
    speakingRef.current = false
    if (supported) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        /* ignore */
      }
    }
  }, [supported])

  return {
    speak,
    speakCue,
    speakEvent,
    speakHit,
    speakClose,
    speakLost,
    reset,
    supported,
  }
}
