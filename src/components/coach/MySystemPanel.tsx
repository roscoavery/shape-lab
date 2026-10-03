/**
 * MySystemPanel — a coach's home for their coaching system: the explicit
 * system switcher, their cards with per-card visibility, adopting cards,
 * map visibility, follows, and (for Ryan) edit grants on his system.
 * Coaches without a system get a clear entry into the setup wizard.
 */

import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { isCoachProfile } from '../../lib/profileRole'
import { searchSkills } from '../../lib/skillRegistry'
import { deleteSkill, drillsForSkill } from '../../lib/skillPaths'
import {
  RYAN_SYSTEM_ID,
  VISIBILITY_BLURBS,
  VISIBILITY_LABELS,
  adoptSkill,
  canEditSystem,
  cardVisibility,
  deleteSystem,
  followSystem,
  getActiveSystemId,
  grantEdit,
  hydrateCoachSystems,
  listSystems,
  mySystemForCoach,
  revokeEdit,
  setCardVisibility,
  setMapVisibility,
  subscribeActiveSystem,
  subscribeCoachSystems,
  systemSkillCards,
  unfollowSystem,
  viewerFromAthlete,
  type CoachSystem,
  type SystemVisibility,
} from '../../lib/coachSystems'
import { SystemSwitcher } from './SystemSwitcher'
import { TourOfferButton } from '../tour/TourOfferButton'
import { SYSTEM_TOUR } from '../../config/surfaceTours'
import type { TourStep } from '../homework/GlowTour'

function useSystems() {
  const [, setTick] = useState(0)
  useEffect(() => {
    void hydrateCoachSystems()
    const bump = () => setTick((n) => n + 1)
    const off1 = subscribeCoachSystems(bump)
    const off2 = subscribeActiveSystem(bump)
    return () => {
      off1()
      off2()
    }
  }, [])
}

export function MySystemPanel({
  signedIn,
  athletes,
  ryanEdit,
  onOpenWizard,
  onOpenBuilder,
  onOpenTour,
}: {
  signedIn: Athlete | null
  athletes: Athlete[]
  ryanEdit: boolean
  onOpenWizard: () => void
  onOpenBuilder: (skillId: string, unscoped: boolean) => void
  onOpenTour?: (steps: TourStep[]) => void
}) {
  useSystems()
  const [query, setQuery] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const viewer = viewerFromAthlete(signedIn)
  const systems = listSystems()
  const active = systems.find((s) => s.id === getActiveSystemId()) ?? systems[0] ?? null
  const mine = signedIn ? mySystemForCoach(signedIn.id) : null
  const isCoach = signedIn ? isCoachProfile(signedIn) : false

  const coachProfiles = useMemo(() => athletes.filter((a) => isCoachProfile(a)), [athletes])
  const adoptHits = useMemo(() => (query.trim() ? searchSkills(query.trim(), 10) : []), [query])

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 text-center">
        <p className="text-sm text-white/60">Pick a profile to use coaching systems.</p>
      </div>
    )
  }

  const editable = active ? canEditSystem(active, viewer) : false
  const isMine = Boolean(active && mine && active.id === mine.id)
  const myCards = mine ? systemSkillCards(mine.ownerCoachId ?? '') : []
  const activeCards = active?.ownerCoachId ? systemSkillCards(active.ownerCoachId) : []
  const following = Boolean(active && viewer && active.followers.includes(viewer.id))

  return (
    <div id="tour-system-builder" className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
      <TourOfferButton onTakeTour={() => onOpenTour?.(SYSTEM_TOUR)} label="✨ Tour my system" />
      <SystemSwitcher signedIn={signedIn} />

      {!mine && isCoach && (
        <div className="rounded-2xl border border-[#6ec8d6]/30 bg-[#6ec8d6]/5 p-5 text-center">
          <h2 className="text-xl font-bold">Build your coaching system</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/65">
            Your own skill cards, drills, and maps — separate from everyone else's. The guided setup walks
            you through it in five steps.
          </p>
          <button
            type="button"
            onClick={onOpenWizard}
            className="mt-4 rounded-xl bg-[#6ec8d6] px-5 py-3 text-sm font-black text-black"
          >
            Start your coaching system
          </button>
        </div>
      )}

      {active && (
        <SystemHeader
          system={active}
          editable={editable}
          isMine={isMine}
          ryanEdit={ryanEdit}
          following={following}
          viewerId={viewer?.id ?? null}
          onFollow={() => viewer && followSystem(active.id, viewer.id)}
          onUnfollow={() => viewer && unfollowSystem(active.id, viewer.id)}
          onMapVisibility={(v) => setMapVisibility(active.id, v)}
        />
      )}

      {active && isMine && (
        <section id="tour-system-skills" className="flex flex-col gap-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-white/60">Your cards</h3>
          {myCards.length === 0 && (
            <p className="text-xs text-white/50">
              No cards here yet. Adopt one below, or run the setup wizard.
            </p>
          )}
          {myCards.map((card) => {
            const drills = drillsForSkill(card.id)
            return (
              <div
                key={card.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{card.name}</p>
                  <p className="text-xs text-white/45">
                    {drills.length} drill{drills.length === 1 ? '' : 's'} ·{' '}
                    {VISIBILITY_LABELS[cardVisibility(active, card.id)]}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <select
                    value={cardVisibility(active, card.id)}
                    onChange={(e) => setCardVisibility(active.id, card.id, e.target.value as SystemVisibility)}
                    className="rounded-lg bg-white/10 px-2 py-1.5 text-xs"
                    aria-label={`Visibility for ${card.name}`}
                  >
                    {(Object.keys(VISIBILITY_LABELS) as SystemVisibility[]).map((v) => (
                      <option key={v} value={v}>
                        {VISIBILITY_LABELS[v]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onOpenBuilder(card.id, false)}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete "${card.name}" from your system? This can't be undone.`)) {
                        deleteSkill(card.id)
                      }
                    }}
                    className="rounded-lg bg-white/10 px-2 py-1.5 text-xs text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {active && active.id === RYAN_SYSTEM_ID && editable && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-white/60">Edit the default system</h3>
          {!isMine && (
            <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
              Ryan granted you edit access — changes here edit the default system directly.
            </p>
          )}
          <p className="text-xs text-white/45">Search a card, then edit it in the builder.</p>
          <RyanCardEditor onOpenBuilder={(id) => onOpenBuilder(id, true)} />
        </section>
      )}

      {active && !isMine && !(active.id === RYAN_SYSTEM_ID && editable) && active.ownerCoachId && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-white/60">
            {active.ownerName}'s cards
          </h3>
          <p className="text-xs text-white/45">
            You're viewing {active.ownerName}'s system. Adopt a card to get your own copy — your edits never
            touch theirs.
          </p>
          {activeCards.slice(0, 12).map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
            >
              <p className="truncate text-sm font-semibold">{card.name}</p>
              <button
                type="button"
                disabled={!signedIn}
                onClick={() => {
                  const row = adoptSkill(card.id, signedIn.id)
                  if (row) onOpenBuilder(row.id, false)
                }}
                className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
              >
                Adopt
              </button>
            </div>
          ))}
        </section>
      )}

      {isMine && (
        <section id="tour-system-share" className="flex flex-col gap-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-white/60">Adopt a card</h3>
          <p className="text-xs text-white/45">
            Copy any card into your system as a starting point. Later edits on either side never ripple.
          </p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skills to adopt…"
            className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm"
          />
          {query.trim() &&
            adoptHits.map((hit) => (
              <div
                key={hit.skill.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
              >
                <p className="truncate text-sm font-semibold">{hit.skill.name}</p>
                <button
                  type="button"
                  onClick={() => {
                    const row = adoptSkill(hit.skill.id, signedIn.id)
                    if (row) {
                      setQuery('')
                      onOpenBuilder(row.id, false)
                    }
                  }}
                  className="shrink-0 rounded-lg bg-[#6ec8d6] px-3 py-1.5 text-xs font-black text-black"
                >
                  Adopt
                </button>
              </div>
            ))}
        </section>
      )}

      {active && active.id === RYAN_SYSTEM_ID && ryanEdit && (
        <GrantManager system={active} coachProfiles={coachProfiles} />
      )}

      {mine && (
        <section className="rounded-xl border border-white/10 bg-black/25 p-3">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-xs font-semibold text-red-300"
            >
              Delete my system…
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-white/70">
                Delete "{mine.name}"? Your cards stay in the skill library, but the system record is gone for
                good.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    deleteSystem(mine.id)
                    setConfirmDelete(false)
                  }}
                  className="rounded-lg bg-red-500/20 px-3 py-2 text-xs font-bold text-red-200"
                >
                  Yes, delete it
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold"
                >
                  Keep it
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function RyanCardEditor({ onOpenBuilder }: { onOpenBuilder: (id: string) => void }) {
  const [q, setQ] = useState('')
  const hits = useMemo(() => (q.trim() ? searchSkills(q.trim(), 8) : []), [q])
  return (
    <div className="flex flex-col gap-1.5">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search cards to edit…"
        className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm"
      />
      {q.trim() &&
        hits.map((hit) => (
          <div
            key={hit.skill.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
          >
            <p className="truncate text-sm font-semibold">{hit.skill.name}</p>
            <button
              type="button"
              onClick={() => onOpenBuilder(hit.skill.id)}
              className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold"
            >
              Edit
            </button>
          </div>
        ))}
    </div>
  )
}

function SystemHeader({
  system,
  editable,
  isMine,
  ryanEdit,
  following,
  viewerId,
  onFollow,
  onUnfollow,
  onMapVisibility,
}: {
  system: CoachSystem
  editable: boolean
  isMine: boolean
  ryanEdit: boolean
  following: boolean
  viewerId: string | null
  onFollow: () => void
  onUnfollow: () => void
  onMapVisibility: (v: SystemVisibility) => void
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold">
            {system.name} {system.locked && <span title="Locked">🔒</span>}
          </h2>
          <p className="text-xs text-white/50">
            @{system.handle} · by {system.ownerName} · {VISIBILITY_LABELS[system.mapVisibility]}
            {system.mapVisibility !== 'public' && (
              <span className="text-white/35"> — {VISIBILITY_BLURBS[system.mapVisibility]}</span>
            )}
          </p>
          {system.tagline && <p className="mt-1 text-sm text-white/65">{system.tagline}</p>}
        </div>
        {!isMine && system.id !== RYAN_SYSTEM_ID && viewerId && (
          <button
            type="button"
            onClick={following ? onUnfollow : onFollow}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${
              following ? 'bg-white/10 text-white' : 'bg-[#6ec8d6] text-black'
            }`}
          >
            {following ? 'Following ✓' : 'Follow'}
          </button>
        )}
      </div>
      {(isMine || (system.id === RYAN_SYSTEM_ID && ryanEdit)) && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="mb-2 text-xs font-semibold text-white/60">Who can see this map?</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(VISIBILITY_LABELS) as SystemVisibility[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onMapVisibility(v)}
                aria-pressed={system.mapVisibility === v}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  system.mapVisibility === v ? 'bg-[#6ec8d6] text-black' : 'bg-white/10 text-white/75'
                }`}
              >
                {VISIBILITY_LABELS[v]}
              </button>
            ))}
          </div>
        </div>
      )}
      {!editable && !isMine && system.id === RYAN_SYSTEM_ID && (
        <p className="mt-3 border-t border-white/10 pt-3 text-xs text-white/45">
          This is the default system. Adopt any card to make it yours.
        </p>
      )}
    </section>
  )
}

function GrantManager({ system, coachProfiles }: { system: CoachSystem; coachProfiles: Athlete[] }) {
  const [adding, setAdding] = useState(false)
  const candidates = coachProfiles.filter((c) => !system.editGrants.includes(c.id) && c.id !== system.ownerCoachId)
  return (
    <section className="rounded-xl border border-white/10 bg-black/25 p-3">
      <h3 className="text-sm font-black uppercase tracking-wider text-white/60">Coaches who can edit</h3>
      <p className="mt-1 text-xs text-white/45">
        Your system is locked by default. Granting lets another coach edit your cards directly.
      </p>
      {system.editGrants.length === 0 && !adding && (
        <p className="mt-2 text-xs text-white/50">Nobody granted yet.</p>
      )}
      <ul className="mt-2 flex flex-col gap-1.5">
        {system.editGrants.map((id) => {
          const coach = coachProfiles.find((c) => c.id === id)
          return (
            <li key={id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span className="text-sm">{coach?.name ?? 'Unknown coach'}</span>
              <button
                type="button"
                onClick={() => revokeEdit(system.id, id)}
                className="rounded-lg bg-white/10 px-2 py-1 text-xs text-red-300"
              >
                Revoke
              </button>
            </li>
          )
        })}
      </ul>
      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold"
        >
          + Grant a coach
        </button>
      ) : (
        <div className="mt-2 flex flex-col gap-1.5">
          {candidates.length === 0 && <p className="text-xs text-white/50">No other coaches to grant.</p>}
          {candidates.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                grantEdit(system.id, c.id)
                setAdding(false)
              }}
              className="rounded-lg bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10"
            >
              {c.name}
            </button>
          ))}
          <button type="button" onClick={() => setAdding(false)} className="text-left text-xs text-white/50 underline">
            Cancel
          </button>
        </div>
      )}
    </section>
  )
}
