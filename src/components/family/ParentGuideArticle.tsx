/**
 * ParentGuideArticle — renders one Parent Guide article exactly as parents see it.
 *
 * Questions render as styled prompts (never like something Ryan typed);
 * answers render verbatim in Ryan's own words.
 *
 * Shared by the parent view (ParentEducationDesk) and the admin
 * "Preview as parent" so Ryan sees exactly what parents see.
 */
import type { ParentEducationArticle } from '../../config/parentEducation'

export function ParentGuideArticle({ article }: { article: ParentEducationArticle }) {
  return (
    <article className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <p className="rounded-lg bg-[#102028] px-3 py-2 text-xs leading-relaxed text-[var(--accent)]">
        Written for parents, in the coach&apos;s own words.
      </p>
      <p className="mt-3 text-xs uppercase tracking-wider text-[var(--accent)]">{article.summary}</p>
      <h2 className="mt-2 text-2xl font-semibold">{article.title}</h2>
      <div className="mt-4 text-sm leading-relaxed text-[var(--text)]">
        {article.intro.map((p, i) => (
          <p key={i} className="mb-3">{p}</p>
        ))}
        {article.qa.map((item) => (
          <div key={item.question} className="mb-5">
            <p className="border-l-2 border-[var(--accent)] pl-3 text-xs italic leading-relaxed text-[var(--muted)]">
              <span className="font-semibold not-italic uppercase tracking-wider text-[var(--accent)]">Question </span>
              {item.question}
            </p>
            <div className="mt-2 space-y-3">
              {item.answer.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
