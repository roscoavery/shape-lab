/**
 * Acuity Scheduling lesson notes arrive on calendar events as structured
 * plain text (booking details, tumbler info, location, reschedule link).
 * This parses that text into fields so the calendar can render a clean
 * card instead of dumping the raw blob. Returns null when the notes do
 * not look like Acuity output, so callers can fall back to plain text.
 */

export type AcuityNotes = {
  parentName?: string
  phone?: string
  email?: string
  price?: string
  paidOnline?: string
  certificateCode?: string
  location?: string
  tumblerName?: string
  tumblerAge?: string
  skills: string[]
  athleteInfo?: string
  rescheduleUrl?: string
  extraSections: { title: string; body: string }[]
}

const SECTION_UNDERLINE = /^={3,}\s*$/
const URL_LINE = /^\s*https?:\/\//i
const BOILERPLATE_LINE =
  /please use acuity scheduling|upload tumbling videos here|created by acuity|^acuityid\s*=/i

function parseKeyValue(line: string): { key: string; value: string } | null {
  if (URL_LINE.test(line)) return null
  const m = line.match(/^\s*([A-Za-z][^:]{0,90}?)\s*::?\s*(.*?)\s*$/)
  if (!m) return null
  const key = m[1].replace(/\s+/g, ' ').trim()
  // Must read like a label ("Price", "Tumbler Age"), not a sentence,
  // timestamp, or address. Digits in the key are the tell.
  if (!/^[A-Za-z][A-Za-z .'\-()]{0,80}$/.test(key)) return null
  return { key, value: m[2].trim() }
}

function sectionStart(lines: string[], idx: number): boolean {
  return (
    idx + 1 < lines.length &&
    lines[idx].trim().length > 0 &&
    SECTION_UNDERLINE.test(lines[idx + 1])
  )
}

export function parseAcuityNotes(notes: string): AcuityNotes | null {
  const text = notes.replace(/\r\n/g, '\n')
  const looksAcuity =
    /secure\.acuityscheduling\.com/i.test(text) ||
    (SECTION_UNDERLINE.test(text) && /tumbler/i.test(text))
  if (!looksAcuity) return null

  const lines = text.split('\n')
  const headerLines: string[] = []
  let idx = 0
  while (idx < lines.length && !sectionStart(lines, idx)) {
    headerLines.push(lines[idx])
    idx += 1
  }
  const sections: { title: string; body: string[] }[] = []
  while (idx < lines.length) {
    const title = lines[idx].trim()
    idx += 2 // skip the title and its === underline
    const body: string[] = []
    while (idx < lines.length && !sectionStart(lines, idx)) {
      body.push(lines[idx])
      idx += 1
    }
    sections.push({ title, body })
  }

  const out: AcuityNotes = { skills: [], extraSections: [] }

  // Header: first line is the appointment datetime (the event already shows
  // its time, so we drop it); the rest are "Key: value" booking details.
  let firstHeader = true
  for (const line of headerLines) {
    const t = line.trim()
    if (!t) continue
    if (firstHeader) {
      firstHeader = false
      if (!parseKeyValue(t)) continue // the datetime line, e.g. "September 26, 2026 11:30am CDT"
    }
    const kv = parseKeyValue(t)
    if (!kv) continue
    switch (kv.key.toLowerCase()) {
      case 'name':
        out.parentName = kv.value || out.parentName
        break
      case 'phone':
        out.phone = kv.value || out.phone
        break
      case 'email':
        out.email = kv.value || out.email
        break
      case 'price':
        out.price = kv.value || out.price
        break
      case 'paid online':
        out.paidOnline = kv.value || out.paidOnline
        break
      case 'certificate code':
        out.certificateCode = kv.value || out.certificateCode
        break
      default:
        break // "Calendar: ..." and anything else is noise for the coach
    }
  }

  const infoParts: string[] = []
  const pushInfo = (s: string) => {
    if (s.trim()) infoParts.push(s.trim())
  }

  for (const section of sections) {
    const title = section.title.toLowerCase()
    // A reschedule link can hide in any section body.
    for (const line of section.body) {
      const m = line.match(/https:\/\/secure\.acuityscheduling\.com[^\s]*/i)
      if (m && !out.rescheduleUrl) out.rescheduleUrl = m[0]
    }

    if (title === 'location') {
      const addr = section.body.map((l) => l.trim()).filter(Boolean).join('\n')
      if (addr) out.location = addr
      continue
    }

    if (title === 'tumbler info') {
      let lastKey: string | null = null
      for (const raw of section.body) {
        const line = raw.trim()
        if (!line || BOILERPLATE_LINE.test(line)) continue
        if (URL_LINE.test(line)) continue // captured above
        const kv = parseKeyValue(line)
        if (!kv) {
          // Continuation of the previous field ("She has her back
          // handspring spotted." belongs to the additional-info field).
          if (lastKey === 'info' && infoParts.length > 0) {
            infoParts[infoParts.length - 1] += ` ${line}`
          } else {
            pushInfo(line)
          }
          lastKey = null
          continue
        }
        const key = kv.key.toLowerCase()
        lastKey = null
        if (!kv.value) continue // e.g. "Upload Tumbling Videos here:"
        if (key.includes('tumbler name')) out.tumblerName = kv.value
        else if (key.includes('tumbler age')) out.tumblerAge = kv.value
        else if (key.includes('skill')) {
          out.skills = kv.value
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean)
        } else if (key.includes('additional info')) {
          pushInfo(kv.value)
          lastKey = 'info'
        } else {
          pushInfo(`${kv.key}: ${kv.value}`)
        }
      }
      continue
    }

    const body = section.body.map((l) => l.trim()).filter((l) => l && !BOILERPLATE_LINE.test(l))
    if (body.length > 0) {
      out.extraSections.push({ title: section.title, body: body.join('\n') })
    }
  }

  if (infoParts.length > 0) out.athleteInfo = infoParts.join('\n\n')

  // The age field sometimes holds a last name instead of an age ("Ava" /
  // "Hiriart"). An age without any digit is really part of the name.
  if (out.tumblerAge && !/\d/.test(out.tumblerAge)) {
    out.tumblerName = [out.tumblerName, out.tumblerAge].filter(Boolean).join(' ')
    delete out.tumblerAge
  }

  const meaningful =
    out.tumblerName ||
    out.parentName ||
    out.phone ||
    out.email ||
    out.skills.length > 0 ||
    out.location ||
    out.athleteInfo ||
    out.extraSections.length > 0
  return meaningful ? out : null
}

/** +14799577387 -> +1 (479) 957-7387; anything else passes through. */
export function formatPhoneDisplay(phone: string): string {
  const m = phone.trim().match(/^\+1(\d{3})(\d{3})(\d{4})$/)
  return m ? `+1 (${m[1]}) ${m[2]}-${m[3]}` : phone.trim()
}

function moneyNumber(s: string | undefined): number | null {
  if (!s) return null
  const n = parseFloat(s.replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : null
}

/** True when the paid-online amount covers the price. */
export function acuityPaidInFull(price?: string, paidOnline?: string): boolean {
  const p = moneyNumber(price)
  const paid = moneyNumber(paidOnline)
  return p !== null && p > 0 && paid !== null && paid >= p
}
