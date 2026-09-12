import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  label: string
  children: ReactNode
}

type State = { error: Error | null }

/** Keep the rest of Shape Lab up if a tab hits a runtime error. */
export class PanelErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`${this.props.label} crashed`, error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <section className="min-h-[12rem] rounded-xl border border-[var(--bad)]/40 bg-[#2a1518] p-4 text-sm text-[var(--text)]">
          <p className="font-semibold">{this.props.label} hit an error on this page.</p>
          <p className="mt-2 text-[var(--muted)]">{this.state.error.message}</p>
          <button
            type="button"
            className="mt-3 rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-[#243040]"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </section>
      )
    }
    return this.props.children
  }
}
