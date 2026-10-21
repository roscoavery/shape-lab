import { beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  checkParentPin,
  clearParentPin,
  hasParentPin,
  parentPinLockSeconds,
  setParentPin,
} from './parentPin'

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

const PIN_KEY = 'shapelab:parent-pin'
const GUARD_KEY = 'shapelab:parent-pin-guard'

beforeEach(() => {
  backing.clear()
})

describe('parentPin', () => {
  it('reports unset before any PIN is stored', async () => {
    assert.equal(hasParentPin(), false)
    assert.equal(await checkParentPin('1234'), false)
  })

  it('rejects PINs that are not exactly 4 digits', async () => {
    for (const bad of ['', '123', '12345', '12a4', '    ']) {
      assert.equal(await setParentPin(bad), false, `expected ${JSON.stringify(bad)} to be rejected`)
    }
    assert.equal(hasParentPin(), false)
  })

  it('stores a hash, never the PIN itself', async () => {
    assert.equal(await setParentPin('1234'), true)
    const stored = backing.get(PIN_KEY)
    assert.ok(stored, 'expected a stored value')
    assert.notEqual(stored, '1234')
    assert.ok(stored.startsWith('v1$'), `expected hashed storage, got ${stored}`)
  })

  it('round-trips set, verify, and clear', async () => {
    assert.equal(await setParentPin('1234'), true)
    assert.equal(hasParentPin(), true)
    assert.equal(await checkParentPin('1234'), true)
    clearParentPin()
    assert.equal(hasParentPin(), false)
    assert.equal(await checkParentPin('1234'), false)
  })

  it('fails verification for a wrong PIN', async () => {
    await setParentPin('1234')
    assert.equal(await checkParentPin('1235'), false)
    assert.equal(await checkParentPin('123'), false)
    assert.equal(await checkParentPin(''), false)
  })

  it('overwrites the old PIN when set again', async () => {
    await setParentPin('1234')
    assert.equal(await setParentPin('9876'), true)
    assert.equal(await checkParentPin('1234'), false)
    assert.equal(await checkParentPin('9876'), true)
  })

  it('clearing an unset PIN does not throw', () => {
    clearParentPin()
    assert.equal(hasParentPin(), false)
  })

  it('upgrades a legacy plaintext PIN to a hash on first good entry', async () => {
    backing.set(PIN_KEY, '1234')
    assert.equal(await checkParentPin('1234'), true)
    const stored = backing.get(PIN_KEY)
    assert.ok(stored && stored.startsWith('v1$'), 'expected the stored PIN to be re-hashed')
    assert.equal(await checkParentPin('1235'), false)
    assert.equal(await checkParentPin('1234'), true)
  })

  it('locks after 5 wrong tries, and even the right PIN waits', async () => {
    await setParentPin('1234')
    for (let i = 0; i < 5; i++) {
      assert.equal(await checkParentPin('0000'), false)
    }
    assert.ok(parentPinLockSeconds() > 0, 'expected the gate to be locked')
    assert.equal(await checkParentPin('1234'), false, 'right PIN must wait out the lock')
    // Simulate the lock expiring.
    backing.set(GUARD_KEY, JSON.stringify({ fails: 0, lockUntil: Date.now() - 1000 }))
    assert.equal(parentPinLockSeconds(), 0)
    assert.equal(await checkParentPin('1234'), true)
  })

  it('a good entry resets the wrong-try count', async () => {
    await setParentPin('1234')
    for (let i = 0; i < 4; i++) await checkParentPin('0000')
    assert.equal(await checkParentPin('1234'), true)
    for (let i = 0; i < 4; i++) await checkParentPin('0000')
    assert.equal(parentPinLockSeconds(), 0, 'count should have reset after the good entry')
  })
})
