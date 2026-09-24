type IconProps = { className?: string; filled?: boolean }

export function IgHomeIcon({ className, filled }: IconProps) {
  return filled ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3.2 4.5 9.4V20c0 .55.45 1 1 1h5v-6.5h3V21h5c.55 0 1-.45 1-1V9.4L12 3.2Z" />
    </svg>
  ) : (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 9.75 12 3.5l7.5 6.25V20a1.25 1.25 0 0 1-1.25 1.25H15v-7H9v7H5.75A1.25 1.25 0 0 1 4.5 20V9.75Z"
      />
    </svg>
  )
}

export function IgReelsIcon({ className, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.75} aria-hidden>
      {filled ? (
        <path d="M7 4.5h10a2.5 2.5 0 0 1 2.5 2.5v10A2.5 2.5 0 0 1 17 19.5H7A2.5 2.5 0 0 1 4.5 17V7A2.5 2.5 0 0 1 7 4.5Zm2.2 2.2 7.2 3.6-7.2 3.6V6.7Z" />
      ) : (
        <>
          <rect x="5" y="4" width="14" height="16" rx="3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m10 8.5 6 3.5-6 3.5V8.5Z" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  )
}

export function IgMessagesIcon({ className, filled }: IconProps) {
  return filled ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.25c-4.97 0-9 3.58-9 8 0 2.2 1.05 4.18 2.75 5.55L4.5 21l4.9-2.45c.82.15 1.67.23 2.6.23 4.97 0 9-3.58 9-8s-4.03-8-9-8Z" />
    </svg>
  ) : (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.25c-4.56 0-8.25 3.14-8.25 7 0 2.02.97 3.84 2.52 5.1L4.75 20.5l4.5-2.25c.75.14 1.53.22 2.35.22 4.56 0 8.25-3.14 8.25-7s-3.69-7-8.25-7Z"
      />
    </svg>
  )
}

export function IgSearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="11" cy="11" r="6.25" />
      <path strokeLinecap="round" d="m16.25 16.25 4 4" />
    </svg>
  )
}

export function IgMenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" d="M4.5 7h15M4.5 12h15M4.5 17h15" />
    </svg>
  )
}

export function IgCreateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IgHeartOutlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.5s-7.2-4.35-7.2-9.45C4.8 7.8 7.35 5.5 10.2 5.5c1.65 0 3.1.8 3.8 2.05.7-1.25 2.15-2.05 3.8-2.05 2.85 0 5.4 2.3 5.4 5.55 0 5.1-7.2 9.45-7.2 9.45Z"
      />
    </svg>
  )
}
