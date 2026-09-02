/**
 * Human-readable gym contacts from the roster file.
 * /api/roster is JSON (looks like code in a browser). This page is a table.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { readRosterFile } from './rosterStore.ts'

export type ContactRow = {
  name: string
  role: string
  phone: string
  parentPhone: string
  email: string
  photo: boolean
  tests: number
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function roleOf(row: Record<string, unknown>): string {
  const role = text(row.role)
  if (role === 'gym_owner') return 'Gym owner'
  if (role === 'coach') return 'Coach'
  if (role === 'parent') return 'Parent'
  return 'Athlete'
}

export function contactRowsFromRoster(roster: { athletes?: unknown[] }): ContactRow[] {
  const athletes = Array.isArray(roster.athletes) ? roster.athletes : []
  return athletes
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => ({
      name: text(row.name) || 'Unnamed',
      role: roleOf(row),
      phone: text(row.phone),
      parentPhone: text(row.parentPhone),
      email: text(row.email),
      photo: text(row.photoDataUrl).startsWith('data:'),
      tests: Array.isArray(row.shapeTests) ? row.shapeTests.length : 0,
    }))
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`
  return value
}

export function contactsCsv(rows: ContactRow[]): string {
  const header = ['Name', 'Role', 'Phone', 'Parent phone', 'Email', 'Photo', 'Shape tests']
  const body = rows.map((row) =>
    [
      csvCell(row.name),
      csvCell(row.role),
      csvCell(row.phone),
      csvCell(row.parentPhone),
      csvCell(row.email),
      row.photo ? 'yes' : '',
      String(row.tests),
    ].join(','),
  )
  return [header.join(','), ...body].join('\n') + '\n'
}

export function contactsHtml(rows: ContactRow[], exportedAt: string): string {
  const cells = rows
    .map(
      (row) => `<tr>
  <td>${escapeHtml(row.name)}</td>
  <td>${escapeHtml(row.role)}</td>
  <td>${escapeHtml(row.phone) || '—'}</td>
  <td>${escapeHtml(row.parentPhone) || '—'}</td>
  <td>${escapeHtml(row.email) || '—'}</td>
  <td>${row.photo ? 'yes' : '—'}</td>
  <td>${row.tests || '—'}</td>
</tr>`,
    )
    .join('\n')
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Shape Lab gym contacts</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 24px; color: #102018; background: #f4f7f5; }
    h1 { font-size: 1.4rem; margin: 0 0 8px; }
    p { color: #3d5348; max-width: 42rem; line-height: 1.45; }
    a { color: #0b6b4c; }
    table { border-collapse: collapse; width: 100%; max-width: 56rem; background: #fff; }
    th, td { border: 1px solid #d5ddd8; padding: 8px 10px; text-align: left; font-size: 0.95rem; }
    th { background: #e8efe9; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .actions { margin: 16px 0; display: flex; gap: 12px; flex-wrap: wrap; }
  </style>
</head>
<body>
  <h1>Gym contacts</h1>
  <p>This is the readable list from the gym link. Saved ${escapeHtml(exportedAt || 'just now')}. ${rows.length} profile${rows.length === 1 ? '' : 's'}.</p>
  <div class="actions">
    <a href="/api/contacts.csv">Download spreadsheet</a>
    <a href="/api/roster">Raw backup file</a>
    <a href="/">Back to Shape Lab</a>
  </div>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Role</th>
        <th>Phone</th>
        <th>Parent phone</th>
        <th>Email</th>
        <th>Photo</th>
        <th>Shape tests</th>
      </tr>
    </thead>
    <tbody>
      ${cells || '<tr><td colspan="7">No profiles on this link yet.</td></tr>'}
    </tbody>
  </table>
</body>
</html>
`
}

export async function sendContactsPage(
  req: IncomingMessage,
  res: ServerResponse,
  format: 'html' | 'csv',
): Promise<void> {
  void req
  const roster = await readRosterFile()
  const rows = contactRowsFromRoster(roster)
  if (format === 'csv') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="shape-lab-contacts.csv"')
    res.setHeader('Cache-Control', 'no-store')
    res.end(contactsCsv(rows))
    return
  }
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(contactsHtml(rows, roster.exportedAt))
}
