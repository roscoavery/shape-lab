import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import type { AppTab } from '../../lib/storage'
import type { AuthSessionUser } from '../../lib/authSession'
import { listGymAccounts, type PublicAccount } from '../../lib/accountAdmin'
import { sessionIsAdmin } from '../../lib/authSession'
import { saveDeskPreview, type DeskPreview } from '../../lib/deskPreview'

type Props = {
  user: AuthSessionUser
  athletes: Athlete[]
  onGo: (tab: AppTab) => void
}

function matchTestAccount(accounts: PublicAccount[], pattern: RegExp): PublicAccount | undefined {
  return accounts.find((a) => pattern.test(a.email) || pattern.test(a.displayName))
}

export function MobileAccountSwitcher({ user, athletes, onGo }: Props) {
  const [open, setOpen] = useState(false)
  const [accounts, setAccounts] = useState<PublicAccount[]>([])
  const admin = sessionIsAdmin(user)

  useEffect(() => {
    if (!admin) return
    void listGymAccounts().then(setAccounts).catch(() => {})
  }, [admin])

  const testAthleteA = useMemo(
    () =>
      athletes.find((a) => /test athlete a/i.test(a.name)) ??
      athletes.find((a) => a.id.includes('test_a')),
    [athletes],
  )
  const testAthleteB = useMemo(
    () =>
      athletes.find((a) => /test athlete b/i.test(a.name)) ??
      athletes.find((a) => a.id.includes('test_b')),
    [athletes],
  )
  const testParentA = matchTestAccount(accounts, /test parent a|parent.*test a/i)
  const testParentB = matchTestAccount(accounts, /test parent b|parent.*test b/i)

  const previewAs = (desk: DeskPreview) => {
    saveDeskPreview(desk)
    setOpen(false)
    onGo('today')
    window.location.reload()
  }

  const rows: { label: string; hint?: string; action: () => void }[] = [
    {
      label: user.displayName || user.email,
      hint: `${user.role} · this login`,
      action: () => {
        saveDeskPreview('home')
        setOpen(false)
      },
    },
  ]

  if (admin) {
    rows.push(
      { label: 'Coach desk view', action: () => previewAs('coach') },
      { label: 'Parent desk view', action: () => previewAs('parent') },
      { label: 'Athlete desk view', action: () => previewAs('athlete') },
      { label: 'Gym owner view', action: () => previewAs('gymOwner') },
    )
    if (testAthleteA) {
      rows.push({
        label: testAthleteA.name,
        hint: 'Test athlete A profile',
        action: () => {
          saveDeskPreview('athlete')
          setOpen(false)
          onGo('history')
        },
      })
    }
    if (testAthleteB) {
      rows.push({
        label: testAthleteB.name,
        hint: 'Test athlete B profile',
        action: () => {
          saveDeskPreview('athlete')
          setOpen(false)
          onGo('history')
        },
      })
    }
    if (testParentA) {
      rows.push({
        label: testParentA.displayName,
        hint: 'Test parent A account',
        action: () => onGo('accounts'),
      })
    }
    if (testParentB) {
      rows.push({
        label: testParentB.displayName,
        hint: 'Test parent B account',
        action: () => onGo('accounts'),
      })
    }
    rows.push({
      label: 'All gym accounts',
      hint: `${accounts.length} saved logins`,
      action: () => {
        setOpen(false)
        onGo('accounts')
      },
    })
  }

  return (
    <>
      <button
        type="button"
        className="mx-auto flex max-w-[14rem] items-center justify-center gap-1 truncate text-sm font-semibold"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">{user.displayName || 'Account'}</span>
        <span className="text-[10px] text-[var(--muted)]">▾</span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[85] flex items-start justify-center bg-black/50 pt-16 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#121820] p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Switch view
            </p>
            <ul className="max-h-[60vh] overflow-y-auto">
              {rows.map((row) => (
                <li key={row.label}>
                  <button
                    type="button"
                    className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-white/5"
                    onClick={row.action}
                  >
                    <p className="text-sm font-medium">{row.label}</p>
                    {row.hint && <p className="text-xs text-[var(--muted)]">{row.hint}</p>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
