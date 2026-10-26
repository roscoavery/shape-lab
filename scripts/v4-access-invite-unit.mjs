#!/usr/bin/env node
/**
 * Module-level account-invite probe, spawned by v4-access-check.mjs with
 * its cwd set to a throwaway directory so data/invites.json lands there —
 * never in the repo's data/ and never on a live gym.
 *
 * Modes:
 *   create  → create a parent account invite, print { id, token, peekValid }
 *   check <token> → print { peekValid, redeemed } for an existing token
 *
 * Expiry cannot be exercised over HTTP (invites live 7 days and the server
 * caches the file in memory), so the suite backdates expiresAt in the
 * scratch file between two fresh child processes and checks that peek and
 * redeem both refuse the token here, through the real invites module.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createAccountInvite, peekAccountInvite, redeemAccountInvite } from '../server/auth/invites.ts'

const fakeReq = { headers: { host: '127.0.0.1' } }
const mode = process.argv[2]

if (mode === 'create') {
  // Invites now validate that linked ids name real athlete rows, so seed the
  // scratch roster with the example athlete before creating the invite.
  const dataDir = path.join(process.cwd(), 'data')
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(
    path.join(dataDir, 'roster.json'),
    JSON.stringify({
      kind: 'shape-lab-roster',
      version: 1,
      athletes: [{ id: 'ath_example_sam', name: 'Sam', createdAt: new Date().toISOString() }],
    }),
  )
  const invite = await createAccountInvite('parent', ['ath_example_sam'], 'acct_access_check', fakeReq)
  const token = new URL(invite.url).searchParams.get('invite') || ''
  const peek = await peekAccountInvite(token)
  console.log(JSON.stringify({ id: invite.id, token, peekValid: peek.valid === true }))
} else if (mode === 'check') {
  const token = process.argv[3] || ''
  const peek = await peekAccountInvite(token)
  const redeemed = await redeemAccountInvite(token)
  console.log(JSON.stringify({ peekValid: peek.valid === true, redeemed }))
} else {
  console.error(`unknown mode: ${mode || '(none)'}`)
  process.exit(2)
}
