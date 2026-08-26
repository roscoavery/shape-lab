/**
 * Renders an Instagram post/reel via Instagram's public embed endpoint.
 * Embeds are display-only: they can't be frame-scrubbed, slow-mo'd, or
 * reliably auto-looped, and private posts won't render at all.
 */

import { parseInstagramUrl } from '../../lib/clipStore'

export function InstagramEmbed({ url }: { url: string }) {
  const parsed = parseInstagramUrl(url)
  if (!parsed) {
    return (
      <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
        Couldn't parse that Instagram link. Expected a post/reel URL like
        https://www.instagram.com/reel/ABC123/
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <iframe
        src={`https://www.instagram.com/${parsed.type}/${parsed.code}/embed/captioned/`}
        title="Instagram post"
        loading="lazy"
        allow="encrypted-media"
        className="h-[480px] w-full rounded-lg border border-[var(--panel-border)] bg-white"
      />
      <p className="rounded-lg border border-[var(--warn)]/40 bg-[#2a2312] px-3 py-2 text-xs leading-relaxed text-[var(--warn)]">
        Instagram embeds are view-only — no frame scrubbing, slow-mo, or reliable
        auto-loop, and private posts won't show. For full loop + scrub control,
        screen-record or download your own video and upload it as a file instead.
      </p>
    </div>
  )
}
