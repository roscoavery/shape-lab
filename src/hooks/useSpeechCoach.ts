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
 *
 * Phone Safari (especially iPhone) often never fires `onend` on short lines
 * like "2.", and camera / MediaRecorder can drop the speech unlock. We:
 *   - say counts as words ("Two.") so the utterance is long enough
 *   - watchdog any utterance that never ends
 *   - cancel + gap between lines on iOS
 *   - keep a silent AudioContext alive from the Start tap
 */

import { useCallback, useEffect, useRef } from 'react'
import { isIosDevice, isPhoneBrowser } from '../lib/delayCameraPipeline'

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

/**
 * iPhone Safari often swallows `onend` on a one-syllable "2." / "3."
 * Speak the count as a word so the line actually finishes and the next
 * class-flow cue ("Fall to lunge.") can start.
 */
const COUNT_WORD: Record<string, string> = {
  '1': 'One',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
  '10': 'Ten',
  '20': 'Twenty',
  '30': 'Thirty',
}

export function expandLeadCount(text: string): string {
  return text.replace(/^(\d+)\.(\s|$)/, (_m, n: string, rest: string) => {
    const word = COUNT_WORD[n]
    return word ? `${word}.${rest}` : `${n}.${rest}`
  })
}

function estimateUtteranceMs(text: string, rate: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const raw = Math.max(520, words * 320 + 200)
  return Math.round(raw / Math.max(0.65, rate))
}

type SpeechJob = {
  text: string
  rate: number
  pitch: number
  onEnd?: () => void
}

type KeepAlive = {
  ctx: AudioContext
  osc: OscillatorNode
  gain: GainNode
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

function audioContextCtor(): (new () => AudioContext) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    AudioContext?: new () => AudioContext
    webkitAudioContext?: new () => AudioContext
  }
  return w.AudioContext ?? w.webkitAudioContext ?? null
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
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const keepAliveRef = useRef<KeepAlive | null>(null)
  const pumpTimerRef = useRef<number | null>(null)
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

  /**
   * Chrome pauses speechSynthesis after ~15s of talking. Resume when paused.
   * On iPhone, calling resume() while already speaking can stall the queue —
   * only resume if Safari actually paused us.
   */
  useEffect(() => {
    if (!supported) return
    const id = window.setInterval(() => {
      try {
        if (isIosDevice()) {
          if (window.speechSynthesis.paused) window.speechSynthesis.resume()
          const keep = keepAliveRef.current
          if (keep && keep.ctx.state === 'suspended') void keep.ctx.resume()
          return
        }
        if (
          window.speechSynthesis.speaking ||
          window.speechSynthesis.pending ||
          window.speechSynthesis.paused
        ) {
          window.speechSynthesis.resume()
        }
      } catch {
        /* ignore */
      }
    }, 4000)
    return () => window.clearInterval(id)
  }, [supported])

  const stopKeepAlive = useCallback(() => {
    const keep = keepAliveRef.current
    keepAliveRef.current = null
    if (!keep) return
    try {
      keep.osc.stop()
    } catch {
      /* already stopped */
    }
    try {
      keep.osc.disconnect()
      keep.gain.disconnect()
    } catch {
      /* ignore */
    }
    void keep.ctx.close().catch(() => undefined)
  }, [])

  const startKeepAlive = useCallback(() => {
    if (!isIosDevice()) return
    const Ctor = audioContextCtor()
    if (!Ctor) return
    try {
      let keep = keepAliveRef.current
      if (keep && keep.ctx.state !== 'closed') {
        void keep.ctx.resume()
        return
      }
      const ctx = new Ctor()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      gain.gain.value = 0.00008
      osc.frequency.value = 180
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      keepAliveRef.current = { ctx, osc, gain }
      void ctx.resume()
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => () => stopKeepAlive(), [stopKeepAlive])

  const ensureVoice = useCallback(() => {
    if (!voiceRef.current) voiceRef.current = pickNaturalVoice()
    return voiceRef.current
  }, [])

  const pumpRef = useRef<() => void>(() => {})

  const pump = useCallback(() => {
    if (!supported || speakingRef.current) return
    const next = queueRef.current.shift()
    if (!next) return
    speakingRef.current = true

    const startUtterance = () => {
      const voice = ensureVoice()
      const spoken = expandLeadCount(next.text)
      const u = new SpeechSynthesisUtterance(spoken)
      u.lang = voice?.lang || 'en-US'
      if (voice) u.voice = voice
      u.rate = next.rate
      u.pitch = next.pitch
      u.volume = 1
      let finished = false
      let watchdog = 0
      const done = () => {
        if (finished) return
        finished = true
        window.clearTimeout(watchdog)
        if (utteranceRef.current === u) utteranceRef.current = null
        next.onEnd?.()
        speakingRef.current = false
        const gap = isIosDevice() ? 50 : 0
        if (gap) {
          if (pumpTimerRef.current != null) window.clearTimeout(pumpTimerRef.current)
          pumpTimerRef.current = window.setTimeout(() => {
            pumpTimerRef.current = null
            pumpRef.current()
          }, gap)
        } else {
          pumpRef.current()
        }
      }
      const extra = isPhoneBrowser() ? 800 : 4000
      watchdog = window.setTimeout(() => {
        if (finished) return
        try {
          window.speechSynthesis.cancel()
        } catch {
          /* ignore */
        }
        done()
      }, estimateUtteranceMs(spoken, next.rate) + extra)
      u.onend = () => done()
      u.onerror = () => done()
      utteranceRef.current = u
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume()
        else if (!isIosDevice()) window.speechSynthesis.resume()
        window.speechSynthesis.speak(u)
      } catch {
        done()
      }
    }

    if (isIosDevice()) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        /* ignore */
      }
      if (pumpTimerRef.current != null) window.clearTimeout(pumpTimerRef.current)
      pumpTimerRef.current = window.setTimeout(() => {
        pumpTimerRef.current = null
        startUtterance()
      }, 40)
      return
    }
    startUtterance()
  }, [supported, ensureVoice])

  pumpRef.current = pump

  const enqueue = useCallback(
    (
      text: string,
      opts: { rate: number; pitch: number; interrupt?: boolean; onEnd?: () => void },
    ) => {
      const spoken = stripDegreeSpeak(text.trim())
      if (!spoken) {
        opts.onEnd?.()
        return
      }
      if (!enabled || !supported) {
        opts.onEnd?.()
        return
      }
      const job: SpeechJob = {
        text: spoken,
        rate: opts.rate,
        pitch: opts.pitch,
        onEnd: opts.onEnd,
      }
      if (opts.interrupt) {
        queueRef.current = [job]
        speakingRef.current = false
        if (pumpTimerRef.current != null) {
          window.clearTimeout(pumpTimerRef.current)
          pumpTimerRef.current = null
        }
        try {
          window.speechSynthesis.cancel()
        } catch {
          /* ignore */
        }
        window.setTimeout(() => pump(), 60)
        return
      }
      queueRef.current.push(job)
      pump()
    },
    [enabled, supported, pump],
  )

  const speakEvent = useCallback(
    (text: string, interrupt = false, onEnd?: () => void) => {
      enqueue(text, { rate: 0.94, pitch: 1.06, interrupt, onEnd })
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
    utteranceRef.current = null
    if (pumpTimerRef.current != null) {
      window.clearTimeout(pumpTimerRef.current)
      pumpTimerRef.current = null
    }
    if (supported) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        /* ignore */
      }
    }
  }, [supported])

  /** Call from a click handler before any await — unlocks iOS / Chrome speech. */
  const unlock = useCallback(() => {
    if (!supported) return
    startKeepAlive()
    try {
      window.speechSynthesis.resume()
      const u = new SpeechSynthesisUtterance(' ')
      u.volume = 0
      u.rate = 2
      u.lang = 'en-US'
      utteranceRef.current = u
      window.speechSynthesis.speak(u)
    } catch {
      /* ignore */
    }
  }, [supported, startKeepAlive])

  return {
    speak,
    speakCue,
    speakEvent,
    speakHit,
    speakClose,
    speakLost,
    reset,
    unlock,
    holdAudio: startKeepAlive,
    supported,
  }
}
