export const LIBRARY_CHANGED_EVENT = 'shape-lab-library-changed'

export function dispatchLibraryChanged(): void {
  window.dispatchEvent(new Event(LIBRARY_CHANGED_EVENT))
}
