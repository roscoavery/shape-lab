/**
 * iPad Air 2 last OS is iOS 15.8. Chrome on that iPad is the same WebKit.
 * Call installLegacySafariShims() from main before React mounts.
 */

export function isLegacyIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const ios = ua.match(/OS (\d+)[._](\d+)/)
  if (ios) {
    const major = Number(ios[1])
    return Number.isFinite(major) && major > 0 && major < 16
  }
  return false
}

function installFindLastIndex() {
  if ('findLastIndex' in Array.prototype) return
  Object.defineProperty(Array.prototype, 'findLastIndex', {
    configurable: true,
    writable: true,
    value: function findLastIndex<T>(
      this: T[],
      pred: (value: T, index: number, array: T[]) => unknown,
    ) {
      for (let i = this.length - 1; i >= 0; i--) {
        if (pred(this[i] as T, i, this)) return i
      }
      return -1
    },
  })
}

function installAbortSignalTimeout() {
  const AbortS = globalThis.AbortSignal as typeof AbortSignal & {
    timeout?: (ms: number) => AbortSignal
  }
  if (typeof AbortS?.timeout === 'function') return
  AbortS.timeout = (ms: number) => {
    const ctrl = new AbortController()
    const id = window.setTimeout(() => ctrl.abort(), ms)
    ctrl.signal.addEventListener('abort', () => window.clearTimeout(id), { once: true })
    return ctrl.signal
  }
}

function installObjectHasOwn() {
  if (typeof Object.hasOwn === 'function') return
  Object.defineProperty(Object, 'hasOwn', {
    configurable: true,
    writable: true,
    value: (obj: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(obj, key),
  })
}

export function installLegacySafariShims() {
  installFindLastIndex()
  installAbortSignalTimeout()
  installObjectHasOwn()
  if (typeof document !== 'undefined' && isLegacyIosSafari()) {
    document.documentElement.classList.add('legacy-ios')
  }
}
