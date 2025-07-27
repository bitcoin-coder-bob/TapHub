import { useState } from "react";
import { X, Zap, AlertCircle } from "lucide-react";
import { type InvoiceInfo } from "../services/auth";

interface PaymentConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  assetName?: string;
  price?: number;
  invoiceInfo?: InvoiceInfo | null;
  showInvoiceInput?: boolean;
}

export function PaymentConfirmation({ 
  isOpen, 
  onClose, 
  onConfirm, 
  assetName, 
  price, 
  invoiceInfo,
  showInvoiceInput = false
}: PaymentConfirmationProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  const getUSDEstimate = (sats: number) => {
    // Simple estimate at ~$65,000 per BTC
    const btcPrice = 65000;
    const usdValue = (sats / 100000000) * btcPrice;
    return usdValue < 0.01 ? "<$0.01" : `~$${usdValue.toFixed(2)}`;
  };

  const amount = showInvoiceInput && invoiceInfo?.amount ? invoiceInfo.amount : price;
  const description = showInvoiceInput && invoiceInfo?.description ? invoiceInfo.description : assetName;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Confirm Payment</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Payment Details */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-medium mb-3">Payment Details</h3>
            
            {/* Amount */}
            {amount && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">Amount</span>
                <div className="text-right">
                  <div className="font-medium">{amount.toLocaleString()} sats</div>
                  <div className="text-sm text-muted-foreground">{getUSDEstimate(amount)}</div>
                </div>
              </div>
            )}

            {/* Description/Asset */}
            {description && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">
                  {showInvoiceInput ? 'Description' : 'Asset'}
                </span>
                <span className="font-medium max-w-48 truncate text-right" title={description}>
                  {description}
                </span>
              </div>
            )}

            {/* Network Fee (only for asset purchases) */}
            {!showInvoiceInput && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Network Fee</span>
                <span className="font-medium">~1 sat</span>
              </div>
            )}
          </div>

          {/* Total */}
          {amount && (
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <div className="text-right">
                  <div className="font-semibold text-lg">
                    {(amount + (!showInvoiceInput ? 1 : 0)).toLocaleString()} sats
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getUSDEstimate(amount + (!showInvoiceInput ? 1 : 0))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Warning for mainnet */}
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                This payment will be processed on the Lightning Network and cannot be reversed.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Confirm Payment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}