import { useState, useEffect } from "react";
import { Zap, Wallet, ArrowRight, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { albyAuth } from "../services/albyAuth";
import { USD } from "@getalby/sdk";

interface AlbyPaymentDemoProps {
  assetId: string;
  assetName: string;
  price: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AlbyPaymentDemo({ assetId, assetName, price, onSuccess, onCancel }: AlbyPaymentDemoProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceChecked, setBalanceChecked] = useState(false);

  useEffect(() => {
    checkBalance();
  }, []);

  const checkBalance = async () => {
    try {
      const balanceMsat = await albyAuth.getBalance();
      setBalance(balanceMsat);
      setBalanceChecked(true);
    } catch (error) {
      console.error('Failed to check balance:', error);
      setBalanceChecked(true);
    }
  };

  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check balance first
      const totalCost = (price + 1) * 1000; // Convert sats to msat and add network fee
      
      if (balance !== null && balance < totalCost) {
        const balanceInSats = Math.floor(balance / 1000);
        throw new Error(`Insufficient balance. You have ${balanceInSats.toLocaleString()} sats but need ${(price + 1).toLocaleString()} sats.`);
      }

      const lnClient = albyAuth.getLNClient();
      if (!lnClient) {
        throw new Error('Not connected to Alby wallet');
      }

      // In a real app, you would get the invoice from the seller
      // For demo purposes, we'll create a test payment request
      await lnClient.requestPayment(USD(price * 0.00000001)); // Convert sats to USD
      
      // Update balance after successful payment
      await checkBalance();
      
      // Simulate payment success
      setTimeout(() => {
        setSuccess(true);
        setIsLoading(false);
        onSuccess?.();
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto p-6 bg-card border border-border rounded-lg">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Payment Successful!</h2>
          <p className="text-muted-foreground mb-4">
            You have successfully purchased {assetName}
          </p>
          <div className="bg-muted/50 p-4 rounded-lg mb-4">
            <p className="text-sm font-mono">
              Asset ID: {assetId}
            </p>
            <p className="text-sm font-mono">
              Amount: {price} sats
            </p>
          </div>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-card border border-border rounded-lg">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Complete Purchase</h2>
        <p className="text-muted-foreground">
          Pay with your Alby wallet to receive {assetName}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Balance Display */}
        {balanceChecked && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Your Balance</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {balance !== null ? albyAuth.formatBalance(balance) : 'Unavailable'}
                </span>
                <button
                  onClick={checkBalance}
                  className="p-1 hover:bg-muted rounded"
                  title="Refresh balance"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
            {balance !== null && balance < (price + 1) * 1000 && (
              <div className="text-sm text-destructive">
                Insufficient funds for this purchase
              </div>
            )}
          </div>
        )}

        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Asset</span>
            <span className="font-medium">{assetName}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Price</span>
            <span className="font-medium">{price} sats</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Network Fee</span>
            <span className="font-medium">~1 sat</span>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold">Total</span>
            <span className="font-semibold text-lg">{price + 1} sats</span>
          </div>

          <button
            onClick={handlePayment}
            disabled={isLoading || (balance !== null && balance < (price + 1) * 1000)}
            className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Pay with Alby
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            onClick={onCancel}
            className="w-full px-6 py-3 mt-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          Payment will be processed instantly via the Lightning Network. 
          Your Taproot Asset will be transferred to your wallet immediately.
        </p>
      </div>
    </div>
  );
} 