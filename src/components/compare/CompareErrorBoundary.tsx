import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/** Keep the rest of Shape Lab up if Compare hits a runtime error. */
export class CompareErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Compare tab crashed', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <section className="rounded-xl border border-[var(--bad)]/40 bg-[#2a1518] p-4 text-sm text-[var(--text)]">
          <p className="font-semibold">Compare hit an error and stayed on this tab.</p>
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
