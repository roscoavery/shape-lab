import { ANATOMY_LESSONS } from '../../config/coachAnatomy'
import { buildAnatomyQuiz } from '../../lib/studyQuiz'
import { StudyQuiz } from './StudyQuiz'

type Props = {
  onExit: () => void
}

export function AnatomyQuiz({ onExit }: Props) {
  return (
    <StudyQuiz
      title="Anatomy for coaches"
      build={buildAnatomyQuiz}
      lessonTitle={(id) => ANATOMY_LESSONS.find((l) => l.id === id)?.title}
      passCopy="You can name the joint, the tissue, and the gym decision."
      midCopy="Good start. Reread the misses in Anatomy, then try again."
      failCopy="Open Anatomy in the coach study room, then retake."
      retryLabel="New anatomy test"
      onExit={onExit}
    />
  )
}
