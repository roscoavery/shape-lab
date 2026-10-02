export type FigurePose = {
  arms: 'up' | 'down' | 't' | 'front'
  knees: 'straight' | 'bent'
  back: 'flat' | 'hollow' | 'arch'
  head: 'neutral' | 'up'
  feet: 'together' | 'apart'
}

export type FigureView = 'side' | 'front' | 'back' | 'top'

/** Screen direction the figure faces (side + top views). */
export type Facing = 'left' | 'right' | 'up' | 'down'

const STROKE = 'rgba(255,255,255,0.88)'
const STROKE_DIM = 'rgba(255,255,255,0.55)'
const LEFT_DOT = '#60a5fa' // her left
const RIGHT_DOT = '#4ade80' // her right

type Pt = [number, number]

function armEnds(arms: FigurePose['arms']): { near: Pt; far: Pt } {
  // Local coords: figure faces screen-right. Near arm drawn slightly forward.
  switch (arms) {
    case 'up':
      return { near: [75, 5], far: [69, 7] }
    case 'down':
      return { near: [67, 90], far: [61, 92] }
    case 't':
      return { near: [92, 40], far: [28, 42] }
    case 'front':
      return { near: [90, 48], far: [84, 50] }
  }
}

function hipsX(back: FigurePose['back']): number {
  return back === 'hollow' ? 57 : back === 'arch' ? 63 : 60
}

function torsoPath(back: FigurePose['back']): string {
  if (back === 'hollow') return 'M60 36 Q71 66 57 98'
  if (back === 'arch') return 'M60 36 Q49 66 63 98'
  return 'M60 36 L60 98'
}

function legPaths(knees: FigurePose['knees'], feet: FigurePose['feet'], hx: number): string[] {
  const apart = feet === 'apart'
  if (knees === 'straight') {
    return apart
      ? [`M${hx} 98 L${hx + 2} 150`, `M${hx - 5} 100 L${hx - 16} 150`]
      : [`M${hx} 98 L${hx} 150`, `M${hx - 5} 100 L${hx - 5} 152`]
  }
  return apart
    ? [
        `M${hx} 98 Q${hx + 16} 124 ${hx + 8} 150`,
        `M${hx - 5} 100 Q${hx + 2} 126 ${hx - 10} 152`,
      ]
    : [
        `M${hx} 98 Q${hx + 16} 124 ${hx + 8} 150`,
        `M${hx - 5} 100 Q${hx + 11} 126 ${hx + 3} 152`,
      ]
}

function SideFigure({ pose, markers }: { pose: FigurePose; markers: boolean }) {
  const hx = hipsX(pose.back)
  const { near, far } = armEnds(pose.arms)
  const headUp = pose.head === 'up'
  return (
    <g strokeLinecap="round" fill="none">
      {/* legs */}
      {legPaths(pose.knees, pose.feet, hx).map((d, i) => (
        <path key={i} d={d} stroke={STROKE} strokeWidth={9} />
      ))}
      {/* torso */}
      <path d={torsoPath(pose.back)} stroke={STROKE} strokeWidth={10} />
      {/* arms: far arm first so near arm overlaps */}
      <line x1={55} y1={40} x2={far[0]} y2={far[1]} stroke={STROKE} strokeWidth={8} />
      <line x1={60} y1={38} x2={near[0]} y2={near[1]} stroke={STROKE} strokeWidth={8} />
      {/* head */}
      <circle
        cx={headUp ? 56 : 60}
        cy={headUp ? 17 : 20}
        r={11}
        stroke={STROKE}
        strokeWidth={8}
        fill="#0b1520"
      />
      {headUp ? (
        <line x1={62} y1={9} x2={68} y2={3} stroke={STROKE} strokeWidth={5} />
      ) : (
        <line x1={69} y1={19} x2={75} y2={17} stroke={STROKE} strokeWidth={5} />
      )}
      {markers && (
        <>
          {/* facing right: near arm = her right (green), far arm = her left (blue) */}
          <circle cx={near[0]} cy={near[1]} r={6} fill={RIGHT_DOT} stroke="none" />
          <circle cx={far[0]} cy={far[1]} r={6} fill={LEFT_DOT} stroke="none" />
        </>
      )}
    </g>
  )
}

function frontArms(arms: FigurePose['arms']): { left: Pt; right: Pt } {
  switch (arms) {
    case 'up':
      return { left: [42, 6], right: [78, 6] }
    case 'down':
      return { left: [50, 90], right: [70, 90] }
    case 't':
      return { left: [30, 42], right: [90, 42] }
    case 'front':
      return { left: [50, 68], right: [70, 68] }
  }
}

function FrontBackFigure({
  pose,
  markers,
  back,
}: {
  pose: FigurePose
  markers: boolean
  back: boolean
}) {
  const stroke = back ? STROKE_DIM : STROKE
  const { left, right } = frontArms(pose.arms)
  const apart = pose.feet === 'apart'
  const bent = pose.knees === 'bent'
  const legL: Pt = apart ? [44, 150] : [55, 150]
  const legR: Pt = apart ? [76, 150] : [65, 150]
  return (
    <g strokeLinecap="round" fill="none">
      {back && (
        <text x={8} y={16} fontSize={11} letterSpacing={2} fill="rgba(255,255,255,0.5)" stroke="none">
          BACK
        </text>
      )}
      {bent ? (
        <>
          <path d={`M60 98 Q52 124 ${legL[0]} ${legL[1]}`} stroke={stroke} strokeWidth={9} />
          <path d={`M60 98 Q68 124 ${legR[0]} ${legR[1]}`} stroke={stroke} strokeWidth={9} />
        </>
      ) : (
        <>
          <line x1={60} y1={98} x2={legL[0]} y2={legL[1]} stroke={stroke} strokeWidth={9} />
          <line x1={60} y1={98} x2={legR[0]} y2={legR[1]} stroke={stroke} strokeWidth={9} />
        </>
      )}
      <line x1={60} y1={36} x2={60} y2={98} stroke={stroke} strokeWidth={10} />
      <line x1={60} y1={38} x2={left[0]} y2={left[1]} stroke={stroke} strokeWidth={8} />
      <line x1={60} y1={38} x2={right[0]} y2={right[1]} stroke={stroke} strokeWidth={8} />
      <circle cx={60} cy={20} r={11} stroke={stroke} strokeWidth={8} fill="#0b1520" />
      {markers &&
        (back ? (
          <>
            <circle cx={left[0]} cy={left[1]} r={6} fill={LEFT_DOT} stroke="none" />
            <circle cx={right[0]} cy={right[1]} r={6} fill={RIGHT_DOT} stroke="none" />
          </>
        ) : (
          <>
            <circle cx={right[0]} cy={right[1]} r={6} fill={LEFT_DOT} stroke="none" />
            <circle cx={left[0]} cy={left[1]} r={6} fill={RIGHT_DOT} stroke="none" />
          </>
        ))}
    </g>
  )
}

function TopFigure({ facing, markers }: { facing: Facing; markers: boolean }) {
  const horizontal = facing === 'up' || facing === 'down'
  // Nose direction (screen coords).
  const nose: Pt =
    facing === 'up' ? [60, 33] : facing === 'down' ? [60, 87] : facing === 'left' ? [33, 60] : [87, 60]
  const noseBase: Pt =
    facing === 'up' ? [60, 45] : facing === 'down' ? [60, 75] : facing === 'left' ? [45, 60] : [75, 60]
  // Her-left end of the shoulders line: facing rotated counter-clockwise (from above).
  const leftEnd: Pt = horizontal
    ? facing === 'up'
      ? [34, 60]
      : [86, 60]
    : facing === 'right'
      ? [60, 34]
      : [60, 86]
  const rightEnd: Pt = horizontal
    ? facing === 'up'
      ? [86, 60]
      : [34, 60]
    : facing === 'right'
      ? [60, 86]
      : [60, 34]
  return (
    <g strokeLinecap="round" fill="none">
      <line
        x1={horizontal ? 34 : 60}
        y1={horizontal ? 60 : 34}
        x2={horizontal ? 86 : 60}
        y2={horizontal ? 60 : 86}
        stroke={STROKE}
        strokeWidth={9}
      />
      <circle cx={60} cy={60} r={15} stroke={STROKE} strokeWidth={8} fill="#0b1520" />
      <line x1={noseBase[0]} y1={noseBase[1]} x2={nose[0]} y2={nose[1]} stroke={STROKE} strokeWidth={6} />
      {markers && (
        <>
          <circle cx={leftEnd[0]} cy={leftEnd[1]} r={6} fill={LEFT_DOT} stroke="none" />
          <circle cx={rightEnd[0]} cy={rightEnd[1]} r={6} fill={RIGHT_DOT} stroke="none" />
        </>
      )}
    </g>
  )
}

/**
 * Chunky side/front/back/top-view stick figure for arcade lab games.
 * Blue wrist dot = her left, green = her right (see legend in the game).
 */
export function ShapeFigure({
  pose,
  view = 'side',
  facing = 'right',
  markers = false,
  className,
}: {
  pose: FigurePose
  view?: FigureView
  facing?: Facing
  markers?: boolean
  className?: string
}) {
  if (view === 'top') {
    return (
      <svg viewBox="0 0 120 120" className={className} role="img" aria-hidden>
        <TopFigure facing={facing} markers={markers} />
      </svg>
    )
  }
  if (view === 'front' || view === 'back') {
    return (
      <svg viewBox="0 0 120 160" className={className} role="img" aria-hidden>
        <FrontBackFigure pose={pose} markers={markers} back={view === 'back'} />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 120 160" className={className} role="img" aria-hidden>
      {facing === 'left' ? (
        <g transform="translate(120,0) scale(-1,1)">
          <SideFigure pose={pose} markers={markers} />
        </g>
      ) : (
        <SideFigure pose={pose} markers={markers} />
      )}
    </svg>
  )
}
