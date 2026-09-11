/** Short success chime when a hold is complete and the task advances. */

let ctx: AudioContext | null = null

function audioContextCtor(): (new () => AudioContext) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    AudioContext?: new () => AudioContext
    webkitAudioContext?: new () => AudioContext
  }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

function audio(): AudioContext | null {
  const Ctor = audioContextCtor()
  if (!Ctor) return null
  if (!ctx || ctx.state === 'closed') ctx = new Ctor()
  return ctx
}

export function playSuccessChime(): void {
  try {
    const ac = audio()
    if (!ac) return
    void ac.resume()
    const now = ac.currentTime;
    const master = ac.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    master.connect(ac.destination);

    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = now + i * 0.07;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + 0.32);
    });
  } catch {
    /* audio blocked or unsupported */
  }
}

/**
 * Call from the Start-hold pointer/click — iPad Safari only unlocks
 * Web Audio during that gesture. A silent tick is required, not just resume().
 */
export function unlockHoldTones(): void {
  try {
    const ac = audio()
    if (!ac) return
    void ac.resume()
    const now = ac.currentTime
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.frequency.value = 440
    g.gain.setValueAtTime(0.00001, now)
    osc.connect(g)
    g.connect(ac.destination)
    osc.start(now)
    osc.stop(now + 0.04)
  } catch {
    /* audio blocked */
  }
}

function playTone(freq: number, ms: number, gain = 0.2) {
  try {
    const ac = audio()
    if (!ac) return
    void ac.resume()
    const now = ac.currentTime
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(gain, now + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000)
    osc.connect(g)
    g.connect(ac.destination)
    osc.start(now)
    osc.stop(now + ms / 1000 + 0.02)
  } catch {
    /* audio blocked */
  }
}

/** Handstand Lab-style: bright beep when the clock starts. */
export function playHoldEnterBeep(): void {
  playTone(1046.5, 140, 0.22)
}

/** Lower beep when they come down and the clock stops. */
export function playHoldExitBeep(): void {
  playTone(349.23, 180, 0.2)
}

export function playHitTick(): void {
  try {
    const ac = audio()
    if (!ac) return
    void ac.resume()
    const now = ac.currentTime
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
    osc.connect(g)
    g.connect(ac.destination)
    osc.start(now)
    osc.stop(now + 0.18)
  } catch {
    /* audio blocked */
  }
}
