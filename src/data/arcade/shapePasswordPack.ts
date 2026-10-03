/**
 * Shape Password pack: real shape names from the shape library.
 * Partner A describes the shape without saying any of the forbidden words;
 * Partner B guesses out loud. `hint` is a concrete description angle that
 * IS allowed. It points at what the body actually does.
 * Draft content: all names match the shape library; nothing here invents
 * coaching claims.
 */
export type ShapePasswordCard = {
  id: string
  shapeName: string
  shapeId: string
  forbidden: [string, string, string, string]
  hint: string
}

export const SHAPE_PASSWORD_CARDS: ShapePasswordCard[] = [
  {
    id: 'sp-01',
    shapeName: 'Handstand',
    shapeId: 'handstand',
    forbidden: ['Handstand', 'upside down', 'vertical', 'stand on your hands'],
    hint: 'What the arms do, and where the eyes look.',
  },
  {
    id: 'sp-02',
    shapeName: 'Hollow (arms down)',
    shapeId: 'hollow_arms_down',
    forbidden: ['Hollow', 'hollow body', 'banana', 'rocker'],
    hint: 'Where you feel the work. What has to touch the floor.',
  },
  {
    id: 'sp-03',
    shapeName: 'Lever',
    shapeId: 'lever',
    forbidden: ['Lever', 'hurdle', 'split step', 'scissor legs'],
    hint: 'What the legs do, and how tall the chest stays.',
  },
  {
    id: 'sp-04',
    shapeName: 'Tuck',
    shapeId: 'tuck_open_shoulders',
    forbidden: ['Tuck', 'tucked', 'ball', 'knees to chest'],
    hint: 'What the feet do: pointed or flexed?',
  },
  {
    id: 'sp-05',
    shapeName: 'Lunge',
    shapeId: 'lunge',
    forbidden: ['Lunge', 'starting position', 'one leg forward', 'square hips'],
    hint: 'Where the arms go, and what stays tall.',
  },
  {
    id: 'sp-06',
    shapeName: 'Candlestick',
    shapeId: 'candlestick',
    forbidden: ['Candlestick', 'candle', 'shoulder stand', 'on the shoulders'],
    hint: 'What it shares with a good handstand: the stacked body.',
  },
  {
    id: 'sp-07',
    shapeName: 'Side plank',
    shapeId: 'side_plank',
    forbidden: ['Side plank', 'plank', 'elbow', 'pencil'],
    hint: 'The straightest line you can squeeze. What does the body look like?',
  },
  {
    id: 'sp-08',
    shapeName: 'Wall handstand',
    shapeId: 'wall_handstand',
    forbidden: ['Wall handstand', 'handstand', 'wall', 'stomach to the wall'],
    hint: 'Which way you face, and what it teaches the shoulders.',
  },
  {
    id: 'sp-09',
    shapeName: 'Pike (open shoulders)',
    shapeId: 'pike_open_shoulders',
    forbidden: ['Pike', 'fold', 'touch your toes', 'straight legs'],
    hint: 'Where the arms reach, and what the legs do.',
  },
  {
    id: 'sp-10',
    shapeName: 'Passé',
    shapeId: 'passe',
    forbidden: ['Passé', 'foot at the knee', 'retiré', 'balance on one leg'],
    hint: 'What the standing leg does, and where the arms reach.',
  },
  {
    id: 'sp-11',
    shapeName: 'Front plank',
    shapeId: 'front_plank',
    forbidden: ['Front plank', 'plank', 'push-up position', 'elbows'],
    hint: 'The line from head to heels. What breaks it?',
  },
  {
    id: 'sp-12',
    shapeName: 'C shape',
    shapeId: 'c_shape',
    forbidden: ['C shape', 'the letter C', 'round the back', 'hollow chest'],
    hint: 'What the hips do, and what the chest does instead of arching.',
  },
]
