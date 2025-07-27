import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { albyAuth } from '../services/albyAuth';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: 'connection' | 'payment' | 'permission' | 'unknown';
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorType: 'unknown' 
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorMessage = error.message.toLowerCase();
    let errorType: State['errorType'] = 'unknown';
    
    if (errorMessage.includes('connection') || 
        errorMessage.includes('network') || 
        errorMessage.includes('timeout') ||
        errorMessage.includes('relay')) {
      errorType = 'connection';
    } else if (errorMessage.includes('permission') || 
               errorMessage.includes('missing permission')) {
      errorType = 'permission';
    } else if (errorMessage.includes('payment') || 
               errorMessage.includes('balance') ||
               errorMessage.includes('invoice')) {
      errorType = 'payment';
    }
    
    return {
      hasError: true,
      error,
      errorType
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorType: 'unknown' });
  };

  handleReconnect = async () => {
    try {
      const credentials = albyAuth.getStoredCredentials();
      if (credentials) {
        await albyAuth.connectWithAlby(credentials);
        this.handleRetry();
      }
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  };

  getErrorContent() {
    const { error, errorType } = this.state;
    
    switch (errorType) {
      case 'connection':
        return {
          title: 'Connection Error',
          description: 'Unable to connect to your wallet. Please check your internet connection.',
          helpText: 'Make sure you have a stable internet connection and your wallet service is available.',
          action: (
            <button
              onClick={this.handleReconnect}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
            >
              <Wifi className="w-4 h-4" />
              Reconnect Wallet
            </button>
          )
        };
      
      case 'permission':
        return {
          title: 'Permission Error',
          description: 'Your wallet connection is missing required permissions.',
          helpText: 'Please reconnect your wallet and ensure you grant the necessary permissions for payments and balance checking.',
          action: (
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reconnect with Permissions
            </button>
          )
        };
      
      case 'payment':
        return {
          title: 'Payment Error',
          description: error?.message || 'Payment could not be processed.',
          helpText: 'Check your balance and invoice details. If the problem persists, try reconnecting your wallet.',
          action: (
            <div className="flex gap-2">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Payment
              </button>
              <button
                onClick={this.handleReconnect}
                className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-accent rounded-lg transition-colors"
              >
                <Wifi className="w-4 h-4" />
                Reconnect Wallet
              </button>
            </div>
          )
        };
      
      default:
        return {
          title: 'Something went wrong',
          description: error?.message || 'An unexpected error occurred.',
          helpText: 'Please try again. If the problem persists, try refreshing the page or reconnecting your wallet.',
          action: (
            <div className="flex gap-2">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-accent rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>
            </div>
          )
        };
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorContent = this.getErrorContent();

      return (
        <div className="max-w-md mx-auto p-6 bg-card border border-border rounded-lg">
          <div className="text-center">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{errorContent.title}</h2>
            <p className="text-muted-foreground mb-4">
              {errorContent.description}
            </p>
            <div className="bg-muted/50 p-4 rounded-lg mb-4 text-left">
              <p className="text-sm text-muted-foreground">
                {errorContent.helpText}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {errorContent.action}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Error Recovery Hook for functional components
export const useErrorRecovery = () => {
  const [error, setError] = React.useState<string | null>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleError = (error: Error | string) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    setError(errorMessage);
  };

  const clearError = () => {
    setError(null);
  };

  const retryWithRecovery = async (operation: () => Promise<void>) => {
    setIsRetrying(true);
    try {
      await operation();
      clearError();
    } catch (err) {
      handleError(err as Error);
    } finally {
      setIsRetrying(false);
    }
  };

  const reconnectWallet = async () => {
    setIsRetrying(true);
    try {
      const credentials = albyAuth.getStoredCredentials();
      if (credentials) {
        await albyAuth.connectWithAlby(credentials);
        clearError();
      } else {
        throw new Error('No stored credentials found');
      }
    } catch (err) {
      handleError(err as Error);
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorType = (errorMessage: string): 'connection' | 'payment' | 'permission' | 'unknown' => {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('connection') || 
        message.includes('network') || 
        message.includes('timeout') ||
        message.includes('relay')) {
      return 'connection';
    } else if (message.includes('permission') || 
               message.includes('missing permission')) {
      return 'permission';
    } else if (message.includes('payment') || 
               message.includes('balance') ||
               message.includes('invoice')) {
      return 'payment';
    }
    
    return 'unknown';
  };

  return {
    error,
    isRetrying,
    handleError,
    clearError,
    retryWithRecovery,
    reconnectWallet,
    getErrorType
  };
};

// Error Display Component for inline errors
interface ErrorDisplayProps {
  error: string;
  type?: 'connection' | 'payment' | 'permission' | 'unknown';
  onRetry?: () => void;
  onReconnect?: () => void;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  type = 'unknown',
  onRetry,
  onReconnect,
  className = ''
}) => {
  const getIcon = () => {
    switch (type) {
      case 'connection':
        return <WifiOff className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getHelpText = () => {
    switch (type) {
      case 'connection':
        return 'Check your internet connection and wallet service availability.';
      case 'permission':
        return 'Reconnect your wallet with the required permissions.';
      case 'payment':
        return 'Verify your balance and invoice details before retrying.';
      default:
        return 'Please try again or contact support if the issue persists.';
    }
  };

  return (
    <div className={`bg-destructive/10 border border-destructive/20 rounded-lg p-3 ${className}`}>
      <div className="flex items-start gap-2">
        <div className="text-destructive mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-destructive font-medium">{error}</p>
          <p className="text-xs text-muted-foreground mt-1">{getHelpText()}</p>
          {(onRetry || onReconnect) && (
            <div className="flex gap-2 mt-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-xs px-2 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors"
                >
                  Retry
                </button>
              )}
              {onReconnect && type === 'connection' && (
                <button
                  onClick={onReconnect}
                  className="text-xs px-2 py-1 border border-border hover:bg-accent rounded transition-colors"
                >
                  Reconnect
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};