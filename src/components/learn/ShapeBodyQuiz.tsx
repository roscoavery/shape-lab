import type { ReferencePhoto } from '../../types'
import { buildShapeTwoQuiz } from '../../lib/shapeTwoQuiz'
import { StudyQuiz } from './StudyQuiz'

type Props = {
  onExit: () => void
  referencePhotos: ReferencePhoto[]
}

export function ShapeBodyQuiz({ onExit, referencePhotos }: Props) {
  return (
    <StudyQuiz
      title="Shape test 2 · look closer"
      build={() => buildShapeTwoQuiz(referencePhotos)}
      passCopy="You can name the close stills and say what the heel, knees, or arms are doing."
      midCopy="Look again at the still — the answer is on the picture, not the title."
      failCopy="Open Shape library, study the still, then try a new mix."
      retryLabel="Different questions"
      onExit={onExit}
    />
  )
}
