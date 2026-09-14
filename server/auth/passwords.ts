/**
 * Password hashing with scrypt. Never store or log plaintext passwords.
 */

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'

const N = 16384
const R = 8
const P = 1
const KEYLEN = 32

function scryptKey(
  password: string,
  salt: Buffer,
  keylen: number,
  n: number,
  r: number,
  p: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, { N: n, r, p }, (err, derived) => {
      if (err) reject(err)
      else resolve(derived)
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptKey(password, salt, KEYLEN, N, R, P)
  return `scrypt$${N}$${R}$${P}$${salt.toString('hex')}$${key.toString('hex')}`
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const n = Number(parts[1])
  const r = Number(parts[2])
  const p = Number(parts[3])
  const salt = Buffer.from(parts[4] ?? '', 'hex')
  const expected = Buffer.from(parts[5] ?? '', 'hex')
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false
  if (salt.length === 0 || expected.length === 0) return false
  const key = await scryptKey(password, salt, expected.length, n, r, p)
  if (key.length !== expected.length) return false
  return timingSafeEqual(key, expected)
}
