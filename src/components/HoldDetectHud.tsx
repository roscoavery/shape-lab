import { getLastTrackDebug, isTrackDebugEnabled } from '../lib/athleteTrack'
import { isHoldDebugEnabled, type HoldDetectDebug } from '../lib/handstandDetect'

export function HoldDetectHud({ detect }: { detect?: HoldDetectDebug }) {
  const track = isTrackDebugEnabled() || isHoldDebugEnabled() ? getLastTrackDebug() : null
  if (!isHoldDebugEnabled() && !track) return null
  if (!isHoldDebugEnabled() && !detect && !track) return null
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-3">
      <span className="text-white/55">{label}</span>
      <span className="tabular-nums text-white">{value}</span>
    </div>
  )
  return (
    <div className="pointer-events-none mt-2 rounded-md border border-white/20 bg-black/70 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-white">
      {track ? (
        <>
          {row('track', `${track.state} · ${track.pickReason}`)}
          {row('model', `${track.model} / ${track.quality} · ${track.candidates} cand`)}
          {row('conf / cont / anat', `${track.poseConf.toFixed(2)} / ${track.continuity.toFixed(2)} / ${track.anatomy.toFixed(2)}`)}
          {row('fps / infer', `${track.fps} / ${track.inferMs.toFixed(0)}ms`)}
        </>
      ) : null}
      {isHoldDebugEnabled() && detect ? (
        <>
          {row('hold', detect.state)}
          {row('conf', detect.confidence.toFixed(2))}
          {row('enter / exit', `${detect.enterAt.toFixed(2)} / ${detect.exitAt.toFixed(2)}`)}
          {row('valid / invalid ms', `${Math.round(detect.validMs)} / ${Math.round(detect.invalidMs)}`)}
          {row('stack / ext / vert', `${detect.stack.toFixed(2)} / ${detect.extension.toFixed(2)} / ${detect.vertical.toFixed(2)}`)}
          {row(
            'elbow / axis',
            `${detect.elbowDeg != null ? `${Math.round(detect.elbowDeg)}°` : '—'} / ${
              detect.bodyAxisDeg != null ? `${Math.round(detect.bodyAxisDeg)}°` : '—'
            }`,
          )}
          {row('lm vis', detect.landmarkVis.toFixed(2))}
          {row('hard fail', detect.hardFail ?? 'none')}
        </>
      ) : null}
    </div>
  )
}
