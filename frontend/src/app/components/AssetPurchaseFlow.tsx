import { useState } from "react";
import {
  ShoppingCart,
  Zap,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

interface AssetPurchaseFlowProps {
  assetId?: string;
  onNavigate: (page: string, params?: any) => void;
}

export function AssetPurchaseFlow({
  assetId = "1",
  onNavigate,
}: AssetPurchaseFlowProps) {
  const [step, setStep] = useState(1);
  const [quantity, setQuantity] = useState("100");

  if (step === 1) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Asset Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-lightning-orange to-bitcoin-yellow rounded-lg flex items-center justify-center">
                  <span className="text-black text-xl">GA</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl">Gaming Credits</h1>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs">
                      Utility
                    </span>
                  </div>
                  <p className="text-muted-foreground">GAME</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Price per token
                  </p>
                  <p className="text-2xl text-lightning-orange">
                    0.00025 BTC
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    Available
                  </p>
                  <p className="text-xl">250,000</p>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="mb-2">Description</h4>
                <p className="text-muted-foreground text-sm">
                  In-game currency for various gaming platforms.
                  Can be used to purchase items, upgrades, and
                  unlock premium features.
                </p>
              </div>
            </div>
          </div>

          {/* Purchase Form */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6 sticky top-8">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="w-5 h-5" />
                <h2 className="text-xl">Purchase Asset</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(e.target.value)
                    }
                    min="10"
                    max="50000"
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-center"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Min: 10 • Max: 50,000
                  </p>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Quantity:</span>
                      <span>
                        {parseInt(
                          quantity || "0",
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Price per token:</span>
                      <span>0.00025 BTC</span>
                    </div>
                    <div className="border-t border-border pt-2">
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span className="text-lg text-lightning-orange">
                          {(
                            parseFloat(quantity || "0") *
                            0.00025
                          ).toFixed(8)}{" "}
                          BTC
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-lightning-orange/10 border border-lightning-orange/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-lightning-orange" />
                    <span className="text-lightning-orange">
                      Payment will be processed via Lightning
                      Network for instant settlement.
                    </span>
                  </div>
                </div>

                <button
                  className="w-full px-4 py-3 bg-lightning-orange hover:bg-lightning-orange/90 text-black rounded-lg transition-colors flex items-center justify-center gap-2"
                  onClick={() => setStep(2)}
                  disabled={
                    !quantity || parseFloat(quantity) < 10
                  }
                >
                  Generate Lightning Invoice
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-xs text-muted-foreground text-center">
                  Assets will be transferred immediately upon
                  payment confirmation
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>

          <h1 className="text-2xl mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground mb-6">
            Your Gaming Credits have been successfully purchased
            and transferred.
          </p>

          <div className="bg-accent/50 p-4 rounded-lg mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Asset:</span>
              <span>GAME</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Quantity:</span>
              <span>{parseInt(quantity).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Paid:</span>
              <span>
                {(parseFloat(quantity) * 0.00025).toFixed(8)}{" "}
                BTC
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onNavigate("orders")}
              className="flex-1 px-4 py-2 border border-border text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              View Order History
            </button>
            <button
              onClick={() => onNavigate("discover")}
              className="flex-1 px-4 py-2 bg-lightning-orange hover:bg-lightning-orange/90 text-black rounded-lg transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}