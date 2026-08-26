/**
 * On-device voice coaching.
 *
 * ChatGPT Cove is not available in the browser. We pick the most natural
 * English voice the OS/browser ships (Google US, Samantha, Aria/Jenny Neural,
 * etc.) and speak a bit slower than the default robotic rate.
 */

import { useCallback, useEffect, useRef } from 'react'

const DEFAULT_THROTTLE_MS = 4000

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

const HIT_LINES = [
  (name: string) => `Yes, that's a ${name}.`,
  (name: string) => `Yep, there's the ${name}.`,
  (name: string) => `Yes — that's the ${name}.`,
  (name: string) => `Yep, that's a ${name}.`,
]

function speakNow(
  text: string,
  voice: SpeechSynthesisVoice | null,
  opts: { rate: number; pitch: number },
) {
  const u = new SpeechSynthesisUtterance(text)
  u.lang = voice?.lang || 'en-US'
  if (voice) u.voice = voice
  u.rate = opts.rate
  u.pitch = opts.pitch
  u.volume = 1
  try {
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch {
    /* speech blocked */
  }
}

export function useSpeechCoach(enabled: boolean, throttleMs = DEFAULT_THROTTLE_MS) {
  const lastSpokenRef = useRef<string | null>(null)
  const lastAtRef = useRef(0)
  const hitIdx = useRef(0)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
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

  const speak = useCallback(
    (text: string | null | undefined) => {
      if (!enabled || !supported || !text) return
      const cleaned = text.trim()
      if (!cleaned) return

      const now = Date.now()
      if (cleaned === lastSpokenRef.current && now - lastAtRef.current < throttleMs) return
      if (now - lastAtRef.current < throttleMs && lastSpokenRef.current) return

      lastSpokenRef.current = cleaned
      lastAtRef.current = now
      if (!voiceRef.current) voiceRef.current = pickNaturalVoice()
      speakNow(cleaned, voiceRef.current, { rate: 0.92, pitch: 1.04 })
    },
    [enabled, supported, throttleMs],
  )

  const speakHit = useCallback(
    (shapeName: string) => {
      if (!enabled || !supported || !shapeName) return
      const now = Date.now()
      if (now - lastAtRef.current < 700) return
      const line = HIT_LINES[hitIdx.current % HIT_LINES.length]!(shapeName)
      hitIdx.current += 1
      lastSpokenRef.current = line
      lastAtRef.current = now
      if (!voiceRef.current) voiceRef.current = pickNaturalVoice()
      speakNow(line, voiceRef.current, { rate: 0.94, pitch: 1.06 })
    },
    [enabled, supported],
  )

  const reset = useCallback(() => {
    lastSpokenRef.current = null
    lastAtRef.current = 0
    if (supported) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        /* ignore */
      }
    }
  }, [supported])

  return { speak, speakHit, reset, supported }
}
