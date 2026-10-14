import { RotateCcw } from 'lucide-react';
import { Component, type ReactNode } from 'react';
import { Button } from './Button';
import { Callout } from './Callout';

interface LoadErrorBoundaryProps {
  children: ReactNode;
  title?: string;
}

interface LoadErrorBoundaryState {
  failed: boolean;
}

/**
 * Catches a part of the page that failed to load (usually a dropped chunk request
 * after `lazyWithRetry` gave up) and offers a reload instead of a blank screen.
 * Reloading is safe: answers are saved on this device and offered for resume.
 */
export class LoadErrorBoundary extends Component<LoadErrorBoundaryProps, LoadErrorBoundaryState> {
  constructor(props: LoadErrorBoundaryProps) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError(): LoadErrorBoundaryState {
    return { failed: true };
  }

  override render() {
    const { failed } = this.state;
    const { children, title = 'This part of the page did not load' } = this.props;
    if (!failed) return children;
    return (
      <Callout
        role="alert"
        tone="danger"
        title={title}
        action={(
          <Button onClick={() => window.location.reload()} leadingIcon={<RotateCcw aria-hidden="true" className="size-4" />}>
            Reload the page
          </Button>
        )}
      >
        Your connection may have dropped. Your answers are saved on this device — after
        reloading, choose Resume to carry on where you left off.
      </Callout>
    );
  }
}
