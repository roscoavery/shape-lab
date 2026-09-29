/**
 * Muse connection API keys — lets a gym owner, admin, or coach (or a parent,
 * with a scoped key) give their own Muse scoped remote access to this gym
 * through the tunnel.
 *
 * Keys belong to the account that created them and can never grant more than
 * that account's role allows. Only the SHA-256 hash of a key is ever stored
 * (data/muse-keys.json). The secret itself is shown once at generation time
 * and never again.
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
  'coach-shapes:write',
  'roster:write',
  'classes:write',
  'athlete-notes:write',
  'stories:write',
  'drills:write',
  'skill-maps:write',
  'chalkboards:read',
  'chalkboards:write',
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

/** Scopes handed out by the "Coach" preset in the app. */
export const COACH_PRESET_SCOPES: MuseScope[] = [
  'library:read',
  'library:add',
  'progress:read',
  'philosophy:read',
  'coach-shapes:write',
  'roster:write',
  'classes:write',
  'athlete-notes:write',
  'stories:write',
  'drills:write',
  'skill-maps:write',
  'chalkboards:read',
  'chalkboards:write',
]

/**
 * Which scopes each account role may put on a key it creates. A key can
 * never grant more than its creator's role allows in the app itself.
 */
export const ROLE_ALLOWED_SCOPES: Record<string, MuseScope[]> = {
  gymOwner: [...MUSE_SCOPES],
  admin: [...MUSE_SCOPES],
  coach: [...COACH_PRESET_SCOPES],
}

export type MuseKeyCreator = { accountId: string; role: string }

export type MuseKeyRecord = {
  id: string
  label: string
  /** SHA-256 hex of the secret. The secret itself is never stored. */
  keyHash: string
  scopes: MuseScope[]
  /** When set, progress:read is limited to this athlete. */
  athleteId: string | null
  /** Account + role that created the key. Keys never escalate past this. */
  createdByAccountId: string | null
  createdByRole: string | null
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
  const createdByRole = typeof r.createdByRole === 'string' && r.createdByRole ? r.createdByRole : null
  const createdByAccountId =
    typeof r.createdByAccountId === 'string' && r.createdByAccountId ? r.createdByAccountId : null
  // Build 707: chalkboard routes are new, so keys minted before they existed
  // cannot carry the scopes. Owner/admin keys never escalate past their
  // creator's role, and owners/admins manage chalkboards in the app itself,
  // so backfill the chalkboard scopes at read time rather than stranding old
  // keys. Runtime-only; stored records are untouched.
  const ownerMade =
    !createdByAccountId || createdByRole === 'gymOwner' || createdByRole === 'admin'
  const withChalkboards = ownerMade
    ? (['chalkboards:read', 'chalkboards:write'] as const).reduce<MuseScope[]>(
        (list, s) => (list.includes(s) ? list : [...list, s]),
        [...scopes],
      )
    : scopes
  return {
    id: r.id,
    label: typeof r.label === 'string' ? r.label.slice(0, 80) : 'Untitled key',
    keyHash: r.keyHash,
    scopes: withChalkboards,
    athleteId: typeof r.athleteId === 'string' && r.athleteId ? r.athleteId : null,
    createdByAccountId,
    createdByRole,
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

/**
 * Keys visible to a signed-in account. Privileged roles (owner/admin) see
 * every key; coaches see only the keys their own account created.
 */
export async function listMuseKeysFor(input: {
  accountId: string
  privileged: boolean
}): Promise<MuseKeyRecord[]> {
  const keys = await listMuseKeys()
  if (input.privileged) return keys
  return keys.filter((k) => k.createdByAccountId === input.accountId)
}

/** Scopes a role is allowed to grant on keys it creates. */
export function allowedScopesForRole(role: string): MuseScope[] {
  return ROLE_ALLOWED_SCOPES[role] ?? []
}

export async function createMuseKey(input: {
  label: unknown
  scopes: unknown
  athleteId?: unknown
  createdBy?: MuseKeyCreator | null
}): Promise<{ record: MuseKeyRecord; secret: string }> {
  const scopes = Array.isArray(input.scopes) ? input.scopes.filter(isScope) : []
  if (scopes.length === 0) throw new Error('Pick at least one scope.')
  const creator = input.createdBy ?? null
  if (creator) {
    const allowed = allowedScopesForRole(creator.role)
    const overreach = scopes.filter((s) => !allowed.includes(s))
    if (overreach.length > 0) {
      throw new Error('This account cannot grant those permissions on a key.')
    }
  }
  const secret = `${MUSE_KEY_PREFIX}${randomBytes(32).toString('base64url')}`
  const record: MuseKeyRecord = {
    id: `mk_${randomBytes(8).toString('hex')}`,
    label: (typeof input.label === 'string' ? input.label : '').trim().slice(0, 80) || 'Untitled key',
    keyHash: hashMuseKey(secret),
    scopes,
    athleteId: typeof input.athleteId === 'string' && input.athleteId ? input.athleteId : null,
    createdByAccountId: creator?.accountId ?? null,
    createdByRole: creator?.role ?? null,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revoked: false,
  }
  const file = await readKeyFile()
  file.keys = [...file.keys, record]
  await writeKeyFile(file)
  return { record, secret }
}

export async function revokeMuseKey(
  id: string,
  input?: { accountId: string; privileged: boolean },
): Promise<boolean> {
  const file = await readKeyFile()
  const found = file.keys.find((k) => k.id === id)
  if (!found) return false
  if (input && !input.privileged && found.createdByAccountId !== input.accountId) {
    return false
  }
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
