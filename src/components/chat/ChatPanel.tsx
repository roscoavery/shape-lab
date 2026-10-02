/**
 * Ask — the in-app chatbot.
 *
 * Answers ONLY from Ryan's own content (interview answers, skill cards,
 * drills, spotting system, technique evidence, reference library, FAQ
 * answers he wrote). Extractive: verbatim quotes with deep links. It never
 * invents coaching advice. Unanswerable questions go to the FAQ inbox.
 *
 * It also works as a co-builder: "add this drill to my roundoff path"
 * attaches a drill to a skill's path through the same flow as the builder.
 */

import { useEffect, useRef, useState } from 'react'
import type { AppTab } from '../../lib/storage'
import { stashMobileSearchJump } from '../../lib/mobileSearchNav'
import {
  buildCorpus,
  planAnswer,
  synthesizeLead,
  prerequisitesExtra,
  excerptFor,
  parseBuilderCommand,
  isThisDrill,
  findDrills,
  findSkills,
  addDrillToSkill,
  type CorpusDoc,
  type ChatLink,
  type SkillCardSection,
} from '../../lib/chatBrain'
import { listFaq, addFaqQuestion, answerFaq, removeFaq, type FaqItem } from '../../lib/chatFaq'
import { createId } from '../../lib/storage'
import type { SessionRole } from '../../lib/authSession'

type Quote = { title: string; excerpt: string; link?: ChatLink; linkLabel: string }

type Action =
  | { kind: 'open'; label: string; link: ChatLink }
  | { kind: 'faq'; label: string; question: string }
  | { kind: 'send'; label: string; text: string }
  | { kind: 'confirm-add'; label: string; drillLabel: string; skillId: string; skillName: string }

type ChatMsg = {
  id: string
  role: 'user' | 'bot'
  text: string
  quotes?: Quote[]
  actions?: Action[]
}

const TAB_LABELS: Partial<Record<AppTab, string>> = {
  learn: 'Shapes & skills',
  drills: 'Drill library',
  spotting: 'Spotting',
  scroll: 'Reference scroll',
  coachlib: 'Coach library',
}

const SECTION_LABELS: Record<SkillCardSection, string> = {
  needs: 'Needs',
  canbend: 'Can bend',
  ask: 'Ask your coach',
  shapes: 'Shapes',
  proof: 'References',
  ryan: "Ryan's note",
  breakdown: 'Video breakdown',
  path: 'Path',
}

function linkLabel(link: ChatLink, title: string): string {
  if (link.kind === 'skill') {
    const base = title.split(' — ')[0]
    return link.section ? `Open ${base} · ${SECTION_LABELS[link.section]}` : `Open ${base}`
  }
  if (link.kind === 'clip') return 'Open video'
  return TAB_LABELS[link.tab] ?? 'Open'
}

type SuggestionBucket = 'coach' | 'athlete' | 'parent'

/** Starter prompts tailored to who's asking — an athlete shouldn't get spotting prompts. */
const SUGGESTIONS: Record<SuggestionBucket, string[]> = {
  coach: [
    'How do you spot a back tuck?',
    'What do you tell parents about basics?',
    'Add candlestick drill to my roundoff path',
  ],
  athlete: [
    'What drills help my back handspring?',
    'How do I stop bending my knees in my roundoff?',
    'What should I work on for my back tuck?',
  ],
  parent: [
    'Why is my athlete still working on basics?',
    'How can I help my kid at home?',
    'What does progress look like?',
  ],
}

const INTRO_COPY: Record<SuggestionBucket, string> = {
  coach: 'Ask about technique, spotting, or drills — or tell me to add a drill to a skill path, like "add candlestick drill to my roundoff path".',
  athlete: 'Ask about technique or drills — like "what drills help my back handspring?"',
  parent: "Ask about your athlete's training, progress, or how to support them at home.",
}

const INPUT_PLACEHOLDER: Record<SuggestionBucket, string> = {
  coach: 'Ask or tell me to add a drill…',
  athlete: 'Ask about technique or drills…',
  parent: "Ask about your athlete's training…",
}

/** Collapse every signed-in role (and signed-out) onto the three suggestion sets. */
function suggestionBucket(role: SessionRole | undefined): SuggestionBucket {
  if (role === 'athlete') return 'athlete'
  if (role === 'parent') return 'parent'
  return 'coach'
}

export function ChatPanel({
  onOpenTab,
  canEditFaq,
  bare = false,
  viewerRole,
}: {
  onOpenTab: (tab: AppTab) => void
  canEditFaq: boolean
  /** Hide the title header when embedded inside another page (e.g. the mobile Search page). */
  bare?: boolean
  /** Who's asking — picks the suggestion set. Follows athlete-view previews, not just the login. */
  viewerRole?: SessionRole
}) {
  const bucket = suggestionBucket(viewerRole)
  const [docs, setDocs] = useState<CorpusDoc[] | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [view, setView] = useState<'chat' | 'inbox'>('chat')
  const [faq, setFaq] = useState<FaqItem[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [showAnswered, setShowAnswered] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    buildCorpus().then((d) => {
      if (!cancelled) setDocs(d)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setFaq(listFaq())
  }, [view])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const push = (msg: Omit<ChatMsg, 'id'>) =>
    setMessages((prev) => [...prev, { ...msg, id: createId('msg') }])

  function followLink(link: ChatLink) {
    if (link.kind === 'skill') {
      stashMobileSearchJump({ kind: 'skill', skillId: link.skillId, section: link.section })
      onOpenTab('learn')
    } else if (link.kind === 'clip') {
      stashMobileSearchJump({ kind: 'clip', url: link.url })
      onOpenTab('scroll')
    } else {
      onOpenTab(link.tab)
    }
  }

  function runAction(action: Action) {
    if (action.kind === 'open') {
      followLink(action.link)
      return
    }
    if (action.kind === 'faq') {
      const item = addFaqQuestion(action.question)
      push({
        role: 'bot',
        text: item
          ? 'Sent to the FAQ inbox. Ryan will write an answer there, and then I will know it too.'
          : 'That question is already in the FAQ inbox.',
      })
      return
    }
    if (action.kind === 'send') {
      void send(action.text)
      return
    }
    if (action.kind === 'confirm-add') {
      const created = addDrillToSkill(action.skillId, action.drillLabel)
      void created
      push({
        role: 'bot',
        text: `Done. "${action.drillLabel}" is now on the ${action.skillName} path.`,
        actions: [
          {
            kind: 'open',
            label: `Open ${action.skillName}`,
            link: { kind: 'skill', skillId: action.skillId },
          },
        ],
      })
    }
  }

  async function send(raw: string) {
    const text = raw.trim()
    if (!text || !docs) return
    push({ role: 'user', text })
    setInput('')

    const cmd = parseBuilderCommand(text)
    if (cmd) {
      handleBuilderCommand(cmd.drillQuery, cmd.skillQuery)
      return
    }

    const plan = planAnswer(text, docs)
    if (!plan) {
      push({
        role: 'bot',
        text: "I can't answer that from Ryan's content. I only quote what he's actually written or recorded, and I don't have anything on this.",
        actions: [{ kind: 'faq', label: 'Send to FAQ inbox', question: text }],
      })
      return
    }
    const quotes: Quote[] = plan.scored.map(({ doc }) => ({
      title: doc.title,
      excerpt: excerptFor(doc, text),
      link: doc.link,
      linkLabel: doc.link ? linkLabel(doc.link, doc.title) : '',
    }))
    const extra = prerequisitesExtra(plan)
    if (extra) {
      quotes.push({
        title: extra.title,
        excerpt: extra.text,
        link: extra.link,
        linkLabel: extra.linkLabel,
      })
    }
    push({
      role: 'bot',
      text: synthesizeLead(plan),
      quotes,
      actions: [{ kind: 'faq', label: 'Not quite it? Send to FAQ inbox', question: text }],
    })
  }

  function handleBuilderCommand(drillQuery: string, skillQuery: string) {
    if (isThisDrill(drillQuery)) {
      push({
        role: 'bot',
        text: 'Which drill? Name it, like: add candlestick drill to back tuck.',
      })
      return
    }
    const drills = findDrills(drillQuery)
    const skills = findSkills(skillQuery)
    if (drills.length === 0) {
      push({
        role: 'bot',
        text: `I can't find a drill called "${drillQuery}" in the drill library.`,
        actions: [{ kind: 'open', label: 'Open Drill library', link: { kind: 'tab', tab: 'drills' } }],
      })
      return
    }
    if (skills.length === 0) {
      push({
        role: 'bot',
        text: `I can't find a skill called "${skillQuery}".`,
        actions: [{ kind: 'open', label: 'Open Shapes & skills', link: { kind: 'tab', tab: 'learn' } }],
      })
      return
    }
    if (drills.length > 1) {
      push({
        role: 'bot',
        text: 'Which drill did you mean?',
        actions: drills.slice(0, 4).map((d) => ({
          kind: 'send' as const,
          label: d.title,
          text: `add ${d.title} drill to ${skillQuery}`,
        })),
      })
      return
    }
    if (skills.length > 1) {
      push({
        role: 'bot',
        text: 'Which skill did you mean?',
        actions: skills.slice(0, 4).map((s) => ({
          kind: 'send' as const,
          label: s.name,
          text: `add ${drills[0].title} drill to ${s.name}`,
        })),
      })
      return
    }
    const drill = drills[0]
    const skill = skills[0]
    push({
      role: 'bot',
      text: `Add "${drill.title}" to the ${skill.name} path?`,
      actions: [
        {
          kind: 'confirm-add',
          label: `Add to ${skill.name}`,
          drillLabel: drill.title,
          skillId: skill.id,
          skillName: skill.name,
        },
      ],
    })
  }

  async function saveFaqAnswer(id: string) {
    const draft = (drafts[id] ?? '').trim()
    if (!draft) return
    if (!answerFaq(id, draft)) return
    setFaq(listFaq())
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    const rebuilt = await buildCorpus()
    setDocs(rebuilt)
  }

  const openFaq = faq.filter((f) => f.status === 'open')
  const answeredFaq = faq.filter((f) => f.status === 'answered')

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-3 pb-16">
      {(!bare || canEditFaq) && (
        <div className={`flex items-start gap-2 ${bare ? 'justify-end' : 'justify-between'}`}>
          {!bare && (
            <div>
              <h1 className="text-2xl font-bold">Ask</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Answers from Ryan's own content, quoted word for word. I never make up coaching advice.
              </p>
            </div>
          )}
        {canEditFaq && (
          <div className="flex shrink-0 gap-1 rounded-xl bg-[#0d1218] p-1">
            <button
              type="button"
              onClick={() => setView('chat')}
              className={`rounded-lg px-3 py-1.5 text-sm ${view === 'chat' ? 'bg-[var(--panel)] font-semibold' : 'text-[var(--muted)]'}`}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setView('inbox')}
              className={`rounded-lg px-3 py-1.5 text-sm ${view === 'inbox' ? 'bg-[var(--panel)] font-semibold' : 'text-[var(--muted)]'}`}
            >
              FAQ inbox{openFaq.length > 0 ? ` (${openFaq.length})` : ''}
            </button>
          </div>
        )}
        </div>
      )}

      {view === 'inbox' && canEditFaq ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            Questions the chat couldn't answer. Write a clear answer and the chat learns it.
          </p>
          {openFaq.length === 0 && answeredFaq.length === 0 ? (
            <p className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
              Inbox is empty. Unanswered questions from the chat land here.
            </p>
          ) : null}
          {openFaq.map((f) => (
            <div key={f.id} className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
              <p className="text-sm font-bold">{f.question}</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {new Date(f.createdAt).toLocaleDateString()}
              </p>
              <textarea
                value={drafts[f.id] ?? ''}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [f.id]: e.target.value }))}
                placeholder="Write the answer in your own words…"
                rows={3}
                className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => void saveFaqAnswer(f.id)}
                  disabled={!(drafts[f.id] ?? '').trim()}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
                >
                  Save answer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeFaq(f.id)
                    setFaq(listFaq())
                  }}
                  className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm text-[var(--muted)]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
          {answeredFaq.length > 0 ? (
            <div>
              <button
                type="button"
                onClick={() => setShowAnswered((s) => !s)}
                className="text-sm font-bold text-[var(--accent)]"
              >
                {showAnswered ? '▾' : '▸'} Answered ({answeredFaq.length})
              </button>
              {showAnswered ? (
                <div className="mt-2 space-y-2">
                  {answeredFaq.map((f) => (
                    <div key={f.id} className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
                      <p className="text-sm font-bold">{f.question}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{f.answer}</p>
                      <button
                        type="button"
                        onClick={() => {
                          removeFaq(f.id)
                          setFaq(listFaq())
                        }}
                        className="mt-2 text-xs text-[var(--muted)] underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {docs === null ? (
              <p className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
                Loading Ryan's knowledge…
              </p>
            ) : null}
            {messages.length === 0 && docs !== null ? (
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
                <p className="text-sm leading-relaxed">{INTRO_COPY[bucket]}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SUGGESTIONS[bucket].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="rounded-full border border-[var(--panel-border)] px-3 py-1.5 text-xs text-[var(--accent)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 ${
                    m.role === 'user'
                      ? 'bg-[var(--accent-dim)] text-white'
                      : 'border border-[var(--panel-border)] bg-[var(--panel)]'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{m.text}</p>
                  {m.quotes?.map((q, i) => (
                    <div key={i} className="mt-2 rounded-xl bg-black/30 p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                        {q.title}
                      </p>
                      <blockquote className="mt-1 border-l-2 border-[var(--accent)] pl-2 text-sm italic leading-relaxed">
                        {q.excerpt}
                      </blockquote>
                      {q.link ? (
                        <button
                          type="button"
                          onClick={() => followLink(q.link!)}
                          className="mt-2 text-xs font-bold text-[var(--accent)] underline"
                        >
                          {q.linkLabel} →
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {m.actions && m.actions.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.actions.map((a, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => runAction(a)}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                            a.kind === 'confirm-add'
                              ? 'bg-emerald-600 text-white'
                              : 'border border-[var(--accent)]/40 text-[var(--accent)]'
                          }`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void send(input)
            }}
            className="sticky bottom-2 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={docs === null ? 'Loading…' : INPUT_PLACEHOLDER[bucket]}
              aria-label="Ask a question"
              disabled={docs === null}
              className="min-w-0 flex-1 rounded-full border border-[var(--panel-border)] bg-[#0d1218] px-4 py-2.5 text-sm disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={docs === null || !input.trim()}
              className="shrink-0 rounded-full bg-[var(--accent-dim)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  )
}
