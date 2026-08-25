/**
 * ============================================================================
 * SHAPE DEFINITIONS — edit this file to change scoring standards
 * ============================================================================
 * HOW TO ADD A NEW SHAPE
 * ----------------------
 * 1. Copy an existing shape block below.
 * 2. Give it a unique `id` (lowercase, no spaces) and a clear `name`.
 * 3. Set `qualityThreshold` (score 0–100 required for "quality hold" time).
 * 4. List `criteria` using the reusable measurement kinds:
 *
 *    joint_angle          → angle at a joint (shoulder–elbow–wrist, etc.)
 *    segment_vs_vertical  → how upright a body line is (0° = vertical)
 *    segment_vs_horizontal→ how level a body line is (0° = horizontal)
 *    point_distance       → how close two landmarks are (feet together)
 *    symmetry             → left/right joint angle difference (0° = perfect)
 *    composite_min        → overall = worst of several hidden "_..." criteria
 *
 * 5. For each criterion set:
 *    - target OR targetMin/targetMax
 *    - tolerance  (still scores 100 inside this band)
 *    - falloff    (how quickly score drops outside the band; default 40)
 *    - weight     (relative importance — numbers don't need to sum to 100)
 *    - feedbackLow / feedbackHigh with optional {delta} placeholder
 *
 * Landmark indices are in src/lib/landmarks.ts (LM.LEFT_ELBOW, etc.).
 *
 * HIDDEN HELPERS: criteria whose id starts with "_" are measured but not
 * shown in the score panel. Use them as building blocks for composite_min.
 *
 * ANGLE CHEAT SHEET
 * -----------------
 * Straight elbow / knee / hip line ≈ 165–180°
 * Vertical body line deviation     ≈ 0–15° from vertical
 * Horizontal lever body            ≈ 0–20° from horizontal
 * Feet together distance           ≈ 0–0.08 (normalized frame units)
 */

import { LM } from '../lib/landmarks'
import type { ShapeDef } from '../types'

/** Shortcut: left elbow angle landmarks */
const L_ELBOW: [number, number, number] = [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST]
const R_ELBOW: [number, number, number] = [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST]
const L_KNEE: [number, number, number] = [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE]
const R_KNEE: [number, number, number] = [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE]
const L_HIP: [number, number, number] = [LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_KNEE]
const R_HIP: [number, number, number] = [LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE]
const L_SHOULDER: [number, number, number] = [LM.LEFT_HIP, LM.LEFT_SHOULDER, LM.LEFT_ELBOW]
const R_SHOULDER: [number, number, number] = [LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW]

/**
 * All shapes available in Shape Lab v1.
 * Handstand is the most complete reference implementation.
 */
export const SHAPES: ShapeDef[] = [
  // ===========================================================================
  // HANDSTAND — most complete example (test this first)
  // Side or slightly oblique camera works best so the body line is visible.
  // ===========================================================================
  {
    id: 'handstand',
    name: 'Handstand',
    description:
      'Stacked handstand: arms by ears, open shoulders, straight hips and knees, tight body line.',
    category: 'hold',
    qualityThreshold: 70,
    tips: [
      'Film from the side for the best body-line reading.',
      'Push tall through the shoulders (open shoulder angle).',
      'Squeeze legs together and point toes.',
    ],
    criteria: [
      // --- hidden left/right building blocks ---
      {
        id: '_left_elbow',
        label: 'Left elbow',
        kind: 'joint_angle',
        points: L_ELBOW,
        targetMin: 165,
        targetMax: 180,
        tolerance: 5,
        falloff: 35,
        weight: 1,
        feedbackLow: 'Straighten left elbow {delta}° more.',
      },
      {
        id: '_right_elbow',
        label: 'Right elbow',
        kind: 'joint_angle',
        points: R_ELBOW,
        targetMin: 165,
        targetMax: 180,
        tolerance: 5,
        falloff: 35,
        weight: 1,
        feedbackLow: 'Straighten right elbow {delta}° more.',
      },
      {
        id: '_left_knee',
        label: 'Left knee',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 165,
        targetMax: 180,
        tolerance: 5,
        falloff: 35,
        weight: 1,
        feedbackLow: 'Straighten left knee {delta}° more.',
      },
      {
        id: '_right_knee',
        label: 'Right knee',
        kind: 'joint_angle',
        points: R_KNEE,
        targetMin: 165,
        targetMax: 180,
        tolerance: 5,
        falloff: 35,
        weight: 1,
        feedbackLow: 'Straighten right knee {delta}° more.',
      },
      {
        id: '_left_hip',
        label: 'Left hip',
        kind: 'joint_angle',
        points: L_HIP,
        targetMin: 160,
        targetMax: 180,
        tolerance: 8,
        falloff: 40,
        weight: 1,
        feedbackLow: 'Open left hip {delta}° more (reduce pike).',
        feedbackHigh: 'Reduce left hip arch {delta}°.',
      },
      {
        id: '_right_hip',
        label: 'Right hip',
        kind: 'joint_angle',
        points: R_HIP,
        targetMin: 160,
        targetMax: 180,
        tolerance: 8,
        falloff: 40,
        weight: 1,
        feedbackLow: 'Open right hip {delta}° more (reduce pike).',
        feedbackHigh: 'Reduce right hip arch {delta}°.',
      },
      {
        id: '_left_shoulder',
        label: 'Left shoulder',
        kind: 'joint_angle',
        points: L_SHOULDER,
        // Open shoulders in handstand ≈ large hip–shoulder–elbow angle
        targetMin: 150,
        targetMax: 180,
        tolerance: 10,
        falloff: 45,
        weight: 1,
        feedbackLow: 'Open left shoulder {delta}° more (arms by ears).',
      },
      {
        id: '_right_shoulder',
        label: 'Right shoulder',
        kind: 'joint_angle',
        points: R_SHOULDER,
        targetMin: 150,
        targetMax: 180,
        tolerance: 10,
        falloff: 45,
        weight: 1,
        feedbackLow: 'Open right shoulder {delta}° more (arms by ears).',
      },

      // --- visible scored criteria (what the coach sees) ---
      {
        id: 'shoulders',
        label: 'Shoulders',
        kind: 'composite_min',
        of: ['_left_shoulder', '_right_shoulder'],
        tolerance: 0,
        weight: 20,
        feedbackLow: 'Open shoulders {delta}° more.',
      },
      {
        id: 'elbows',
        label: 'Elbows',
        kind: 'composite_min',
        of: ['_left_elbow', '_right_elbow'],
        tolerance: 0,
        weight: 18,
        feedbackLow: 'Straighten elbows {delta}° more.',
      },
      {
        id: 'hips',
        label: 'Hips',
        kind: 'composite_min',
        of: ['_left_hip', '_right_hip'],
        tolerance: 0,
        weight: 18,
        feedbackLow: 'Open hips {delta}° more.',
      },
      {
        id: 'knees',
        label: 'Knees',
        kind: 'composite_min',
        of: ['_left_knee', '_right_knee'],
        tolerance: 0,
        weight: 14,
        feedbackLow: 'Straighten knees {delta}° more.',
      },
      {
        id: 'body_line',
        label: 'Body line',
        kind: 'segment_vs_vertical',
        // Hip midpoint≈ use left hip to left ankle as proxy for body line;
        // side-view athletes: shoulder→ankle is even better — we use shoulder→ankle.
        segment: [LM.LEFT_SHOULDER, LM.LEFT_ANKLE],
        target: 0,
        tolerance: 12,
        falloff: 40,
        weight: 16,
        feedbackHigh: 'Stack body line — you are {delta}° off vertical.',
      },
      {
        id: 'head',
        label: 'Head position',
        kind: 'segment_vs_vertical',
        // Nose should stay roughly stacked with shoulders (neutral head)
        segment: [LM.LEFT_SHOULDER, LM.NOSE],
        targetMin: 0,
        targetMax: 35,
        tolerance: 10,
        falloff: 40,
        weight: 8,
        feedbackHigh: 'Neutralize head — tuck chin slightly ({delta}° off).',
      },
      {
        id: 'feet_together',
        label: 'Feet together',
        kind: 'point_distance',
        pair: [LM.LEFT_ANKLE, LM.RIGHT_ANKLE],
        target: 0,
        tolerance: 0.06,
        falloff: 0.2,
        weight: 6,
        feedbackHigh: 'Squeeze feet together.',
      },
    ],
  },

  // ===========================================================================
  // LUNGE
  // ===========================================================================
  {
    id: 'lunge',
    name: 'Lunge',
    description: 'Lunge with front knee bent, back leg long, torso upright, arms by ears.',
    category: 'static',
    qualityThreshold: 65,
    tips: ['Keep hips square and torso tall.', 'Arms cover the ears.'],
    criteria: [
      {
        id: '_front_knee',
        label: 'Front knee',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 80,
        targetMax: 110,
        tolerance: 10,
        falloff: 40,
        weight: 1,
        feedbackLow: 'Bend front knee more ({delta}°).',
        feedbackHigh: 'Ease front knee bend ({delta}°).',
      },
      {
        id: '_back_knee',
        label: 'Back knee',
        kind: 'joint_angle',
        points: R_KNEE,
        targetMin: 150,
        targetMax: 180,
        tolerance: 10,
        falloff: 40,
        weight: 1,
        feedbackLow: 'Straighten back leg {delta}° more.',
      },
      {
        id: 'front_knee',
        label: 'Front knee',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 80,
        targetMax: 110,
        tolerance: 10,
        weight: 22,
        feedbackLow: 'Bend front knee more ({delta}°).',
        feedbackHigh: 'Ease front knee bend ({delta}°).',
      },
      {
        id: 'back_leg',
        label: 'Back leg',
        kind: 'joint_angle',
        points: R_KNEE,
        targetMin: 150,
        targetMax: 180,
        tolerance: 10,
        weight: 20,
        feedbackLow: 'Straighten back leg {delta}° more.',
      },
      {
        id: 'torso',
        label: 'Torso upright',
        kind: 'segment_vs_vertical',
        segment: [LM.LEFT_HIP, LM.LEFT_SHOULDER],
        target: 0,
        tolerance: 15,
        falloff: 40,
        weight: 20,
        feedbackHigh: 'Stand taller — torso is {delta}° off vertical.',
      },
      {
        id: 'shoulders_open',
        label: 'Arms by ears',
        kind: 'joint_angle',
        points: L_SHOULDER,
        targetMin: 140,
        targetMax: 180,
        tolerance: 10,
        weight: 18,
        feedbackLow: 'Cover ears with arms — open shoulders {delta}°.',
      },
      {
        id: 'elbows',
        label: 'Elbows straight',
        kind: 'joint_angle',
        points: L_ELBOW,
        targetMin: 160,
        targetMax: 180,
        tolerance: 8,
        weight: 12,
        feedbackLow: 'Straighten elbows {delta}°.',
      },
      {
        id: 'hips_square',
        label: 'Hip square (symmetry)',
        kind: 'symmetry',
        leftPoints: L_HIP,
        rightPoints: R_HIP,
        target: 0,
        tolerance: 20,
        falloff: 50,
        weight: 8,
        feedbackHigh: 'Square the hips — left/right differ by {delta}°.',
      },
    ],
  },

  // ===========================================================================
  // LEVER (support lever / mid-lever approximation)
  // ===========================================================================
  {
    id: 'lever',
    name: 'Lever',
    description: 'Body held near horizontal from the shoulders, arms straight, toes pointed.',
    category: 'hold',
    qualityThreshold: 65,
    tips: ['Film from the side.', 'Keep a long body line parallel to the floor.'],
    criteria: [
      {
        id: 'body_horizontal',
        label: 'Body horizontal',
        kind: 'segment_vs_horizontal',
        segment: [LM.LEFT_SHOULDER, LM.LEFT_ANKLE],
        target: 0,
        tolerance: 15,
        falloff: 40,
        weight: 28,
        feedbackHigh: 'Level the body — {delta}° off horizontal.',
      },
      {
        id: 'elbows',
        label: 'Elbows straight',
        kind: 'joint_angle',
        points: L_ELBOW,
        targetMin: 160,
        targetMax: 180,
        tolerance: 8,
        weight: 22,
        feedbackLow: 'Straighten arms {delta}°.',
      },
      {
        id: 'hips',
        label: 'Hips open',
        kind: 'joint_angle',
        points: L_HIP,
        targetMin: 155,
        targetMax: 180,
        tolerance: 10,
        weight: 22,
        feedbackLow: 'Open hips / reduce pike {delta}°.',
      },
      {
        id: 'knees',
        label: 'Knees straight',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 160,
        targetMax: 180,
        tolerance: 8,
        weight: 18,
        feedbackLow: 'Straighten knees {delta}°.',
      },
      {
        id: 'feet_together',
        label: 'Feet together',
        kind: 'point_distance',
        pair: [LM.LEFT_ANKLE, LM.RIGHT_ANKLE],
        target: 0,
        tolerance: 0.08,
        falloff: 0.2,
        weight: 10,
        feedbackHigh: 'Squeeze legs together.',
      },
    ],
  },

  // ===========================================================================
  // MOUNTAIN CLIMBER (lunge-scale entry shape)
  // ===========================================================================
  {
    id: 'mountain_climber',
    name: 'Mountain climber',
    description: 'Deep lunge scale / mountain climber entry: hands down, back leg high and open.',
    category: 'static',
    qualityThreshold: 60,
    criteria: [
      {
        id: 'back_leg_line',
        label: 'Back leg height',
        kind: 'segment_vs_horizontal',
        segment: [LM.RIGHT_HIP, LM.RIGHT_ANKLE],
        target: 0,
        tolerance: 25,
        falloff: 50,
        weight: 30,
        feedbackHigh: 'Lift the back leg — {delta}° below horizontal.',
      },
      {
        id: 'back_knee',
        label: 'Back knee straight',
        kind: 'joint_angle',
        points: R_KNEE,
        targetMin: 155,
        targetMax: 180,
        tolerance: 10,
        weight: 25,
        feedbackLow: 'Straighten back knee {delta}°.',
      },
      {
        id: 'front_knee',
        label: 'Front knee bend',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 70,
        targetMax: 120,
        tolerance: 15,
        weight: 20,
        feedbackLow: 'Bend front knee more.',
        feedbackHigh: 'Soften the front knee angle.',
      },
      {
        id: 'shoulders',
        label: 'Shoulders over hands',
        kind: 'segment_vs_vertical',
        segment: [LM.LEFT_WRIST, LM.LEFT_SHOULDER],
        target: 0,
        tolerance: 20,
        falloff: 45,
        weight: 15,
        feedbackHigh: 'Stack shoulders over hands ({delta}° off).',
      },
      {
        id: 'elbows',
        label: 'Elbows straight',
        kind: 'joint_angle',
        points: L_ELBOW,
        targetMin: 155,
        targetMax: 180,
        tolerance: 10,
        weight: 10,
        feedbackLow: 'Straighten supporting arms.',
      },
    ],
  },

  // ===========================================================================
  // SEATED PIKE — arms covering ears, looking through hands
  // ===========================================================================
  {
    id: 'seated_pike',
    name: 'Seated pike',
    description: 'Seated pike fold with arms covering ears, eyes looking through the hands.',
    category: 'static',
    qualityThreshold: 60,
    criteria: [
      {
        id: 'pike_fold',
        label: 'Pike fold (hips)',
        kind: 'joint_angle',
        points: L_HIP,
        targetMin: 20,
        targetMax: 70,
        tolerance: 15,
        falloff: 50,
        weight: 30,
        feedbackHigh: 'Fold deeper over the legs ({delta}°).',
        feedbackLow: 'Ease the fold slightly.',
      },
      {
        id: 'knees',
        label: 'Knees straight',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 160,
        targetMax: 180,
        tolerance: 8,
        weight: 25,
        feedbackLow: 'Straighten knees {delta}°.',
      },
      {
        id: 'arms_by_ears',
        label: 'Arms covering ears',
        kind: 'joint_angle',
        points: L_SHOULDER,
        targetMin: 140,
        targetMax: 180,
        tolerance: 12,
        weight: 25,
        feedbackLow: 'Reach arms longer by the ears ({delta}°).',
      },
      {
        id: 'elbows',
        label: 'Elbows straight',
        kind: 'joint_angle',
        points: L_ELBOW,
        targetMin: 155,
        targetMax: 180,
        tolerance: 10,
        weight: 12,
        feedbackLow: 'Straighten elbows.',
      },
      {
        id: 'feet_together',
        label: 'Feet together',
        kind: 'point_distance',
        pair: [LM.LEFT_ANKLE, LM.RIGHT_ANKLE],
        target: 0,
        tolerance: 0.08,
        falloff: 0.2,
        weight: 8,
        feedbackHigh: 'Keep feet together.',
      },
    ],
  },

  // ===========================================================================
  // HOLLOW
  // ===========================================================================
  {
    id: 'hollow',
    name: 'Hollow',
    description: 'Hollow body hold: lower back pressed down, arms by ears, legs tight.',
    category: 'hold',
    qualityThreshold: 65,
    criteria: [
      {
        id: 'shoulder_open',
        label: 'Arms by ears',
        kind: 'joint_angle',
        points: L_SHOULDER,
        targetMin: 140,
        targetMax: 180,
        tolerance: 12,
        weight: 22,
        feedbackLow: 'Cover ears — open shoulders {delta}°.',
      },
      {
        id: 'hips',
        label: 'Hollow hip angle',
        kind: 'joint_angle',
        points: L_HIP,
        targetMin: 120,
        targetMax: 155,
        tolerance: 12,
        falloff: 40,
        weight: 28,
        feedbackLow: 'Hollow more (posterior tilt).',
        feedbackHigh: 'Reduce pike — lengthen hollow.',
      },
      {
        id: 'knees',
        label: 'Knees straight',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 160,
        targetMax: 180,
        tolerance: 8,
        weight: 20,
        feedbackLow: 'Straighten knees {delta}°.',
      },
      {
        id: 'elbows',
        label: 'Elbows straight',
        kind: 'joint_angle',
        points: L_ELBOW,
        targetMin: 155,
        targetMax: 180,
        tolerance: 10,
        weight: 15,
        feedbackLow: 'Straighten elbows.',
      },
      {
        id: 'feet_together',
        label: 'Feet together',
        kind: 'point_distance',
        pair: [LM.LEFT_ANKLE, LM.RIGHT_ANKLE],
        target: 0,
        tolerance: 0.07,
        falloff: 0.2,
        weight: 15,
        feedbackHigh: 'Squeeze heels together.',
      },
    ],
  },

  // ===========================================================================
  // ARCH
  // ===========================================================================
  {
    id: 'arch',
    name: 'Arch',
    description: 'Prone arch: chest and thighs lifted, arms by ears or reaching long.',
    category: 'hold',
    qualityThreshold: 60,
    criteria: [
      {
        id: 'hip_extension',
        label: 'Hip extension',
        kind: 'joint_angle',
        points: L_HIP,
        targetMin: 160,
        targetMax: 200,
        tolerance: 15,
        falloff: 45,
        weight: 30,
        feedbackLow: 'Lift thighs / open hips into the arch.',
      },
      {
        id: 'shoulders',
        label: 'Shoulders open',
        kind: 'joint_angle',
        points: L_SHOULDER,
        targetMin: 130,
        targetMax: 180,
        tolerance: 15,
        weight: 25,
        feedbackLow: 'Reach arms longer by the ears.',
      },
      {
        id: 'knees',
        label: 'Knees straight',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 155,
        targetMax: 180,
        tolerance: 10,
        weight: 25,
        feedbackLow: 'Straighten knees.',
      },
      {
        id: 'feet_together',
        label: 'Feet together',
        kind: 'point_distance',
        pair: [LM.LEFT_ANKLE, LM.RIGHT_ANKLE],
        target: 0,
        tolerance: 0.08,
        falloff: 0.2,
        weight: 20,
        feedbackHigh: 'Keep legs glued together.',
      },
    ],
  },

  // ===========================================================================
  // SUPERMAN
  // ===========================================================================
  {
    id: 'superman',
    name: 'Superman',
    description: 'Prone Superman hold: arms and legs lifted, tight body.',
    category: 'hold',
    qualityThreshold: 60,
    criteria: [
      {
        id: 'arm_lift',
        label: 'Arm lift',
        kind: 'joint_angle',
        points: L_SHOULDER,
        targetMin: 120,
        targetMax: 180,
        tolerance: 15,
        weight: 30,
        feedbackLow: 'Lift arms higher.',
      },
      {
        id: 'leg_lift',
        label: 'Leg lift',
        kind: 'joint_angle',
        points: L_HIP,
        targetMin: 150,
        targetMax: 200,
        tolerance: 15,
        weight: 30,
        feedbackLow: 'Lift legs higher from the floor.',
      },
      {
        id: 'knees',
        label: 'Knees straight',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 155,
        targetMax: 180,
        tolerance: 10,
        weight: 20,
        feedbackLow: 'Straighten knees.',
      },
      {
        id: 'elbows',
        label: 'Elbows straight',
        kind: 'joint_angle',
        points: L_ELBOW,
        targetMin: 150,
        targetMax: 180,
        tolerance: 12,
        weight: 20,
        feedbackLow: 'Straighten elbows.',
      },
    ],
  },

  // ===========================================================================
  // BRIDGE
  // ===========================================================================
  {
    id: 'bridge',
    name: 'Bridge',
    description: 'Back bridge / backbend: hips high, shoulders open, legs engaged.',
    category: 'hold',
    qualityThreshold: 60,
    criteria: [
      {
        id: 'shoulders',
        label: 'Shoulders open',
        kind: 'joint_angle',
        points: L_SHOULDER,
        targetMin: 140,
        targetMax: 180,
        tolerance: 15,
        weight: 30,
        feedbackLow: 'Push shoulders open over the hands.',
      },
      {
        id: 'hips_high',
        label: 'Hips open',
        kind: 'joint_angle',
        points: L_HIP,
        targetMin: 130,
        targetMax: 180,
        tolerance: 15,
        weight: 30,
        feedbackLow: 'Push hips higher.',
      },
      {
        id: 'elbows',
        label: 'Elbows straight',
        kind: 'joint_angle',
        points: L_ELBOW,
        targetMin: 155,
        targetMax: 180,
        tolerance: 10,
        weight: 20,
        feedbackLow: 'Straighten arms.',
      },
      {
        id: 'knee_symmetry',
        label: 'Leg symmetry',
        kind: 'symmetry',
        leftPoints: L_KNEE,
        rightPoints: R_KNEE,
        target: 0,
        tolerance: 15,
        falloff: 40,
        weight: 20,
        feedbackHigh: 'Even the legs — difference {delta}°.',
      },
    ],
  },

  // ===========================================================================
  // CANDLESTICK
  // ===========================================================================
  {
    id: 'candlestick',
    name: 'Candlestick',
    description: 'Shoulder stand candlestick: hips stacked over shoulders, legs vertical.',
    category: 'hold',
    qualityThreshold: 65,
    criteria: [
      {
        id: 'legs_vertical',
        label: 'Legs vertical',
        kind: 'segment_vs_vertical',
        segment: [LM.LEFT_HIP, LM.LEFT_ANKLE],
        target: 0,
        tolerance: 15,
        falloff: 40,
        weight: 35,
        feedbackHigh: 'Stack legs vertical — {delta}° off.',
      },
      {
        id: 'hips',
        label: 'Hips open',
        kind: 'joint_angle',
        points: L_HIP,
        targetMin: 155,
        targetMax: 180,
        tolerance: 10,
        weight: 25,
        feedbackLow: 'Open hips / reduce pike.',
      },
      {
        id: 'knees',
        label: 'Knees straight',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 160,
        targetMax: 180,
        tolerance: 8,
        weight: 25,
        feedbackLow: 'Straighten knees.',
      },
      {
        id: 'feet_together',
        label: 'Feet together',
        kind: 'point_distance',
        pair: [LM.LEFT_ANKLE, LM.RIGHT_ANKLE],
        target: 0,
        tolerance: 0.07,
        falloff: 0.2,
        weight: 15,
        feedbackHigh: 'Squeeze feet together.',
      },
    ],
  },

  // ===========================================================================
  // PASSÉ
  // ===========================================================================
  {
    id: 'passe',
    name: 'Passé',
    description: 'Standing passé: one foot at the knee, hips square, posture tall.',
    category: 'static',
    qualityThreshold: 65,
    criteria: [
      {
        id: 'stance_knee',
        label: 'Stance knee straight',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 160,
        targetMax: 180,
        tolerance: 8,
        weight: 25,
        feedbackLow: 'Straighten the standing leg.',
      },
      {
        id: 'passe_height',
        label: 'Passé foot height',
        kind: 'point_distance',
        pair: [LM.RIGHT_ANKLE, LM.LEFT_KNEE],
        target: 0,
        tolerance: 0.12,
        falloff: 0.25,
        weight: 30,
        feedbackHigh: 'Place passé foot closer to the knee.',
      },
      {
        id: 'torso',
        label: 'Torso upright',
        kind: 'segment_vs_vertical',
        segment: [LM.LEFT_HIP, LM.LEFT_SHOULDER],
        target: 0,
        tolerance: 12,
        falloff: 40,
        weight: 25,
        feedbackHigh: 'Stand taller — torso {delta}° off vertical.',
      },
      {
        id: 'hips_square',
        label: 'Hips square',
        kind: 'symmetry',
        leftPoints: L_HIP,
        rightPoints: R_HIP,
        target: 0,
        tolerance: 20,
        falloff: 50,
        weight: 20,
        feedbackHigh: 'Square the hips.',
      },
    ],
  },

  // ===========================================================================
  // TUCKED HANDSTAND
  // ===========================================================================
  {
    id: 'tucked_handstand',
    name: 'Tucked handstand',
    description: 'Handstand with hips piked and knees tucked, shoulders open on top of hands.',
    category: 'hold',
    qualityThreshold: 60,
    criteria: [
      {
        id: 'elbows',
        label: 'Elbows straight',
        kind: 'joint_angle',
        points: L_ELBOW,
        targetMin: 160,
        targetMax: 180,
        tolerance: 8,
        weight: 25,
        feedbackLow: 'Straighten elbows.',
      },
      {
        id: 'shoulders',
        label: 'Shoulders open',
        kind: 'joint_angle',
        points: L_SHOULDER,
        targetMin: 145,
        targetMax: 180,
        tolerance: 12,
        weight: 25,
        feedbackLow: 'Open shoulders over the hands.',
      },
      {
        id: 'tuck_knees',
        label: 'Knees tucked',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 30,
        targetMax: 90,
        tolerance: 15,
        falloff: 50,
        weight: 25,
        feedbackHigh: 'Tuck knees tighter.',
        feedbackLow: 'Keep a clear tuck shape.',
      },
      {
        id: 'balance_line',
        label: 'Stack over hands',
        kind: 'segment_vs_vertical',
        segment: [LM.LEFT_WRIST, LM.LEFT_HIP],
        target: 0,
        tolerance: 18,
        falloff: 45,
        weight: 25,
        feedbackHigh: 'Stack hips over hands ({delta}°).',
      },
    ],
  },

  // ===========================================================================
  // PIKED HANDSTAND
  // ===========================================================================
  {
    id: 'piked_handstand',
    name: 'Piked handstand',
    description: 'Handstand with a clear pike at the hips, legs straight.',
    category: 'hold',
    qualityThreshold: 60,
    criteria: [
      {
        id: 'elbows',
        label: 'Elbows straight',
        kind: 'joint_angle',
        points: L_ELBOW,
        targetMin: 160,
        targetMax: 180,
        tolerance: 8,
        weight: 22,
        feedbackLow: 'Straighten elbows.',
      },
      {
        id: 'shoulders',
        label: 'Shoulders open',
        kind: 'joint_angle',
        points: L_SHOULDER,
        targetMin: 145,
        targetMax: 180,
        tolerance: 12,
        weight: 22,
        feedbackLow: 'Open shoulders.',
      },
      {
        id: 'pike',
        label: 'Pike angle',
        kind: 'joint_angle',
        points: L_HIP,
        targetMin: 60,
        targetMax: 120,
        tolerance: 15,
        falloff: 45,
        weight: 28,
        feedbackLow: 'Pike more at the hips.',
        feedbackHigh: 'Keep a clearer pike (less open).',
      },
      {
        id: 'knees',
        label: 'Knees straight',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 160,
        targetMax: 180,
        tolerance: 8,
        weight: 18,
        feedbackLow: 'Straighten knees in the pike.',
      },
      {
        id: 'feet_together',
        label: 'Feet together',
        kind: 'point_distance',
        pair: [LM.LEFT_ANKLE, LM.RIGHT_ANKLE],
        target: 0,
        tolerance: 0.08,
        falloff: 0.2,
        weight: 10,
        feedbackHigh: 'Keep feet together.',
      },
    ],
  },

  // ===========================================================================
  // L HANDSTAND
  // ===========================================================================
  {
    id: 'l_handstand',
    name: 'L handstand',
    description: 'L-shape handstand: one line vertical through arms/torso, legs near horizontal.',
    category: 'hold',
    qualityThreshold: 60,
    criteria: [
      {
        id: 'arms_vertical',
        label: 'Arms vertical',
        kind: 'segment_vs_vertical',
        segment: [LM.LEFT_WRIST, LM.LEFT_SHOULDER],
        target: 0,
        tolerance: 15,
        falloff: 40,
        weight: 28,
        feedbackHigh: 'Stack arms vertical ({delta}°).',
      },
      {
        id: 'legs_horizontal',
        label: 'Legs horizontal',
        kind: 'segment_vs_horizontal',
        segment: [LM.LEFT_HIP, LM.LEFT_ANKLE],
        target: 0,
        tolerance: 20,
        falloff: 45,
        weight: 28,
        feedbackHigh: 'Bring legs toward horizontal L ({delta}°).',
      },
      {
        id: 'elbows',
        label: 'Elbows straight',
        kind: 'joint_angle',
        points: L_ELBOW,
        targetMin: 160,
        targetMax: 180,
        tolerance: 8,
        weight: 22,
        feedbackLow: 'Straighten elbows.',
      },
      {
        id: 'knees',
        label: 'Knees straight',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 160,
        targetMax: 180,
        tolerance: 8,
        weight: 22,
        feedbackLow: 'Straighten knees.',
      },
    ],
  },

  // ===========================================================================
  // WALL HANDSTAND
  // ===========================================================================
  {
    id: 'wall_handstand',
    name: 'Wall handstand',
    description: 'Handstand at the wall — same body standards as freestanding, slightly more forgiving line.',
    category: 'hold',
    qualityThreshold: 65,
    tips: ['Use the same cues as freestanding handstand.', 'Prefer stomach-to-wall for open shoulders.'],
    criteria: [
      {
        id: '_left_elbow',
        label: 'Left elbow',
        kind: 'joint_angle',
        points: L_ELBOW,
        targetMin: 160,
        targetMax: 180,
        tolerance: 8,
        weight: 1,
        feedbackLow: 'Straighten left elbow.',
      },
      {
        id: '_right_elbow',
        label: 'Right elbow',
        kind: 'joint_angle',
        points: R_ELBOW,
        targetMin: 160,
        targetMax: 180,
        tolerance: 8,
        weight: 1,
        feedbackLow: 'Straighten right elbow.',
      },
      {
        id: 'elbows',
        label: 'Elbows',
        kind: 'composite_min',
        of: ['_left_elbow', '_right_elbow'],
        tolerance: 0,
        weight: 25,
      },
      {
        id: 'shoulders',
        label: 'Shoulders',
        kind: 'joint_angle',
        points: L_SHOULDER,
        targetMin: 145,
        targetMax: 180,
        tolerance: 12,
        weight: 25,
        feedbackLow: 'Open shoulders {delta}° more.',
      },
      {
        id: 'hips',
        label: 'Hips',
        kind: 'joint_angle',
        points: L_HIP,
        targetMin: 155,
        targetMax: 180,
        tolerance: 10,
        weight: 20,
        feedbackLow: 'Open hips / reduce pike.',
      },
      {
        id: 'knees',
        label: 'Knees',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 160,
        targetMax: 180,
        tolerance: 8,
        weight: 15,
        feedbackLow: 'Straighten knees.',
      },
      {
        id: 'body_line',
        label: 'Body line',
        kind: 'segment_vs_vertical',
        segment: [LM.LEFT_SHOULDER, LM.LEFT_ANKLE],
        target: 0,
        tolerance: 18,
        falloff: 45,
        weight: 15,
        feedbackHigh: 'Tighten body line — {delta}° off vertical.',
      },
    ],
  },

  // ===========================================================================
  // C SHAPE
  // ===========================================================================
  {
    id: 'c_shape',
    name: 'C shape',
    description: 'Standing artistic C-curve: long side bend with arms framing the head.',
    category: 'static',
    qualityThreshold: 55,
    criteria: [
      {
        id: 'side_curve',
        label: 'Side curve',
        kind: 'joint_angle',
        points: [LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_KNEE],
        targetMin: 140,
        targetMax: 170,
        tolerance: 15,
        falloff: 45,
        weight: 35,
        feedbackLow: 'Create a clearer C-curve through the side.',
        feedbackHigh: 'Soften the curve slightly.',
      },
      {
        id: 'arms_frame',
        label: 'Arms framing head',
        kind: 'joint_angle',
        points: L_SHOULDER,
        targetMin: 130,
        targetMax: 180,
        tolerance: 15,
        weight: 30,
        feedbackLow: 'Reach arms longer by the ear.',
      },
      {
        id: 'stance_leg',
        label: 'Stance leg',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 155,
        targetMax: 180,
        tolerance: 10,
        weight: 20,
        feedbackLow: 'Straighten the standing leg.',
      },
      {
        id: 'elbows',
        label: 'Elbows straight',
        kind: 'joint_angle',
        points: L_ELBOW,
        targetMin: 150,
        targetMax: 180,
        tolerance: 12,
        weight: 15,
        feedbackLow: 'Straighten elbows.',
      },
    ],
  },

  // ===========================================================================
  // ZOMBIE (arms forward, hollow-ish standing / lying drill)
  // ===========================================================================
  {
    id: 'zombie',
    name: 'Zombie',
    description: 'Zombie: arms reaching forward at shoulder height, body tight and hollow.',
    category: 'static',
    qualityThreshold: 60,
    criteria: [
      {
        id: 'arms_forward',
        label: 'Arms forward',
        kind: 'segment_vs_horizontal',
        segment: [LM.LEFT_SHOULDER, LM.LEFT_WRIST],
        target: 0,
        tolerance: 20,
        falloff: 45,
        weight: 30,
        feedbackHigh: 'Reach arms forward at shoulder height ({delta}°).',
      },
      {
        id: 'elbows',
        label: 'Elbows straight',
        kind: 'joint_angle',
        points: L_ELBOW,
        targetMin: 155,
        targetMax: 180,
        tolerance: 10,
        weight: 25,
        feedbackLow: 'Straighten elbows.',
      },
      {
        id: 'torso',
        label: 'Torso line',
        kind: 'segment_vs_vertical',
        segment: [LM.LEFT_HIP, LM.LEFT_SHOULDER],
        target: 0,
        tolerance: 20,
        falloff: 45,
        weight: 25,
        feedbackHigh: 'Keep torso controlled ({delta}° off).',
      },
      {
        id: 'knees',
        label: 'Knees straight',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 155,
        targetMax: 180,
        tolerance: 10,
        weight: 20,
        feedbackLow: 'Straighten knees.',
      },
    ],
  },

  // ===========================================================================
  // SIDE PLANK
  // ===========================================================================
  {
    id: 'side_plank',
    name: 'Side plank',
    description: 'Side plank hold: body in one long line, hips lifted, supporting arm straight.',
    category: 'hold',
    qualityThreshold: 65,
    criteria: [
      {
        id: 'body_line',
        label: 'Body line',
        kind: 'segment_vs_horizontal',
        segment: [LM.LEFT_SHOULDER, LM.LEFT_ANKLE],
        target: 0,
        tolerance: 18,
        falloff: 40,
        weight: 35,
        feedbackHigh: 'Lift hips into one long line ({delta}°).',
      },
      {
        id: 'support_elbow',
        label: 'Support arm straight',
        kind: 'joint_angle',
        points: L_ELBOW,
        targetMin: 155,
        targetMax: 180,
        tolerance: 10,
        weight: 25,
        feedbackLow: 'Straighten the supporting arm.',
      },
      {
        id: 'hips',
        label: 'Hips open',
        kind: 'joint_angle',
        points: L_HIP,
        targetMin: 150,
        targetMax: 180,
        tolerance: 12,
        weight: 25,
        feedbackLow: 'Open / lift the hips.',
      },
      {
        id: 'knees',
        label: 'Knees straight',
        kind: 'joint_angle',
        points: L_KNEE,
        targetMin: 155,
        targetMax: 180,
        tolerance: 10,
        weight: 15,
        feedbackLow: 'Straighten knees.',
      },
    ],
  },
]

/** Fast lookup by id */
export const SHAPES_BY_ID: Record<string, ShapeDef> = Object.fromEntries(
  SHAPES.map((s) => [s.id, s]),
)

export function getShape(id: string): ShapeDef | undefined {
  return SHAPES_BY_ID[id]
}
