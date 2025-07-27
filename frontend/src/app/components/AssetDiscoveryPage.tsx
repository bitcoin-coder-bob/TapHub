import { useState, useEffect } from "react";
import { Search, Zap, Star } from "lucide-react";

interface AssetDiscoveryPageProps {
  onNavigate: (page: string, params?: unknown) => void;
}

interface Asset {
  id: string;
  name: string;
  symbol: string;
  totalSupply: string;
  available: string;
  status: string;
}

interface NodeAsset {
  nodePubkey: string;
  assets: Asset[];
  createdAt: string;
  updatedAt: string;
}

interface AssetWithNode extends Asset {
  nodePubkey: string;
  nodeName?: string;
  nodeRating?: number;
  nodeTrades?: number;
}

export function AssetDiscoveryPage({ onNavigate }: AssetDiscoveryPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [assets, setAssets] = useState<AssetWithNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all node assets from database
  useEffect(() => {
    const fetchAllNodeAssets = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // First, get all verified nodes
        const nodesResponse = await fetch('/api/verfiedNodes/getVerfiedNodes');
        
        if (nodesResponse.status === 404) {
          // No nodes registered in DB
          setAssets([]);
          setIsLoading(false);
          return;
        }
        
        if (!nodesResponse.ok) {
          throw new Error('Failed to fetch nodes');
        }
        const nodePubkeys = await nodesResponse.json();

        // Then, fetch assets for each node
        const allAssets: AssetWithNode[] = [];
        
        for (const nodePubkey of nodePubkeys) {
          try {
            const assetsResponse = await fetch(`/api/verfiedNodes/getNodeAssets?nodePubkey=${nodePubkey}`);
            if (assetsResponse.ok) {
              const nodeAssets: NodeAsset = await assetsResponse.json();
              
              // Add node information to each asset
              const assetsWithNode = nodeAssets.assets.map(asset => ({
                ...asset,
                nodePubkey: nodeAssets.nodePubkey,
                nodeName: `Node ${nodeAssets.nodePubkey.slice(0, 8)}...`,
                nodeRating: 4.5, // Default rating - could be fetched from node profile
                nodeTrades: Math.floor(Math.random() * 500) + 50 // Mock trades count
              }));
              
              allAssets.push(...assetsWithNode);
            }
            // Silently ignore 404s - it just means the node has no assets
          } catch (error) {
            // Only log unexpected errors, not 404s
            console.error(`Unexpected error fetching assets for node ${nodePubkey}:`, error);
          }
        }

        setAssets(allAssets);
      } catch (error) {
        console.error('Error fetching assets:', error);
        setError('Failed to load assets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllNodeAssets();
  }, []);

  const filteredAssets = assets.filter((asset) => {
    return (
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.nodeName && asset.nodeName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted/50 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
          <h3 className="mb-2">Loading assets...</h3>
          <p className="text-muted-foreground">Fetching available Taproot Assets</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <h3 className="mb-2">Error loading assets</h3>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

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
            key={`${asset.nodePubkey}-${asset.id}`}
            className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => onNavigate("asset-detail", { 
              assetId: asset.id,
              nodePubkey: asset.nodePubkey 
            })}
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
                    {asset.symbol} • {asset.status}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg text-primary mb-1">
                  Available: {parseInt(asset.available).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Supply: {parseInt(asset.totalSupply).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {asset.nodeName}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  {asset.nodeRating}
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {asset.nodeTrades} trades
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAssets.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted/50 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2">No assets found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery ? 'Try searching for something else' : 'No assets are currently available. This could be because no nodes are registered or nodes have no assets listed.'}
          </p>
          <div className="flex gap-4 justify-center">
            {searchQuery && (
              <button
                className="px-4 py-2 border border-border text-foreground hover:bg-accent rounded-lg transition-colors"
                onClick={() => setSearchQuery("")}
              >
                Clear Search
              </button>
            )}
            {!searchQuery && (
              <button
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
                onClick={() => onNavigate("register-node")}
              >
                Register Your Node
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}