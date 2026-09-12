import { buildShapeBodyQuiz } from '../../lib/studyQuiz'
import { StudyQuiz } from './StudyQuiz'

type Props = {
  onExit: () => void
}

export function ShapeBodyQuiz({ onExit }: Props) {
  return (
    <StudyQuiz
      title="Shape test 2 · body positions"
      build={buildShapeBodyQuiz}
      passCopy="You can tell starting lunge, landing lunge, and mountain climber apart by the body, not the name."
      midCopy="That mix is the point. Retake for a different set of distinctions."
      failCopy="Look at the stills in Shape library, then try a new mix."
      retryLabel="Different questions"
      onExit={onExit}
    />
  )
}
