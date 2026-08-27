/**
 * Download + Instagram Story helpers for Tasks 2 runs.
 *
 * Instagram does not let a website auto-post to personal Stories.
 * We save the video, write the analysis, copy a caption, and open Instagram
 * (or the system share sheet) so the athlete drops it on their Story.
 */

import { getCaptureBlob } from './captureStore'
import {
  extForVideoType,
  getRememberedBlob,
  isAppleMobile,
  rememberCaptureBlob,
  saveVideoToDevice,
  type SaveVideoResult,
} from './saveMedia'
import type { Athlete, FlowRunReport } from '../types'

export function normalizeInstagramHandle(raw: string | undefined | null): string {
  if (!raw) return ''
  return raw
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9._]/g, '')
}

export function instagramUrl(handle: string): string {
  const h = normalizeInstagramHandle(handle)
  return h ? `https://www.instagram.com/${h}/` : 'https://www.instagram.com/'
}

export function averageScore(report: FlowRunReport): number {
  if (report.holdAttempts && report.holdAttempts.length > 0) {
    const best = report.holdAttempts.find((h) => h.highlighted) ?? report.holdAttempts[0]!
    return Math.round(best.livePeak)
  }
  if (report.steps.length === 0) return 0
  return Math.round(report.steps.reduce((n, s) => n + s.overall, 0) / report.steps.length)
}

function holdTimeLabel(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const sec = seconds - m * 60
  if (m > 0) return `${m}:${sec.toFixed(1).padStart(4, '0')}`
  return `${sec.toFixed(1)}s`
}

export function isHoldReport(report: FlowRunReport): boolean {
  return Boolean(report.holdAttempts) || report.bestHoldSeconds != null
}

export function analysisText(report: FlowRunReport, athlete?: Athlete | null): string {
  const handle = normalizeInstagramHandle(report.instagramHandle || athlete?.instagramHandle)
  const who = athlete?.name ?? 'Athlete'
  const ig = handle ? ` (@${handle})` : ''
  if (isHoldReport(report)) {
    const holds = report.holdAttempts ?? []
    const longest = holds.find((h) => h.highlighted) ?? holds[0]
    const lines = [
      'Shape Lab — Handstand hold challenge',
      `${who}${ig}`,
      report.sequenceName,
      new Date(report.createdAt).toLocaleString(),
      longest ? `Longest hold ${holdTimeLabel(longest.holdSeconds)}` : 'No timed holds',
      '',
      report.summary,
      '',
    ]
    for (const hold of holds) {
      const mark = hold.highlighted ? ' — longest' : ''
      lines.push(`Hold ${hold.index}${mark} — ${holdTimeLabel(hold.holdSeconds)}`)
      if (hold.highlighted) {
        if (hold.cues.length === 0) {
          lines.push('  Line looks in on this hold. Push tall, ears covered, ribs in, legs together.')
        } else {
          for (const cue of hold.cues) lines.push(`  • ${cue}`)
        }
      }
      lines.push('')
    }
    lines.push('Snapshots map the replay playhead — they are not grades.')
    lines.push('Not a gate. These are notes for next time.')
    return lines.join('\n')
  }
  const lines = [
    'Shape Lab — Tasks 2 analysis',
    `${who}${ig}`,
    report.sequenceName,
    new Date(report.createdAt).toLocaleString(),
    `Average ${averageScore(report)}/100`,
    '',
    report.summary,
    '',
  ]
  for (const step of report.steps) {
    lines.push(`${step.rep != null ? `Handstand ${step.rep}` : step.shapeName} — ${step.overall}/100`)
    if (step.cues.length === 0) {
      lines.push('  Lines look in on this snapshot.')
    } else {
      for (const cue of step.cues) lines.push(`  • ${cue}`)
    }
    lines.push('')
  }
  lines.push('Not a gate. These are notes for next time.')
  return lines.join('\n')
}

export function storyCaption(report: FlowRunReport, athlete?: Athlete | null): string {
  const handle = normalizeInstagramHandle(report.instagramHandle || athlete?.instagramHandle)
  const tag = handle ? `@${handle}` : athlete?.name ?? ''
  if (isHoldReport(report)) {
    const longest = report.bestHoldSeconds ?? report.holdAttempts?.find((h) => h.highlighted)?.holdSeconds
    const bits = (report.holdAttempts ?? []).map(
      (h) => `${h.index}:${holdTimeLabel(h.holdSeconds)}${h.highlighted ? '*' : ''}`,
    )
    return [
      `${report.nickname} · longest ${longest != null ? holdTimeLabel(longest) : '—'}`,
      bits.join(' · '),
      tag,
      'Shape Lab hold challenge',
    ]
      .filter(Boolean)
      .join('\n')
  }
  const avg = averageScore(report)
  const bits = report.steps.map((s) =>
    s.rep != null ? `${s.rep}:${s.overall}` : `${s.shapeName} ${s.overall}`,
  )
  return [
    `${report.nickname} · ${avg}/100`,
    bits.join(' · '),
    tag,
    'Shape Lab class flow',
  ]
    .filter(Boolean)
    .join('\n')
}

function stamp(iso: string): string {
  return iso.replace(/[:.]/g, '-').slice(0, 19)
}

export function analysisFileName(report: FlowRunReport): string {
  const nick = report.nickname.replace(/\s+/g, '_')
  return `shape-lab_${nick}_${stamp(report.createdAt)}_analysis.txt`
}

export function videoFileName(report: FlowRunReport, type: string, holdIndex?: number): string {
  const nick = report.nickname.replace(/\s+/g, '_')
  const ext = extForVideoType(type)
  const hold = holdIndex != null ? `_hold${holdIndex}` : ''
  return `shape-lab_${nick}_${stamp(report.createdAt)}${hold}.${ext}`
}

function triggerAnchorDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function downloadBlob(blob: Blob, filename: string) {
  triggerAnchorDownload(blob, filename)
}

async function blobForCapture(id: string): Promise<Blob | null> {
  return getRememberedBlob(id) ?? (await getCaptureBlob(id))
}

export function downloadAnalysis(report: FlowRunReport, athlete?: Athlete | null) {
  const text = analysisText(report, athlete)
  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), analysisFileName(report))
}

export async function downloadFlowVideo(report: FlowRunReport): Promise<SaveVideoResult> {
  if (!report.replayCaptureId) return 'failed'
  const blob = await blobForCapture(report.replayCaptureId)
  if (!blob) return 'failed'
  rememberCaptureBlob(report.replayCaptureId, blob)
  return saveVideoToDevice(blob, videoFileName(report, blob.type))
}

export async function downloadHoldVideo(
  report: FlowRunReport,
  clipId: string,
  holdIndex: number,
): Promise<SaveVideoResult> {
  const blob = await blobForCapture(clipId)
  if (!blob) return 'failed'
  rememberCaptureBlob(clipId, blob)
  return saveVideoToDevice(blob, videoFileName(report, blob.type, holdIndex))
}

export async function downloadFlowPack(
  report: FlowRunReport,
  athlete?: Athlete | null,
): Promise<{ video: SaveVideoResult; analysis: boolean }> {
  downloadAnalysis(report, athlete)
  const video = await downloadFlowVideo(report)
  return { video, analysis: true }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export async function shareToInstagramStory(
  report: FlowRunReport,
  athlete?: Athlete | null,
): Promise<'shared' | 'downloaded' | 'failed'> {
  const caption = storyCaption(report, athlete)
  await copyText(caption)
  let file: File | null = null
  if (report.replayCaptureId) {
    const blob = getRememberedBlob(report.replayCaptureId) ?? (await getCaptureBlob(report.replayCaptureId))
    if (blob) {
      rememberCaptureBlob(report.replayCaptureId, blob)
      const name = videoFileName(report, blob.type)
      file = new File([blob], name, { type: blob.type || 'video/mp4' })
    }
  }

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
  }
  if (file && typeof navigator.share === 'function') {
    const fileOnly: ShareData = { files: [file] }
    const withCaption: ShareData = isAppleMobile()
      ? fileOnly
      : { files: [file], text: caption, title: `${report.nickname} · Shape Lab` }
    const tryShare = async (data: ShareData) => {
      const can = typeof nav.canShare === 'function' ? nav.canShare(data) : true
      if (!can) return false
      try {
        await navigator.share(data)
        return true
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return true
        return false
      }
    }
    if (await tryShare(withCaption)) return 'shared'
    if (withCaption !== fileOnly && (await tryShare(fileOnly))) return 'shared'
  }

  if (file) {
    const saved = await saveVideoToDevice(file, file.name)
    downloadAnalysis(report, athlete)
    if (saved === 'failed') return 'failed'
  } else {
    downloadAnalysis(report, athlete)
  }

  const story = 'instagram://story-camera'
  window.setTimeout(() => {
    window.location.href = story
  }, 400)
  window.setTimeout(() => {
    if (document.visibilityState === 'visible') {
      window.open('https://www.instagram.com/', '_blank', 'noopener')
    }
  }, 1400)

  return file ? 'downloaded' : 'failed'
}
