import { Plus, Package, Zap, DollarSign, X } from "lucide-react";
import { useState, useEffect } from "react";

interface Asset {
  id: string;
  name: string;
  symbol: string;
  price: string;
  priceUnit: string;
  available: string;
  status: "Active" | "Draft";
}

interface AssetListingDashboardProps {
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

export function AssetListingDashboard({ onNavigate: _ }: AssetListingDashboardProps) {
  const [userAssets, setUserAssets] = useState<Asset[]>([]);
  const [showListingForm, setShowListingForm] = useState(false);
  const [listingForm, setListingForm] = useState({
    name: "",
    symbol: "",
    price: "",
    priceUnit: "BTC",
    available: "",
    status: "Draft" as "Active" | "Draft"
  });

  // Load assets from localStorage on component mount
  useEffect(() => {
    const savedAssets = localStorage.getItem('tapHubAssets');
    if (savedAssets) {
      try {
        setUserAssets(JSON.parse(savedAssets));
      } catch (error) {
        console.error('Error loading assets from localStorage:', error);
        setUserAssets([]);
      }
    }
  }, []);

  // Save assets to localStorage whenever userAssets changes
  useEffect(() => {
    localStorage.setItem('tapHubAssets', JSON.stringify(userAssets));
  }, [userAssets]);

  const handleCreateListing = () => {
    if (!listingForm.name || !listingForm.symbol || !listingForm.price || !listingForm.available) {
      alert('Please fill in all required fields');
      return;
    }

    const newListingAsset: Asset = {
      id: Date.now().toString(),
      name: listingForm.name,
      symbol: listingForm.symbol,
      price: listingForm.price,
      priceUnit: listingForm.priceUnit,
      available: listingForm.available,
      status: listingForm.status
    };

    setUserAssets(prev => [...prev, newListingAsset]);
    setShowListingForm(false);
    setListingForm({
      name: "",
      symbol: "",
      price: "",
      priceUnit: "BTC",
      available: "",
      status: "Draft"
    });
  };

  const handleDeleteAsset = (id: string) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      setUserAssets(prev => prev.filter(asset => asset.id !== id));
    }
  };

  const handleEditAsset = (id: string) => {
    // For now, just delete and let user add again
    // In a real implementation, you might want to show a form to edit price/quantity
    if (confirm('Edit will remove the current listing. You can add it again with new settings.')) {
      setUserAssets(prev => prev.filter(asset => asset.id !== id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Node Runner Access Notice */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <p className="text-sm text-blue-600 dark:text-blue-400 whitespace-nowrap">
            <strong>Node Runner Access:</strong> This dashboard is only available to Lightning node operators who can list Taproot Assets for sale.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl mb-2">My Assets</h1>
          <p className="text-muted-foreground">
            Manage your Taproot Asset listings
          </p>
        </div>
        <button 
          onClick={() => setShowListingForm(true)}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Asset
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
                  <button 
                    onClick={() => handleEditAsset(asset.id)}
                    className="px-3 py-1 text-xs border border-border rounded hover:bg-accent transition-colors"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteAsset(asset.id)}
                    className="px-3 py-1 text-xs border border-red-500/20 text-red-500 rounded hover:bg-red-500/10 transition-colors"
                  >
                    Delete
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
            <button 
              onClick={() => setShowListingForm(true)}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
            >
              Add First Asset
            </button>
          </div>
        )}
      </div>

      {/* Listing Form Modal */}
      {showListingForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create New Asset Listing</h2>
              <button 
                onClick={() => {
                  setShowListingForm(false);
                  setListingForm({
                    name: "",
                    symbol: "",
                    price: "",
                    priceUnit: "BTC",
                    available: "",
                    status: "Draft"
                  });
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Asset Name *</label>
                <input
                  type="text"
                  value={listingForm.name}
                  onChange={(e) => setListingForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., My Custom Token"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Asset Symbol *</label>
                <input
                  type="text"
                  value={listingForm.symbol}
                  onChange={(e) => setListingForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., MCT"
                  maxLength={10}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price *</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={listingForm.price}
                    onChange={(e) => setListingForm(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.0001"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Price Unit</label>
                  <select
                    value={listingForm.priceUnit}
                    onChange={(e) => setListingForm(prev => ({ ...prev, priceUnit: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="BTC">BTC</option>
                    <option value="sats">sats</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Available Quantity *</label>
                <input
                  type="text"
                  value={listingForm.available}
                  onChange={(e) => setListingForm(prev => ({ ...prev, available: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., 10,000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the total quantity available for sale
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={listingForm.status}
                  onChange={(e) => setListingForm(prev => ({ ...prev, status: e.target.value as "Active" | "Draft" }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowListingForm(false);
                  setListingForm({
                    name: "",
                    symbol: "",
                    price: "",
                    priceUnit: "BTC",
                    available: "",
                    status: "Draft"
                  });
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateListing}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
              >
                Create Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}