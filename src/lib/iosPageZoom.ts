/**
 * iOS Safari page-zooms on some press-drags (Shot / crop). JS cannot set
 * visualViewport.scale. Briefly lock maximum-scale, then restore.
 */

const VIEWPORT_BASE = 'width=device-width, initial-scale=1.0, viewport-fit=cover'

function viewportMeta(): HTMLMetaElement | null {
  return document.querySelector('meta[name="viewport"]')
}

export function releasePointerCaptures(el: Element | null, ids?: Iterable<number>) {
  if (!el || typeof (el as HTMLElement).releasePointerCapture !== 'function') return
  const host = el as HTMLElement
  const list = ids ? [...ids] : []
  for (const id of list) {
    try {
      host.releasePointerCapture(id)
    } catch {
      /* already released */
    }
  }
}

export function resetIosPageZoom() {
  if (typeof document === 'undefined') return
  const meta = viewportMeta()
  if (!meta) return
  const restore = meta.getAttribute('content') || VIEWPORT_BASE
  meta.setAttribute('content', `${VIEWPORT_BASE}, maximum-scale=1.0`)
  try {
    window.scrollTo(0, 0)
  } catch {
    /* ignore */
  }
  window.requestAnimationFrame(() => {
    meta.setAttribute(
      'content',
      restore.includes('maximum-scale=1') ? VIEWPORT_BASE : restore,
    )
    try {
      window.scrollTo(0, 0)
    } catch {
      /* ignore */
    }
  })
}
