/**
 * Account store. Lives in gitignored data/accounts.json.
 * Bootstrap admin comes from server env — never from client JavaScript.
 */

import { randomBytes } from 'node:crypto'
import { isHomeGym, readJson, writeJson } from '../persist.ts'
import { serverEnv, serverEnvFlag } from './env.ts'
import { hashPassword, verifyPassword } from './passwords.ts'
import { isAccountRole, type Account, type AccountRole, type AuthUser } from './types.ts'

const FILE = 'data/accounts.json'

type AccountFile = {
  kind: 'shape-lab-accounts'
  version: 1
  accounts: Account[]
}

const EMPTY: AccountFile = {
  kind: 'shape-lab-accounts',
  version: 1,
  accounts: [],
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function newId(): string {
  return `acct_${randomBytes(8).toString('hex')}`
}

function asAccount(raw: unknown): Account | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.email !== 'string') return null
  if (typeof row.passwordHash !== 'string' || !isAccountRole(row.role)) return null
  if (typeof row.displayName !== 'string') return null
  return {
    id: row.id,
    email: normalizeEmail(row.email),
    passwordHash: row.passwordHash,
    role: row.role,
    displayName: row.displayName,
    rosterProfileId: typeof row.rosterProfileId === 'string' ? row.rosterProfileId : undefined,
    linkedAthleteIds: Array.isArray(row.linkedAthleteIds)
      ? row.linkedAthleteIds.filter((id): id is string => typeof id === 'string' && Boolean(id))
      : undefined,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date().toISOString(),
  }
}

async function readFile(): Promise<AccountFile> {
  const stored = await readJson<AccountFile>(FILE, EMPTY)
  if (!stored || stored.kind !== 'shape-lab-accounts' || !Array.isArray(stored.accounts)) {
    return { ...EMPTY }
  }
  return {
    kind: 'shape-lab-accounts',
    version: 1,
    accounts: stored.accounts.map(asAccount).filter((row): row is Account => Boolean(row)),
  }
}

async function writeFile(accounts: Account[]): Promise<AccountFile> {
  const next: AccountFile = { kind: 'shape-lab-accounts', version: 1, accounts }
  await writeJson(FILE, next)
  return next
}

export function publicUserFromAccount(account: Account): AuthUser {
  return {
    accountId: account.id,
    email: account.email,
    role: account.role,
    displayName: account.displayName,
    rosterProfileId: account.rosterProfileId,
    linkedAthleteIds: account.linkedAthleteIds ?? [],
  }
}

export async function listAccounts(): Promise<Account[]> {
  return (await readFile()).accounts
}

export async function findAccountById(id: string): Promise<Account | null> {
  return (await readFile()).accounts.find((row) => row.id === id) ?? null
}

export async function findAccountByEmail(email: string): Promise<Account | null> {
  const needle = normalizeEmail(email)
  return (await readFile()).accounts.find((row) => row.email === needle) ?? null
}

export function allowFirstAdmin(): boolean {
  if (serverEnvFlag('SHAPE_LAB_ALLOW_FIRST_ADMIN')) return true
  return isHomeGym()
}

export async function hasAdminAccount(): Promise<boolean> {
  return (await readFile()).accounts.some((row) => row.role === 'admin' || row.role === 'gymOwner')
}

export async function ensureBootstrapAdmin(): Promise<void> {
  const email = serverEnv('SHAPE_LAB_BOOTSTRAP_ADMIN_EMAIL').trim()
  const password = serverEnv('SHAPE_LAB_BOOTSTRAP_ADMIN_PASSWORD')
  if (!email || !password) return
  if (await hasAdminAccount()) return
  await createAccount({
    email,
    password,
    role: 'admin',
    displayName: 'Gym admin',
    rosterProfileId: 'ath_ryan',
  })
}

export async function createAccount(input: {
  email: string
  password: string
  role: AccountRole
  displayName: string
  rosterProfileId?: string
  linkedAthleteIds?: string[]
}): Promise<AuthUser> {
  const email = normalizeEmail(input.email)
  if (!email || !email.includes('@')) {
    throw new Error('Enter a valid email address.')
  }
  if (!input.password || input.password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }
  const file = await readFile()
  if (file.accounts.some((row) => row.email === email)) {
    throw new Error('That email already has an account.')
  }
  const now = new Date().toISOString()
  const account: Account = {
    id: newId(),
    email,
    passwordHash: await hashPassword(input.password),
    role: input.role,
    displayName: input.displayName.trim() || email,
    rosterProfileId: input.rosterProfileId,
    linkedAthleteIds: input.linkedAthleteIds,
    createdAt: now,
    updatedAt: now,
  }
  await writeFile([...file.accounts, account])
  return publicUserFromAccount(account)
}

export async function authenticateAccount(email: string, password: string): Promise<Account | null> {
  await ensureBootstrapAdmin()
  const account = await findAccountByEmail(email)
  if (!account) return null
  const ok = await verifyPassword(password, account.passwordHash)
  return ok ? account : null
}

export async function accountsWithoutSecrets(): Promise<
  Omit<Account, 'passwordHash'>[]
> {
  return (await readFile()).accounts.map(({ passwordHash: _hash, ...rest }) => rest)
}
