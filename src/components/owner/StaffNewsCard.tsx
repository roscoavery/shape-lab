/**
 * Coach-facing staff news — the latest owner updates, read-only.
 * Shown on the coach Today view. Returns null when there is no news.
 */
import { useEffect, useState } from 'react'
import { loadStaffNews, subscribeOwnerData, type StaffNewsPost } from '../../lib/ownerData'

export function StaffNewsCard() {
  const [posts, setPosts] = useState<StaffNewsPost[]>([])

  useEffect(() => {
    const refresh = () => setPosts(loadStaffNews().slice(0, 3))
    refresh()
    return subscribeOwnerData(refresh)
  }, [])

  if (posts.length === 0) return null

  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
      <h2 className="text-sm font-bold text-[var(--text)]">Staff news</h2>
      <ul className="mt-2 space-y-2">
        {posts.map((p) => (
          <li key={p.id}>
            <p className="text-sm text-[var(--text)]">{p.body}</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {p.authorName} · {new Date(p.createdAt).toLocaleDateString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
