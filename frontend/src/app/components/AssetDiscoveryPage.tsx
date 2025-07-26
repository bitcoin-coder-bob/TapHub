import { useState } from "react";
import { Search, Zap, Star } from "lucide-react";

interface AssetDiscoveryPageProps {
  onNavigate: (page: string, params?: unknown) => void;
}

export function AssetDiscoveryPage({ onNavigate }: AssetDiscoveryPageProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data for assets
  const assets = [
    {
      id: "1",
      name: "Stablecoin USD",
      symbol: "SUSD",
      type: "Stablecoin",
      price: "1.00",
      priceUnit: "USD",
      node: "⚡ Alpha Node",
      rating: 4.8,
      trades: 156,
      available: "1,000,000",
    },
    {
      id: "2",
      name: "Bitcoin Art Token",
      symbol: "BART",
      type: "NFT",
      price: "0.001",
      priceUnit: "BTC",
      node: "🎨 Artist Pro",
      rating: 4.9,
      trades: 89,
      available: "50",
    },
    {
      id: "3",
      name: "Gaming Credits",
      symbol: "GAME",
      type: "Utility",
      price: "0.00025",
      priceUnit: "BTC",
      node: "🎮 Game Central",
      rating: 4.6,
      trades: 234,
      available: "500,000",
    },
    {
      id: "4",
      name: "Energy Token",
      symbol: "ENRG",
      type: "Commodity",
      price: "0.0005",
      priceUnit: "BTC",
      node: "⚡ Energy Grid",
      rating: 4.7,
      trades: 127,
      available: "75,000",
    },
  ];

  const filteredAssets = assets.filter((asset) => {
    return (
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.node.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl mb-2">Browse Assets</h1>
        <p className="text-muted-foreground">
          Discover Taproot Assets on the Lightning Network
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {filteredAssets.length} assets found
        </p>
      </div>

      {/* Asset List */}
      <div className="space-y-4">
        {filteredAssets.map((asset) => (
          <div
            key={asset.id}
            className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => onNavigate("asset-detail", { assetId: asset.id })}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                  <span className="text-primary">
                    {asset.symbol.slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h3 className="mb-1">{asset.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {asset.symbol} • {asset.type}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg text-primary mb-1">
                  {asset.price} {asset.priceUnit}
                </div>
                <div className="text-sm text-muted-foreground">
                  {parseInt(asset.available).toLocaleString()} available
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {asset.node}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  {asset.rating}
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {asset.trades} trades
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted/50 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2">No assets found</h3>
          <p className="text-muted-foreground mb-6">
            Try searching for something else
          </p>
          <button
            className="px-4 py-2 border border-border text-foreground hover:bg-accent rounded-lg transition-colors"
            onClick={() => setSearchQuery("")}
          >
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
}