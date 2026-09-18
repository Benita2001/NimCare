import { Component, type ErrorInfo, type ReactNode } from 'react';
import { EnvelopeCharacter } from './Illustrations';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Root render-exception guard. Before this existed, a single uncaught
 * render error anywhere in the tree (e.g. calling a string method on a
 * null wallet address from a malformed Loop row) took down the entire
 * Mini App to a blank white screen with no visible error — unacceptable
 * for a wallet-hosted product. See MEMORY.md 2026-09-18 blank-screen
 * hotfix for the incident this was added in response to.
 *
 * This is a last-resort safety net, not a substitute for fixing the
 * actual defensive checks closer to the data (see Home.tsx
 * resolveOtherWallet, lib/luna.ts shortenAddress).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('NimCare render error:', error, info.componentStack);
    }
    // Never log the raw error/stack to any remote service here — this is a
    // client-only safety net, not a telemetry pipeline, and the point of
    // this component is specifically to avoid ever surfacing a stack trace
    // to the user.
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  handleHome = () => {
    this.setState({ hasError: false });
    window.location.href = window.location.origin;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="screen screen-center">
          <div className="hero-mobile-char"><EnvelopeCharacter className="hero-char" /></div>
          <h1>Something went wrong.</h1>
          <p className="subtitle">NimCare hit an unexpected screen error. Your wallet and funds are safe.</p>
          <button className="btn btn-primary" onClick={this.handleReset}>Try again</button>
          <button className="btn btn-ghost" onClick={this.handleHome}>Back to NimCare</button>
        </div>
      );
    }
    return this.props.children;
  }
}
