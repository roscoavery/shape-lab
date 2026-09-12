/**
 * Learn → Physics test. Same flow as the shape test: pick, see if you
 * were right, then a score plus every miss with the correct idea.
 */

import { buildPhysicsQuiz } from '../../lib/studyQuiz'
import { physicsLessonById } from '../../config/tumblingPhysics'
import { StudyQuiz } from './StudyQuiz'

type Props = {
  onExit: () => void
}

export function PhysicsQuiz({ onExit }: Props) {
  return (
    <StudyQuiz
      title="Physics in tumbling"
      build={buildPhysicsQuiz}
      lessonTitle={(id) => physicsLessonById(id)?.title}
      passCopy="Perfect. You can talk this in gym language, not just slogans."
      midCopy="Solid. The misses below are the ideas to reread in Tumbling physics, then retake."
      failCopy="Study the Why on each miss, then open Tumbling physics and try again."
      retryLabel="New physics test"
      onExit={onExit}
    />
  )
}
