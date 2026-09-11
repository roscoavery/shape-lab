/**
 * Is the home gym answering on this computer?
 * TCP open is enough to start a tunnel. HTTP /api/health is preferred.
 */
import net from 'node:net'

export function originFromPort(port) {
  return `http://127.0.0.1:${port}`
}

export function portOpen(port, host = '127.0.0.1', timeoutMs = 1500) {
  return new Promise((resolve) => {
    let done = false
    const socket = net.connect({ port: Number(port), host })
    const finish = (ok) => {
      if (done) return
      done = true
      socket.destroy()
      resolve(ok)
    }
    socket.on('connect', () => finish(true))
    socket.on('error', () => finish(false))
    socket.setTimeout(timeoutMs, () => finish(false))
  })
}

export async function originReady(origin, timeoutMs = 2500) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const res = await fetch(`${String(origin).replace(/\/$/, '')}/api/health`, {
      signal: ac.signal,
      redirect: 'manual',
      headers: { Host: 'gym.shapelab.win', Accept: 'application/json' },
    })
    if (!res.ok) return false
    const body = await res.json().catch(() => null)
    return Boolean(body && body.ok === true)
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function waitForOrigin(origin, opts = {}) {
  const interval = opts.intervalMs ?? 500
  const maxMs = opts.maxMs ?? 240_000
  const started = Date.now()
  let lastLog = 0
  while (Date.now() - started < maxMs) {
    if (opts.stopped?.()) return false
    if (await originReady(origin)) return true
    const elapsed = Date.now() - started
    if (opts.onWait && elapsed - lastLog >= (opts.logEveryMs ?? 8000)) {
      lastLog = elapsed
      opts.onWait(elapsed)
    }
    await new Promise((r) => setTimeout(r, interval))
  }
  return false
}
