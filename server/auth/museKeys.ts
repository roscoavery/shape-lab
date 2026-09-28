/**
 * Muse connection API keys — lets a gym owner (or a parent, with a scoped key)
 * give their own Muse scoped remote access to this gym through the tunnel.
 *
 * Only the SHA-256 hash of a key is ever stored (data/muse-keys.json).
 * The secret itself is shown once at generation time and never again.
 */

import { createHash, randomBytes } from 'node:crypto'
import { readJson, writeJson } from '../persist.ts'

const FILE = 'data/muse-keys.json'
export const MUSE_KEY_PREFIX = 'slm_'

export const MUSE_SCOPES = [
  'library:read',
  'library:add',
  'progress:read',
  'philosophy:read',
] as const

export type MuseScope = (typeof MUSE_SCOPES)[number]

/** Scopes handed out by the "Owner" preset in the app. */
export const OWNER_PRESET_SCOPES: MuseScope[] = [
  'library:read',
  'library:add',
  'progress:read',
  'philosophy:read',
]

/** Scopes handed out by the "Parent" preset in the app. */
export const PARENT_PRESET_SCOPES: MuseScope[] = ['progress:read', 'philosophy:read']

export type MuseKeyRecord = {
  id: string
  label: string
  /** SHA-256 hex of the secret. The secret itself is never stored. */
  keyHash: string
  scopes: MuseScope[]
  /** When set, progress:read is limited to this athlete. */
  athleteId: string | null
  createdAt: string
  lastUsedAt: string | null
  revoked: boolean
}

export type MuseKeyFile = {
  kind: 'shape-lab-muse-keys'
  version: 1
  keys: MuseKeyRecord[]
}

const EMPTY: MuseKeyFile = { kind: 'shape-lab-muse-keys', version: 1, keys: [] }

function isScope(value: unknown): value is MuseScope {
  return typeof value === 'string' && (MUSE_SCOPES as readonly string[]).includes(value)
}

function cleanRecord(raw: unknown): MuseKeyRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id) return null
  if (typeof r.keyHash !== 'string' || !r.keyHash) return null
  const scopes = Array.isArray(r.scopes) ? r.scopes.filter(isScope) : []
  if (scopes.length === 0) return null
  return {
    id: r.id,
    label: typeof r.label === 'string' ? r.label.slice(0, 80) : 'Untitled key',
    keyHash: r.keyHash,
    scopes,
    athleteId: typeof r.athleteId === 'string' && r.athleteId ? r.athleteId : null,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
    lastUsedAt: typeof r.lastUsedAt === 'string' ? r.lastUsedAt : null,
    revoked: r.revoked === true,
  }
}

async function readKeyFile(): Promise<MuseKeyFile> {
  const data = await readJson<MuseKeyFile>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-muse-keys' || !Array.isArray(data.keys)) {
    return { ...EMPTY }
  }
  return { ...EMPTY, keys: data.keys.map(cleanRecord).filter((k): k is MuseKeyRecord => k !== null) }
}

async function writeKeyFile(file: MuseKeyFile): Promise<void> {
  await writeJson(FILE, file)
}

export function hashMuseKey(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex')
}

/** Public view of a key — safe to send to the app. Never includes the hash. */
export function presentMuseKey(r: MuseKeyRecord): Omit<MuseKeyRecord, 'keyHash'> {
  const { keyHash: _hash, ...rest } = r
  void _hash
  return rest
}

export async function listMuseKeys(): Promise<MuseKeyRecord[]> {
  const file = await readKeyFile()
  return file.keys
}

export async function createMuseKey(input: {
  label: unknown
  scopes: unknown
  athleteId?: unknown
}): Promise<{ record: MuseKeyRecord; secret: string }> {
  const scopes = Array.isArray(input.scopes) ? input.scopes.filter(isScope) : []
  if (scopes.length === 0) throw new Error('Pick at least one scope.')
  const secret = `${MUSE_KEY_PREFIX}${randomBytes(32).toString('base64url')}`
  const record: MuseKeyRecord = {
    id: `mk_${randomBytes(8).toString('hex')}`,
    label: (typeof input.label === 'string' ? input.label : '').trim().slice(0, 80) || 'Untitled key',
    keyHash: hashMuseKey(secret),
    scopes,
    athleteId: typeof input.athleteId === 'string' && input.athleteId ? input.athleteId : null,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revoked: false,
  }
  const file = await readKeyFile()
  file.keys = [...file.keys, record]
  await writeKeyFile(file)
  return { record, secret }
}

export async function revokeMuseKey(id: string): Promise<boolean> {
  const file = await readKeyFile()
  const found = file.keys.some((k) => k.id === id)
  if (!found) return false
  file.keys = file.keys.map((k) => (k.id === id ? { ...k, revoked: true } : k))
  await writeKeyFile(file)
  return true
}

export type VerifiedMuseKey = {
  key: MuseKeyRecord
  /** Call after a successful request so "last used" stays honest. */
  touch: () => Promise<void>
}

/**
 * Verify a Bearer secret. Returns null for unknown, revoked, or
 * malformed keys. Touches lastUsedAt on success (best effort).
 */
export async function verifyMuseKey(secret: string | null | undefined): Promise<VerifiedMuseKey | null> {
  if (typeof secret !== 'string' || !secret.startsWith(MUSE_KEY_PREFIX) || secret.length < 16) {
    return null
  }
  const hash = hashMuseKey(secret)
  const file = await readKeyFile()
  const key = file.keys.find((k) => k.keyHash === hash && !k.revoked)
  if (!key) return null
  let touched = false
  return {
    key,
    touch: async () => {
      if (touched) return
      touched = true
      try {
        const live = await readKeyFile()
        live.keys = live.keys.map((k) =>
          k.id === key.id ? { ...k, lastUsedAt: new Date().toISOString() } : k,
        )
        await writeKeyFile(live)
      } catch {
        /* last-used is informational; never fail the request over it */
      }
    },
  }
}

export function museKeyHasScope(key: MuseKeyRecord, scope: MuseScope): boolean {
  return key.scopes.includes(scope)
}

/** Parent-scoped keys may only read their own athlete. Owner keys pass. */
export function museKeyMayReadAthlete(key: MuseKeyRecord, athleteId: string): boolean {
  if (!key.athleteId) return true
  return key.athleteId === athleteId
}
