import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowUpRight, ArrowDownLeft, Clock, RefreshCw } from "lucide-react";
import { albyAuth } from "../services/albyAuth";
import { ErrorDisplay, useErrorRecovery } from "./ErrorBoundary";

interface Transaction {
  type: string;
  invoice?: string;
  description?: string;
  description_hash?: string;
  preimage?: string;
  payment_hash?: string;
  amount?: number;
  fees_paid?: number;
  created_at?: number;
  expires_at?: number;
  settled_at?: number;
  state?: string;
}

interface TransactionHistoryProps {
  onNavigate: (page: string) => void;
}

export function TransactionHistory({ onNavigate }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [connectionState, setConnectionState] = useState(albyAuth.getConnectionState());
  const isFetchingRef = useRef(false);

  console.log('TransactionHistory: Render - isLoading:', isLoading, 'connectionState:', connectionState, 'transactions:', transactions.length, 'error:', error?.message);

  const fetchTransactions = useCallback(async () => {
    // Prevent multiple concurrent fetches
    if (isFetchingRef.current) {
      return;
    }
    
    isFetchingRef.current = true;
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('TransactionHistory: Starting fetch...');
      const txHistory = await albyAuth.getTransactions();
      console.log('TransactionHistory: Fetch completed, got', txHistory.length, 'transactions');
      
      console.log('TransactionHistory: Setting transactions');
      setTransactions(txHistory as Transaction[]);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError(err as Error);
    } finally {
      console.log('TransactionHistory: Setting loading to false');
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []); // Remove all dependencies to prevent recreations

  useEffect(() => {
    console.log('TransactionHistory: useEffect running');
    
    // Only fetch transactions if user is authenticated and connected
    const currentConnectionState = albyAuth.getConnectionState();
    console.log('TransactionHistory: Current connection state:', currentConnectionState);
    setConnectionState(currentConnectionState);
    
    if (currentConnectionState === 'connected') {
      console.log('TransactionHistory: Connection is connected, fetching transactions');
      fetchTransactions();
    } else if (currentConnectionState === 'disconnected') {
      console.log('TransactionHistory: Connection is disconnected, setting loading to false');
      setIsLoading(false);
    }
    
    // Subscribe to connection state changes
    const unsubscribe = albyAuth.onConnectionStateChange((state) => {
      console.log('TransactionHistory: Connection state changed to:', state);
      setConnectionState(state);
      
      // Only fetch if we transition to connected
      if (state === 'connected') {
        console.log('TransactionHistory: State changed to connected, fetching transactions');
        fetchTransactions();
      } else if (state === 'disconnected') {
        console.log('TransactionHistory: State changed to disconnected, setting loading to false');
        setIsLoading(false);
      }
    });
    
    // Cleanup on unmount
    return () => {
      console.log('TransactionHistory: Cleaning up');
      unsubscribe();
    };
  }, []); // Remove fetchTransactions dependency to prevent infinite loops

  const formatAmount = (amount?: number): string => {
    if (!amount) return '0 sats';
    const sats = Math.floor(amount / 1000);
    return `${sats.toLocaleString()} sats`;
  };

  const formatTimestamp = (timestamp?: number): string => {
    if (!timestamp) return 'Unknown time';
    
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.type === 'incoming') {
      return <ArrowDownLeft className="w-5 h-5 text-green-500" />;
    }
    return <ArrowUpRight className="w-5 h-5 text-orange-500" />;
  };

  const getTransactionDescription = (transaction: Transaction): string => {
    if (transaction.description) {
      return transaction.description;
    }
    
    if (transaction.type === 'incoming') {
      return 'Received payment';
    }
    
    return 'Sent payment';
  };

  const getTransactionStatus = (transaction: Transaction) => {
    if (transaction.state === 'settled') {
      return { text: 'Completed', color: 'text-green-500' };
    }
    if (transaction.state === 'pending') {
      return { text: 'Pending', color: 'text-yellow-500' };
    }
    if (transaction.state === 'failed') {
      return { text: 'Failed', color: 'text-red-500' };
    }
    return { text: 'Unknown', color: 'text-gray-500' };
  };

  if (error && connectionState !== 'connecting') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => onNavigate('home')}
            className="text-primary hover:text-primary/80 text-sm mb-4"
          >
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
          <p className="text-muted-foreground">Your recent Lightning Network transactions</p>
        </div>

        <div className="text-center py-12">
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
              Failed to load transactions
            </h3>
            <p className="text-red-600 dark:text-red-300 text-sm mb-4">
              {error.message}
            </p>
            <button
              onClick={() => {
                setError(null);
                fetchTransactions();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => onNavigate('home')}
          className="text-primary hover:text-primary/80 text-sm mb-4"
        >
          ← Back to Home
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
            <p className="text-muted-foreground">Your recent Lightning Network transactions</p>
          </div>
          <button
            onClick={fetchTransactions}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {connectionState === 'connecting' ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-medium mb-2">Connecting to wallet...</h3>
          <p className="text-muted-foreground">
            Establishing connection with your Lightning wallet
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-muted rounded w-20 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-16"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No transactions yet</h3>
          <p className="text-muted-foreground mb-6">
            Your Lightning Network transaction history will appear here once you make payments or receive funds.
          </p>
          <button
            onClick={() => onNavigate('discover')}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
          >
            Explore TapHub
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction, index) => {
            const status = getTransactionStatus(transaction);
            const isIncoming = transaction.type === 'incoming';
            
            return (
              <div key={transaction.payment_hash || index} className="bg-card border border-border rounded-lg p-6 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {getTransactionIcon(transaction)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground truncate">
                        {getTransactionDescription(transaction)}
                      </h3>
                      <span className={`text-sm ${status.color}`}>
                        {status.text}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatTimestamp(transaction.settled_at || transaction.created_at)}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-medium ${isIncoming ? 'text-green-500' : 'text-foreground'}`}>
                      {isIncoming ? '+' : '-'}{formatAmount(transaction.amount)}
                    </div>
                    {transaction.fees_paid && transaction.fees_paid > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Fee: {formatAmount(transaction.fees_paid)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}