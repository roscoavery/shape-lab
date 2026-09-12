import { PROGRESSION_LESSONS } from '../../config/tumblingProgression'
import { buildProgressionQuiz } from '../../lib/studyQuiz'
import { StudyQuiz } from './StudyQuiz'

type Props = {
  onExit: () => void
}

export function ProgressionQuiz({ onExit }: Props) {
  return (
    <StudyQuiz
      title="Progressions"
      build={buildProgressionQuiz}
      lessonTitle={(id) => PROGRESSION_LESSONS.find((l) => l.id === id)?.title}
      passCopy="You can name the level and the kind of stuck."
      midCopy="Close. The misses below are the distinctions that keep a plan honest."
      failCopy="Open Progression in the coach study room, then retake."
      retryLabel="New progressions test"
      onExit={onExit}
    />
  )
}
