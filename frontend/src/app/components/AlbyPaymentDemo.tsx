import { useState, useEffect } from "react";
import { Zap, Wallet, ArrowRight, CheckCircle, AlertCircle, RefreshCw, Copy, Info } from "lucide-react";
import { albyAuth, type InvoiceInfo } from "../services/albyAuth";
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
  const [invoice, setInvoice] = useState('');
  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceInfo | null>(null);
  const [showInvoiceInput, setShowInvoiceInput] = useState(false);

  useEffect(() => {
    checkBalance();
  }, []);

  useEffect(() => {
    if (invoice.trim()) {
      const validation = albyAuth.validateInvoice(invoice.trim());
      setInvoiceInfo(validation);
    } else {
      setInvoiceInfo(null);
    }
  }, [invoice]);

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
    if (showInvoiceInput) {
      return handleInvoicePayment();
    }
    
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

  const handleInvoicePayment = async () => {
    if (!invoiceInfo?.valid) {
      setError('Please enter a valid Lightning invoice');
      return;
    }

    if (invoiceInfo.expired) {
      setError('This invoice has expired');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Check balance if we know the invoice amount
      if (invoiceInfo.amount && balance !== null) {
        const requiredBalance = invoiceInfo.amount * 1000; // Convert to msat
        if (balance < requiredBalance) {
          const balanceInSats = Math.floor(balance / 1000);
          throw new Error(`Insufficient balance. You have ${balanceInSats.toLocaleString()} sats but need ${invoiceInfo.amount.toLocaleString()} sats.`);
        }
      }

      const result = await albyAuth.makePayment(invoice.trim());
      
      // Update balance after successful payment
      await checkBalance();
      
      setSuccess(true);
      setIsLoading(false);
      onSuccess?.();
      
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

        {/* Invoice Input Toggle */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Payment Method</span>
            <button
              onClick={() => setShowInvoiceInput(!showInvoiceInput)}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              {showInvoiceInput ? 'Use Asset Purchase' : 'Pay Lightning Invoice'}
            </button>
          </div>
          
          {showInvoiceInput ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="invoice" className="block text-sm font-medium mb-2">
                  Lightning Invoice
                </label>
                <textarea
                  id="invoice"
                  value={invoice}
                  onChange={(e) => setInvoice(e.target.value)}
                  placeholder="lnbc1..."
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none text-sm font-mono"
                />
              </div>
              
              {/* Invoice Validation Status */}
              {invoice.trim() && invoiceInfo && (
                <div className={`p-3 rounded-lg border ${
                  invoiceInfo.valid && !invoiceInfo.expired
                    ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                    : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {invoiceInfo.valid && !invoiceInfo.expired ? (
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      {invoiceInfo.errorMessage ? (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {invoiceInfo.errorMessage}
                        </p>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                            Valid Invoice
                          </p>
                          {invoiceInfo.amount && (
                            <p className="text-sm text-muted-foreground">
                              Amount: {invoiceInfo.amount.toLocaleString()} sats
                            </p>
                          )}
                          {invoiceInfo.description && (
                            <p className="text-sm text-muted-foreground">
                              Description: {invoiceInfo.description}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
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
          )}
        </div>

        <div className="border-t border-border pt-4">
          {!showInvoiceInput && (
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold">Total</span>
              <span className="font-semibold text-lg">{price + 1} sats</span>
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={
              isLoading || 
              (showInvoiceInput ? (!invoiceInfo?.valid || invoiceInfo?.expired) : (balance !== null && balance < (price + 1) * 1000))
            }
            className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Zap className="w-4 h-4" />
                {showInvoiceInput ? 'Pay Invoice' : 'Pay with Alby'}
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