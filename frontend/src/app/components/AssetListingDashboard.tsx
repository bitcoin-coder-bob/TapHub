import { Plus, Package, Zap, DollarSign } from "lucide-react";

interface AssetListingDashboardProps {
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

export function AssetListingDashboard({ onNavigate: _onNavigate }: AssetListingDashboardProps) {
  // Mock user assets
  const userAssets = [
    {
      id: "1",
      name: "My Gaming Token",
      symbol: "GAME",
      price: "0.0002",
      priceUnit: "BTC",
      available: "10,000",
      status: "Active"
    },
    {
      id: "2", 
      name: "Art Collection NFT",
      symbol: "ART",
      price: "0.005",
      priceUnit: "BTC", 
      available: "5",
      status: "Draft"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl mb-2">My Assets</h1>
          <p className="text-muted-foreground">
            Manage your Taproot Asset listings
          </p>
        </div>
        <button className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Asset
        </button>
      </div>

      {/* Simple Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Listed Assets</p>
              <p className="text-xl">{userAssets.length}</p>
            </div>
            <Package className="w-6 h-6 text-primary" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-xl">23</p>
            </div>
            <Zap className="w-6 h-6 text-primary" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-xl">0.15 BTC</p>
            </div>
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>

      {/* Assets List */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="mb-4">Your Assets</h2>
        
        {userAssets.length > 0 ? (
          <div className="space-y-4">
            {userAssets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <span className="text-primary text-sm">{asset.symbol.slice(0, 2)}</span>
                  </div>
                  <div>
                    <h3 className="text-sm">{asset.name}</h3>
                    <p className="text-xs text-muted-foreground">{asset.symbol}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm">{asset.price} {asset.priceUnit}</div>
                  <div className="text-xs text-muted-foreground">{asset.available} available</div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded ${
                    asset.status === 'Active' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {asset.status}
                  </span>
                  <button className="px-3 py-1 text-xs border border-border rounded hover:bg-accent transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="mb-2">No assets listed yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by creating your first Taproot Asset listing
            </p>
            <button className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors">
              Create First Asset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}