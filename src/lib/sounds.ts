/** Short success chime when a hold is complete and the task advances. */

let ctx: AudioContext | null = null;

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function playSuccessChime(): void {
  try {
    const ac = audio();
    void ac.resume();
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

/** Single bright tick when they first match the shape (hold chime is separate). */
export function playHitTick(): void {
  try {
    const ac = audio()
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
