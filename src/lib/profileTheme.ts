import type { CSSProperties } from 'react'
import type { FavoriteColor } from '../types'

export const FAVORITE_COLORS: { id: FavoriteColor; label: string; swatch: string }[] = [
  { id: 'red', label: 'Red', swatch: '#fb7185' },
  { id: 'orange', label: 'Orange', swatch: '#fb923c' },
  { id: 'gold', label: 'Gold', swatch: '#fbbf24' },
  { id: 'lime', label: 'Lime', swatch: '#a3e635' },
  { id: 'teal', label: 'Teal', swatch: '#2dd4bf' },
  { id: 'sky', label: 'Sky', swatch: '#38bdf8' },
  { id: 'indigo', label: 'Indigo', swatch: '#818cf8' },
  { id: 'violet', label: 'Violet', swatch: '#c084fc' },
  { id: 'pink', label: 'Pink', swatch: '#f472b6' },
  { id: 'slate', label: 'Slate', swatch: '#94a3b8' },
]

type Theme = {
  accent: string
  accentSoft: string
  ink: string
  panel: string
  wash: string
  glow: string
}

const THEMES: Record<FavoriteColor, Theme> = {
  red: {
    accent: '#fb7185',
    accentSoft: 'rgba(251,113,133,0.22)',
    ink: '#fff5f6',
    panel: 'linear-gradient(165deg,#1a1014 0%,#241318 55%,#120c10 100%)',
    wash: 'radial-gradient(120% 80% at 100% 0%,rgba(251,113,133,0.28),transparent 55%)',
    glow: '0 18px 40px rgba(251,113,133,0.16)',
  },
  orange: {
    accent: '#fb923c',
    accentSoft: 'rgba(251,146,60,0.22)',
    ink: '#fff7ed',
    panel: 'linear-gradient(165deg,#1a1410 0%,#241810 55%,#120e0a 100%)',
    wash: 'radial-gradient(120% 80% at 100% 0%,rgba(251,146,60,0.26),transparent 55%)',
    glow: '0 18px 40px rgba(251,146,60,0.16)',
  },
  gold: {
    accent: '#fbbf24',
    accentSoft: 'rgba(251,191,36,0.2)',
    ink: '#fffbeb',
    panel: 'linear-gradient(165deg,#181410 0%,#221c10 55%,#100e08 100%)',
    wash: 'radial-gradient(120% 80% at 100% 0%,rgba(251,191,36,0.24),transparent 55%)',
    glow: '0 18px 40px rgba(251,191,36,0.14)',
  },
  lime: {
    accent: '#a3e635',
    accentSoft: 'rgba(163,230,53,0.18)',
    ink: '#f7fee7',
    panel: 'linear-gradient(165deg,#101610 0%,#142014 55%,#0a100a 100%)',
    wash: 'radial-gradient(120% 80% at 100% 0%,rgba(163,230,53,0.2),transparent 55%)',
    glow: '0 18px 40px rgba(163,230,53,0.12)',
  },
  teal: {
    accent: '#2dd4bf',
    accentSoft: 'rgba(45,212,191,0.2)',
    ink: '#f0fdfa',
    panel: 'linear-gradient(165deg,#0c1614 0%,#10241e 55%,#07110e 100%)',
    wash: 'radial-gradient(120% 80% at 100% 0%,rgba(45,212,191,0.22),transparent 55%)',
    glow: '0 18px 40px rgba(45,212,191,0.14)',
  },
  sky: {
    accent: '#38bdf8',
    accentSoft: 'rgba(56,189,248,0.2)',
    ink: '#f0f9ff',
    panel: 'linear-gradient(165deg,#0c141a 0%,#102028 55%,#081018 100%)',
    wash: 'radial-gradient(120% 80% at 100% 0%,rgba(56,189,248,0.22),transparent 55%)',
    glow: '0 18px 40px rgba(56,189,248,0.14)',
  },
  indigo: {
    accent: '#818cf8',
    accentSoft: 'rgba(129,140,248,0.22)',
    ink: '#eef2ff',
    panel: 'linear-gradient(165deg,#101018 0%,#161428 55%,#0a0a14 100%)',
    wash: 'radial-gradient(120% 80% at 100% 0%,rgba(129,140,248,0.24),transparent 55%)',
    glow: '0 18px 40px rgba(129,140,248,0.16)',
  },
  violet: {
    accent: '#c084fc',
    accentSoft: 'rgba(192,132,252,0.22)',
    ink: '#faf5ff',
    panel: 'linear-gradient(165deg,#141018 0%,#1c1428 55%,#0e0a14 100%)',
    wash: 'radial-gradient(120% 80% at 100% 0%,rgba(192,132,252,0.24),transparent 55%)',
    glow: '0 18px 40px rgba(192,132,252,0.16)',
  },
  pink: {
    accent: '#f472b6',
    accentSoft: 'rgba(244,114,182,0.22)',
    ink: '#fdf2f8',
    panel: 'linear-gradient(165deg,#181014 0%,#24141c 55%,#120a10 100%)',
    wash: 'radial-gradient(120% 80% at 100% 0%,rgba(244,114,182,0.24),transparent 55%)',
    glow: '0 18px 40px rgba(244,114,182,0.16)',
  },
  slate: {
    accent: '#94a3b8',
    accentSoft: 'rgba(148,163,184,0.2)',
    ink: '#f8fafc',
    panel: 'linear-gradient(165deg,#12161c 0%,#181c24 55%,#0c1014 100%)',
    wash: 'radial-gradient(120% 80% at 100% 0%,rgba(148,163,184,0.18),transparent 55%)',
    glow: '0 18px 40px rgba(15,23,42,0.2)',
  },
}

export function isFavoriteColor(value: string | undefined): value is FavoriteColor {
  return FAVORITE_COLORS.some((c) => c.id === value)
}

export function profileTheme(color?: string | null): Theme {
  if (color && isFavoriteColor(color)) return THEMES[color]
  return THEMES.teal
}

export function profileThemeStyle(color?: string | null): CSSProperties {
  const t = profileTheme(color)
  return {
    background: `${t.wash}, ${t.panel}`,
    boxShadow: t.glow,
    ['--profile-accent' as string]: t.accent,
    ['--profile-accent-soft' as string]: t.accentSoft,
    ['--profile-ink' as string]: t.ink,
  }
}
