import React, { Component, ErrorInfo, ReactNode } from 'react';

import logger from '../../../utils/logger';

interface Props {
  children: ReactNode;
  onPiPError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

class PiPErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    retryCount: 0,
  };

  private maxRetries = 3;

  private retryTimeoutId: NodeJS.Timeout | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('PiP Error Boundary caught an error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
    });

    // Call custom error handler
    if (this.props.onPiPError) {
      this.props.onPiPError(error);
    }

    // Auto-retry for recoverable errors
    if (this.state.retryCount < this.maxRetries && this.isRecoverableError(error)) {
      this.scheduleRetry();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <div
          style={{
            padding: '8px',
            fontSize: '11px',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: '#fafafa',
            textAlign: 'center' as const,
          }}
        >
          <div style={{ marginBottom: '6px' }}>📹 Picture-in-Picture unavailable</div>
          <div style={{ fontSize: '9px', color: '#999', marginBottom: '6px' }}>
            {this.state.error?.message || 'Unknown error occurred'}
          </div>

          {canRetry && (
            <div style={{ fontSize: '9px', color: '#888', marginBottom: '6px' }}>
              Retrying... ({this.state.retryCount}/{this.maxRetries})
            </div>
          )}

          <button
            onClick={() => {
              logger.info('PiP Error Boundary manual retry triggered');
              this.setState({
                hasError: false,
                error: null,
                retryCount: 0,
              });
            }}
            style={{
              padding: '3px 8px',
              fontSize: '10px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              background: '#fff',
              cursor: 'pointer',
              color: '#333',
            }}
          >
            {canRetry ? 'Retry Now' : 'Reset'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }

  private isRecoverableError(error: Error): boolean {
    // Identify errors that might be recoverable
    const recoverablePatterns = [
      /canvas/i,
      /video/i,
      /media/i,
      /stream/i,
      /picture.*in.*picture/i,
      /requestPictureInPicture/i,
      /captureStream/i,
    ];

    return recoverablePatterns.some((pattern) => pattern.test(error.message) || pattern.test(error.name));
  }

  private scheduleRetry = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.pow(2, this.state.retryCount) * 1000;

    this.retryTimeoutId = setTimeout(() => {
      logger.info('PiP Error Boundary attempting retry', {
        retryCount: this.state.retryCount + 1,
        maxRetries: this.maxRetries,
      });

      this.setState((prevState) => ({
        hasError: false,
        error: null,
        retryCount: prevState.retryCount + 1,
      }));
    }, delay);
  };
}

export default PiPErrorBoundary;
