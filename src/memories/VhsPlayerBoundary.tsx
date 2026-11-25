import { Component, type ErrorInfo, type ReactNode } from 'react';
import { VhsPlayerContent, type VhsPlayerProps } from './VhsPlayer';

interface Props extends VhsPlayerProps {
  fallback?: ReactNode;
}

interface State {
  failed: boolean;
}

export class VhsPlayerBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Playback errors stay inside the station instead of taking down the game shell.
  }

  render(): ReactNode {
    if (this.state.failed) {
      return this.props.fallback ?? (
        <section className="vhs-player vhs-player--fallback" role="alert">
          <strong>VHS playback paused safely.</strong>
          <span>Close the deck and try the tape again.</span>
          <button type="button" className="vhs-secondary" onClick={this.props.onClose}>Close</button>
        </section>
      );
    }
    const { fallback: _fallback, ...playerProps } = this.props;
    return <VhsPlayerContent {...playerProps} />;
  }
}
