import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12

function keyMaterial(): Buffer {
  const raw = process.env.CALENDAR_CREDENTIAL_KEY?.trim()
  if (!raw) {
    throw new Error('CALENDAR_CREDENTIAL_KEY_MISSING')
  }
  return createHash('sha256').update(raw, 'utf8').digest()
}

export function encryptSecret(plaintext: string): string {
  const key = keyMaterial()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${enc.toString('base64url')}`
}

export function decryptSecret(blob: string): string {
  if (!blob.startsWith('v1:')) throw new Error('CALENDAR_CREDENTIAL_INVALID')
  const parts = blob.split(':')
  if (parts.length !== 4) throw new Error('CALENDAR_CREDENTIAL_INVALID')
  const iv = Buffer.from(parts[1]!, 'base64url')
  const tag = Buffer.from(parts[2]!, 'base64url')
  const data = Buffer.from(parts[3]!, 'base64url')
  const key = keyMaterial()
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

export function hasCredentialKey(): boolean {
  return Boolean(process.env.CALENDAR_CREDENTIAL_KEY?.trim())
}

/** Redact secrets from arbitrary strings for logs / API errors. */
export function redactSecrets(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
    .replace(/\b[a-z0-9]{4}(?:-[a-z0-9]{4}){3,}\b/gi, '[app-password]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
}
