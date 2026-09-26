/**
 * Infographic concept cards — gallery of Ryan's coaching concepts.
 * Each card gets its own visual: gears, curve, spectrum, circles,
 * versus, paradox, steps, funnel. Labeled blocks, no walls of text.
 */
import { useState } from 'react'
import { CONCEPT_CARDS, type ConceptCard } from '../../config/conceptCards'
import { ProofStrip } from './SkillPathCards'

function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      className="text-[11px] font-extrabold uppercase tracking-widest opacity-70"
      style={color ? { color } : undefined}
    >
      {children}
    </div>
  )
}

function Takeaway({ text, color }: { text: string; color?: string }) {
  return (
    <p
      className="mt-4 rounded-xl border p-3 text-[13px] font-semibold leading-relaxed"
      style={{
        borderColor: (color ?? '#6ec8d6') + '66',
        background: (color ?? '#6ec8d6') + '11',
        color: color ?? 'var(--text)',
      }}
    >
      {text}
    </p>
  )
}

/* ---------------- gears ---------------- */
function GearsCard({ card }: { card: ConceptCard }) {
  const d = card.data as {
    gears: { name: string; color: string; role: string; points: string[]; quote: string }[]
    mesh: string
  }
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {d.gears.map((g) => (
          <div key={g.name} className="rounded-2xl border bg-[var(--panel)] p-5" style={{ borderColor: g.color + '55' }}>
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-black text-white"
              style={{ background: g.color }}
            >
              ⚙
            </div>
            <h4 className="mt-3 text-center text-base font-extrabold" style={{ color: g.color }}>
              {g.name}
            </h4>
            <p className="mt-1 text-center text-xs uppercase tracking-widest opacity-60">{g.role}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] opacity-85">
              {g.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="mt-3 text-center text-[13px] italic opacity-70">“{g.quote}”</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-sm font-semibold opacity-90">{d.mesh}</p>
    </div>
  )
}

/* ---------------- s-curve ---------------- */
function SCurveCard({ card }: { card: ConceptCard }) {
  const d = card.data as {
    phases: { name: string; color: string; text: string }[]
    takeaway: string
  }
  return (
    <div>
      <svg viewBox="0 0 600 180" className="w-full" role="img" aria-label="S-curve of progress">
        <path
          d="M 20 150 C 100 150, 140 145, 190 120 C 240 95, 260 60, 320 45 C 380 32, 460 25, 580 18"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="110" cy="148" r="7" fill="#2e7d4f" />
        <circle cx="280" cy="72" r="7" fill="#2e7d4f" />
        <circle cx="480" cy="24" r="7" fill="#d9732b" />
        <text x="110" y="172" textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.7">compounding</text>
        <text x="280" y="172" textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.7">takeoff</text>
        <text x="480" y="172" textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.7">shrinking pocket</text>
      </svg>
      <div className="mt-2 grid gap-3 md:grid-cols-3">
        {d.phases.map((p) => (
          <div key={p.name} className="rounded-xl border bg-[var(--panel)] p-4" style={{ borderColor: p.color + '55' }}>
            <p className="text-sm font-extrabold" style={{ color: p.color }}>{p.name}</p>
            <p className="mt-1 text-[13px] opacity-80">{p.text}</p>
          </div>
        ))}
      </div>
      <Takeaway text={d.takeaway} />
    </div>
  )
}

/* ---------------- spectrum (danger zone) ---------------- */
function SpectrumCard({ card }: { card: ConceptCard }) {
  const d = card.data as {
    stages: { name: string; color: string; text: string; danger?: boolean }[]
    takeaway: string
  }
  return (
    <div>
      <div className="grid gap-3 md:grid-cols-3">
        {d.stages.map((s) => (
          <div
            key={s.name}
            className="rounded-2xl border-2 bg-[var(--panel)] p-4"
            style={{ borderColor: s.color, background: s.danger ? s.color + '11' : undefined }}
          >
            <p className="text-sm font-extrabold uppercase tracking-wide" style={{ color: s.color }}>
              {s.danger ? '⚠ ' : ''}{s.name}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed opacity-85">{s.text}</p>
          </div>
        ))}
      </div>
      <Takeaway text={d.takeaway} color="#c93a3a" />
    </div>
  )
}

/* ---------------- circles ---------------- */
function CirclesCard({ card }: { card: ConceptCard }) {
  const d = card.data as {
    inner: { name: string; color: string; items: string[] }
    outer: { name: string; color: string; items: string[] }
    takeaway: string
  }
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border-2 p-5 text-center" style={{ borderColor: d.inner.color }}>
          <div
            className="mx-auto flex h-28 w-28 items-center justify-center rounded-full text-white"
            style={{ background: d.inner.color }}
          >
            <span className="px-3 text-xs font-extrabold uppercase tracking-widest">{d.inner.name}</span>
          </div>
          <ul className="mt-4 space-y-1 text-[13px] opacity-85">
            {d.inner.items.map((x) => (
              <li key={x}>✓ {x}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-dashed p-5 text-center" style={{ borderColor: d.outer.color }}>
          <p className="text-sm font-extrabold uppercase tracking-widest" style={{ color: d.outer.color }}>
            {d.outer.name}
          </p>
          <ul className="mt-4 space-y-1 text-[13px] opacity-60">
            {d.outer.items.map((x) => (
              <li key={x}>✕ {x}</li>
            ))}
          </ul>
        </div>
      </div>
      <Takeaway text={d.takeaway} color={d.inner.color} />
    </div>
  )
}

/* ---------------- versus ---------------- */
function VersusCard({ card }: { card: ConceptCard }) {
  const d = card.data as {
    left: { name: string; color: string; points: string[] }
    right: { name: string; color: string; points: string[] }
    takeaway: string
  }
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { ...d.left, mark: '✓' },
          { ...d.right, mark: '✕' },
        ].map((s) => (
          <div key={s.name} className="rounded-2xl border-2 bg-[var(--panel)] p-5" style={{ borderColor: s.color }}>
            <p className="text-base font-extrabold" style={{ color: s.color }}>{s.name}</p>
            <ul className="mt-3 space-y-1.5 text-[13px] opacity-85">
              {s.points.map((p) => (
                <li key={p}>{s.mark} {p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Takeaway text={d.takeaway} />
    </div>
  )
}

/* ---------------- paradox ---------------- */
function ParadoxCard({ card }: { card: ConceptCard }) {
  const d = card.data as {
    quote: string
    attribution: string
    fast: { name: string; color: string; points: string[] }
    slow: { name: string; color: string; points: string[] }
    takeaway: string
  }
  return (
    <div>
      <p className="text-center text-2xl font-black">“{d.quote}”</p>
      <p className="mt-1 text-center text-xs uppercase tracking-widest opacity-60">— {d.attribution}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {[d.fast, d.slow].map((s) => (
          <div key={s.name} className="rounded-2xl border bg-[var(--panel)] p-5" style={{ borderColor: s.color + '55' }}>
            <p className="text-sm font-extrabold uppercase tracking-wide" style={{ color: s.color }}>{s.name}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] opacity-85">
              {s.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Takeaway text={d.takeaway} />
    </div>
  )
}

/* ---------------- steps ---------------- */
function StepsCard({ card }: { card: ConceptCard }) {
  const d = card.data as {
    steps: { n: number; name: string; color: string; text: string }[]
    takeaway: string
  }
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {d.steps.map((s) => (
          <div key={s.n} className="rounded-2xl border bg-[var(--panel)] p-5" style={{ borderColor: s.color + '55' }}>
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-black text-white"
              style={{ background: s.color }}
            >
              {s.n}
            </span>
            <p className="mt-3 text-base font-extrabold" style={{ color: s.color }}>{s.name}</p>
            <p className="mt-1 text-[13px] opacity-80">{s.text}</p>
          </div>
        ))}
      </div>
      <Takeaway text={d.takeaway} />
    </div>
  )
}

/* ---------------- funnel ---------------- */
function FunnelCard({ card }: { card: ConceptCard }) {
  const d = card.data as {
    layers: { name: string; color: string; text: string }[]
    result: string
    takeaway: string
  }
  return (
    <div>
      <div className="mx-auto max-w-xl space-y-1.5">
        {d.layers.map((l, i) => (
          <div
            key={l.name}
            className="rounded-xl px-5 py-3 text-center text-white"
            style={{
              background: l.color,
              marginLeft: `${i * 4}%`,
              marginRight: `${i * 4}%`,
            }}
          >
            <p className="text-sm font-extrabold uppercase tracking-widest">{l.name}</p>
            <p className="mt-0.5 text-xs opacity-90">{l.text}</p>
          </div>
        ))}
        <div className="rounded-xl border-2 border-dashed border-[var(--accent)] px-5 py-4 text-center">
          <Label>Result</Label>
          <p className="mt-1 text-sm font-semibold">{d.result}</p>
        </div>
      </div>
      <Takeaway text={d.takeaway} />
    </div>
  )
}

function CardBody({ card }: { card: ConceptCard }) {
  switch (card.kind) {
    case 'gears': return <GearsCard card={card} />
    case 'scurve': return <SCurveCard card={card} />
    case 'spectrum': return <SpectrumCard card={card} />
    case 'circles': return <CirclesCard card={card} />
    case 'versus': return <VersusCard card={card} />
    case 'paradox': return <ParadoxCard card={card} />
    case 'steps': return <StepsCard card={card} />
    case 'funnel': return <FunnelCard card={card} />
  }
}

function ConceptSection({ card, canEdit }: { card: ConceptCard; canEdit: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 sm:p-6">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full text-left">
        <h3 className="text-xl font-black">{card.title}</h3>
        <p className="mt-1 text-sm opacity-70">{card.subtitle}</p>
        <span className="mt-2 inline-block text-sm opacity-50">{open ? '− show less' : '+ open the visual'}</span>
      </button>
      {open && (
        <div className="mt-5">
          <CardBody card={card} />
          <div className="mt-5 border-t border-white/10 pt-4">
            <ProofStrip evidenceKey={`concept-${card.id}`} coach={false} canEdit={canEdit} />
          </div>
        </div>
      )}
    </section>
  )
}

export function ConceptCards({ canEdit = false }: { canEdit?: boolean }) {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-black sm:text-3xl">Coaching concepts, visualized</h2>
        <p className="mt-2 text-sm opacity-70">
          The ideas behind the coaching, each as a picture instead of a paragraph.
        </p>
      </div>
      {CONCEPT_CARDS.map((card) => (
        <ConceptSection key={card.id} card={card} canEdit={canEdit} />
      ))}
    </div>
  )
}
