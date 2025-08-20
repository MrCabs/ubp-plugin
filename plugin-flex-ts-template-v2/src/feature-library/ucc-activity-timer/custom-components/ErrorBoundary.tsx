import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  private resetTimeoutId: NodeJS.Timeout | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error details
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error state if resetKeys changed
    if (
      hasError &&
      resetKeys &&
      prevProps.resetKeys !== resetKeys &&
      resetKeys.some((resetKey, idx) => resetKey !== prevProps.resetKeys?.[idx])
    ) {
      this.resetErrorBoundary();
    }

    // Reset error state if props changed and resetOnPropsChange is true
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    // Clear any pending reset
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    // Reset state immediately
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  // Auto-reset after a delay to recover from transient errors
  scheduleAutoReset = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = setTimeout(() => {
      this.resetErrorBoundary();
    }, 5000); // Auto-reset after 5 seconds
  };

  render() {
    if (this.state.hasError) {
      // Schedule auto-reset for transient errors
      this.scheduleAutoReset();

      // Return custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div style={{ padding: '10px', color: '#666', fontSize: '12px' }}>
          <div>⚠️ Timer display temporarily unavailable</div>
          <button
            onClick={this.resetErrorBoundary}
            style={{
              marginTop: '5px',
              padding: '2px 8px',
              fontSize: '11px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              background: '#f5f5f5',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
