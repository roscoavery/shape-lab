import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Shape test 2 comparison questions (src/lib/shapeTwoQuiz.ts): the answer
 * is tapping a still, never a shape-name button. The question carries
 * stillChoiceIds, the shape id of each still in display order, so the
 * tapped still always answers the shape that still shows.
 *
 * Importing shapeTwoQuiz pulls ./shippedRefs, whose module calls Vite's
 * import.meta.glob at load time and cannot load outside the app bundle.
 * Nothing under test calls the real photo lookup, so pickReferencePhoto
 * is stubbed to return one photo per shape id, with the shape id encoded
 * in the dataUrl so the still-to-shape binding can be checked after the
 * left/right shuffle. Same mock-module pattern as familyView.test.ts.
 */
mock.module('./shippedRefs.ts', {
  cache: false,
  // Node 24's runtime names this option `exports`; the bundled
  // @types/node still calls it `namedExports`, hence the cast.
  exports: {
    pickReferencePhoto: (_photos: unknown, shapeId: string) => ({
      id: `photo-${shapeId}`,
      shapeId,
      athleteId: null,
      dataUrl: `data:image/jpeg;base64,${shapeId}`,
      createdAt: '',
    }),
  },
} as Parameters<typeof mock.module>[1])

const { SHAPE_TWO_BANK, buildShapeTwoQuiz } = await import('./shapeTwoQuiz')

const COMPARISON_IDS = [
  's2-t1-compare',
  's2-t2-compare',
  's2-t3-compare',
  's2-t4-compare',
  's2-t6-compare',
  's2-t7-compare',
  's2-t8-lever',
]

function collectAll() {
  const byId = new Map<string, ReturnType<typeof buildShapeTwoQuiz>[number]>()
  for (let run = 0; run < 100 && byId.size < SHAPE_TWO_BANK.length; run++) {
    for (const q of buildShapeTwoQuiz([])) byId.set(q.id, q)
  }
  assert.equal(
    byId.size,
    SHAPE_TWO_BANK.length,
    `expected every bank question drawn after repeated runs, got ${byId.size} of ${SHAPE_TWO_BANK.length}`,
  )
  return byId
}

describe('shape two comparison questions', () => {
  it('the seven which-still questions carry a still binding, never name buttons', () => {
    const byId = collectAll()
    for (const id of COMPARISON_IDS) {
      const q = byId.get(id)
      assert.ok(q, `${id} was drawn`)
      assert.ok(q!.photoUrl2, `${id} has two stills`)
      assert.deepEqual(
        q!.stillChoiceIds?.slice().sort(),
        q!.choices.map((c) => c.id).sort(),
        `${id}: the two choices are exactly the two stills`,
      )
      assert.ok(
        q!.stillChoiceIds!.includes(q!.answerId),
        `${id}: the correct still is one of the two`,
      )
      // The binding rides with the shuffle: photoUrl is the first still's
      // shape, photoUrl2 the second's.
      assert.equal(q!.photoUrl, `data:image/jpeg;base64,${q!.stillChoiceIds![0]}`)
      assert.equal(q!.photoUrl2, `data:image/jpeg;base64,${q!.stillChoiceIds![1]}`)
    }
  })

  it('s2-t8-ftos keeps its four text choices: its stills illustrate one shape two ways', () => {
    const byId = collectAll()
    const q = byId.get('s2-t8-ftos')
    assert.ok(q, 's2-t8-ftos was drawn')
    assert.ok(q!.photoUrl2, 's2-t8-ftos has two stills')
    assert.equal(q!.choices.length, 4)
    assert.equal(q!.stillChoiceIds, undefined)
  })

  it('no question carries a still binding without two stills', () => {
    const byId = collectAll()
    for (const q of byId.values()) {
      if (q.stillChoiceIds) {
        assert.ok(q.photoUrl && q.photoUrl2, `${q.id}: still binding needs both stills`)
        assert.equal(q.choices.length, 2, `${q.id}: still binding needs exactly two choices`)
      }
    }
  })
})
