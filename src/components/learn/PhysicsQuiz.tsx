import { buildPhysicsQuiz, type PhysicsTrack } from '../../lib/studyQuiz'
import { physicsLessonById } from '../../config/tumblingPhysics'
import { StudyQuiz } from './StudyQuiz'

type Props = {
  onExit: () => void
  track?: PhysicsTrack
}

export function PhysicsQuiz({ onExit, track = 'all' }: Props) {
  return (
    <StudyQuiz
      title={track === 'core' ? 'Physics · how motion works' : 'Physics in tumbling'}
      build={() => buildPhysicsQuiz(track)}
      lessonTitle={(id) => physicsLessonById(id)?.title}
      passCopy="Perfect. You can talk this in gym language, not just slogans."
      midCopy="Solid. Retake for a different mix from the same chapter."
      failCopy="Study the Why on each miss, then open Tumbling physics and try a new set."
      retryLabel="Different questions"
      onExit={onExit}
    />
  )
}
