import { useState, useEffect } from "react";
import { Zap, Wallet, ArrowRight, CheckCircle, AlertCircle, RefreshCw, Coins } from "lucide-react";
import { albyAuth, type InvoiceInfo } from "../services/albyAuth";
import { ErrorDisplay, useErrorRecovery } from "./ErrorBoundary";

interface TaprootAssetPaymentProps {
  assetId: string;
  assetName: string;
  assetAmount: string;
  price: number; // in sats
  peerPubkey?: string;
  onSuccess?: (result: { invoice: string; payment_hash: string; accepted_buy_quote?: Record<string, unknown> }) => void;
  onCancel?: () => void;
}

export function TaprootAssetPayment({ 
  assetId, 
  assetName, 
  assetAmount, 
  price, 
  peerPubkey, 
  onSuccess, 
  onCancel 
}: TaprootAssetPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceChecked, setBalanceChecked] = useState(false);
  const [lastFailedOperation, setLastFailedOperation] = useState<(() => Promise<void>) | null>(null);
  
  const { 
    error, 
    isRetrying, 
    handleError, 
    clearError, 
    retryWithRecovery, 
    reconnectWallet,
    getErrorType 
  } = useErrorRecovery();

  useEffect(() => {
    checkBalance();
  }, []);

  const checkBalance = async () => {
    try {
      const balanceMsat = await albyAuth.getBalance();
      setBalance(balanceMsat);
      setBalanceChecked(true);
      clearError();
    } catch (error) {
      console.error('Failed to check balance:', error);
      handleError(error as Error);
      setBalanceChecked(true);
    }
  };

  const handleTaprootAssetPayment = async () => {
    const paymentOperation = async () => {
      // Use the new Taproot asset payment method
      const result = await albyAuth.makeTaprootAssetPayment(assetId, assetAmount, peerPubkey);
      
      // Update balance after successful payment
      await checkBalance();
      
      setSuccess(true);
      setIsLoading(false);
      onSuccess?.(result);
    };
    
    setIsLoading(true);
    clearError();
    setLastFailedOperation(() => paymentOperation);
    
    try {
      await paymentOperation();
    } catch (err) {
      handleError(err as Error);
      setIsLoading(false);
    }
  };

  const handleRetryLastOperation = async () => {
    if (lastFailedOperation) {
      await retryWithRecovery(lastFailedOperation);
    }
  };

  const handleReconnect = async () => {
    await reconnectWallet();
    await checkBalance();
  };

  // Check if user has sufficient balance
  const hasSufficientBalance = balance !== null && balance >= (price + 1) * 1000; // Add 1 sat for network fee
  const balanceInSats = balance ? Math.floor(balance / 1000) : 0;

  if (success) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Taproot Asset Purchase Successful!</h3>
          <p className="text-muted-foreground mb-4">
            Your {assetName} assets have been successfully purchased and transferred to your wallet.
          </p>
          <div className="bg-accent/50 p-4 rounded-lg mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Asset:</span>
              <span>{assetName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Amount:</span>
              <span>{parseInt(assetAmount).toLocaleString()} units</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Paid:</span>
              <span>{price.toLocaleString()} sats</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
          <Coins className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Purchase Taproot Asset</h3>
          <p className="text-sm text-muted-foreground">
            Complete your purchase using Lightning Network
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          type={getErrorType(error)}
          onRetry={handleRetryLastOperation}
          onReconnect={handleReconnect}
        />
      )}

      {/* Asset Details */}
      <div className="bg-accent/50 p-4 rounded-lg mb-6 space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-medium">Asset</span>
          <span className="text-primary font-semibold">{assetName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium">Amount</span>
          <span>{parseInt(assetAmount).toLocaleString()} units</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium">Price</span>
          <span>{price.toLocaleString()} sats</span>
        </div>
        <div className="border-t border-border pt-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total</span>
            <span className="text-lg text-primary font-semibold">
              {(price + 1).toLocaleString()} sats
            </span>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            +1 sat network fee
          </div>
        </div>
      </div>

      {/* Balance Check */}
      {balanceChecked && (
        <div className="bg-muted/50 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Wallet Balance</span>
            <div className="text-right">
              <div className="font-semibold">{balanceInSats.toLocaleString()} sats</div>
              <div className="text-xs text-muted-foreground">
                {albyAuth.formatBalance(balance || 0)}
              </div>
            </div>
          </div>
          
          {!hasSufficientBalance && balance !== null && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <div className="text-sm text-red-700 dark:text-red-300">
                  Insufficient balance. You need {(price + 1).toLocaleString()} sats but have {balanceInSats.toLocaleString()} sats.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Button */}
      <div className="space-y-3">
        <button
          onClick={handleTaprootAssetPayment}
          disabled={
            isLoading || 
            isRetrying || 
            !balanceChecked || 
            !hasSufficientBalance
          }
          className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading || isRetrying ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              {isRetrying ? 'Retrying...' : 'Processing...'}
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Purchase with Lightning
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <button
          onClick={onCancel}
          className="w-full px-6 py-3 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          This payment will be processed instantly via the Lightning Network using NIP-47. 
          Your Taproot Asset will be transferred to your wallet immediately upon payment confirmation.
        </p>
      </div>
    </div>
  );
} 