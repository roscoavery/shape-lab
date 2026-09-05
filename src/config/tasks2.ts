/**
 * Tasks 2 — class-pace guided sequences.
 * Not a gate: the show goes on. Voice leads, camera grades after.
 */

export type FlowPreviewShape = {
  shapeId: string
  /** Class nickname on the preview strip (LG, LV, HS). */
  label: string
}

export type FlowBeat = {
  speak: string
  /** Shape to show + score. Omit to keep the previous shape. */
  shapeId?: string
  stance?: 'left' | 'right'
  profileOk?: boolean
  /** Pause after this line before the next (ms). */
  pauseMs?: number
  /** Grab a snapshot this many ms after the line starts (class “2”). */
  snapshotAtMs?: number
  /** Label on the snapshot strip (e.g. Long bridge vs Chin to chest). */
  snapLabel?: string
  /** Hunt this many ms for the highest-scoring frame (handstand / FTOS). */
  snapshotBestMs?: number
  /** Ignore the first part of a best-window (kick-up, walking in). */
  snapshotMinMs?: number
  /**
   * Hunt the best-matching frame as a replay playhead (accuracy), not a
   * class-count snapshot. Same hunt as snapshotBestMs.
   */
  playheadBestMs?: number
  /** Restart the saved replay here (drop get-set / standing around). */
  replayStart?: boolean
  /** Stop the saved replay after this beat (drop standing-clean after the lunge). */
  replayEnd?: boolean
  /** Rep number for numbered handstand grades (MC HS 5 reps). */
  rep?: number
}

export type FlowSequence = {
  id: string
  name: string
  nickname: string
  description: string
  /** Default is a spoken beat list. Hold challenge times inverted holds until Done. */
  mode?: 'beats' | 'hs-hold'
  previewSpeak: string
  /**
   * Spoken and shown right before the first beat — get set (side view, clean).
   * Not a graded snapshot.
   */
  setupSpeak?: string
  /** Extra coaching after the side-view get-set, still on the setup still. */
  setupExtraSpeak?: string
  /** Coach still while they get set (usually stand clean). */
  setupShapeId?: string
  previewShapes: FlowPreviewShape[]
  beats: FlowBeat[]
  /**
   * If set, written analysis / snapshot grades only include these shapes.
   * The replay can still cover the whole athletic pass.
   */
  reviewShapeIds?: string[]
}

const HS_PREVIEW: FlowPreviewShape[] = [
  { shapeId: 'lunge_start', label: 'LG' },
  { shapeId: 'lever', label: 'LV' },
  { shapeId: 'handstand', label: 'HS' },
  { shapeId: 'lunge_land', label: 'LG' },
]

function hsProgression(side: 'left' | 'right'): FlowBeat[] {
  const cartwheel = side === 'right' ? 'cartwheel' : 'non cartwheel'
  return [
    {
      speak:
        'Start feet together, fully open shoulders, arms in close by the ears.',
      shapeId: 'feet_together_open_shoulders',
      profileOk: true,
      pauseMs: 300,
      snapshotBestMs: 2800,
      snapshotMinMs: 700,
      replayStart: true,
    },
    {
      speak: `Take your ${cartwheel} leg to a passé and hold for 3.`,
      shapeId: 'passe',
      stance: side,
      pauseMs: 350,
    },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'Fall to lunge.',
      shapeId: 'lunge_start',
      stance: side,
      pauseMs: 250,
    },
    { speak: 'Hold for 3.', pauseMs: 350 },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'Lever.',
      shapeId: 'lever',
      stance: side,
      pauseMs: 250,
    },
    { speak: 'Hold for 3.', pauseMs: 350 },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'Handstand.',
      shapeId: 'handstand',
      pauseMs: 250,
      snapshotBestMs: 2600,
      snapshotMinMs: 700,
    },
    {
      speak: 'Back to your landing lunge. Hold for 5. With your back foot flat.',
      shapeId: 'lunge_land',
      stance: side,
      pauseMs: 200,
    },
    { speak: '4. Arms tight behind the ears.', pauseMs: 200 },
    { speak: '3. Chest stays tilted forward.', pauseMs: 200 },
    { speak: '2. Chin stays up.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'And clean.',
      shapeId: 'stand_clean',
      profileOk: true,
      pauseMs: 700,
      snapshotBestMs: 2200,
      snapshotMinMs: 1100,
    },
  ]
}

/** Same HS class flow on the non-cartwheel side, with extra open-shoulder coaching. */
function hsNonCartwheel(): FlowBeat[] {
  return [
    {
      speak:
        'Start feet together, fully open shoulders, arms in close by the ears.',
      shapeId: 'feet_together_open_shoulders',
      profileOk: true,
      pauseMs: 300,
      snapshotBestMs: 2800,
      snapshotMinMs: 700,
      replayStart: true,
    },
    {
      speak: 'Take your non cartwheel leg to a passé and hold for 3.',
      shapeId: 'passe',
      stance: 'left',
      pauseMs: 350,
    },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'Fall to lunge.',
      shapeId: 'lunge_start',
      stance: 'left',
      pauseMs: 250,
    },
    { speak: 'Hold for 3.', pauseMs: 350 },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'Lever.',
      shapeId: 'lever',
      stance: 'left',
      pauseMs: 250,
    },
    { speak: 'Hold for 3.', pauseMs: 350 },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'Handstand.',
      shapeId: 'handstand',
      pauseMs: 250,
      snapshotBestMs: 2600,
      snapshotMinMs: 700,
    },
    {
      speak: 'Back to your non cartwheel lunge.',
      shapeId: 'lunge_land',
      stance: 'left',
      pauseMs: 250,
    },
    { speak: 'Hold for 5. With your back foot flat.', pauseMs: 200 },
    { speak: '4. Arms tight behind the ears.', pauseMs: 200 },
    { speak: '3. Chest stays tilted forward.', pauseMs: 200 },
    { speak: '2. Chin stays up.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'And clean.',
      shapeId: 'stand_clean',
      profileOk: true,
      pauseMs: 700,
      snapshotBestMs: 2200,
      snapshotMinMs: 1100,
    },
  ]
}

function mcHsLungeAssisted(): FlowBeat[] {
  return [
    {
      speak: 'Ready.',
      shapeId: 'stand_clean',
      profileOk: true,
      pauseMs: 280,
      replayStart: true,
    },
    {
      speak: 'Step to mountain climber.',
      shapeId: 'mountain_climber',
      pauseMs: 400,
    },
    {
      speak:
        'Kick to handstand and hold it. Push tall through the ground. Eyes can look through the eyebrows at the hands, with arms covering the ears. Squeeze ribs in and squeeze butt in. Legs tight together, straight knees, pointed toes.',
      shapeId: 'handstand',
      pauseMs: 250,
    },
    {
      speak: 'Hold for 3.',
      pauseMs: 350,
      snapshotBestMs: 2800,
      snapshotMinMs: 350,
    },
    { speak: '2.', pauseMs: 400 },
    {
      speak: 'Back to lunge and hold for 3.',
      shapeId: 'lunge_land',
      stance: 'right',
      pauseMs: 350,
    },
    {
      speak: '2.',
      pauseMs: 500,
      replayEnd: true,
    },
    {
      speak: 'Clean.',
      shapeId: 'stand_clean',
      profileOk: true,
      pauseMs: 400,
    },
  ]
}

function mcHsLeverLunge(): FlowBeat[] {
  return [
    {
      speak: 'Ready.',
      shapeId: 'stand_clean',
      profileOk: true,
      pauseMs: 350,
    },
    {
      speak: 'Start clean.',
      pauseMs: 400,
    },
    {
      speak: 'Step to mountain climber and hold for 3.',
      shapeId: 'mountain_climber',
      pauseMs: 350,
      replayStart: true,
    },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'Kick to handstand.',
      shapeId: 'handstand',
      pauseMs: 250,
      snapshotBestMs: 2600,
      snapshotMinMs: 700,
    },
    {
      speak: 'Lever.',
      shapeId: 'lever',
      stance: 'right',
      pauseMs: 250,
      playheadBestMs: 2200,
      snapshotMinMs: 200,
    },
    {
      speak: 'Back to lunge.',
      shapeId: 'lunge_land',
      stance: 'right',
      pauseMs: 250,
    },
    { speak: 'Hold for 5. With the back foot flat.', pauseMs: 200 },
    { speak: '4. Arms tight behind the ears.', pauseMs: 200 },
    { speak: '3. Chest stays tilted forward.', pauseMs: 200 },
    { speak: '2. Chin stays up.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'And clean.',
      shapeId: 'stand_clean',
      profileOk: true,
      pauseMs: 700,
      snapshotBestMs: 2200,
      snapshotMinMs: 1100,
    },
  ]
}

function mcHsFiveReps(): FlowBeat[] {
  const ordinal = ['one', 'two', 'three', 'four', 'five'] as const
  const beats: FlowBeat[] = [
    {
      speak: 'Start clean.',
      shapeId: 'stand_clean',
      profileOk: true,
      pauseMs: 280,
      replayStart: true,
    },
    {
      speak: 'Step to mountain climber.',
      shapeId: 'mountain_climber',
      pauseMs: 280,
    },
    {
      speak: 'Kick to handstand.',
      shapeId: 'handstand',
      pauseMs: 180,
      snapshotBestMs: 2400,
      snapshotMinMs: 400,
      rep: 1,
    },
    {
      speak: 'Back to lunge.',
      shapeId: 'lunge_land',
      stance: 'right',
      pauseMs: 250,
    },
    {
      speak: 'And clean.',
      shapeId: 'stand_clean',
      profileOk: true,
      pauseMs: 280,
    },
    { speak: "That's one.", pauseMs: 220 },
  ]
  for (let n = 2; n <= 5; n++) {
    beats.push(
      {
        speak: 'Mountain climber.',
        shapeId: 'mountain_climber',
        pauseMs: 280,
      },
      {
        speak: 'Kick to hands.',
        shapeId: 'handstand',
        pauseMs: 180,
        snapshotBestMs: 2400,
        snapshotMinMs: 400,
        rep: n,
      },
      {
        speak: 'Back to lunge.',
        shapeId: 'lunge_land',
        stance: 'right',
        pauseMs: 250,
      },
      {
        speak: 'And clean.',
        shapeId: 'stand_clean',
        profileOk: true,
        pauseMs: 280,
      },
      {
        speak: `That's ${ordinal[n - 1]}.`,
        pauseMs: 220,
        replayEnd: n === 5,
      },
    )
  }
  return beats
}

/** Class long-bridge talk-through. Two stills: before chin to chest, then after. */
function longBridgeClass(): FlowBeat[] {
  return [
    {
      speak: 'Lie on your back. Bridge up on 3.',
      shapeId: 'long_bridge',
      pauseMs: 400,
    },
    { speak: '1.', pauseMs: 350 },
    { speak: '2.', pauseMs: 350 },
    {
      speak: '3. Bridge up.',
      pauseMs: 900,
      replayStart: true,
    },
    { speak: 'Can you get your feet together.', pauseMs: 550 },
    { speak: 'Straight legs if you can.', pauseMs: 550 },
    {
      speak: 'Pushing through your toes. Heels flat on the mat.',
      pauseMs: 550,
    },
    {
      speak: 'Arms in close by the ears.',
      pauseMs: 500,
      snapshotAtMs: 280,
      snapLabel: 'Long bridge',
    },
    {
      speak: 'And go chin to chest.',
      pauseMs: 450,
    },
    { speak: 'Hold for 5.', pauseMs: 280 },
    { speak: '4.', pauseMs: 280 },
    { speak: '3.', pauseMs: 280 },
    {
      speak: '2.',
      pauseMs: 400,
      snapshotAtMs: 120,
      snapLabel: 'Chin to chest',
    },
    {
      speak: 'Come down. Rock it out.',
      pauseMs: 800,
      replayEnd: true,
    },
  ]
}

const PIKE_MS = 2000
const HOLLOW_MS = 1200
const ARCH_MS = 1200

const COUNT_WORDS = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
  'Twenty',
  'Twenty one',
  'Twenty two',
  'Twenty three',
  'Twenty four',
  'Twenty five',
  'Twenty six',
  'Twenty seven',
  'Twenty eight',
  'Twenty nine',
  'Thirty',
]

function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n)
}

/** Snap-open drill: pike (zombie arms) → hollow arms down → arch (supine). */
function pikeHollowArchClass(opts?: { mode?: 'learn' | 'reps'; reps?: number }): FlowBeat[] {
  const mode = opts?.mode ?? 'reps'
  const reps = mode === 'learn' ? 5 : Math.min(10, Math.max(3, opts?.reps ?? 5))
  const beats: FlowBeat[] = []

  for (let r = 1; r <= reps; r++) {
    const first = r === 1
    const learn = mode === 'learn' && first
    if (learn) {
      beats.push({
        speak: 'Sit in a pike. Zombie arms.',
        shapeId: 'seated_pike',
        pauseMs: 400,
        replayStart: true,
        rep: r,
      })
      beats.push({ speak: 'Toes pointed. Straight knees.', pauseMs: 450 })
      beats.push({
        speak:
          'Torso upright and rounded hollow. Shoulders shrug. Arms covering the ears. Eyes looking through the hands.',
        pauseMs: 500,
        snapshotAtMs: 400,
        snapLabel: 'Pike (zombie arms)',
      })
      beats.push({
        speak:
          'Inch back to hollow until lower back is flat, bringing arms in close to the body.',
        shapeId: 'hollow_arms_down',
        pauseMs: 800,
        snapshotAtMs: 350,
        snapLabel: 'Hollow (arms down)',
      })
      beats.push({
        speak:
          'Then snap open to the arch. Arms all the way back. Hips up. Straight knees. Ankles together with pointed toes.',
        shapeId: 'arch',
        pauseMs: 900,
        snapshotAtMs: 400,
        snapLabel: 'Arch (supine)',
      })
      continue
    }
    beats.push({
      speak: first
        ? 'Pike. Zombie arms. Toes pointed. Straight knees.'
        : 'Pike.',
      shapeId: 'seated_pike',
      pauseMs: PIKE_MS,
      ...(first ? { replayStart: true, snapshotAtMs: 400, snapLabel: 'Pike (zombie arms)' } : {}),
      rep: r,
    })
    beats.push({
      speak: first
        ? 'Inch back to hollow until lower back is flat, bringing arms in close to the body.'
        : 'Hollow.',
      shapeId: 'hollow_arms_down',
      pauseMs: first ? 1600 : HOLLOW_MS,
      ...(first ? { snapshotAtMs: 350, snapLabel: 'Hollow (arms down)' } : {}),
    })
    beats.push({
      speak: first
        ? 'Then snap open to the arch. Arms all the way back. Hips up. Straight knees. Ankles together with pointed toes.'
        : 'Arch.',
      shapeId: 'arch',
      pauseMs: first ? 1800 : ARCH_MS,
      ...(first ? { snapshotAtMs: 400, snapLabel: 'Arch (supine)' } : {}),
    })
  }
  beats.push({
    speak: 'That is pike, hollow, arch.',
    pauseMs: 500,
    replayEnd: true,
  })
  return beats
}

/** Pike (open shoulders) → seated tuck → hollow → arch. */
function pikeTuckHollowArchClass(): FlowBeat[] {
  return [
    {
      speak: 'Sit in a pike. Arms up by the ears. Shoulders open.',
      shapeId: 'pike_open_shoulders',
      pauseMs: 450,
      replayStart: true,
    },
    {
      speak: 'Legs together. Knees straight. Toes pointed.',
      pauseMs: 450,
      snapshotAtMs: 300,
      snapLabel: 'Pike (open shoulders)',
    },
    {
      speak: 'Bend the knees. Pull the feet in. That is a tuck.',
      shapeId: 'tuck_open_shoulders',
      pauseMs: 500,
    },
    {
      speak:
        'Flex the feet. Keep reaching arms behind the ears. Slightly rounded hollow back.',
      pauseMs: 500,
      snapshotAtMs: 350,
      snapLabel: 'Tuck',
    },
    {
      speak: 'Hollow. Arms down.',
      shapeId: 'hollow_arms_down',
      pauseMs: 550,
    },
    {
      speak: 'Hold.',
      pauseMs: 400,
      snapshotAtMs: 180,
      snapLabel: 'Hollow (arms down)',
    },
    {
      speak: 'Arch. On your back.',
      shapeId: 'arch',
      pauseMs: 550,
    },
    {
      speak: 'Hold.',
      pauseMs: 400,
      snapshotAtMs: 180,
      snapLabel: 'Arch (supine)',
    },
    {
      speak: 'Pike, tuck, hollow, arch. Go again when you are ready.',
      pauseMs: 700,
      replayEnd: true,
    },
  ]
}

/** Lemon squeezes: pike (open shoulders) → tuck, then hollow / tuck reps. */
function lemonSqueezesClass(opts?: { sets?: number; repsPerSet?: number[] }): FlowBeat[] {
  const sets = Math.min(3, Math.max(1, opts?.sets ?? 3))
  const repsPerSet = opts?.repsPerSet ?? [10, 8, 6]
  const beats: FlowBeat[] = []
  const hollowMs = 550
  const tuckMs = 550

  for (let set = 1; set <= sets; set++) {
    const reps = Math.min(30, Math.max(5, repsPerSet[set - 1] ?? repsPerSet.at(-1) ?? 10))
    beats.push({
      speak:
        set === 1
          ? `Set 1. Start in a pike with open shoulders.`
          : `Set ${set}. Back to a pike with open shoulders.`,
      shapeId: 'pike_open_shoulders',
      pauseMs: 700,
      ...(set === 1
        ? { replayStart: true, snapshotAtMs: 280, snapLabel: 'Pike (open shoulders)' }
        : {}),
    })
    beats.push({
      speak: 'Pull a tuck.',
      shapeId: 'tuck_open_shoulders',
      pauseMs: 600,
      ...(set === 1 ? { snapshotAtMs: 250, snapLabel: 'Tuck' } : {}),
    })
    for (let r = 1; r <= reps; r++) {
      const count = r % 5 === 0 ? ` ${countWord(r)}.` : ''
      beats.push({
        speak: 'Hollow.',
        shapeId: 'hollow_arms_down',
        pauseMs: hollowMs,
        ...(set === 1 && r === 1 ? { snapshotAtMs: 180, snapLabel: 'Hollow' } : {}),
        rep: r,
      })
      beats.push({
        speak: `Tuck.${count}`,
        shapeId: 'tuck_open_shoulders',
        pauseMs: tuckMs,
      })
    }
  }
  beats.push({
    speak: 'That is lemon squeezes.',
    pauseMs: 500,
    replayEnd: true,
  })
  return beats
}

/** Spoken ~30s hold after the athlete is already in the shape. */
function holdCountThirty(): FlowBeat[] {
  return [
    { speak: 'Hold for 30.', pauseMs: 9000 },
    { speak: '20.', pauseMs: 10000 },
    { speak: '10.', pauseMs: 5000 },
    { speak: '5.', pauseMs: 900 },
    { speak: '4.', pauseMs: 900 },
    { speak: '3.', pauseMs: 900 },
    { speak: '2.', pauseMs: 900 },
    { speak: '1.', pauseMs: 700 },
  ]
}

/** Easy home core: 10× pike-hollow-arch, 3× open pike-tuck-hollow-arch, 30s holds. */
function coreHomeClass(): FlowBeat[] {
  const beats: FlowBeat[] = [
    {
      speak: 'Easy core at home. First, pike, hollow, arch. Ten times.',
      shapeId: 'seated_pike',
      pauseMs: 550,
      replayStart: true,
    },
  ]
  for (let i = 1; i <= 10; i++) {
    beats.push({
      speak: i === 1 ? 'Pike. Zombie arms.' : 'Pike.',
      shapeId: 'seated_pike',
      pauseMs: i === 1 ? 450 : 300,
      ...(i === 1
        ? { snapshotAtMs: 280, snapLabel: 'Pike (zombie arms)' }
        : {}),
    })
    beats.push({
      speak: i === 1 ? 'Hollow. Arms down.' : 'Hollow.',
      shapeId: 'hollow_arms_down',
      pauseMs: 320,
      ...(i === 1 ? { snapshotAtMs: 180, snapLabel: 'Hollow' } : {}),
    })
    beats.push({
      speak: i === 1 ? 'Arch. On your back.' : 'Arch.',
      shapeId: 'arch',
      pauseMs: 320,
      ...(i === 1 || i === 10
        ? { snapshotAtMs: 160, snapLabel: i === 1 ? 'Arch' : 'Arch 10' }
        : {}),
    })
    beats.push({ speak: `That's ${i}.`, pauseMs: 200 })
  }
  beats.push({
    speak:
      'Now open-shoulder pike into tuck and hollow. Three times. Finish each one on an arch.',
    shapeId: 'pike_open_shoulders',
    pauseMs: 550,
  })
  for (let i = 1; i <= 3; i++) {
    beats.push({
      speak: i === 1 ? 'Pike. Arms up by the ears.' : 'Pike. Arms up.',
      shapeId: 'pike_open_shoulders',
      pauseMs: 380,
      ...(i === 1
        ? { snapshotAtMs: 240, snapLabel: 'Pike (open shoulders)' }
        : {}),
    })
    for (let s = 1; s <= 3; s++) {
      beats.push({
        speak:
          i === 1 && s === 1
            ? 'Tuck. Flex the feet. Keep reaching.'
            : 'Tuck.',
        shapeId: 'tuck_open_shoulders',
        pauseMs: 300,
        ...(i === 1 && s === 1
          ? { snapshotAtMs: 200, snapLabel: 'Tuck' }
          : {}),
      })
      beats.push({
        speak: 'Hollow.',
        shapeId: 'hollow_arms_down',
        pauseMs: 300,
      })
    }
    beats.push({
      speak: 'Arch.',
      shapeId: 'arch',
      pauseMs: 320,
      ...(i === 3 ? { snapshotAtMs: 160, snapLabel: 'Arch (set 2)' } : {}),
    })
    beats.push({ speak: `That's ${i}.`, pauseMs: 200 })
  }
  beats.push({
    speak:
      'Side plank. Left side. Be a pencil. Foot stacked. Top hand on the hip. Head in line.',
    shapeId: 'side_plank',
    pauseMs: 700,
    snapshotAtMs: 400,
    snapLabel: 'Side plank left',
  })
  beats.push(...holdCountThirty())
  beats.push({
    speak:
      'Other side. If the knees cannot stay straight, bend them and put weight on the bottom knee.',
    shapeId: 'side_plank',
    pauseMs: 700,
    snapshotAtMs: 400,
    snapLabel: 'Side plank right',
  })
  beats.push(...holdCountThirty())
  beats.push({
    speak: 'Superman. Chin up. Arms behind the ears. Straight knees off the mat.',
    shapeId: 'superman',
    pauseMs: 700,
    snapshotAtMs: 400,
    snapLabel: 'Superman',
  })
  beats.push(...holdCountThirty())
  beats.push({
    speak: 'Hollow hold. Start in a zombie-arm pike.',
    shapeId: 'seated_pike',
    pauseMs: 500,
  })
  beats.push({
    speak: 'Inch back until the lowest part of the lower back touches the ground.',
    shapeId: 'hollow_arms_down',
    pauseMs: 700,
  })
  beats.push({
    speak: 'Flatten the low back. Let the feet inch off the ground.',
    pauseMs: 550,
    snapshotAtMs: 320,
    snapLabel: 'Hollow hold',
  })
  beats.push(...holdCountThirty())
  beats.push({
    speak:
      'That is home core. Work those holds up to a minute — side plank, Superman, and hollow.',
    pauseMs: 900,
    replayEnd: true,
  })
  return beats
}

export const FLOW_SEQUENCES: FlowSequence[] = [
  {
    id: 'flow_hs_right',
    name: 'LG LV HS LG (Cartwheel side)',
    nickname: 'LG LV HS LG',
    description:
      'Cartwheel side. Lunge, lever, handstand, lunge. Side view. Stand clean before we start. After clean you get a fullscreen replay. Not a gate.',
    previewSpeak: 'This sequence is lunge, lever, handstand, lunge. Cartwheel side.',
    setupSpeak: 'Side view. Stand clean. Stay clean until we start.',
    setupShapeId: 'stand_clean',
    previewShapes: HS_PREVIEW,
    beats: hsProgression('right'),
  },
  {
    id: 'flow_hs_left',
    name: 'LG LV HS LG (NON Cartwheel side)',
    nickname: 'LG LV HS LG',
    description:
      'Same sequence on the non-cartwheel side. Open shoulders often get harder here — extra effort. Side view. Stand clean before we start. After clean you get a fullscreen replay. Not a gate.',
    previewSpeak: 'This sequence is lunge, lever, handstand, lunge. Non cartwheel side.',
    setupSpeak: 'Side view. Stand clean. Stay clean until we start.',
    setupExtraSpeak:
      'Now that we are doing the non cartwheel side, open shoulders often become harder for athletes. Remember, extra effort on open shoulders. Here we go.',
    setupShapeId: 'stand_clean',
    previewShapes: HS_PREVIEW,
    beats: hsNonCartwheel(),
  },
  {
    id: 'flow_mc_hs',
    name: 'MC HS LV LG',
    nickname: 'MC HS LV LG',
    description:
      'Cartwheel side. Ready in clean, mountain climber 3-2, kick to handstand, pass through lever, landing lunge 5-count, clean. Lever is a replay marker from your best match, not a timed snapshot. After clean you get a fullscreen replay. Not a gate.',
    previewSpeak: 'This sequence is mountain climber, handstand, lever, landing lunge.',
    setupShapeId: 'stand_clean',
    previewShapes: [
      { shapeId: 'mountain_climber', label: 'MC' },
      { shapeId: 'handstand', label: 'HS' },
      { shapeId: 'lever', label: 'LV' },
      { shapeId: 'lunge_land', label: 'LG' },
    ],
    beats: mcHsLeverLunge(),
  },
  {
    id: 'flow_mc_hs_lg_assist',
    name: 'MC HS LG (Assisted)',
    nickname: 'MC HS LG',
    description:
      'Spotted handstand. A coach, friend, or parent can catch the first straight leg, then pull the feet together. Mountain climber, handstand, landing lunge. Analysis is the handstand only — you are not graded on the lunge. Replay is mountain climber through landing lunge. Not a gate.',
    previewSpeak:
      'This is an assisted handstand sequence, allowing more focus on the details of the handstand.',
    setupSpeak:
      'Make sure to kick up with straight legs one at a time so the spotter can grab the first one before pulling the feet together.',
    setupShapeId: 'handstand',
    previewShapes: [
      { shapeId: 'mountain_climber', label: 'MC' },
      { shapeId: 'handstand', label: 'HS' },
      { shapeId: 'lunge_land', label: 'LG' },
    ],
    reviewShapeIds: ['handstand'],
    beats: mcHsLungeAssisted(),
  },
  {
    id: 'flow_mc_hs_5reps',
    name: 'MC HS 5 reps',
    nickname: 'MC HS 5 reps',
    description:
      'Five mountain-climber → handstand → lunge → clean reps. Assisted or on your own. Each kick is graded at the tallest, straightest handstand. Numbered 1–5. Not a gate.',
    previewSpeak: 'Ready for 5 handstand reps? Here we go.',
    setupSpeak:
      'Assisted or on your own is fine. We grade the tallest, straightest handstand on each kick.',
    setupShapeId: 'handstand',
    previewShapes: [
      { shapeId: 'mountain_climber', label: 'MC' },
      { shapeId: 'handstand', label: 'HS' },
      { shapeId: 'lunge_land', label: 'LG' },
    ],
    reviewShapeIds: ['handstand'],
    beats: mcHsFiveReps(),
  },
  {
    id: 'flow_hs_hold_challenge',
    name: 'Handstand hold challenge',
    nickname: 'Hold challenge',
    mode: 'hs-hold',
    description:
      'One-person hold-time challenge. Walking on the hands is allowed — try not to. The clock starts when you are in a handstand and stops when a foot hits the ground. As many tries as you want. The app trims each hold, highlights your longest, and writes form cues. Snapshots map the replay — they are not grades. Not a gate.',
    previewSpeak: 'Ready to challenge your handstand hold time?',
    setupSpeak:
      'Handstand walking is allowed, but try not to walk. Start clean. Hit a mountain climber and hit a handstand when you are ready, and hold for as long as you can.',
    setupExtraSpeak:
      'You get as many tries as you want. Tap Done when you are finished — I will trim each hold and keep your longest.',
    setupShapeId: 'stand_clean',
    previewShapes: [
      { shapeId: 'mountain_climber', label: 'MC' },
      { shapeId: 'handstand', label: 'HS' },
    ],
    reviewShapeIds: ['handstand'],
    beats: [],
  },
  {
    id: 'flow_long_bridge',
    name: 'Long Bridge',
    nickname: 'Long bridge',
    description:
      'Class talk-through. Only after rainbow-bridge shoulders are open. Lie on your back, bridge up on 3, feet together, straight legs, heels flat, arms by the ears, chin to chest, hold, come down and rock it out. Two snapshots: one before chin to chest, one after. Not a gate.',
    previewSpeak:
      'This is a long bridge. Work this after your shoulders already open on a rainbow bridge.',
    setupSpeak: 'Lie on your back. We will bridge up on 3.',
    setupExtraSpeak:
      'If the shoulders are not open on a rainbow yet, stay on rainbow bridge. A slightly less arched version of this long shape is what we want mid back handspring, flight to hands.',
    setupShapeId: 'long_bridge',
    previewShapes: [{ shapeId: 'long_bridge', label: 'Long' }],
    beats: longBridgeClass(),
  },
  {
    id: 'flow_pike_hollow_arch',
    name: 'Pike → Hollow → Arch',
    nickname: 'Snap open',
    description:
      'Class snap-open drill for handsprings and whips. Sit in a pike with zombie arms, inch back to hollow until the lower back is flat with arms in close, then snap open to the arch. Pick Learn for the full talk-through plus 5 reps, or pick 3–10 reps. Not a gate.',
    previewSpeak:
      'Pike, hollow, arch. Inch back to hollow, then snap open to the arch.',
    setupSpeak: 'Side view. Sit in a pike with zombie arms.',
    setupExtraSpeak:
      'Inch back to hollow until the lower back is flat, bringing arms in close to the body. Then snap open to the arch — arms all the way back, hips up, straight knees, ankles together with pointed toes.',
    setupShapeId: 'seated_pike',
    previewShapes: [
      { shapeId: 'seated_pike', label: 'Pike' },
      { shapeId: 'hollow_arms_down', label: 'Hollow' },
    ],
    beats: pikeHollowArchClass({ mode: 'reps', reps: 5 }),
  },
  {
    id: 'flow_pike_tuck_hollow_arch',
    name: 'Pike → Tuck → Hollow → Arch',
    nickname: 'Pike tuck hollow arch',
    description:
      'Class chain: open-shoulder pike, pull into the seated tuck (flexed feet, arms behind the ears, slightly rounded hollow), then hollow arms down, then arch. Open-shoulder pike into this tuck is how we teach arms behind the ears while pulling for a back tuck. The torso usually rounds more on a back tuck or a tucked candle. Not a gate.',
    previewSpeak:
      'Pike, tuck, hollow, arch. Arms stay behind the ears when you pull the tuck.',
    setupSpeak: 'Side view. Sit in a pike with arms up by the ears.',
    setupExtraSpeak:
      'From the pike, bend the knees and pull the feet in. Flex the feet. Keep reaching. That is the tuck we want before a back tuck.',
    setupShapeId: 'pike_open_shoulders',
    previewShapes: [
      { shapeId: 'pike_open_shoulders', label: 'Pike' },
      { shapeId: 'tuck_open_shoulders', label: 'Tuck' },
      { shapeId: 'hollow_arms_down', label: 'Hollow' },
    ],
    beats: pikeTuckHollowArchClass(),
  },
  {
    id: 'flow_lemon_squeezes',
    name: 'Lemon squeezes',
    nickname: 'Lemon squeezes',
    description:
      'Start in a pike with open shoulders, pull a tuck, then hollow–tuck for the reps you pick. Default is 3 sets of 10, 8, and 6. Reset to pike with open shoulders each set. Not a gate.',
    previewSpeak:
      'Lemon squeezes. Pike with open shoulders, pull a tuck, then hollow, tuck.',
    setupSpeak: 'Side view. Start in a pike with open shoulders.',
    setupExtraSpeak:
      'Pull a tuck. Then the count is hollow, tuck. We reset to pike with open shoulders at the start of each set.',
    setupShapeId: 'pike_open_shoulders',
    previewShapes: [
      { shapeId: 'pike_open_shoulders', label: 'Pike' },
      { shapeId: 'tuck_open_shoulders', label: 'Tuck' },
      { shapeId: 'hollow_arms_down', label: 'Hollow' },
    ],
    beats: lemonSqueezesClass({ sets: 3, repsPerSet: [10, 8, 6] }),
  },
  {
    id: 'flow_core_home',
    name: 'Core home conditioning',
    nickname: 'Home core',
    description:
      'Easy home core. Ten pike (zombie arms) → hollow → arch. Then three open-shoulder pike → tuck → hollow (three squeezes) → arch. Then 30-second side planks (both sides), Superman, and hollow. Hollow starts from a zombie-arm pike and inches back until the low back is flat. Finish by working those holds toward a minute. Not a gate.',
    previewSpeak:
      'Easy core at home. Shapes first, then 30-second holds. Work the holds toward a minute.',
    setupSpeak: 'Side view. Sit in a pike with zombie arms. We will move, then we will hold.',
    setupExtraSpeak:
      'If a side plank with straight knees is too hard, bend the knees and put weight on the bottom knee. Be a pencil.',
    setupShapeId: 'seated_pike',
    previewShapes: [
      { shapeId: 'seated_pike', label: 'Pike' },
      { shapeId: 'tuck_open_shoulders', label: 'Tuck' },
      { shapeId: 'side_plank', label: 'Plank' },
      { shapeId: 'superman', label: 'Super' },
      { shapeId: 'hollow_arms_down', label: 'Hollow' },
    ],
    beats: coreHomeClass(),
  },
]

export const FLOW_BY_ID: Record<string, FlowSequence> = Object.fromEntries(
  FLOW_SEQUENCES.map((s) => [s.id, s]),
)

export function getFlowSequence(id: string): FlowSequence | undefined {
  return FLOW_BY_ID[id]
}

export type FlowRunConfig = {
  pikeHollowArchMode?: 'learn' | 'reps'
  pikeHollowArchReps?: number
  lemonPlan?: 'default' | 'custom'
  lemonSets?: number
  lemonReps?: number
}

/** Build the spoken run for Start / Go again, including pike–hollow–arch reps and lemon sets. */
export function resolveFlowRun(id: string, config?: FlowRunConfig): FlowSequence | undefined {
  const base = getFlowSequence(id)
  if (!base) return undefined
  if (id === 'flow_pike_hollow_arch') {
    const mode = config?.pikeHollowArchMode ?? 'reps'
    const reps = mode === 'learn' ? 5 : Math.min(10, Math.max(3, config?.pikeHollowArchReps ?? 5))
    return { ...base, beats: pikeHollowArchClass({ mode, reps }) }
  }
  if (id === 'flow_lemon_squeezes') {
    const plan = config?.lemonPlan ?? 'default'
    const sets = plan === 'default' ? 3 : Math.min(3, Math.max(1, config?.lemonSets ?? 3))
    const reps = Math.min(30, Math.max(5, config?.lemonReps ?? 10))
    const repsPerSet = plan === 'default' ? [10, 8, 6] : Array.from({ length: sets }, () => reps)
    return { ...base, beats: lemonSqueezesClass({ sets, repsPerSet }) }
  }
  return base
}
