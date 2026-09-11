/**
 * One Euro Filter (Casiez, Roussel, Vogel).
 * Low jitter when still, follows kick-up / come-down without lag.
 */

function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * Math.max(0.01, cutoff))
  return 1 / (1 + tau / Math.max(1e-4, dt))
}

class LowPass {
  private s: number | null = null

  reset() {
    this.s = null
  }

  next(value: number, a: number): number {
    if (this.s == null || !Number.isFinite(this.s)) {
      this.s = value
      return value
    }
    this.s = a * value + (1 - a) * this.s
    return this.s
  }
}

export class OneEuro {
  private x = new LowPass()
  private dx = new LowPass()
  private lastT = 0
  private lastX = 0

  constructor(
    readonly minCutoff = 1.15,
    readonly beta = 0.085,
    readonly dCutoff = 1.0,
  ) {}

  reset() {
    this.x.reset()
    this.dx.reset()
    this.lastT = 0
    this.lastX = 0
  }

  filter(value: number, t: number): number {
    if (!Number.isFinite(value)) return this.lastX
    const dt = this.lastT ? Math.max(0.008, Math.min(0.08, (t - this.lastT) / 1000)) : 1 / 45
    const instDx = this.lastT ? (value - this.lastX) / dt : 0
    const edx = this.dx.next(instDx, alpha(this.dCutoff, dt))
    const cutoff = this.minCutoff + this.beta * Math.abs(edx)
    const out = this.x.next(value, alpha(cutoff, dt))
    this.lastT = t
    this.lastX = out
    return out
  }
}

export class LandmarkEuro {
  private filters: OneEuro[] = []

  constructor(
    count = 33,
    minCutoff = 1.15,
    beta = 0.085,
  ) {
    for (let i = 0; i < count * 2; i++) this.filters.push(new OneEuro(minCutoff, beta))
  }

  reset() {
    for (const f of this.filters) f.reset()
  }

  apply(
    lm: Array<{ x: number; y: number; z: number; visibility?: number }>,
    t: number,
  ): Array<{ x: number; y: number; z: number; visibility?: number }> {
    return lm.map((p, i) => {
      const fx = this.filters[i * 2]
      const fy = this.filters[i * 2 + 1]
      if (!fx || !fy || (p.visibility ?? 1) < 0.12) return { ...p }
      return {
        x: fx.filter(p.x, t),
        y: fy.filter(p.y, t),
        z: p.z,
        visibility: p.visibility,
      }
    })
  }
}
