/**
 * Applies the Build 776 Parent Guide editorial pass to the LIVE coach-interview
 * answers (data/coach-interview.json).
 *
 * Safe: only updates an answer if the live text exactly matches the pre-edit
 * snapshot. If Ryan edited an answer in the Coach Interview UI, it's skipped
 * and reported for manual review.
 *
 * Run from the shape-lab repo root on the Mac:
 *   node scripts/apply-parent-guide-edits.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const interviewPath = join(root, 'data', 'coach-interview.json')

// Extract answerKey -> paragraphs from a parentEducation.ts source string
function extractAnswers(source) {
  const out = {}
  // Match each QA block: answerKey: "...", answer: [ "...", ... ]
  const qaRe = /answerKey:\s*"([^"]+)"[\s\S]*?answer:\s*\[([\s\S]*?)\n\s*\]/g
  let m
  while ((m = qaRe.exec(source)) !== null) {
    const key = m[1]
    const arrBody = m[2]
    const paras = []
    const strRe = /"((?:[^"\\]|\\.)*)"/g
    let s
    while ((s = strRe.exec(arrBody)) !== null) {
      paras.push(s[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'))
    }
    out[key] = paras
  }
  return out
}

// The before/after snapshots are embedded at build time by the script below.
// For now, read them from the two files passed as args.
const [, , beforeFile, afterFile] = process.argv
if (!beforeFile || !afterFile) {
  console.error('Usage: node scripts/apply-parent-guide-edits.mjs <before.ts> <after.ts>')
  process.exit(1)
}

const before = extractAnswers(readFileSync(beforeFile, 'utf8'))
const after = extractAnswers(readFileSync(afterFile, 'utf8'))

if (!existsSync(interviewPath)) {
  console.error('Not found: ' + interviewPath)
  process.exit(1)
}

const live = JSON.parse(readFileSync(interviewPath, 'utf8'))
const answers = live.answers || live

const updated = []
const skipped = []
const unchanged = []

for (const key of Object.keys(after)) {
  const beforeText = (before[key] || []).join('\n\n')
  const afterText = after[key].join('\n\n')
  const liveText = (answers[key] || '').trim()

  if (!liveText) {
    unchanged.push(key + ' (no live answer, uses fallback)')
    continue
  }
  if (liveText === afterText) {
    unchanged.push(key + ' (already matches)')
    continue
  }
  if (liveText === beforeText) {
    answers[key] = afterText
    updated.push(key)
  } else {
    skipped.push(key)
  }
}

if (updated.length > 0) {
  const out = live.answers ? { ...live, answers } : answers
  writeFileSync(interviewPath, JSON.stringify(out, null, 2) + '\n')
}

console.log('\n=== Parent Guide editorial pass applied ===')
console.log(`Updated: ${updated.length}`)
updated.forEach((k) => console.log('  ✓ ' + k))
if (skipped.length > 0) {
  console.log(`\nSkipped (you edited these in the Coach Interview — review manually): ${skipped.length}`)
  skipped.forEach((k) => console.log('  ! ' + k))
}
if (unchanged.length > 0) {
  console.log(`\nUnchanged: ${unchanged.length}`)
  unchanged.forEach((k) => console.log('  - ' + k))
}
console.log('\nDone. Reload the Parent Guide to see the changes.')
