import { ANATOMY_LESSONS } from '../../config/coachAnatomy'
import { buildMovementsQuiz } from '../../lib/studyQuiz'
import { StudyQuiz } from './StudyQuiz'

type Props = {
  onExit: () => void
}

export function MovementsQuiz({ onExit }: Props) {
  return (
    <StudyQuiz
      title="Movements"
      build={buildMovementsQuiz}
      lessonTitle={(id) => ANATOMY_LESSONS.find((l) => l.id === id)?.title}
      passCopy="You can name the joint action, including wrist dorsiflexion and plantarflexion."
      midCopy="Close. The misses are the words that get mixed in the gym."
      failCopy="Reread Joint actions, then take a new mix."
      retryLabel="Different questions"
      onExit={onExit}
    />
  )
}
