/**
 * The 4 Levels of Progression, as an in-app infographic.
 * Built from Ryan's 4-levels reference (docs/4-levels-reference.png):
 * color-coded levels, labeled blocks, no walls of text.
 */
import { useState } from 'react'
import { PROGRESSION_BLOCKS, PROGRESSION_LEVELS } from '../../config/progressionLevels'

function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      className="text-[11px] font-extrabold uppercase tracking-widest opacity-70"
      style={color ? { color } : undefined}
    >
      {children}
    </div>
  )
}

function LevelCard({ level }: { level: (typeof PROGRESSION_LEVELS)[number] }) {
  const [open, setOpen] = useState(level.n === 1)
  return (
    <div
      className="overflow-hidden rounded-2xl border bg-[var(--panel)]"
      style={{ borderColor: level.color + '55' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-black text-white"
          style={{ background: level.color }}
        >
          {level.n}
        </span>
        <span>
          <span className="block text-[10px] font-bold uppercase tracking-widest opacity-60">
            Level {level.n}
          </span>
          <span className="block text-base font-extrabold" style={{ color: level.color }}>
            {level.name}
          </span>
        </span>
        <span className="ml-auto text-lg opacity-50">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="space-y-4 px-4 pb-4 text-sm leading-relaxed">
          <p className="opacity-90">{level.tagline}</p>
          <div>
            <Label color={level.color}>What it looks like</Label>
            <p className="mt-1 text-[13px] opacity-80">{level.looksLike}</p>
          </div>
          {level.bridge && (
            <div
              className="rounded-xl border p-3"
              style={{ borderColor: level.color + '66', background: level.color + '11' }}
            >
              <p className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: level.color }}>
                {level.bridge.title}
              </p>
              <p className="mt-1 text-[13px] opacity-80">{level.bridge.body}</p>
            </div>
          )}
          {level.masteryNote && (
            <div
              className="rounded-xl border p-3"
              style={{ borderColor: level.color + '66', background: level.color + '11' }}
            >
              <p className="text-[13px] font-semibold" style={{ color: level.color }}>
                {level.masteryNote}
              </p>
            </div>
          )}
          <div>
            <Label color={level.color}>Athlete experience</Label>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] opacity-80">
              {level.athleteExperience.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <Label color={level.color}>Coach focus</Label>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] opacity-80">
              {level.coachFocus.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function BlockCard({ block }: { block: (typeof PROGRESSION_BLOCKS)[number] }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="overflow-hidden rounded-2xl border bg-[var(--panel)]"
      style={{ borderColor: block.color + '55' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full p-4 text-left"
      >
        <span className="text-base font-extrabold" style={{ color: block.color }}>
          {block.name}
        </span>
        <span className="mt-0.5 block text-[11px] font-bold uppercase tracking-widest opacity-60">
          {block.when}
        </span>
        <span className="mt-2 block text-[13px] opacity-80">
          <span className="font-semibold">What it is: </span>
          {block.whatItIs}
        </span>
        <span className="mt-1 block text-lg opacity-50">{open ? '− show less' : '+ details'}</span>
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4 text-[13px] leading-relaxed opacity-90">
          {block.commonReasons.length > 0 && (
            <div>
              <Label color={block.color}>Common reasons</Label>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 opacity-80">
                {block.commonReasons.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <Label color={block.color}>When it shows up</Label>
            <p className="mt-1 opacity-80">{block.whenItShowsUp}</p>
          </div>
          <div>
            <Label color={block.color}>How it looks</Label>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 opacity-80">
              {block.howItLooks.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <Label color={block.color}>How to help</Label>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 opacity-80">
              {block.howToHelp.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <p
            className="rounded-xl border p-3 font-semibold"
            style={{ borderColor: block.color + '66', background: block.color + '11', color: block.color }}
          >
            Takeaway: {block.takeaway}
          </p>
        </div>
      )}
    </div>
  )
}

export function ProgressionLevels() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="text-center">
        <h2 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">
          The 4 levels of progression for any tumbling skill
        </h2>
        <p className="mt-2 text-sm opacity-70">
          Progress is not linear. Athletes may move forward, stay the same, or take steps back.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PROGRESSION_LEVELS.map((level) => (
          <LevelCard key={level.n} level={level} />
        ))}
      </div>

      <div className="mt-10 rounded-2xl bg-[#0e1c33] p-4 text-center text-white">
        <h3 className="text-lg font-black uppercase tracking-wide">
          Understanding fear and blocks in progression
        </h3>
        <p className="mt-1 text-[13px] opacity-80">
          Fear is a normal part of growth. The key is knowing the difference between
          normal fear and when it becomes a block.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {PROGRESSION_BLOCKS.map((block) => (
          <BlockCard key={block.name} block={block} />
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-center">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--accent)]">
          The foundation for overcoming any block
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed opacity-90">
          Unconditional support from coaches and parents and removing pressure is always
          helpful. Athletes thrive when they feel safe, supported, and valued for who
          they are not just what they perform. With the right support, every athlete
          can get back to doing what they love.
        </p>
      </div>

      <div className="mt-4 rounded-2xl bg-[#0e1c33] p-5 text-center text-white">
        <p className="text-lg font-black uppercase tracking-wide">
          Every athlete&apos;s journey is unique
        </p>
        <p className="mx-auto mt-1 max-w-2xl text-[13px] opacity-80">
          Managing fear can be an ongoing journey with ups and downs. Fear can be an
          obstacle athletes get better at hurdling. Some days the obstacle can feel
          bigger than others.
        </p>
      </div>
    </div>
  )
}
