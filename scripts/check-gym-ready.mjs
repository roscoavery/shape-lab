import http from 'node:http'
import { originFromPort, originReady, portOpen, waitForOrigin } from './gym-ready.mjs'

function assert(cond, msg) {
  if (!cond) {
    console.error(msg)
    process.exit(1)
  }
}

assert(originFromPort(43127) === 'http://127.0.0.1:43127', 'originFromPort')
assert((await portOpen(1, '127.0.0.1', 200)) === false, 'closed port should be down')

const server = http.createServer((req, res) => {
  if (req.url?.startsWith('/api/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('gym')
})

await new Promise((resolve, reject) => {
  server.listen(0, '127.0.0.1', resolve)
  server.on('error', reject)
})
const { port } = server.address()
const origin = `http://127.0.0.1:${port}`
assert(await portOpen(port), 'listening port should be open')
assert(await originReady(origin), 'originReady against local gym')
assert(await waitForOrigin(origin, { maxMs: 1000 }), 'waitForOrigin already up')
server.close()
console.log('gym-ready ok')
