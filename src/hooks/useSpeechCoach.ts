/**
 * Speech coaching — speak main corrections without spamming.
 * Throttles utterances (~4s) and skips repeats of the same cue.
 */

import { useCallback, useEffect, useRef } from 'react'

const DEFAULT_THROTTLE_MS = 4000

export function useSpeechCoach(enabled: boolean, throttleMs = DEFAULT_THROTTLE_MS) {
  const lastSpokenRef = useRef<string | null>(null)
  const lastAtRef = useRef(0)
  const supported =
    typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'

  useEffect(() => {
    if (!enabled || !supported) return
    // Warm up voices on some browsers
    window.speechSynthesis.getVoices()
  }, [enabled, supported])

  const speak = useCallback(
    (text: string | null | undefined) => {
      if (!enabled || !supported || !text) return
      const cleaned = text.trim()
      if (!cleaned) return

      const now = Date.now()
      if (cleaned === lastSpokenRef.current && now - lastAtRef.current < throttleMs) {
        return
      }
      if (now - lastAtRef.current < throttleMs && lastSpokenRef.current) {
        // Different cue, but still within throttle window — skip
        return
      }

      lastSpokenRef.current = cleaned
      lastAtRef.current = now

      try {
        window.speechSynthesis.cancel()
        const utter = new SpeechSynthesisUtterance(cleaned)
        utter.rate = 1.05
        utter.pitch = 1
        utter.volume = 1
        window.speechSynthesis.speak(utter)
      } catch {
        // Speech API unavailable / blocked
      }
    },
    [enabled, supported, throttleMs],
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

  return { speak, reset, supported }
}
