import { useMemo, useState } from 'react'
import {
  daysInMonth,
  getAgeFromDateOfBirth,
  isoDateOfBirth,
  splitDateOfBirth,
} from '../../lib/age'

const MONTHS = [
  { n: 1, label: 'Jan' },
  { n: 2, label: 'Feb' },
  { n: 3, label: 'Mar' },
  { n: 4, label: 'Apr' },
  { n: 5, label: 'May' },
  { n: 6, label: 'Jun' },
  { n: 7, label: 'Jul' },
  { n: 8, label: 'Aug' },
  { n: 9, label: 'Sep' },
  { n: 10, label: 'Oct' },
  { n: 11, label: 'Nov' },
  { n: 12, label: 'Dec' },
] as const

const YEAR_PAGE = 12

type Props = {
  value?: string
  onChange: (iso: string) => void
  size?: 'station' | 'compact'
}

function yearWindow(thisYear: number, page: number): number[] {
  const newest = thisYear - 3 - page * YEAR_PAGE
  return Array.from({ length: YEAR_PAGE }, (_, i) => newest - i).filter((y) => y >= 1900)
}

/**
 * Month / day / year tap grids — faster on iPad than the native date spinner.
 */
export function BirthdayQuickPick({ value, onChange, size = 'compact' }: Props) {
  const parsed = splitDateOfBirth(value)
  const thisYear = new Date().getFullYear()
  const [month, setMonth] = useState(parsed?.month ?? 0)
  const [day, setDay] = useState(parsed?.day ?? 0)
  const [year, setYear] = useState(parsed?.year ?? 0)
  const [page, setPage] = useState(0)

  const years = useMemo(() => yearWindow(thisYear, page), [thisYear, page])
  const maxDay = daysInMonth(year || 2016, month || 1)
  const iso = month && day && year ? isoDateOfBirth(year, month, Math.min(day, maxDay)) : null
  const age = getAgeFromDateOfBirth(iso)
  const station = size === 'station'
  const cell = station
    ? 'h-14 rounded-2xl text-base font-bold'
    : 'h-11 rounded-xl text-sm font-semibold'

  const emit = (nextMonth: number, nextDay: number, nextYear: number) => {
    setMonth(nextMonth)
    setDay(nextDay)
    setYear(nextYear)
    if (!nextMonth || !nextDay || !nextYear) {
      onChange('')
      return
    }
    const nextIso = isoDateOfBirth(nextYear, nextMonth, nextDay)
    onChange(nextIso ?? '')
  }

  const pickMonth = (n: number) => {
    const cap = daysInMonth(year || 2016, n)
    emit(n, day && day > cap ? cap : day, year)
  }
  const pickDay = (n: number) => emit(month, n, year)
  const pickYear = (n: number) => {
    const cap = daysInMonth(n, month || 1)
    emit(month, day && day > cap ? cap : day, n)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Month
        </p>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {MONTHS.map((m) => (
            <button
              key={m.n}
              type="button"
              onClick={() => pickMonth(m.n)}
              className={`${cell} ${
                month === m.n
                  ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                  : 'bg-white/8 text-[var(--text)]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Day
        </p>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => pickDay(n)}
              className={`${station ? 'h-12 rounded-xl text-sm font-bold' : 'h-10 rounded-lg text-sm font-semibold'} ${
                day === n
                  ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                  : 'bg-white/8 text-[var(--text)]'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Year
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold disabled:opacity-30"
            >
              Newer
            </button>
            <button
              type="button"
              disabled={years[years.length - 1]! <= 1900}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold disabled:opacity-30"
            >
              Older
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => pickYear(y)}
              className={`${cell} ${
                year === y
                  ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                  : 'bg-white/8 text-[var(--text)]'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
      {iso ? (
        <p className="text-sm font-semibold text-[var(--accent)]">
          {iso}
          {age != null ? ` · age ${age}` : ''}
        </p>
      ) : (
        <p className="text-sm text-[var(--muted)]">Tap month, day, then year. Skip if the line is moving.</p>
      )}
    </div>
  )
}
