import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

// ============================================================================
// 1. GLOBAL REACT ERROR BOUNDARY (Requirement 10)
// Friendly "Something broke. Tap to reload." screen
// ============================================================================
interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Avoid logging secrets or sensitive data
    if (process.env.NODE_ENV !== 'production') {
      console.error('GlobalErrorBoundary caught error:', error.message, errorInfo.componentStack);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetCacheAndReload = () => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      // storage unavailable
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen w-full bg-[#050B16] text-[#E6F1FF] flex items-center justify-center p-4 sm:p-6 font-sans select-none"
        >
          <div className="max-w-md w-full bg-[#0A1830] border border-cyan-500/30 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-5">
            <div className="w-14 h-14 mx-auto rounded-full bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center text-cyan-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-mono-tabular uppercase tracking-widest text-[#22D3EE] font-semibold">
                WorldPulse Telemetry Guard
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Something broke. Tap to reload.
              </h1>
              <p className="text-xs sm:text-sm text-[#8FA5C2] leading-relaxed">
                An unexpected view error interrupted telemetry rendering. Your saved bookmarks and local data are safe.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600 text-[#050B16] font-bold text-xs sm:text-sm font-mono-tabular hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tap to reload</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCacheAndReload}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-full border border-cyan-500/30 text-[#8FA5C2] hover:text-white hover:border-cyan-400 font-mono-tabular text-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                title="Clears local cache and reloads fresh data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Cache</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// 2. PANEL-LEVEL ERROR BOUNDARY (Requirement 11)
// Wraps each major panel (map, Top 10, briefing, markets, speech archive)
// so one failure does not blank the page
// ============================================================================
interface PanelErrorBoundaryProps {
  name: string;
  children: ReactNode;
  fallbackHeight?: string;
}

interface PanelErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class PanelErrorBoundary extends Component<
  PanelErrorBoundaryProps,
  PanelErrorBoundaryState
> {
  constructor(props: PanelErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): PanelErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`PanelErrorBoundary caught error in [${this.props.name}]:`, error.message, errorInfo.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <section
          role="alert"
          aria-label={`${this.props.name} error panel`}
          className={`wp-glass-card p-5 sm:p-6 border border-rose-500/30 bg-[#0A1830]/80 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 ${
            this.props.fallbackHeight || 'min-h-[160px]'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-rose-500/15 border border-rose-500/35 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white font-mono-tabular">
              Something broke in {this.props.name}. Tap to reload.
            </h3>
            <p className="text-xs text-[#8FA5C2] max-w-sm">
              The rest of WorldPulse remains operational. Tap below to retry this panel or reload.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={this.handleRetry}
              className="min-h-[44px] px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/30 text-xs font-mono-tabular font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry {this.props.name}</span>
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="min-h-[44px] px-4 py-2 rounded-full border border-cyan-500/30 text-[#8FA5C2] hover:text-white hover:border-cyan-400 text-xs font-mono-tabular transition-colors cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
