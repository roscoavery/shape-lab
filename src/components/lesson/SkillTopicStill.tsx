/**
 * Small shape still next to a selected loggable item (hold picker, rep rows).
 * Shows nothing when the selection has no shape id or no still exists —
 * never an empty placeholder.
 */
import { useEffect, useState } from 'react'
import { pickCoachStill } from '../../lib/shippedRefs'
import { loadReferencePhotos } from '../../lib/storage'
import type { ReferencePhoto } from '../../types'
import { CroppedStill } from '../CroppedStill'
import type { SkillTopic } from './SkillPicker'

/** Resolve the library shape id behind a loggable selection, if any. */
export function skillTopicShapeId(
  topic: Pick<SkillTopic, 'kind' | 'id' | 'scoreShapeId'>,
): string | null {
  if (topic.kind === 'shape' && topic.id) return topic.id
  if (topic.kind === 'coach' && topic.scoreShapeId) return topic.scoreShapeId
  return null
}

export function SkillTopicStill({
  topic,
  className = '',
}: {
  topic: Pick<SkillTopic, 'kind' | 'id' | 'scoreShapeId'>
  className?: string
}) {
  const shapeId = skillTopicShapeId(topic)
  const [photos, setPhotos] = useState<ReferencePhoto[]>(() => loadReferencePhotos())
  useEffect(() => {
    setPhotos(loadReferencePhotos())
  }, [shapeId])
  if (!shapeId) return null
  const still = pickCoachStill(photos, shapeId)
  if (!still) return null
  return (
    <CroppedStill
      src={still.dataUrl}
      stillId={still.id}
      alt=""
      className={`h-12 w-12 shrink-0 rounded-lg object-cover ${className}`}
    />
  )
}

/** Direct shape-id version for rep rows that carry a refId instead of a topic. */
export function ShapeIdStill({
  shapeId,
  className = '',
}: {
  shapeId: string | null | undefined
  className?: string
}) {
  if (!shapeId) return null
  return <SkillTopicStill topic={{ kind: 'shape', id: shapeId }} className={className} />
}
