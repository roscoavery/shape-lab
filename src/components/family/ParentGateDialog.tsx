import { useEffect, useState } from 'react'
import { checkParentPin, hasParentPin, parentPinLockSeconds, setParentPin } from '../../lib/parentPin'

type Props = {
  onSuccess: () => void
  onCancel: () => void
}

/**
 * Parent Gate dialog. If no PIN is set yet, prompts to create one.
 * Otherwise prompts to enter the PIN.
 */
export function ParentGateDialog({ onSuccess, onCancel }: Props) {
  const [mode] = useState<'setup' | 'verify'>(hasParentPin() ? 'verify' : 'setup')
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(() => {
    const left = parentPinLockSeconds()
    return left > 0 ? `Too many wrong tries. Wait ${left} seconds and try again.` : null
  })
  const [lockLeft, setLockLeft] = useState(() => parentPinLockSeconds())
  const [busy, setBusy] = useState(false)
  const padDisabled = busy || lockLeft > 0

  // Count the retry lock down so the pad reopens on its own.
  useEffect(() => {
    if (lockLeft <= 0) return
    const t = window.setInterval(() => {
      const left = parentPinLockSeconds()
      setLockLeft(left)
      if (left <= 0) setError(null)
    }, 1000)
    return () => window.clearInterval(t)
  }, [lockLeft > 0])

  const handleDigit = (d: string, target: 'pin' | 'confirm') => {
    if (padDisabled) return
    if (target === 'pin' && pin.length >= 4) return
    if (target === 'confirm' && confirm.length >= 4) return
    setError(null)
    if (target === 'pin') setPin((p) => p + d)
    else setConfirm((c) => c + d)
  }

  const handleBackspace = (target: 'pin' | 'confirm') => {
    if (padDisabled) return
    if (target === 'pin') setPin((p) => p.slice(0, -1))
    else setConfirm((c) => c.slice(0, -1))
  }

  const submit = async () => {
    if (padDisabled) return
    if (mode === 'setup') {
      if (pin.length !== 4) {
        setError('Enter a 4-digit PIN.')
        return
      }
      if (confirm.length !== 4) {
        setError('Confirm your 4-digit PIN.')
        return
      }
      if (pin !== confirm) {
        setError('PINs do not match. Try again.')
        setPin('')
        setConfirm('')
        return
      }
      setBusy(true)
      try {
        if (await setParentPin(pin)) {
          onSuccess()
        } else {
          setError('Could not save that PIN.')
        }
      } finally {
        setBusy(false)
      }
      return
    }
    // Verify mode
    if (pin.length !== 4) {
      setError('Enter your 4-digit PIN.')
      return
    }
    setBusy(true)
    try {
      if (await checkParentPin(pin)) {
        onSuccess()
      } else {
        const left = parentPinLockSeconds()
        setPin('')
        if (left > 0) {
          setLockLeft(left)
          setError(`Too many wrong tries. Wait ${left} seconds and try again.`)
        } else {
          setError('Wrong PIN. Try again.')
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const renderPad = (target: 'pin' | 'confirm', value: string, label: string) => (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</p>
      <div className="mt-1.5 flex justify-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-12 w-12 rounded-xl border text-center text-2xl leading-[3rem] ${
              value[i]
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text)]'
                : 'border-[var(--panel-border)] text-transparent'
            }`}
          >
            {value[i] ? '•' : '·'}
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            disabled={padDisabled}
            onClick={() => handleDigit(d, target)}
            className="rounded-xl border border-[var(--panel-border)] py-3 text-xl font-semibold text-[var(--text)] hover:bg-white/5 disabled:opacity-40"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          disabled={padDisabled}
          onClick={() => handleBackspace(target)}
          className="rounded-xl border border-[var(--panel-border)] py-3 text-sm text-[var(--muted)] hover:bg-white/5 disabled:opacity-40"
        >
          ⌫
        </button>
        <button
          type="button"
          disabled={padDisabled}
          onClick={() => handleDigit('0', target)}
          className="rounded-xl border border-[var(--panel-border)] py-3 text-xl font-semibold text-[var(--text)] hover:bg-white/5 disabled:opacity-40"
        >
          0
        </button>
        <button
          type="button"
          disabled={padDisabled}
          onClick={() => void submit()}
          className="rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-40"
        >
          {mode === 'setup' ? (target === 'pin' ? 'Next' : 'Save') : 'Unlock'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h2 className="text-lg font-semibold text-[var(--text)]">
          {mode === 'setup' ? 'Set a Parent PIN' : 'Parent PIN'}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {mode === 'setup'
            ? 'Create a 4-digit PIN. You\'ll enter it when returning from Athlete View to the Parent experience.'
            : 'Enter your Parent PIN to return to the Parent experience.'}
        </p>
        {lockLeft > 0 ? (
          <p className="mt-2 text-sm text-[var(--bad)]">
            Too many wrong tries. Try again in {lockLeft} seconds.
          </p>
        ) : (
          error && <p className="mt-2 text-sm text-[var(--bad)]">{error}</p>
        )}
        <div className="mt-4">
          {mode === 'setup' ? (
            pin.length < 4 ? (
              renderPad('pin', pin, 'Choose PIN')
            ) : (
              renderPad('confirm', confirm, 'Confirm PIN')
            )
          ) : (
            renderPad('pin', pin, 'Enter PIN')
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 w-full rounded-xl border border-[var(--panel-border)] py-2.5 text-sm text-[var(--muted)]"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
