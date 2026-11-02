/**
 * Public front-door hub (build 1200). Rendered standalone at /start with NO
 * sign-in: the page Ryan links from his Instagram bio and from Acuity.
 *
 * Button order is deliberate: Start here first, then Book a lesson. Start
 * here opens the existing new-athlete intake link, which now reuses an
 * existing profile when the name plus birthday or parent phone matches one,
 * so an existing athlete never gets a duplicate from this flow.
 *
 * The three ShapeLab paths come from GET /api/share/start-links, which
 * returns the gym's long-lived study, parent Learn, and new-athlete paths.
 * No roster data ever leaves that endpoint, only paths.
 */

import { useEffect, useState } from 'react'

const ACUITY_BOOKING_URL = 'https://coachryan.as.me/schedule/1088ecb1'
const INSTAGRAM_URL = 'https://www.instagram.com/coachryanwilliams/'

type StartLinks = {
  studyPath: string
  learnPath: string
  newAthletePath: string
}

function HubButton({
  href,
  primary,
  title,
  blurb,
}: {
  href: string
  primary?: boolean
  title: string
  blurb: string
}) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noreferrer' : undefined}
      className={`block rounded-2xl border p-4 text-left ${
        primary
          ? 'border-sky-400/60 bg-sky-500 text-white'
          : 'border-white/15 bg-white/5 text-white'
      }`}
    >
      <span className="block text-base font-bold">{title}</span>
      <span
        className={`mt-0.5 block text-sm ${primary ? 'text-white/85' : 'text-white/60'}`}
      >
        {blurb}
      </span>
    </a>
  )
}

export default function PublicStartHubPage() {
  const [links, setLinks] = useState<StartLinks | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/share/start-links')
      .then((r) => r.json().catch(() => null))
      .then((d) => {
        if (cancelled) return
        if (d?.studyPath && d?.learnPath && d?.newAthletePath) {
          setLinks(d)
        } else {
          setFailed(true)
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-dvh bg-[#0a1014] px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
          ShapeLab
        </p>
        <h1 className="mt-3 text-center text-2xl font-black text-white">
          Start here
        </h1>
        <p className="mt-2 text-center text-sm text-white/60">
          New to ShapeLab? Start here first. Then book a lesson, study the
          shapes, or learn how training works.
        </p>

        {failed ? (
          <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-white/70">
            This page is not set up yet. Ask your coach for the sign-up link.
          </p>
        ) : !links ? (
          <p className="mt-6 text-center text-white/60">Loading…</p>
        ) : (
          <div className="mt-6 space-y-3">
            <HubButton
              href={links.newAthletePath}
              primary
              title="Start here"
              blurb="New athlete sign-up. If you already have a profile, Start here finds it, so no duplicate gets made."
            />
            <HubButton
              href={ACUITY_BOOKING_URL}
              title="Book a lesson"
              blurb="Private lessons with Coach Ryan at TumbleSmart in Broken Arrow."
            />
            <HubButton
              href={links.studyPath}
              title="Shape library and test"
              blurb="Study the shapes and take the shape test. No account needed."
            />
            <HubButton
              href={links.learnPath}
              title="For parents"
              blurb="The parent guide, progression levels, coaching concepts, and nutrition. No account needed."
            />
            <HubButton
              href={INSTAGRAM_URL}
              title="Instagram"
              blurb="Coach Ryan on Instagram."
            />
          </div>
        )}
      </div>
    </div>
  )
}
