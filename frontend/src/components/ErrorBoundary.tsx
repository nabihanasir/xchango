import { Component } from 'react';
import type { ReactNode } from 'react';
import ErrorAlert from './ErrorAlert';
import { AppApiError } from '../types/error';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('React Error Boundary caught an error', { error, errorInfo });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const fallbackError =
        this.state.error instanceof AppApiError
          ? this.state.error
          : new AppApiError({
              code: 'UI_RENDER_ERROR',
              message: 'Page failed to render',
              reason: this.state.error.message || 'A rendering error interrupted the page.',
              solution: 'Refresh the page. If the issue continues, contact support with the request details.',
              status: 500,
              timestamp: new Date().toISOString(),
              path: window.location.pathname,
            });

      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="w-full max-w-2xl space-y-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.32em] text-yellow-default">Application Error</p>
              <h1 className="mt-3 text-3xl font-black text-dark-blue">We hit an unexpected interface problem</h1>
            </div>
            <ErrorAlert error={fallbackError} />
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-dark-blue px-6 py-3 text-sm font-bold text-white transition hover:bg-dark-blue-light"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
