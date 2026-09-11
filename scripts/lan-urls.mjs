import { hostname, networkInterfaces } from 'node:os'

export function lanOrigins(port) {
  const out = []
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list || []) {
      const v4 = a.family === 'IPv4' || a.family === 4
      if (v4 && !a.internal) out.push(`http://${a.address}:${port}`)
    }
  }
  const name = hostname().split('.')[0]
  if (name) out.push(`http://${name}.local:${port}`)
  return [...new Set(out)]
}

export function printLanUrls(port) {
  const urls = lanOrigins(port)
  console.log('')
  console.log('────────────────────────────────────────')
  console.log('On this Wi-Fi, open Safari on iPad / phone:')
  if (urls.length === 0) {
    console.log(`  http://127.0.0.1:${port}/`)
  } else {
    for (const u of urls) console.log(`  ${u}/`)
  }
  console.log('That http link is on this Wi-Fi only. Camera needs HTTPS.')
  console.log('Skip trycloudflare if it 502s — that hostname is new every start.')
  console.log('Keep the Vercel tab until names and faces show here.')
  console.log('────────────────────────────────────────')
  console.log('')
}
