import { ANATOMY_LESSONS } from '../../config/coachAnatomy'
import { buildAnatomyQuiz, type AnatomyTrack } from '../../lib/studyQuiz'
import { StudyQuiz } from './StudyQuiz'

type Props = {
  onExit: () => void
  track?: AnatomyTrack
}

const TITLE: Record<AnatomyTrack, string> = {
  all: 'Anatomy for coaches',
  joints: 'Anatomy · joints',
  tissues: 'Anatomy · tissues',
  prevention: 'Anatomy · prevention',
}

export function AnatomyQuiz({ onExit, track = 'all' }: Props) {
  return (
    <StudyQuiz
      title={TITLE[track]}
      build={() => buildAnatomyQuiz(track)}
      lessonTitle={(id) => ANATOMY_LESSONS.find((l) => l.id === id)?.title}
      passCopy="You can name the joint, the tissue, and the gym decision."
      midCopy="Good start. Reread the misses in Anatomy, then try a different version."
      failCopy="Open Anatomy in the coach study room, then retake a different mix."
      retryLabel="Different questions"
      onExit={onExit}
    />
  )
}
