/**
 * IG crops we still have on disk after the gym Blob library went empty.
 * Hydrate merges these so they show even when /api/ig-stills is blank.
 */

import type { ReferencePhoto } from '../types'

export const SHIPPED_IG_STILLS: ReferencePhoto[] = [
  {
    id: 'ig_mtcn5232_az6p66',
    shapeId: 'handstand',
    athleteId: null,
    createdAt: '2026-08-28T07:39:19.118Z',
    library: 'ig',
    persistedToApp: true,
    dataUrl: '/learn/ig-stills/ig_mtcn5232_az6p66.jpg',
  },
  {
    id: 'ig_mtdy2mah_ey7owy',
    shapeId: 'custom_eduardo_athlete_lever',
    athleteId: 'ath_mt946zgf_p3ml85',
    label: 'eduardo athlete lever',
    customName: 'eduardo athlete lever',
    createdAt: '2026-08-29T05:33:07.289Z',
    library: 'ig',
    persistedToApp: true,
    dataUrl: '/learn/ig-stills/ig_mtdy2mah_ey7owy.jpg',
  },
  {
    id: 'ig_mtdy0ax0_wz77sx',
    shapeId: 'custom_eduardo_athlete_starting_lunge',
    athleteId: 'ath_mt946zgf_p3ml85',
    label: 'eduardo athlete starting lunge',
    customName: 'eduardo athlete starting lunge',
    createdAt: '2026-08-29T05:31:19.236Z',
    library: 'ig',
    persistedToApp: true,
    dataUrl: '/learn/ig-stills/ig_mtdy0ax0_wz77sx.jpg',
  },
  {
    id: 'ig_mtdcrfqt_j9l8df',
    shapeId: 'custom_zombie_into_whip',
    athleteId: 'ath_ryan',
    label: 'Dead mat whip shapes',
    customName: 'Zombie into whip',
    createdAt: '2026-08-28T19:36:33.653Z',
    library: 'ig',
    persistedToApp: true,
    dataUrl: '/learn/ig-stills/ig_mtdcrfqt_j9l8df.jpg',
  },
]
