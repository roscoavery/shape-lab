import { Component, type ErrorInfo, type ReactNode } from 'react'
import { HOLD_BUILD_BANNER, HOLD_BUILD_LABEL } from '../lib/holdBuild'

type Props = {
  children: ReactNode
}

type State = { error: Error | null }

/**
 * Last-resort boundary around the whole app. A throw in the main render used
 * to unmount React to an empty black root with no way back. This shows a
 * recovery screen instead, with a one-tap fresh reload.
 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`ShapeLab root crashed (${HOLD_BUILD_LABEL})`, error.message, info.componentStack)
  }

  private hardReload = () => {
    // window.location.reload() re-serves the cached page on iOS home-screen
    // apps. A cache-busting query param forces a genuinely fresh load.
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('v', Date.now().toString(36))
      window.location.href = url.toString()
    } catch {
      window.location.reload()
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-10">
          <div className={`${HOLD_BUILD_BANNER} mb-4`}>{HOLD_BUILD_LABEL}</div>
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">shapelab</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text)]">
            ShapeLab hit a snag loading this screen
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            {this.state.error.message}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={this.hardReload}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]"
            >
              Reload a fresh copy
            </button>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm font-semibold"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
