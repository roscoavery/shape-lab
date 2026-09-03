/**
 * JSON / binary storage that works on the gym computer (data/) and on Vercel.
 * Local: write data/*.json as today.
 * Production: Vercel Blob when a store is connected (private preferred);
 * otherwise /tmp plus an in-process cache so a warm function keeps writes.
 */

import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'

const ROOT = process.cwd()
const TMP = path.join('/tmp', 'shape-lab-data')
const mem = new Map<string, Buffer>()

function diskPath(rel: string): string {
  return path.join(ROOT, rel)
}

function tmpPath(rel: string): string {
  return path.join(TMP, rel)
}

function canWrite(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true })
    fs.accessSync(dir, fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}

function useBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)
}

export type PersistMode = 'blob' | 'disk' | 'tmp'

/** Where gym JSON actually lasts. `tmp` is gone after a Vercel cold start. */
export function persistMode(): PersistMode {
  if (useBlob()) return 'blob'
  if (canWrite(path.dirname(diskPath('data/roster.json')))) return 'disk'
  return 'tmp'
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const node = Readable.fromWeb(stream as import('node:stream/web').ReadableStream)
  const chunks: Buffer[] = []
  for await (const chunk of node) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function readBlob(rel: string): Promise<Buffer | null> {
  const { get } = await import('@vercel/blob')
  for (const access of ['private', 'public'] as const) {
    try {
      const hit = await get(rel, { access, useCache: false })
      if (hit?.statusCode === 200 && hit.stream) {
        return await streamToBuffer(hit.stream)
      }
    } catch {
      /* try the other access mode */
    }
  }
  return null
}

async function writeBlob(rel: string, body: string | Buffer, contentType: string): Promise<void> {
  const { put } = await import('@vercel/blob')
  const options = {
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    cacheControlMaxAge: 60,
  } as const
  try {
    await put(rel, body, { ...options, access: 'private' })
  } catch {
    await put(rel, body, { ...options, access: 'public' })
  }
}

export async function readText(rel: string): Promise<string | null> {
  const cached = mem.get(rel)
  if (cached) return cached.toString('utf8')
  if (useBlob()) {
    try {
      const buf = await readBlob(rel)
      if (buf) {
        mem.set(rel, buf)
        return buf.toString('utf8')
      }
    } catch {
      /* fall through */
    }
  }
  for (const p of [diskPath(rel), tmpPath(rel)]) {
    try {
      const text = fs.readFileSync(p, 'utf8')
      mem.set(rel, Buffer.from(text, 'utf8'))
      return text
    } catch {
      /* next */
    }
  }
  return null
}

function assertDurableWrite(): void {
  if (persistMode() === 'tmp' && process.env.VERCEL) {
    throw new Error(
      'Gym data cannot persist on this Vercel project without a Blob store. Connect Storage → Blob and redeploy Production on the same URL.',
    )
  }
}

export async function writeText(rel: string, text: string): Promise<void> {
  assertDurableWrite()
  const buf = Buffer.from(text, 'utf8')
  mem.set(rel, buf)
  if (useBlob()) {
    await writeBlob(rel, text, 'application/json')
    return
  }
  const dest = canWrite(path.dirname(diskPath(rel))) ? diskPath(rel) : tmpPath(rel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, text)
}

export async function readJson<T>(rel: string, fallback: T): Promise<T> {
  const text = await readText(rel)
  if (!text) return fallback
  try {
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

/** Bundled `data/*.json` from the deploy — used when Blob is stale or smaller. */
export function readDiskJson<T>(rel: string, fallback: T): T {
  try {
    const text = fs.readFileSync(diskPath(rel), 'utf8')
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

export async function writeJson(rel: string, data: unknown): Promise<void> {
  await writeText(rel, JSON.stringify(data, null, 2) + '\n')
}

export async function readBin(rel: string): Promise<Buffer | null> {
  const cached = mem.get(rel)
  if (cached) return cached
  if (useBlob()) {
    try {
      const buf = await readBlob(rel)
      if (buf) {
        mem.set(rel, buf)
        return buf
      }
    } catch {
      /* fall through */
    }
  }
  for (const p of [diskPath(rel), tmpPath(rel)]) {
    try {
      const buf = fs.readFileSync(p)
      mem.set(rel, buf)
      return buf
    } catch {
      /* next */
    }
  }
  return null
}

export async function writeBin(rel: string, buf: Buffer, contentType: string): Promise<void> {
  assertDurableWrite()
  mem.set(rel, buf)
  if (useBlob()) {
    await writeBlob(rel, buf, contentType)
    return
  }
  const dest = canWrite(path.dirname(diskPath(rel))) ? diskPath(rel) : tmpPath(rel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, buf)
}

export async function removeFile(rel: string): Promise<void> {
  mem.delete(rel)
  if (useBlob()) {
    try {
      const { del } = await import('@vercel/blob')
      await del(rel)
    } catch {
      /* ignore */
    }
  }
  for (const p of [diskPath(rel), tmpPath(rel)]) {
    try {
      fs.unlinkSync(p)
    } catch {
      /* ignore */
    }
  }
}
