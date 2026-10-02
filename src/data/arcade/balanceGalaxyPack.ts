import type { FigurePose } from '../../components/arcade/lab/ShapeFigure'

export type BalanceGalaxyBalance = {
  id: string
  shapeName: string
  pose: FigurePose
  /** Whether the balance is done on a chosen side. */
  sides: boolean
  /** What steadiness looks like here. */
  cue: string
}

/**
 * Draft balances for Balance Galaxy. Standing only, low-risk. The figure is
 * a rough reference for single-leg shapes — the cue describes the real
 * position.
 */
export const BALANCE_GALAXY_BALANCES: BalanceGalaxyBalance[] = [
  {
    id: 'bgb-passe',
    shapeName: 'Passé hold',
    pose: { arms: 't', knees: 'bent', back: 'flat', head: 'neutral', feet: 'together' },
    sides: true,
    cue: 'Toe at the knee, standing leg straight, T arms steady — pick the steadier leg.',
  },
  {
    id: 'bgb-lever',
    shapeName: 'Standing lever',
    pose: { arms: 'front', knees: 'straight', back: 'flat', head: 'neutral', feet: 'together' },
    sides: false,
    cue: 'Hinge forward, one leg lifts behind you — one long line from head to heel.',
  },
  {
    id: 'bgb-lunge-hold',
    shapeName: 'Lunge hold',
    pose: { arms: 'up', knees: 'bent', back: 'flat', head: 'neutral', feet: 'apart' },
    sides: true,
    cue: 'Sink into the lunge and freeze — front knee over the ankle, arms tall.',
  },
  {
    id: 'bgb-arabesque',
    shapeName: 'Arabesque stand',
    pose: { arms: 't', knees: 'straight', back: 'flat', head: 'neutral', feet: 'apart' },
    sides: true,
    cue: 'Stand on one leg, lift the other behind you — hips square, chest open.',
  },
]
