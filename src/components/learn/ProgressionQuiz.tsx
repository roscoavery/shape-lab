import { PROGRESSION_LESSONS } from '../../config/tumblingProgression'
import { buildProgressionQuiz, type ProgressionTrack } from '../../lib/studyQuiz'
import { StudyQuiz } from './StudyQuiz'

type Props = {
  onExit: () => void
  track?: ProgressionTrack
}

const TITLE: Record<ProgressionTrack, string> = {
  all: 'Progressions',
  levels: 'Progressions · four levels',
  blocks: 'Progressions · fear and blocks',
  deep: 'Progressions · deeper cases',
}

export function ProgressionQuiz({ onExit, track = 'all' }: Props) {
  return (
    <StudyQuiz
      title={TITLE[track]}
      build={() => buildProgressionQuiz(track)}
      lessonTitle={(id) => PROGRESSION_LESSONS.find((l) => l.id === id)?.title}
      passCopy="You can name the level and the kind of stuck."
      midCopy="Close. Try another mix. The questions will not be the same set."
      failCopy="Open Progression in the coach study room, then retake a different version."
      retryLabel="Different questions"
      onExit={onExit}
    />
  )
}
