import { useState } from "react";
import { Zap, ArrowRight, Upload, Search, ShoppingCart } from "lucide-react";

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  const [viewMode, setViewMode] = useState<'list' | 'buy'>('list');

  const listingSteps = [
    {
      icon: Zap,
      title: "Connect Node",
      description: "Register your Lightning Network node with TapHub"
    },
    {
      icon: Upload,
      title: "List Assets",
      description: "Upload your Taproot Assets with pricing and details"
    },
    {
      icon: ShoppingCart,
      title: "Earn Bitcoin",
      description: "Receive instant Lightning payments when assets sell"
    }
  ];

  const buyingSteps = [
    {
      icon: Search,
      title: "Browse Assets",
      description: "Discover Taproot Assets from verified Lightning nodes"
    },
    {
      icon: Zap,
      title: "Pay with Lightning",
      description: "Complete purchase with instant Lightning Network payment"
    },
    {
      icon: Upload,
      title: "Receive Assets",
      description: "Get your Taproot Assets transferred automatically"
    }
  ];

  const currentSteps = viewMode === 'list' ? listingSteps : buyingSteps;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-full">
            <Zap className="w-4 h-4" />
            Lightning Network Marketplace
          </div>

          <h1 className="text-4xl md:text-5xl mb-6">
            Trade Taproot Assets
            <br />
            <span className="text-primary">Instantly</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            TapHub connects Lightning Network nodes for fast, secure trading of Bitcoin-based assets.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center justify-center gap-2"
              onClick={() => onNavigate("discover")}
            >
              Browse Assets
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              className="px-8 py-3 border border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors"
              onClick={() => onNavigate("register")}
            >
              List Assets
            </button>
          </div>
        </div>
      </div>

      {/* How It Works with Toggle */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl mb-4">How TapHub Works</h2>
          
          {/* Toggle Switch */}
          <div className="inline-flex items-center gap-4 p-1 bg-muted rounded-lg mb-8">
            <button
              className={`px-4 py-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setViewMode('list')}
            >
              For Asset Sellers
            </button>
            <button
              className={`px-4 py-2 rounded-md transition-colors ${
                viewMode === 'buy'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setViewMode('buy')}
            >
              For Asset Buyers
            </button>
          </div>

          <p className="text-muted-foreground">
            {viewMode === 'list' 
              ? 'Simple steps to start selling your Taproot Assets'
              : 'Easy process to discover and buy Taproot Assets'
            }
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {currentSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="text-center p-6 border border-border rounded-lg">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA based on current view */}
        <div className="text-center mt-12">
          <button
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
            onClick={() => onNavigate(viewMode === 'list' ? 'register' : 'discover')}
          >
            {viewMode === 'list' ? 'Start Selling Assets' : 'Start Buying Assets'}
          </button>
        </div>
      </div>
    </div>
  );
}