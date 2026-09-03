import { useEffect, useState, type CSSProperties } from 'react'
import {
  playGestureBurst,
  subscribeGestureBurst,
  type GestureBurstKind,
} from '../lib/gestureBurst'

export { playGestureBurst }

type Shot = { id: number; kind: GestureBurstKind }

/** Full-screen slap / collide animation — not a thank-you emoji. */
export function GestureBurstHost() {
  const [shot, setShot] = useState<Shot | null>(null)

  useEffect(() => {
    let n = 0
    return subscribeGestureBurst((kind) => {
      n += 1
      const id = n
      setShot({ id, kind })
      window.setTimeout(() => {
        setShot((cur) => (cur?.id === id ? null : cur))
      }, 1400)
    })
  }, [])

  if (!shot) return null

  return (
    <div
      key={shot.id}
      className="pointer-events-none fixed inset-0 z-[500] flex items-center justify-center"
      aria-hidden
    >
      <style>{`
        @keyframes sl-burst-in { 0% { opacity: 0; transform: scale(.55); } 18% { opacity: 1; transform: scale(1.08); } 100% { opacity: 0; transform: scale(1.2); } }
        @keyframes sl-hand-l { 0% { transform: translate(-42vw, 8px) rotate(-18deg); opacity: 0; } 22% { opacity: 1; } 38% { transform: translate(-6px, 0) rotate(-4deg); } 100% { transform: translate(-10px, -6px) rotate(-8deg); opacity: 0; } }
        @keyframes sl-hand-r { 0% { transform: translate(42vw, 8px) rotate(18deg) scaleX(-1); opacity: 0; } 22% { opacity: 1; } 38% { transform: translate(6px, 0) rotate(4deg) scaleX(-1); } 100% { transform: translate(10px, -6px) rotate(8deg) scaleX(-1); opacity: 0; } }
        @keyframes sl-fist-l { 0% { transform: translate(-38vw, 10px) rotate(-12deg); opacity: 0; } 28% { opacity: 1; } 42% { transform: translate(-4px, 0) rotate(0deg); } 100% { transform: translate(-18px, 4px); opacity: 0; } }
        @keyframes sl-fist-r { 0% { transform: translate(38vw, 10px) rotate(12deg); opacity: 0; } 28% { opacity: 1; } 42% { transform: translate(4px, 0) rotate(0deg); } 100% { transform: translate(18px, 4px); opacity: 0; } }
        @keyframes sl-shock { 0% { transform: scale(.2); opacity: .9; } 100% { transform: scale(2.4); opacity: 0; } }
        @keyframes sl-spark { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) scale(.2); opacity: 0; } }
        .sl-burst { animation: sl-burst-in 1.25s ease-out forwards; }
        .sl-hand-l { animation: sl-hand-l 1.15s cubic-bezier(.2,.8,.2,1) forwards; }
        .sl-hand-r { animation: sl-hand-r 1.15s cubic-bezier(.2,.8,.2,1) forwards; }
        .sl-fist-l { animation: sl-fist-l 1.15s cubic-bezier(.15,.9,.3,1) forwards; }
        .sl-fist-r { animation: sl-fist-r 1.15s cubic-bezier(.15,.9,.3,1) forwards; }
        .sl-shock { animation: sl-shock .7s ease-out .32s both; }
        .sl-spark { animation: sl-spark .7s ease-out .36s both; }
      `}</style>
      <div className="sl-burst relative h-56 w-56">
        <span className="sl-shock absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#5cf0c8] bg-[#5cf0c8]/15" />
        {shot.kind === 'hi5' ? (
          <>
            <span className="sl-hand-l absolute left-1/2 top-1/2 -ml-16 -mt-14">
              <Palm />
            </span>
            <span className="sl-hand-r absolute left-1/2 top-1/2 -ml-2 -mt-14">
              <Palm />
            </span>
          </>
        ) : (
          <>
            <span className="sl-fist-l absolute left-1/2 top-1/2 -ml-16 -mt-10">
              <Fist />
            </span>
            <span className="sl-fist-r absolute left-1/2 top-1/2 -ml-2 -mt-10">
              <Fist />
            </span>
          </>
        )}
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="sl-spark absolute left-1/2 top-1/2 h-2 w-2 -ml-1 -mt-1 rounded-full bg-[#f4e27c]"
            style={{ '--dx': s.x, '--dy': s.y } as CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}

const SPARKS = [
  { x: '42px', y: '-48px' },
  { x: '-40px', y: '-44px' },
  { x: '54px', y: '8px' },
  { x: '-52px', y: '12px' },
  { x: '20px', y: '46px' },
  { x: '-18px', y: '50px' },
  { x: '8px', y: '-58px' },
  { x: '-8px', y: '58px' },
]

function Palm() {
  return (
    <svg width="72" height="88" viewBox="0 0 72 88" fill="none" aria-hidden>
      <path
        d="M22 80c-8-2-14-16-10-28l8-22c2-5 8-6 11-3l3 22 2-28c1-6 8-8 12-4l2 32 4-24c2-6 9-7 12-2l1 28 5-16c2-6 10-6 12 0 2 8-1 22-6 32-7 14-22 22-38 21-6 0-12-2-18-8z"
        fill="#f3c7a0"
        stroke="#2a1a12"
        strokeWidth="2.2"
      />
    </svg>
  )
}

function Fist() {
  return (
    <svg width="70" height="56" viewBox="0 0 70 56" fill="none" aria-hidden>
      <rect x="8" y="14" width="50" height="32" rx="12" fill="#e8b892" stroke="#2a1a12" strokeWidth="2.2" />
      <path d="M16 18h8v12H16zM28 14h8v16h-8zM40 16h8v14h-8zM52 20h8v12h-8z" fill="#f3c7a0" stroke="#2a1a12" strokeWidth="1.6" />
      <path d="M12 36c8 10 34 12 46 2" stroke="#2a1a12" strokeWidth="2" fill="none" />
    </svg>
  )
}
