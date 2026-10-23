/**
 * Coach education data model. Everything here is educational reference for
 * coaches. It is never a diagnosis tool and never medical advice for an athlete.
 */

export type ReviewStatus = 'draft' | 'in_review' | 'approved' | 'retired'

/** How strong the backing for a claim is. `uncertain` is a legitimate answer. */
/**
 * `policy` marks ShapeLab coaching rules (for example "do not diagnose"). They
 * are conduct rules for our coaches, not medical findings.
 */
export type Evidence = 'guideline' | 'review' | 'consensus' | 'policy' | 'uncertain'

export type SourceKind =
  | 'guideline'
  | 'systematic_review'
  | 'review'
  | 'consensus_statement'
  | 'primary_study'
  | 'textbook'
  | 'agency'
  /** A coach's or practitioner's own book or site. Never experimental evidence. */
  | 'practitioner'
  /** Historical primary text, cited for what it said, not for being current. */
  | 'historical'

export const PRACTITIONER_NOTE = 'Coaching approach, not experimental evidence'

export type Source = {
  id: string
  title: string
  /** Authors or organisation, as published. */
  by: string
  /** Journal, publisher, or agency. */
  venue: string
  /** Omitted for web pages that show no publication or update date. */
  year?: number
  kind: SourceKind
  url: string
  pmid?: string
  doi?: string
  isbn?: string
  /** ISO date the bibliographic record was checked against its public record. */
  verifiedOn: string
  /** How it was checked. Kept so a reviewer can repeat it. */
  verifiedBy: 'pubmed' | 'publisher_page' | 'agency_page' | 'openlibrary_isbn' | 'author_page'
}

/** A single statement with the evidence behind it. */
export type Claim = {
  text: string
  evidence?: Evidence
  sourceIds?: string[]
}

/** A time range that is explicitly an estimate, with a source or `uncertain`. */
export type RecoveryRange = {
  /** Plain-language range, for example "about 3 to 6 weeks for many mild cases". */
  text: string
  minWeeks?: number
  maxWeeks?: number
  sourceIds: string[]
  uncertain: boolean
  note?: string
}

export type Region =
  | 'muscle_tendon'
  | 'ankle_foot'
  | 'knee'
  | 'spine_pelvis'
  | 'upper_limb'
  | 'bone'
  | 'neuro'

export const REGION_LABELS: Record<Region, string> = {
  muscle_tendon: 'Muscle and tendon',
  ankle_foot: 'Ankle and foot',
  knee: 'Knee and leg',
  spine_pelvis: 'Spine and pelvis',
  upper_limb: 'Shoulder to hand',
  bone: 'Fractures and bone',
  neuro: 'Head and nerves',
}

export type TissueId =
  | 'muscle'
  | 'tendon'
  | 'ligament'
  | 'bone'
  | 'growth_plate'
  | 'cartilage'
  | 'joint_capsule'
  | 'nerve'
  | 'brain'
  | 'spinal_cord'
  | 'bursa_cyst'
  | 'fascia'

export const TISSUE_LABELS: Record<TissueId, string> = {
  muscle: 'Muscle',
  tendon: 'Tendon',
  ligament: 'Ligament',
  bone: 'Bone',
  growth_plate: 'Growth plate',
  cartilage: 'Cartilage',
  joint_capsule: 'Joint capsule',
  nerve: 'Nerve',
  brain: 'Brain',
  spinal_cord: 'Spinal cord',
  bursa_cyst: 'Bursa or cyst',
  fascia: 'Fascia',
}

export type Urgency = 'emergency' | 'same_day' | 'soon' | 'monitor'

export const URGENCY_LABELS: Record<Urgency, string> = {
  emergency: 'Emergency: call 911 (or local emergency number)',
  same_day: 'Same-day medical evaluation',
  soon: 'Arrange a clinician visit soon',
  monitor: 'Monitor and report to parent',
}

/**
 * The standard 21-section injury card. Sections 1 through 21 are rendered in
 * this order. `uncertain` content is still valid: write what is not known.
 */
export type ConditionCard = {
  /** 1. Plain-language summary a coach can say out loud. */
  summary: Claim
  /** 2. Structures involved (anatomy). */
  structures: Claim[]
  /** 3. Typical mechanism. */
  mechanism: Claim[]
  /** 4. Where it shows up in gymnastics and tumbling. */
  gymContext: Claim[]
  /** 5. Who is at higher risk and why. */
  riskFactors: Claim[]
  /** 6. What an athlete may report or show. */
  signs: Claim[]
  /** 7. Red flags: signs that make this urgent or an emergency. */
  redFlags: Claim[]
  /** 8. What a coach can safely observe without testing the injury. */
  coachObservations: Claim[]
  /** 9. Immediate coach response. */
  immediateResponse: Claim[]
  /** 10. Who should evaluate. */
  whoEvaluates: Claim[]
  /** 11. How clinicians usually work it out (so coaches know what to expect). */
  clinicianWorkup: Claim[]
  /** 12. Typical management a clinician may direct. Educational, not a plan. */
  typicalManagement: Claim[]
  /** 13. Tissue healing range. Separate from 14 on purpose. */
  tissueRecovery: RecoveryRange
  /** 14. Time before running, jumping, landing, tumbling load may be cleared. */
  returnToImpact: RecoveryRange
  /** 15. Return-to-tumbling considerations the coach can act on. */
  returnToTumbling: Claim[]
  /** 16. Prevention and load management. */
  prevention: Claim[]
  /** 17. Common myths and mistakes. */
  mythsAndMistakes: Claim[]
  /** 18. What a coach should not do. */
  doNot: Claim[]
  /** 19. Talking with the athlete and parent, and documentation. */
  communication: Claim[]
  /** 20. Look-alikes and related conditions (free text, ids go in `related`). */
  lookAlikes: Claim[]
  /** 21. Questions for the clinician. */
  questionsForClinician: Claim[]
}

export const CARD_SECTIONS: {
  key: keyof ConditionCard
  label: string
  /** Sections shown first on mobile and in Quick Reference. */
  priority?: boolean
}[] = [
  { key: 'summary', label: 'In plain language', priority: true },
  { key: 'redFlags', label: 'Danger signs', priority: true },
  { key: 'immediateResponse', label: 'What to do now', priority: true },
  { key: 'whoEvaluates', label: 'Who should evaluate', priority: true },
  { key: 'structures', label: 'Structures involved' },
  { key: 'mechanism', label: 'How it happens' },
  { key: 'gymContext', label: 'In gymnastics and tumbling' },
  { key: 'riskFactors', label: 'Who is at higher risk' },
  { key: 'signs', label: 'What an athlete may report or show' },
  { key: 'coachObservations', label: 'What a coach can safely observe' },
  { key: 'clinicianWorkup', label: 'How clinicians work it out' },
  { key: 'typicalManagement', label: 'Typical management (clinician directed)' },
  { key: 'tissueRecovery', label: 'Tissue healing range' },
  { key: 'returnToImpact', label: 'Return to impact and load range' },
  { key: 'returnToTumbling', label: 'Return to tumbling' },
  { key: 'prevention', label: 'Prevention and load management' },
  { key: 'mythsAndMistakes', label: 'Myths and mistakes' },
  { key: 'doNot', label: 'What a coach should not do' },
  { key: 'communication', label: 'Talking with athlete and parent' },
  { key: 'lookAlikes', label: 'Look-alikes' },
  { key: 'questionsForClinician', label: 'Questions to ask the clinician' },
]

export type Condition = {
  id: string
  name: string
  aliases: string[]
  regions: Region[]
  tissues: TissueId[]
  tags: string[]
  /** Highest urgency this condition can reach. Drives the badge. */
  urgency: Urgency
  /** `complete` means every card field is sourced or marked uncertain. */
  completeness: 'complete' | 'in_preparation'
  /** Review status shipped in code. The server overlay may override it. */
  review: ReviewStatus
  related: string[]
  mediaIds: string[]
  /** Only present when completeness is `complete`. */
  card?: ConditionCard
  /** Shown on in-preparation entries. */
  preparationNote?: string
}

export type ConditionSummary = Pick<
  Condition,
  'id' | 'name' | 'aliases' | 'regions' | 'tissues' | 'tags' | 'urgency' | 'completeness' | 'review'
>

export type LessonBlock =
  | { kind: 'p'; text: string; sourceIds?: string[]; evidence?: Evidence }
  | { kind: 'h'; text: string }
  | { kind: 'list'; items: string[]; sourceIds?: string[]; evidence?: Evidence }
  | { kind: 'callout'; tone: 'safety' | 'tip' | 'note' | 'uncertain'; text: string; sourceIds?: string[]; evidence?: Evidence }
  | { kind: 'figure'; slotId: string }
  | { kind: 'comparison'; comparisonId: string }
  | { kind: 'conditions'; conditionIds: string[] }
  | { kind: 'scenarios'; scenarioIds: string[] }
  | { kind: 'flashcards'; deckId: string }
  | { kind: 'matching'; matchingId: string }
  | { kind: 'terms'; termKinds: MovementTermKind[] }
  | { kind: 'methods' }
  | { kind: 'exercises'; exerciseIds: string[] }
  | { kind: 'evidenceLinks'; exerciseIds: string[] }
  | { kind: 'timeline'; items: TimelineItem[] }

export type TimelineItem = {
  year: string
  label: string
  text: string
  /** What kind of statement this was when it was made. */
  status: 'framework' | 'clinical_guidance' | 'expert_opinion' | 'review'
  sourceIds: string[]
}

export const TIMELINE_STATUS_LABELS: Record<TimelineItem['status'], string> = {
  framework: 'Proposed framework',
  clinical_guidance: 'Clinical guidance',
  expert_opinion: 'Expert opinion',
  review: 'Evidence review',
}

export type ModuleId =
  | 'fundamentals'
  | 'library'
  | 'response'
  | 'recovery'
  | 'movement'
  | 'stretching'
  | 'training'
  | 'testing'

export type Lesson = {
  id: string
  moduleId: ModuleId
  title: string
  kicker: string
  minutes: number
  review: ReviewStatus
  blocks: LessonBlock[]
  /** Existing ShapeLab skill or shape ids tied to this lesson. */
  shapeIds?: string[]
  /** Set when this lesson wraps an existing Learn lesson. */
  legacyId?: string
  /** Lesson still waiting for a verified visual. */
  visualNeeded?: string[]
  /** Short coach-facing action line, shown at the end. */
  gym?: string
}

export type ModuleInfo = {
  id: ModuleId
  title: string
  blurb: string
}

export type ComparisonTable = {
  id: string
  title: string
  intro: string
  columns: { id: string; label: string }[]
  rows: {
    label: string
    cells: Record<string, string>
    sourceIds?: string[]
  }[]
  footnote?: string
}

export type Scenario = {
  id: string
  title: string
  setup: string
  /** Steps the learner picks between. Correct choice is `safest`. */
  choices: { id: string; label: string; safest?: boolean; feedback: string }[]
  takeaway: string
  sourceIds: string[]
  /** Scenario names a true emergency. */
  emergency?: boolean
}

export type Flashcard = { id: string; front: string; back: string; sourceIds?: string[] }
export type FlashcardDeck = { id: string; title: string; cards: Flashcard[] }

export type MatchingSet = {
  id: string
  title: string
  prompt: string
  pairs: { id: string; left: string; right: string }[]
}

export type MovementTermKind =
  | 'plane_axis'
  | 'joint_action'
  | 'scapular'
  | 'pelvic'
  | 'foot_chain'
  | 'chain'
  | 'contraction'
  | 'loading'

/**
 * How strongly an exercise is tied to fewer injuries. Improving a strength
 * number is `capacity`, never `direct_reduction`.
 */
export type PreventionEvidence = 'direct_reduction' | 'capacity' | 'rationale_only' | 'insufficient'

export const PREVENTION_EVIDENCE_LABELS: Record<PreventionEvidence, string> = {
  direct_reduction: 'Direct injury reduction evidence',
  capacity: 'Evidence for improving an associated physical capacity',
  rationale_only: 'Biomechanical rationale without proven injury reduction',
  insufficient: 'Insufficient or conflicting evidence',
}

export type ContractionDemand = { concentric: string; eccentric: string; isometric: string }

/**
 * Coach education layer over an existing exercise. `catalogId` is the
 * homework catalog id, so the exercise itself is never duplicated. Records
 * with `educationOnly` have no catalog entry and cannot be assigned.
 */
export type ExerciseEducation = {
  id: string
  name: string
  catalogId?: string
  educationOnly?: boolean
  caution?: 'advanced'
  summary: string
  primaryMuscles: string[]
  supportingMuscles: string[]
  joints: string[]
  planes: string[]
  contraction: ContractionDemand
  loadingEmphasis: string
  qualities: string[]
  mobility: string[]
  control: string[]
  gymApplication: Claim[]
  errors: string[]
  beginner: string[]
  advanced: string[]
  progressWhen: string[]
  stopOrModify: string[]
  injuryConsiderations: Claim[]
  researchSupports: Claim[]
  stillTheoretical: Claim[]
  /** Topic-specific sections, for example step height or heel elevation. */
  focus?: { title: string; points: Claim[] }[]
  /** Coaching prerequisites before introducing it. Not a validated screen. */
  readiness?: Claim[]
  contraindications?: Claim[]
  conditionIds: string[]
  lessonIds: string[]
  /** Existing ShapeLab coaching standard shown as such. */
  shapeLabStandard?: string
  review: ReviewStatus
}

export type ExerciseLink = {
  exerciseId: string
  capacity: string
  tissueDemand: string
  mayHelp: string
  evidence: PreventionEvidence
  limits: string
  contraindications: string
  sourceIds: string[]
  conditionIds: string[]
}

export type MovementTerm = {
  id: string
  term: string
  kind: MovementTermKind
  definition: string
  /** Tumbling example, attached to existing ShapeLab shape ids when one exists. */
  gymExample: string
  shapeIds?: string[]
  sourceIds: string[]
  /** Loading concepts are never joint actions. */
  isJointAction: boolean
}

export type StretchMethod = {
  id: string
  name: string
  what: string
  evidenceNote: string
  gymUse: string
  cautions: string
  sourceIds: string[]
  evidence: Evidence
}

export type MediaStatus =
  | 'candidate'
  | 'license_pending'
  | 'license_verified'
  | 'anatomy_pending'
  | 'approved'
  | 'rejected'

export type MediaLicenseId =
  | 'CC0'
  | 'CC-BY-4.0'
  | 'CC-BY-3.0'
  | 'CC-BY-SA-4.0'
  | 'CC-BY-SA-3.0'
  | 'PD'
  | 'unknown'

export type Hotspot = {
  id: string
  /** Percent coordinates inside the image, 0 to 100. */
  x: number
  y: number
  label: string
  detail?: string
}

export type MediaAsset = {
  id: string
  title: string
  creator: string
  institution?: string
  sourcePageUrl: string
  /** Original file on the source site. */
  fileUrl: string
  /** Hosted, approved copy under public/coach-ed/media. Set only after approval. */
  localPath?: string
  license: MediaLicenseId
  licenseUrl: string
  commercialUseAllowed: boolean
  modificationAllowed: boolean
  attributionRequired: boolean
  /** Exact credit text shown beside the image. */
  creditLine: string
  verifiedOn?: string
  /** What was checked, in words a reviewer can repeat. */
  verificationEvidence?: string
  altText: string
  structures: string[]
  tags: string[]
  conditionIds: string[]
  lessonIds: string[]
  status: MediaStatus
  /** Anatomy reviewer note. Free text. */
  anatomyReview?: { reviewer: string; on: string; note: string }
  modifications: { on: string; by: string; what: string }[]
  hotspots?: Hotspot[]
  rejectionReason?: string
  widthPx?: number
  heightPx?: number
}

export type QuestionDifficulty = 'foundation' | 'applied' | 'advanced'

export type QuestionKind = 'single' | 'scenario'

/** The part of a question that is safe to send to the browser. */
export type QuestionPublic = {
  id: string
  topicId: string
  kind: QuestionKind
  difficulty: QuestionDifficulty
  critical: boolean
  prompt: string
  choices: { id: string; label: string }[]
  sourceIds: string[]
}

/** The server-only part. Never imported by anything under src/components. */
export type QuestionAnswer = {
  id: string
  answerId: string
  explain: string
}

export type AssessmentCategoryId =
  | 'injury_fundamentals'
  | 'tissue_anatomy'
  | 'injury_response'
  | 'concussion'
  | 'ankle_foot'
  | 'knee_leg'
  | 'spine_pelvis'
  | 'upper_limb'
  | 'fracture_bone'
  | 'return_to_tumbling'
  | 'movement_science'
  | 'flexibility_stretching'
  | 'training_science'
  | 'comprehensive'

export type Assessment = {
  id: AssessmentCategoryId
  title: string
  blurb: string
  /** Question topic ids drawn into this assessment. */
  topicIds: string[]
  /** How many questions a fresh attempt draws. */
  size: number
  /** Marked safe to run only when its content is no longer a draft. */
  requiresCriticalCorrect: boolean
}

export type MasteryLevelId = 'foundations' | 'working' | 'proficient' | 'advanced'

export type MasteryLevel = {
  id: MasteryLevelId
  label: string
  /** Assessment ids that must be passed. */
  requires: AssessmentCategoryId[]
  /** Requires an assessment pass before this many days ago, or none. */
  blurb: string
}

export const ASSESSMENT_PASS_PERCENT = 85

/** Every mastery label is an internal ShapeLab achievement, not a credential. */
export const MASTERY_DISCLAIMER =
  'ShapeLab achievements are internal learning milestones. They are not a medical, athletic-training, coaching, or first-aid certification.'

export const EDUCATIONAL_DISCLAIMER =
  'Educational reference for coaches. It is not medical advice and cannot be used to diagnose or rule out an injury. When in doubt, stop activity and get a qualified clinician involved.'
