/**
 * Minimal S3-compatible client for Cloudflare R2, hand-rolled on node:crypto.
 *
 * R2 speaks AWS Signature Version 4 with the region fixed to `auto` and the
 * bucket addressed in the path:
 *   https://<accountId>.r2.cloudflarestorage.com/<bucket>/<key>
 *
 * Only what ShapeLab needs is implemented: presigned GET/PUT URLs (so phones
 * stream straight from Cloudflare's edge instead of through the Mac), direct
 * PUT/DELETE/HEAD for server-side work. No new npm dependencies.
 *
 * All functions use erasable TypeScript only so scripts can import this file
 * directly under node's type stripping.
 */

import { createHash, createHmac } from 'node:crypto'

export type R2Config = {
  accountId: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  /** Normalized per-coach prefix: '' or ends with '/'. */
  prefix: string
}

export function r2ConfigFromEnv(env: NodeJS.ProcessEnv = process.env): R2Config | null {
  const accountId = (env.R2_ACCOUNT_ID ?? '').trim()
  const bucket = (env.R2_BUCKET ?? '').trim()
  const accessKeyId = (env.R2_ACCESS_KEY_ID ?? '').trim()
  const secretAccessKey = (env.R2_SECRET_ACCESS_KEY ?? '').trim()
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) return null
  let prefix = (env.R2_PREFIX ?? '').trim().replace(/^\/+/, '')
  if (prefix && !prefix.endsWith('/')) prefix += '/'
  return { accountId, bucket, accessKeyId, secretAccessKey, prefix }
}

/** Object key for an athlete video file, namespaced by the coach prefix. */
export function r2KeyForVideoFile(prefix: string, file: string): string {
  const clean = file.replace(/^\/+/, '')
  return `${prefix}data/athlete-video-blobs/${clean}`
}

function sha256Hex(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

function hmacSha256(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest()
}

function amzDates(now: Date = new Date()): { amzDate: string; dateStamp: string } {
  const p = (n: number) => String(n).padStart(2, '0')
  const y = now.getUTCFullYear()
  const stamp = `${y}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}`
  const time = `T${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}Z`
  return { amzDate: `${stamp}${time}`, dateStamp: stamp }
}

/** Encode each path segment; S3 requires '/' separators to survive. */
function encodeKey(key: string): string {
  return key
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
}

function signingKey(cfg: R2Config, dateStamp: string): Buffer {
  const kDate = hmacSha256(`AWS4${cfg.secretAccessKey}`, dateStamp)
  const kRegion = hmacSha256(kDate, 'auto')
  const kService = hmacSha256(kRegion, 's3')
  return hmacSha256(kService, 'aws4_request')
}

function hostFor(cfg: R2Config): string {
  return `${cfg.accountId}.r2.cloudflarestorage.com`
}

/**
 * Build a presigned URL. The signature covers only the `host` header, so
 * callers may send any Content-Type on PUT without breaking the signature.
 * expiresInSec is clamped to the SigV4 maximum of 7 days.
 */
export function presignR2Url(
  cfg: R2Config,
  key: string,
  method: 'GET' | 'PUT',
  expiresInSec: number,
): string {
  const host = hostFor(cfg)
  const canonicalUri = `/${cfg.bucket}/${encodeKey(key)}`
  const { amzDate, dateStamp } = amzDates()
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`
  const expires = Math.min(Math.max(1, Math.floor(expiresInSec)), 604800)
  const params: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${cfg.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host',
  }
  const canonicalQuery = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&')
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join(
    '\n',
  )
  const signature = hmacSha256(signingKey(cfg, dateStamp), stringToSign).toString('hex')
  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`
}

export function presignR2GetUrl(cfg: R2Config, key: string, expiresInSec: number): string {
  return presignR2Url(cfg, key, 'GET', expiresInSec)
}

export function presignR2PutUrl(cfg: R2Config, key: string, expiresInSec = 900): string {
  return presignR2Url(cfg, key, 'PUT', expiresInSec)
}

async function authorizedR2Request(
  cfg: R2Config,
  method: 'PUT' | 'DELETE' | 'HEAD',
  key: string,
  body?: Buffer,
  contentType?: string,
): Promise<Response> {
  const host = hostFor(cfg)
  const canonicalUri = `/${cfg.bucket}/${encodeKey(key)}`
  const { amzDate, dateStamp } = amzDates()
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`
  const payloadHash = sha256Hex(body ?? Buffer.alloc(0))
  const headers: Record<string, string> = {
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  }
  if (contentType) headers['content-type'] = contentType
  // `host` is signed but left for the HTTP client to set from the URL.
  const signedNames = ['host', ...Object.keys(headers).sort()]
  const canonicalHeaders =
    `host:${host}\n` + Object.keys(headers).sort().map((n) => `${n}:${headers[n]}\n`).join('')
  const canonicalRequest = [method, canonicalUri, '', canonicalHeaders, signedNames.join(';'), payloadHash].join(
    '\n',
  )
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join(
    '\n',
  )
  const signature = hmacSha256(signingKey(cfg, dateStamp), stringToSign).toString('hex')
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedNames.join(';')}, Signature=${signature}`
  const init: { method: string; headers: Record<string, string>; body?: ArrayBuffer } = {
    method,
    headers: { ...headers, Authorization: authorization },
  }
  // Fresh ArrayBuffer copy: the DOM fetch typing in this project rejects
  // Buffer and typed-array views as a request body.
  if (body) {
    const ab = new ArrayBuffer(body.byteLength)
    new Uint8Array(ab).set(body)
    init.body = ab
  }
  return fetch(`https://${host}${canonicalUri}`, init)
}

/** Upload bytes to R2. Throws on non-2xx. */
export async function r2PutObject(
  cfg: R2Config,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const res = await authorizedR2Request(cfg, 'PUT', key, body, contentType)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`R2 PUT failed (${res.status}): ${text.slice(0, 200)}`)
  }
}

/** Delete an object. Missing keys are not an error. */
export async function r2DeleteObject(cfg: R2Config, key: string): Promise<void> {
  const res = await authorizedR2Request(cfg, 'DELETE', key)
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '')
    throw new Error(`R2 DELETE failed (${res.status}): ${text.slice(0, 200)}`)
  }
}

/** True when the object exists. */
export async function r2HeadObject(cfg: R2Config, key: string): Promise<boolean> {
  try {
    const res = await authorizedR2Request(cfg, 'HEAD', key)
    return res.ok
  } catch {
    return false
  }
}
