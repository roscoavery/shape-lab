import { useState } from 'react'
import {
  GREGER_VIDEOS,
  GREGER_YOUTUBE,
  NUTRITIONFACTS_HOME,
  NUTRITIONFACTS_SEARCH,
  searchNutritionFacts,
} from '../../config/nutritionFacts'

export function NutritionFactsBrowse({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState('')
  const hits = searchNutritionFacts(query)
  const searchUrl = `${NUTRITIONFACTS_SEARCH}${encodeURIComponent(query.trim() || 'protein')}`
  return (
    <section
      className={`rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] ${compact ? 'p-4' : 'p-5'}`}
    >
      <h3 className="font-semibold">NutritionFacts.org</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Short readings from public NutritionFacts.org topics and Dr. Michael Greger videos — not
        medical advice.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <a href={NUTRITIONFACTS_HOME} target="_blank" rel="noreferrer" className="text-[var(--accent)] underline">
          NutritionFacts.org
        </a>
        <a href={GREGER_VIDEOS} target="_blank" rel="noreferrer" className="text-[var(--accent)] underline">
          Videos
        </a>
        <a href={GREGER_YOUTUBE} target="_blank" rel="noreferrer" className="text-[var(--accent)] underline">
          YouTube
        </a>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask about protein, dairy, sugar, sleep…"
        className="mt-3 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
      />
      <ul className="mt-3 space-y-3">
        {hits.length === 0 ? (
          <li className="text-sm text-[var(--muted)]">
            Nothing in this short list matches. Search the source:{' '}
            <a href={searchUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] underline">
              nutritionfacts.org
            </a>
          </li>
        ) : (
          hits.map((card) => (
            <li key={card.id} className="rounded-lg bg-[#121820] px-3 py-3">
              <p className="text-sm font-semibold">{card.question}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{card.answer}</p>
              <a
                href={card.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs font-semibold text-[var(--accent)] underline"
              >
                {card.sourceLabel}
              </a>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}
