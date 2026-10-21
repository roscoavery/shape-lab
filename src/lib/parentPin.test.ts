import { beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkParentPin, clearParentPin, hasParentPin, setParentPin } from './parentPin'

/**
 * Parent Gate PIN (src/lib/parentPin.ts) against a localStorage stub.
 * The module reads window.localStorage at call time, so swapping the
 * global before each test is enough — no browser needed.
 */

type StorageStub = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

const backing = new Map<string, string>()
const localStorageStub: StorageStub = {
  getItem: (key) => (backing.has(key) ? (backing.get(key) as string) : null),
  setItem: (key, value) => {
    backing.set(key, String(value))
  },
  removeItem: (key) => {
    backing.delete(key)
  },
}
;(globalThis as { window?: { localStorage: StorageStub } }).window = {
  localStorage: localStorageStub,
}

beforeEach(() => {
  backing.clear()
})

describe('parentPin', () => {
  it('reports unset before any PIN is stored', () => {
    assert.equal(hasParentPin(), false)
    assert.equal(checkParentPin('1234'), false)
  })

  it('rejects PINs that are not exactly 4 digits', () => {
    for (const bad of ['', '123', '12345', '12a4', '    ']) {
      assert.equal(setParentPin(bad), false, `expected ${JSON.stringify(bad)} to be rejected`)
    }
    assert.equal(hasParentPin(), false)
  })

  it('round-trips set, verify, and clear', () => {
    assert.equal(setParentPin('1234'), true)
    assert.equal(hasParentPin(), true)
    assert.equal(checkParentPin('1234'), true)
    clearParentPin()
    assert.equal(hasParentPin(), false)
    assert.equal(checkParentPin('1234'), false)
  })

  it('fails verification for a wrong PIN', () => {
    setParentPin('1234')
    assert.equal(checkParentPin('1235'), false)
    assert.equal(checkParentPin('123'), false)
    assert.equal(checkParentPin(''), false)
  })

  it('overwrites the old PIN when set again', () => {
    setParentPin('1234')
    assert.equal(setParentPin('9876'), true)
    assert.equal(checkParentPin('1234'), false)
    assert.equal(checkParentPin('9876'), true)
  })

  it('clearing an unset PIN does not throw', () => {
    clearParentPin()
    assert.equal(hasParentPin(), false)
  })
})
