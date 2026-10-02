/**
 * Cue Quest pack — real shape names + verbatim coach cues.
 * Draft content: each `cue` is copied word-for-word from the coach's
 * shape tips; `why` states what body relationship the cue addresses,
 * grounded in the cue itself.
 */
export type CueQuestItem = {
  id: string
  cue: string
  shapeId: string
  shapeName: string
  why: string
}

export const CUE_QUEST_ITEMS: CueQuestItem[] = [
  {
    id: 'cq-01',
    cue: 'Flatten the low back, then let the feet inch off the ground.',
    shapeId: 'hollow_arms_down',
    shapeName: 'Hollow (arms down)',
    why: 'The hollow only counts when the lower back stays pressed down — this cue keeps athletes from lifting the low back as the feet leave the floor.',
  },
  {
    id: 'cq-02',
    cue: 'On the back — this is a tight arch, not a Superman.',
    shapeId: 'arch',
    shapeName: 'Tight arch',
    why: 'It keeps the two arch shapes apart: the tight arch is lying on the back, the Superman on the stomach.',
  },
  {
    id: 'cq-03',
    cue: 'Chin stays up with straight arms behind the ears.',
    shapeId: 'superman',
    shapeName: 'Superman',
    why: 'It stops the head dropping and the shoulders closing — chin up with arms behind the ears keeps the line long.',
  },
  {
    id: 'cq-04',
    cue: 'Open hips, ribs in — same stacked body as a good handstand, just on the shoulders.',
    shapeId: 'candlestick',
    shapeName: 'Candlestick',
    why: 'It stops the hips piking and the ribs flaring — the candlestick stacks like a handstand, balanced on the shoulders.',
  },
  {
    id: 'cq-05',
    cue: 'Hips under, chest hollow — round the back, do not arch.',
    shapeId: 'c_shape',
    shapeName: 'C shape',
    why: 'It stops athletes arching in the C — the hips tuck under and the chest rounds to make the curve.',
  },
  {
    id: 'cq-06',
    cue: 'Armpits in front of toes — that keeps the hollow if they push the hips into an arch.',
    shapeId: 'zombie',
    shapeName: 'Zombie',
    why: 'It stops the hips drifting into an arch — armpits past the toes holds the hollow body line.',
  },
  {
    id: 'cq-07',
    cue: 'Be a pencil. Straightest line you can squeeze.',
    shapeId: 'side_plank',
    shapeName: 'Side plank',
    why: 'It stops sagging or piking hips — the body holds one straight pencil line.',
  },
  {
    id: 'cq-08',
    cue: 'Straight line head to heels — no sag, no pike.',
    shapeId: 'front_plank',
    shapeName: 'Front plank',
    why: 'It stops the hips sagging low or piking high — the plank holds a straight line from head to heels.',
  },
  {
    id: 'cq-09',
    cue: 'Thighs parallel to the floor.',
    shapeId: 'wall_sit',
    shapeName: 'Wall sit',
    why: 'It stops sitting too high or too low — thighs level with the floor sets the hold.',
  },
  {
    id: 'cq-10',
    cue: 'Prefer stomach-to-wall for open shoulders.',
    shapeId: 'wall_handstand',
    shapeName: 'Wall handstand',
    why: 'It picks the wall orientation on purpose — stomach-to-wall trains the open-shoulder line.',
  },
  {
    id: 'cq-11',
    cue: 'Middle of the thighs in front of the eyes.',
    shapeId: 'tucked_candle',
    shapeName: 'Tucked candle',
    why: 'It shows the tuck depth — thighs in front of the eyes means the tuck is actually tight.',
  },
  {
    id: 'cq-12',
    cue: 'C plus one medium step — not as big as a lunge.',
    shapeId: 'mountain_climber',
    shapeName: 'Mountain climber',
    why: 'It stops over-striding — the mountain climber is a small C-shape step, not a lunge.',
  },
  {
    id: 'cq-13',
    cue: 'Tilt the chest toward parallel with the floor.',
    shapeId: 'lever',
    shapeName: 'Lever',
    why: 'It stops athletes standing too upright — the chest tilts toward parallel while the back leg lifts.',
  },
  {
    id: 'cq-14',
    cue: 'Not a mountain climber — do not bend the back knee or round into a C.',
    shapeId: 'lunge_start',
    shapeName: 'Starting lunge with open shoulders',
    why: 'It stops the lunge collapsing — the starting lunge keeps the back leg straight and the back flat.',
  },
  {
    id: 'cq-15',
    cue: 'Press the back heel flat — no rolling in on the arch.',
    shapeId: 'lunge_land',
    shapeName: 'Landing lunge',
    why: 'It stops the back foot rolling inward — the heel presses flat in the landing lunge.',
  },
  {
    id: 'cq-16',
    cue: 'Spread the arch through every joint — do not dump it all into the low back.',
    shapeId: 'rainbow_bridge',
    shapeName: 'Rainbow Bridge',
    why: 'It stops hinging only at the low back — the arch spreads through shoulders, spine, and hips.',
  },
  {
    id: 'cq-17',
    cue: 'Arms in close by the ears. Chin to chest.',
    shapeId: 'long_bridge',
    shapeName: 'Long Bridge',
    why: 'It sets the arm and head position — arms hug the ears and the chin tucks in the long bridge.',
  },
  {
    id: 'cq-18',
    cue: "Hips square and torso tall; don't lean into the passé hip.",
    shapeId: 'passe',
    shapeName: 'Passé',
    why: 'It stops tipping toward the lifted leg — the hips stay square and the torso stays tall.',
  },
  {
    id: 'cq-19',
    cue: 'Keep the chest open. A full tuck kills the twist.',
    shapeId: 'puck',
    shapeName: 'Puck',
    why: 'It stops tucking too tight — the chest stays open so the twist can happen.',
  },
  {
    id: 'cq-20',
    cue: 'Arms by the ears, not a sit-up.',
    shapeId: 'hollow_arms_up',
    shapeName: 'Hollow (arms up)',
    why: 'It stops athletes crunching up like a sit-up — the arms stay by the ears in the hollow line.',
  },
  {
    id: 'cq-21',
    cue: 'Sit in a pike — do not fold over the legs.',
    shapeId: 'seated_pike',
    shapeName: 'Pike (zombie arms)',
    why: 'It stops collapsing the torso onto the legs — the pike sits tall with an upright rounded torso.',
  },
  {
    id: 'cq-22',
    cue: 'Not zombie arms. Those reach forward; these reach up.',
    shapeId: 'pike_open_shoulders',
    shapeName: 'Pike (open shoulders)',
    why: 'It stops reaching forward instead of up — open-shoulder pike arms reach to the ceiling.',
  },
  {
    id: 'cq-23',
    cue: 'Flex the feet — toes to the shins, not pointed.',
    shapeId: 'tuck_open_shoulders',
    shapeName: 'Tuck',
    why: 'It stops pointed toes in the tuck — the feet flex, toes pulling to the shins.',
  },
  {
    id: 'cq-24',
    cue: 'Hands pose as if they just pushed through an object. Wide fingers. Thumbs slightly down, pinkies slightly up.',
    shapeId: 'hands_push_through',
    shapeName: 'Hands',
    why: 'It stops lazy hand finishes — the hands push through with wide fingers and a thumbs-down finish.',
  },
]
