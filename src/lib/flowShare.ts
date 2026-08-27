/**
 * Download + Instagram Story helpers for Tasks 2 runs.
 *
 * Instagram does not let a website auto-post to personal Stories.
 * We save the video, write the analysis, copy a caption, and open Instagram
 * (or the system share sheet) so the athlete drops it on their Story.
 */

import { getCaptureBlob } from './captureStore'
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
  if (report.steps.length === 0) return 0
  return Math.round(report.steps.reduce((n, s) => n + s.overall, 0) / report.steps.length)
}

export function analysisText(report: FlowRunReport, athlete?: Athlete | null): string {
  const handle = normalizeInstagramHandle(report.instagramHandle || athlete?.instagramHandle)
  const who = athlete?.name ?? 'Athlete'
  const ig = handle ? ` (@${handle})` : ''
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
  const avg = averageScore(report)
  const bits = report.steps.map((s) =>
    s.rep != null ? `${s.rep}:${s.overall}` : `${s.shapeName} ${s.overall}`,
  )
  const tag = handle ? `@${handle}` : athlete?.name ?? ''
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

export function videoFileName(report: FlowRunReport, type: string): string {
  const nick = report.nickname.replace(/\s+/g, '_')
  const ext = type.includes('mp4') ? 'mp4' : 'webm'
  return `shape-lab_${nick}_${stamp(report.createdAt)}.${ext}`
}

export function downloadBlob(blob: Blob, filename: string) {
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

export function downloadAnalysis(report: FlowRunReport, athlete?: Athlete | null) {
  const text = analysisText(report, athlete)
  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), analysisFileName(report))
}

export async function downloadFlowVideo(report: FlowRunReport): Promise<boolean> {
  if (!report.replayCaptureId) return false
  const blob = await getCaptureBlob(report.replayCaptureId)
  if (!blob) return false
  downloadBlob(blob, videoFileName(report, blob.type))
  return true
}

export async function downloadFlowPack(
  report: FlowRunReport,
  athlete?: Athlete | null,
): Promise<{ video: boolean; analysis: boolean }> {
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
    const blob = await getCaptureBlob(report.replayCaptureId)
    if (blob) {
      const name = videoFileName(report, blob.type)
      file = new File([blob], name, { type: blob.type || 'video/webm' })
    }
  }

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
  }
  if (file && typeof navigator.share === 'function') {
    const data: ShareData = {
      files: [file],
      text: caption,
      title: `${report.nickname} · Shape Lab`,
    }
    const can = typeof nav.canShare === 'function' ? nav.canShare(data) : true
    if (can) {
      try {
        await navigator.share(data)
        return 'shared'
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return 'shared'
      }
    }
  }

  if (file) downloadBlob(file, file.name)
  downloadAnalysis(report, athlete)

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
