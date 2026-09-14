/**
 * Optional invite email. Copy-link still works when SMTP is off.
 * Never log the sign-in URL.
 */

import { isAdmin } from './permissions.ts'
import type { AuthUser } from './types.ts'

export function mailConfigured(): boolean {
  const host = (process.env.SHAPE_LAB_SMTP_HOST || '').trim()
  const from = (process.env.SHAPE_LAB_MAIL_FROM || '').trim()
  return Boolean(host && from)
}

export function mailEnabledFor(user: AuthUser | null | undefined): boolean {
  return isAdmin(user) && mailConfigured()
}

export type InviteMailResult = {
  mailed: boolean
  error?: string
}

export async function sendInviteEmail(opts: {
  to: string
  url: string
  displayName: string
}): Promise<InviteMailResult> {
  if (!mailConfigured()) return { mailed: false }
  const to = opts.to.trim().toLowerCase()
  if (!to || !to.includes('@')) return { mailed: false, error: 'That account has no email.' }
  const from = (process.env.SHAPE_LAB_MAIL_FROM || '').trim()
  const host = (process.env.SHAPE_LAB_SMTP_HOST || '').trim()
  const user = (process.env.SHAPE_LAB_SMTP_USER || '').trim()
  const pass = process.env.SHAPE_LAB_SMTP_PASS || ''
  const port = Number(process.env.SHAPE_LAB_SMTP_PORT || 587)
  const name = opts.displayName.trim() || 'there'
  try {
    const nodemailer = await import('nodemailer')
    const createTransport =
      nodemailer.createTransport ||
      (nodemailer as { default?: { createTransport: typeof nodemailer.createTransport } }).default
        ?.createTransport
    if (!createTransport) return { mailed: false, error: 'Could not load mail.' }
    const transport = createTransport({
      host,
      port: Number.isFinite(port) ? port : 587,
      secure: process.env.SHAPE_LAB_SMTP_SECURE === '1',
      auth: user ? { user, pass } : undefined,
    })
    await transport.sendMail({
      from,
      to,
      subject: 'Sign in to Shape Lab',
      text: [
        `Hi ${name},`,
        '',
        'Someone at your gym made a sign-in link for this email. It works for 7 days, once.',
        '',
        opts.url,
        '',
        'If you did not ask for this, ignore it.',
      ].join('\n'),
    })
    return { mailed: true }
  } catch {
    return { mailed: false, error: 'Could not send that email.' }
  }
}
