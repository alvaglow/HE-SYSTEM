'use client'
/**
 * PILOT-LAUNCH HARDENING: dashboards query live Supabase tables directly in
 * server components, and any thrown error (a bad RLS policy, a network blip,
 * a null-pointer on a field that came back empty) previously took down the
 * entire page with Next.js's generic error screen — no way for a user to
 * know whether it's their connection, a bug, or a permissions issue, and no
 * way to recover without a full reload. Wrapping each dashboard's content
 * (and the payment flow) in this boundary means one broken widget shows a
 * scoped, readable error with a retry button instead of blanking the whole
 * portal.
 */
import React from 'react'

interface Props {
  children: React.ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Logged to the browser console today. If/when a client-side telemetry
    // endpoint exists, forward this there too — for now this at least means
    // the error is visible instead of vanishing into a blank screen.
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-800 font-medium mb-1">
            {this.props.fallbackTitle ?? "Something went wrong loading this section."}
          </p>
          <p className="text-red-600 text-sm mb-4">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
