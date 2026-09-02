/**
 * Gym-computer display crops for coach / IG stills.
 * Ryan sets borders in Learn; every browser hydrates them.
 *
 * Shipped library crops always fill gaps. An empty Blob file used to hide
 * those framings and a replace-all PUT could wipe them.
 */

import { readJson, writeJson } from './persist.ts'

/** Same framings as src/lib/shippedStillCrops.ts — keep the two maps in sync. */
const SHIPPED_STILL_CROPS: Record<string, StillCropRect> = {
  default_long_bridge_0: {
    x: 0.016525687014772313,
    y: 0.031745907617005575,
    w: 0.9669490132752461,
    h: 0.9523812339419142,
  },
  default_lever_0: {
    x: 0.0020556868793808526,
    y: 0.2100830078125,
    w: 0.9979443131206192,
    h: 0.4818115234375,
  },
  default_lunge_land_0: {
    x: 0.037815557462032724,
    y: 0.08826904296875,
    w: 0.9621844425379673,
    h: 0.733447265625,
  },
  default_feet_together_open_shoulders_0: {
    x: 0.07405081775700935,
    y: 0.10164794921875,
    w: 0.8004770439361857,
    h: 0.8168212890625001,
  },
  default_lunge_start_0: {
    x: 0.027753141884491832,
    y: 0.09375,
    w: 0.9554540901540596,
    h: 0.64508056640625,
  },
  default_passe_0: {
    x: 0.04861746814763435,
    y: 0.03380126953125,
    w: 0.7949572411653038,
    h: 0.873486328125,
  },
  default_handstand_0: {
    x: 0.2065260842581776,
    y: 0.23125,
    w: 0.5783115850430782,
    h: 0.5067138671875,
  },
  default_hollow_arms_up_0: {
    x: 0.0008143915194217406,
    y: 0.4699951171875,
    w: 0.9991856084805782,
    h: 0.25308837890625,
  },
  default_hollow_arms_down_0: {
    x: 0.03662708318122081,
    y: 0.4912353515625,
    w: 0.9633729168187792,
    h: 0.21439208984375002,
  },
  default_mountain_climber_0: {
    x: 0.20095346040814838,
    y: 0.3409423828125,
    w: 0.6067557361638434,
    h: 0.38359374999999996,
  },
  default_c_shape_0: {
    x: 0.4447614397321429,
    y: 0.24170487451737452,
    w: 0.27109375,
    h: 0.7582951254826255,
  },
}

function mergeStillCrops(
  ...maps: Array<Record<string, StillCropRect> | null | undefined>
): Record<string, StillCropRect> {
  const out: Record<string, StillCropRect> = {}
  for (const map of maps) {
    if (!map) continue
    for (const [id, rect] of Object.entries(map)) {
      if (!id || !rect) continue
      const parsed = parseRect(rect)
      if (parsed) out[id] = parsed
    }
  }
  return out
}

const FILE = 'data/still-crops.json'

export type StillCropRect = { x: number; y: number; w: number; h: number }

export type StillCropFile = {
  kind: 'shape-lab-still-crops'
  version: 1
  updatedAt: string
  crops: Record<string, StillCropRect>
}

const EMPTY: StillCropFile = {
  kind: 'shape-lab-still-crops',
  version: 1,
  updatedAt: '',
  crops: {},
}

function parseRect(value: unknown): StillCropRect | null {
  if (!value || typeof value !== 'object') return null
  const r = value as Record<string, unknown>
  const x = Number(r.x)
  const y = Number(r.y)
  const w = Number(r.w)
  const h = Number(r.h)
  if (![x, y, w, h].every(Number.isFinite)) return null
  const cx = Math.min(0.94, Math.max(0, x))
  const cy = Math.min(0.94, Math.max(0, y))
  const cw = Math.min(1 - cx, Math.max(0.06, w))
  const ch = Math.min(1 - cy, Math.max(0.06, h))
  if (cx <= 0.004 && cy <= 0.004 && cw >= 0.992 && ch >= 0.992) return null
  return { x: cx, y: cy, w: cw, h: ch }
}

function parseCropMap(raw: unknown): Record<string, StillCropRect> {
  if (!raw || typeof raw !== 'object') return {}
  const crops: Record<string, StillCropRect> = {}
  for (const [id, rect] of Object.entries(raw as Record<string, unknown>)) {
    if (!id) continue
    const parsed = parseRect(rect)
    if (parsed) crops[id] = parsed
  }
  return crops
}

function withShipped(stored: Record<string, StillCropRect>): Record<string, StillCropRect> {
  return mergeStillCrops(SHIPPED_STILL_CROPS, stored)
}

export async function readStillCropFile(): Promise<StillCropFile> {
  const data = await readJson<StillCropFile>(FILE, { ...EMPTY })
  const stored =
    data && data.kind === 'shape-lab-still-crops' && typeof data.crops === 'object'
      ? parseCropMap(data.crops)
      : {}
  const crops = withShipped(stored)
  const healed =
    Object.keys(stored).length < Object.keys(crops).length ||
    Object.keys(SHIPPED_STILL_CROPS).some((id) => !stored[id])
  if (healed) {
    const out: StillCropFile = {
      kind: 'shape-lab-still-crops',
      version: 1,
      updatedAt: data?.updatedAt || new Date().toISOString(),
      crops,
    }
    try {
      await writeJson(FILE, out)
    } catch {
      /* still return the merged crops to the browser */
    }
    return out
  }
  return {
    kind: 'shape-lab-still-crops',
    version: 1,
    updatedAt: data?.updatedAt ?? '',
    crops,
  }
}

export async function writeStillCropFile(data: unknown): Promise<StillCropFile> {
  const parsed = data as Partial<StillCropFile>
  const incoming = parseCropMap(parsed.crops)
  const existing = await readJson<StillCropFile>(FILE, { ...EMPTY })
  const stored =
    existing && existing.kind === 'shape-lab-still-crops' && typeof existing.crops === 'object'
      ? parseCropMap(existing.crops)
      : {}
  const crops = mergeStillCrops(SHIPPED_STILL_CROPS, stored, incoming)
  const out: StillCropFile = {
    kind: 'shape-lab-still-crops',
    version: 1,
    updatedAt: new Date().toISOString(),
    crops,
  }
  await writeJson(FILE, out)
  return out
}
