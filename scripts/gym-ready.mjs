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

async function httpAlive(url, timeoutMs) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ac.signal, redirect: 'manual' })
    return Number.isFinite(res.status)
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function originReady(origin, timeoutMs = 2500) {
  let parsed
  try {
    parsed = new URL(origin)
  } catch {
    return false
  }
  const port = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80))
  const listening = await portOpen(port, parsed.hostname, Math.min(timeoutMs, 1500))
  if (!listening) return false
  if (await httpAlive(`${origin.replace(/\/$/, '')}/api/health`, timeoutMs)) return true
  if (await httpAlive(`${origin.replace(/\/$/, '')}/api/persist`, timeoutMs)) return true
  if (await httpAlive(origin, timeoutMs)) return true
  return true
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
