/**
 * ============================================================================
 * Shape Lab — shared TypeScript types
 * ============================================================================
 * Coaches: you usually edit shapes.ts / sequences.ts, not this file.
 * These types describe how shapes, criteria, athletes, and attempts are stored.
 */

/** MediaPipe Pose landmark (normalized 0–1 coordinates). */
export type Landmark = {
  x: number
  y: number
  z: number
  visibility?: number
}

/** How a single scoring rule measures the body. */
export type CriterionKind =
  | 'joint_angle' // Angle at one joint (e.g. elbow)
  | 'segment_vs_vertical' // Line between two points vs true vertical
  | 'segment_vs_horizontal' // Line between two points vs true horizontal
  | 'point_distance' // Distance between two landmarks (normalized)
  | 'forward_of' // How far pair[0] is in front of pair[1] (heel→toe facing)
  | 'symmetry' // Absolute difference between two joint angles
  | 'composite_min' // Takes the worse (min) of several sub-measurements

/**
 * One reusable scoring criterion.
 *
 * COACH EDIT TIPS:
 * - target: ideal value (degrees for angles, 0–1 for distances)
 * - tolerance: how far from target still scores 100
 * - weight: relative importance (all weights are normalized to sum to 100%)
 * - Outside tolerance, score falls off toward 0 using falloffDegrees / falloffUnits
 */
export type CriterionDef = {
  /** Stable id used in UI and history, e.g. "elbows" */
  id: string
  /** Short label shown in the score panel */
  label: string
  kind: CriterionKind

  /**
   * For joint_angle: [proximal, joint, distal] landmark indices
   * Example elbows: [shoulder, elbow, wrist]
   */
  points?: [number, number, number]

  /**
   * For segment_vs_*: [pointA, pointB] landmark indices
   * Angle is measured of the segment A→B relative to vertical or horizontal.
   */
  segment?: [number, number]

  /**
   * For point_distance: [pointA, pointB]
   * Distance is in normalized image units (roughly 0–1 of frame width).
   *
   * For forward_of: [frontPoint, rearPoint] — how far frontPoint is in front
   * of rearPoint along the floor, using heel→toe as facing. Positive = in front.
   * Side view only (needsView: 'side').
   */
  pair?: [number, number]

  /**
   * For symmetry: two joint triplets; score is based on |angle1 - angle2|
   * Ideal difference is usually 0.
   */
  leftPoints?: [number, number, number]
  rightPoints?: [number, number, number]

  /**
   * For composite_min: list of criterion ids defined on the same shape.
   * Useful for "elbows" = min(leftElbow, rightElbow).
   */
  of?: string[]

  /** Ideal value (degrees or distance units). Use targetMin/targetMax for a range. */
  target?: number
  /** Inclusive ideal range. Prefer this over target when a band is OK. */
  targetMin?: number
  targetMax?: number

  /**
   * Within this many units of the target/range, score = 100.
   * Degrees for angles; normalized units for distances.
   */
  tolerance: number

  /**
   * Beyond tolerance, score drops from 100 → 0 across this many extra units.
   * Larger = more forgiving. Default 40 for angles.
   */
  falloff?: number

  /** Relative weight in the overall score (any positive number). */
  weight: number

  /**
   * Feedback when the measured value is BELOW the target/range
   * (after subtracting tolerance). Use {delta} for how many degrees/units short.
   */
  feedbackLow?: string

  /**
   * Feedback when the measured value is ABOVE the target/range.
   * Use {delta} for how many degrees/units over.
   */
  feedbackHigh?: string

  /** Fallback feedback if side-specific messages are omitted. */
  feedback?: string

  /**
   * If set, this check is only reliable from that camera angle.
   * When the athlete is filmed from the wrong angle, it is excluded from the
   * overall score (so a front-on photo doesn't tank a side-view body line).
   */
  needsView?: 'side' | 'front'
}

/** Which way to point the camera for this shape. */
export type CameraView = 'any' | 'side' | 'front'

export type ShapeCategory = 'static' | 'hold' | 'transition'

/**
 * One gymnastics shape definition.
 * Add new shapes by copying an existing block in shapes.ts.
 */
export type ShapeDef = {
  id: string
  name: string
  description: string
  /**
   * Full written standard for the body position. This is the grading contract —
   * criteria below measure these words. Shown large in Tasks / Learn / scoring.
   */
  bodyPosition?: string
  category: ShapeCategory
  /** Minimum overall score (0–100) to count quality hold time / advance sequences */
  qualityThreshold: number
  /**
   * any = joint angles work from most angles (athlete may face any way).
   * side = body line / lever / lunge line needs a side or 3/4 view — never face-on.
   * front = both arms/legs need to be visible (T, symmetry).
   */
  cameraView?: CameraView
  /**
   * When true, scoring tries both “left leg in front” and “right leg in front”
   * and uses the better match — so athletes don’t have to match a photo’s side.
   */
  stanceAware?: boolean
  /** Optional coaching tips shown in the UI */
  tips?: string[]
  /**
   * Extra teach-notes (when you use this shape, connections, common mistakes).
   * Shown in Learn / Glossary with the reference photo.
   */
  coachNotes?: string
  criteria: CriterionDef[]
}

export type SequenceStep = {
  shapeId: string
  /** Seconds the athlete must stay above qualityThreshold to advance */
  holdSeconds: number
}

export type SequenceDef = {
  id: string
  name: string
  description: string
  steps: SequenceStep[]
}

export type Athlete = {
  id: string
  name: string
  notes?: string
  /** Instagram username without @. Used for Story captions and tagging Ryan. */
  instagramHandle?: string
  createdAt: string
  /** SHA-256 of athleteId + passcode. Required to open the profile on any link. */
  passcodeHash?: string
  /**
   * Who this profile is. Ryan is always gym admin (treated as coach).
   * Gym owners and coaches can keep their own Compare collections.
   */
  role?: 'gym_owner' | 'coach' | 'athlete' | 'parent'
  /** Gym they own, coach at, or train at. */
  gymName?: string
  /** Parent profiles: the athlete they came for. */
  childName?: string
  /**
   * Asked when a coach or parent makes a profile. Opens the back-care
   * homework path (journal, glute bridges, back extensions).
   */
  hasBackPain?: boolean
  /** Athlete (or coach) said they are dealing with an injury right now. */
  injuryActive?: boolean
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  /** Mom or dad — used on the class station so Ryan can text a parent. */
  parentPhone?: string
  /** Which leg goes forward on a cartwheel. */
  cartwheelLeg?: 'left' | 'right'
  /** Research: which hold feels harder. */
  harderShape?: 'hollow' | 'superman'
  /** 1 = easy, 5 = very hard to hit a fully open shoulder. */
  openShoulderHardness?: 1 | 2 | 3 | 4 | 5
  /** Optional class-station snapshot (data URL). */
  photoDataUrl?: string
  /** Which way they twist — or not yet / both ways. */
  twistDirection?: 'left' | 'right' | 'both' | 'not_yet'
  /** If they twist both ways, which side is better. */
  twistBetterSide?: 'left' | 'right'
  /** Writing / throwing hand. Ambidextrous is allowed. */
  dominantHand?: 'left' | 'right' | 'ambidextrous'
  /** Skateboard stance: regular = left foot forward, goofy = right. */
  skateStance?: 'regular' | 'goofy'
  /** Coach / admin notes filed while working with this athlete. */
  coachNotes?: AthleteCoachNote[]
  /** Recent shape-test scores (oldest first, newest last). */
  shapeTests?: ShapeTestRecord[]
}

export type AthleteCoachNote = {
  id: string
  authorId: string
  authorName: string
  text: string
  createdAt: string
  meetingId?: string
  lessonId?: string
  className?: string
  topicLabel?: string
}

export type ShapeTestRecord = {
  id: string
  takenAt: number
  pool: 'pathway' | 'arm-positions'
  format: 'picture' | 'describe' | 'mixed'
  score: number
  total: number
}

export type CriterionScore = {
  id: string
  label: string
  score: number
  measured: number | null
  weight: number
  feedback: string | null
}

export type ScoreResult = {
  overall: number
  criteria: CriterionScore[]
  mainCorrection: string | null
  /** Which front-leg stance scored better (when the shape is stance-aware). */
  detectedStance?: 'left' | 'right'
  /** What the camera appears to see. */
  cameraViewDetected?: 'front' | 'side' | 'unknown'
  /** Shown when the athlete is facing the wrong way for this shape. */
  viewWarning?: string | null
  /**
   * True when the pose is good enough to count a quality hold.
   */
  holdReady?: boolean
  /**
   * True when the athlete is actually in the shape except one piece
   * (a leftover leg or line check). Open shoulders on lunges/lever do
   * not count as “close”. Casual standing is not “close”.
   */
  nearHit?: boolean
}

export type AttemptRecord = {
  id: string
  athleteId: string
  shapeId: string
  shapeName: string
  overall: number
  criteria: { id: string; label: string; score: number }[]
  totalHoldSeconds: number
  qualityHoldSeconds: number
  mainCorrection: string | null
  savedAt: string
}

export type AppSettings = {
  qualityThresholdOverride: number | null
  mirrorVideo: boolean
  showAngles: boolean
  /** Speak live corrections during Tasks mode (throttled ~4s). */
  voiceEnabled: boolean
}

/**
 * Per-athlete curriculum progress.
 * completions[taskId] = how many times the athlete finished that task.
 */
export type AthleteTaskProgress = {
  athleteId: string
  /** Successful finishes per curriculum task id */
  completions: Record<string, number>
  /** Currently selected / suggested task id */
  currentTaskId: string | null
  /**
   * Optional coach-assigned subset of task ids.
   * Empty / missing = full curriculum is available (subject to unlock order).
   */
  assignedTaskIds: string[] | null
  /**
   * Tasks the athlete skipped (app glitch / stuck). Unlocks the next task
   * without counting as a successful completion.
   */
  skippedTaskIds?: string[]
  updatedAt: string
}

/** One snapshot from a Tasks 2 class-flow run. */
export type FlowStepSnap = {
  shapeId: string
  shapeName: string
  overall: number
  cues: string[]
  captureId: string | null
  clipId?: string | null
  /** Seconds into the run replay when this shape was snapshotted. */
  atSec?: number
  /** Replay seek marker from best match (not a timed class-count snapshot). */
  marker?: 'playhead'
  /** 1-based rep number when this still is one of several handstand kicks. */
  rep?: number
  /** Hold duration when this still maps a timed handstand (not a snapshot grade). */
  holdSeconds?: number
}

/** One timed handstand inside a hold-challenge run. */
export type FlowHoldAttempt = {
  index: number
  holdSeconds: number
  /** Best live line during the hold — used for written cues, not a snapshot grade. */
  livePeak: number
  cues: string[]
  clipId: string | null
  snapshotId: string | null
  playheadSec?: number
  highlighted?: boolean
  /** Seconds into the clip when the hold clock started. */
  clockOffsetSec?: number
}

/** Written review of one Tasks 2 sequence. */
export type FlowRunReport = {
  id: string
  athleteId: string
  sequenceId: string
  sequenceName: string
  nickname: string
  createdAt: string
  replayCaptureId: string | null
  steps: FlowStepSnap[]
  summary: string
  /** Timed holds for the one-person handstand hold challenge. */
  holdAttempts?: FlowHoldAttempt[]
  bestHoldSeconds?: number
  /** When the athlete marked this run to send to Ryan. */
  sharedWithCoachAt?: string | null
  /** Handle used on the Story caption for this run. */
  instagramHandle?: string
}

export type FlowProgress = {
  athleteId: string
  completions: Record<string, number>
  currentId: string | null
  updatedAt: string
}

/** One shape inside a finished task run — used for the written analysis. */
export type TaskStepReport = {
  shapeId: string
  shapeName: string
  required: boolean
  tries?: number
  bestOverall: number
  qualityHit: boolean
  holdSeconds: number
  mainCorrection: string | null
  criteria: { id: string; label: string; score: number; feedback: string | null }[]
  notes: string
}

/** Written analysis of one completed task attempt. */
export type TaskRunReport = {
  id: string
  athleteId: string
  taskId: string
  taskName: string
  createdAt: string
  steps: TaskStepReport[]
  summary: string
}

/** Who put a homework item on the athlete's list. */
export type HomeworkSource = 'auto' | 'coach' | 'athlete'

/** How an assigned or catalog drill is trained and logged. */
export type HomeworkTrackMode = 'hold' | 'reps' | 'hold_or_reps' | 'journal'

/**
 * One homework drill on an athlete's list.
 * `auto` items are seeded for EVERY athlete and cannot be removed —
 * they track progress over the whole tumbling journey.
 */
export type HomeworkItem = {
  id: string
  athleteId: string
  /** Shape being trained (from src/config/shapes.ts), or `custom:…` when typed. */
  shapeId: string
  /** Coach-typed drill name when this is not a scored gym shape. */
  customLabel?: string
  source: HomeworkSource
  /**
   * Stable key for auto items ('hollow' | 'superman' | 'side_plank' |
   * 'wall_handstand') so the hollow item can switch shape (arms down →
   * arms up) while keeping its identity and history.
   */
  autoKey?: string
  /** Quality-hold goal in seconds (shown as a progress bar) */
  targetSeconds?: number
  /**
   * Form standard for this drill: score required for "proper hold" time and
   * verbal form tips. Missing = global default (85).
   */
  formStandard?: number
  notes?: string
  createdAt: string
  /** Set when the hollow auto item was leveled up arms-down → arms-up */
  progressedAt?: string
  /** Stock catalog id (push-ups, pull-ups, back extensions, …). */
  catalogId?: string
  /** Coach-authored custom exercise id. */
  coachExerciseId?: string
  /**
   * How this drill is logged. Custom skills default to reps so a typed
   * skill is not trapped on a hold-only timer.
   */
  trackMode?: HomeworkTrackMode
  /** Rep goal when this is a reps (or hold-or-reps) drill. */
  targetReps?: number
  /** Pull-up grip, or any grip the coach named. */
  grip?: string
  /** Allow a weight field on the log (back extensions, glute bridges). */
  allowWeight?: boolean
}

/** One form-breakdown event during a camera homework session. */
export type HomeworkBreakdown = {
  /** Seconds into the hold when form fell below the standard */
  atSeconds: number
  /** Lowest-scoring criterion at that moment */
  criterionId: string
  criterionLabel: string
  /** Coach cue explaining why form broke (if available) */
  feedback: string | null
}

/** One logged homework session (a completed timed hold). */
export type HomeworkLog = {
  id: string
  athleteId: string
  homeworkId: string
  shapeId: string
  /** ISO date-time of the session */
  date: string
  totalHoldSeconds: number
  /**
   * LEGACY (v1 camera logs): hold time above the old quality threshold.
   * New logs write properHoldSeconds instead — read via logProperHoldSeconds().
   */
  qualityHoldSeconds?: number
  /** Hold time at/above the form standard (camera sessions only) */
  properHoldSeconds?: number
  /** Form standard (score) the proper-hold timer used */
  formStandard?: number
  /** How the session was recorded. Missing (v1 logs) = 'camera'. */
  method?: 'camera' | 'manual'
  /** When/why form broke during the hold (camera sessions) */
  breakdowns?: HomeworkBreakdown[]
  /** Overall shape score (0–100) at log time; 0 for manual entries */
  score: number
  /** Class-flow sequence run vs a timed hold vs a set of reps. Missing = hold. */
  kind?: 'hold' | 'sequence' | 'reps' | 'set' | 'journal'
  /** Sequence completions, or counted reps for a strength drill. */
  reps?: number
  /** Reps the athlete counted as quality (form they would show a coach). */
  qualityReps?: number
  grip?: string
  weightLb?: number
  /** 0–10 pain after this session (care / back-extension logs). */
  painLevel?: number
  journal?: string
  trackMode?: HomeworkTrackMode
  /** For side plank: which side was trained */
  side?: 'left' | 'right'
  /** Lesson holds land on the athlete’s homework, labeled with the coach. */
  loggedFrom?: 'lesson' | 'class'
  lessonId?: string
  coachId?: string
  coachName?: string
  /** Short label shown on the homework log — e.g. “In class · Hollow”. */
  sourceLabel?: string
  classMeetingId?: string
  className?: string
}

export type LessonBlockKind = 'hold' | 'compare' | 'talk'

export type LessonBlock = {
  id: string
  kind: LessonBlockKind
  title: string
  notes?: string
  shapeId?: string
  targetSeconds?: number
  formStandard?: number
}

export type LessonPlan = {
  id: string
  athleteId: string
  coachId: string
  title: string
  blocks: LessonBlock[]
  createdAt: string
  updatedAt: string
}

export type LessonNoteTopicKind = 'shape' | 'sequence' | 'custom' | 'coach'

export type LessonNote = {
  id: string
  text: string
  createdAt: string
  context: 'general' | 'compare' | 'hold'
  topicKind?: LessonNoteTopicKind
  topicId?: string
  topicLabel?: string
}

export type LessonHold = {
  id: string
  shapeId: string
  shapeName: string
  createdAt: string
  totalHoldSeconds: number
  properHoldSeconds: number
  score: number
  method: 'camera' | 'manual'
  topicKind?: LessonNoteTopicKind
}

export type LessonSession = {
  id: string
  planId: string | null
  athleteId: string
  coachId: string
  startedAt: string
  endedAt?: string
  notes: LessonNote[]
  holds: LessonHold[]
}

export type CoachProgression = {
  id: string
  title: string
  notes: string
}

export type CoachShapeMedia = {
  id: string
  kind: 'photo' | 'video'
  src: string
  crop?: { x: number; y: number; w: number; h: number }
  label?: string
}

/** Gym-wide shape added while signed in — appears in Learn and homework. */
export type GymLibraryShape = {
  id: string
  name: string
  description: string
  bodyPosition: string
  cameraView?: CameraView
  category?: ShapeCategory
  /** Grade camera work using this shipped shape’s criteria. */
  scoreShapeId?: string
  createdById: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

export type CoachShape = {
  id: string
  coachId: string
  coachName: string
  name: string
  description: string
  bodyPosition: string
  scoreShapeId?: string
  progressions: CoachProgression[]
  media: CoachShapeMedia[]
  createdAt: string
  updatedAt: string
}

export type WarmupStep = {
  id: string
  title: string
  notes: string
  holdSeconds?: number
  mediaKind?: 'photo' | 'video'
  mediaSrc?: string
}

export type WarmupGuide = {
  id: string
  coachId: string
  coachName: string
  title: string
  description: string
  steps: WarmupStep[]
  createdAt: string
  updatedAt: string
}

export type WarmupStar = {
  athleteId: string
  warmupId: string
}

/** Ryan’s private drill clip. If shapeId is set, the video shows on that shape for everyone. */
export type DrillClip = {
  id: string
  title: string
  notes: string
  src: string
  shapeId?: string
  createdAt: string
  updatedAt: string
}

export type CoachSkillRef = {
  id: string
  coachId: string
  coachName: string
  name: string
  notes?: string
  src: string
  trimStart?: number
  trimEnd?: number
  lessonId?: string
  athleteId?: string
  athleteName?: string
  createdAt: string
  updatedAt: string
}

/**
 * Coach still that shows the idea of a shape.
 * Grading uses the written body position, not a pixel match to this photo.
 * Stored as a data URL (base64) in localStorage / IndexedDB.
 */
export type ReferencePhoto = {
  id: string
  /** Shape this photo demonstrates */
  shapeId: string
  /** If set, photo is for this athlete only; null = shared for the shape */
  athleteId: string | null
  /** data:image/...;base64,... */
  dataUrl: string
  label?: string
  /** Extra coach notes entered when the picture was uploaded. */
  notes?: string
  createdAt: string
  /**
   * Where the still came from.
   * `ig` = cropped from a Compare / Instagram clip (IG shapes library).
   * Missing or `coach` = glossary upload or other coach still — never overwrite shipped files.
   */
  library?: 'coach' | 'ig'
  /**
   * Display name when this still is not one of the scored library shapes
   * (typed at Screenshot save time).
   */
  customName?: string
  /**
   * Written to the Shape Lab server (Ryan profile). Shows on every browser / link.
   */
  persistedToApp?: boolean
}

/** Coach-authored exercise that can be assigned as homework. */
export type CoachExercise = {
  id: string
  coachId: string
  name: string
  trackMode: HomeworkTrackMode
  notes?: string
  createdAt: string
}

/** One injury check-in — healing log, not a diagnosis. */
export type InjuryEntry = {
  id: string
  athleteId: string
  date: string
  /** Where it hurts (knee, low back, wrist, …). */
  bodyPart: string
  /** 0 = none, 10 = worst. */
  painLevel: number
  whatHurts: string
  where: string
  startedWhen?: string
  worseWhen?: string
  betterWhen?: string
  doctorNotes?: string
  notes?: string
}

/** Back-care journal after a guided session. */
export type PainJournalEntry = {
  id: string
  athleteId: string
  date: string
  painLevel: number
  exerciseId?: string
  exerciseName?: string
  holdSeconds?: number
  reps?: number
  weightLb?: number
  felt?: string
  notes?: string
}
