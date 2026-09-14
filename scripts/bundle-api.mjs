import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outfile = join(root, 'api', '[[...path]].js')

mkdirSync(join(root, 'api'), { recursive: true })

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [join(root, 'server', 'vercelFn.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  minify: true,
  logLevel: 'info',
  // Keep Blob and nodemailer on Node’s real modules, not the bundled ESM rewrite
  // that throws “Dynamic require of node:buffer is not supported”.
  external: ['@vercel/blob', '@vercel/blob/client', 'nodemailer'],
})

console.log(`bundled ${outfile}`)
