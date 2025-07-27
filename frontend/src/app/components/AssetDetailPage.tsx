import { useState, useEffect } from "react";
import { ArrowLeft, Zap, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { auth } from "../services/auth";

interface AssetDetailPageProps {
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
  assetId?: string;
  nodePubkey?: string;
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

interface ChannelDetection {
  channels: string[];
  success: boolean;
  error?: string;
}

export function AssetDetailPage({ onNavigate, assetId, nodePubkey }: AssetDetailPageProps) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channelDetection, setChannelDetection] = useState<ChannelDetection | null>(null);
  const [isDetectingChannel, setIsDetectingChannel] = useState(false);
  const [userPubkey, setUserPubkey] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Get user's pubkey
  useEffect(() => {
    const user = auth.getCurrentUser();
    if (user && user.pubkey) {
      setUserPubkey(user.pubkey);
      setIsAuthenticated(true);
    } else {
      setError("Please connect your wallet to view asset details");
      setIsLoading(false);
    }
  }, []);

  // Fetch asset details
  useEffect(() => {
    const fetchAssetDetails = async () => {
      if (!assetId || !nodePubkey) {
        setError("Asset ID and Node Pubkey are required");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/verfiedNodes/getNodeAssets?nodePubkey=${nodePubkey}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch asset details');
        }

        const nodeAssets: NodeAsset = await response.json();
        
        // Check if node has any assets
        if (!nodeAssets.assets || nodeAssets.assets.length === 0) {
          setError('no-assets-registered');
          setIsLoading(false);
          return;
        }
        
        const foundAsset = nodeAssets.assets.find(a => a.id === assetId);

        if (!foundAsset) {
          throw new Error('Asset not found');
        }

        setAsset(foundAsset);
      } catch (error) {
        console.error('Error fetching asset details:', error);
        setError('Failed to load asset details');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchAssetDetails();
    }
  }, [assetId, nodePubkey, isAuthenticated]);

  // Detect channel between user and node
  const detectChannel = async () => {
    if (!userPubkey || !nodePubkey) {
      setError("User pubkey or node pubkey not available");
      return;
    }

    try {
      setIsDetectingChannel(true);
      setError(null);

      const response = await fetch('/api/detectChannels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pk1: userPubkey,
          pk2: nodePubkey
        })
      });

      if (!response.ok) {
        throw new Error('Failed to detect channel');
      }

      const result: ChannelDetection = await response.json();
      setChannelDetection(result);
    } catch (error) {
      console.error('Error detecting channel:', error);
      setError('Failed to detect channel');
    } finally {
      setIsDetectingChannel(false);
    }
  };

  // Auto-detect channel when component loads
  useEffect(() => {
    if (userPubkey && nodePubkey && !channelDetection && isAuthenticated) {
      detectChannel();
    }
  }, [userPubkey, nodePubkey, isAuthenticated]);

  const handleOpenChannel = () => {
    // In a real implementation, this would open a channel creation flow
    alert(`Opening channel with node ${nodePubkey?.slice(0, 8)}...`);
  };

  const handleConnectWallet = () => {
    onNavigate("login");
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
          <h3 className="mb-2">Wallet Connection Required</h3>
          <p className="text-muted-foreground mb-6">
            Please connect your wallet to view asset details and check channel status
          </p>
          <button
            onClick={handleConnectWallet}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted/50 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
          <h3 className="mb-2">Loading asset details...</h3>
          <p className="text-muted-foreground">Fetching asset information</p>
        </div>
      </div>
    );
  }

  if (error === 'no-assets-registered') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-blue-500 text-2xl">📦</span>
          </div>
          <h3 className="mb-2">No Assets Available</h3>
          <p className="text-muted-foreground mb-6">
            There are currently no nodes registered with assets in the database. Check back later or register your own node.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
              onClick={() => onNavigate("register-node")}
            >
              Register Node
            </button>
            <button
              className="px-4 py-2 border border-border hover:bg-accent rounded-lg transition-colors"
              onClick={() => onNavigate("discover")}
            >
              Back to Discovery
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <h3 className="mb-2">Error loading asset</h3>
          <p className="text-muted-foreground mb-6">{error || 'Asset not found'}</p>
          <button
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
            onClick={() => onNavigate("discover")}
          >
            Back to Assets
          </button>
        </div>
      </div>
    );
  }

  const hasChannel = channelDetection?.channels && channelDetection.channels.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <button
        onClick={() => onNavigate("discover")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Assets
      </button>

      {/* Asset Header */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-primary/20 rounded-lg flex items-center justify-center">
            <span className="text-primary text-2xl">{asset.symbol.slice(0, 2)}</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">{asset.name}</h1>
            <p className="text-muted-foreground">{asset.symbol} • {asset.status}</p>
          </div>
        </div>

        {/* Asset Stats */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-accent/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Available Supply</p>
            <p className="text-2xl font-semibold">{parseInt(asset.available).toLocaleString()}</p>
          </div>
          <div className="bg-accent/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Supply</p>
            <p className="text-2xl font-semibold">{parseInt(asset.totalSupply).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Channel Status */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Channel Status</h2>
        
        {isDetectingChannel ? (
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <span>Detecting channel...</span>
          </div>
        ) : hasChannel ? (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">Channel Open</p>
              <p className="text-sm text-muted-foreground">
                You have an active channel with this node ({channelDetection.channels.length} channels)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-400">No Channel Found</p>
                <p className="text-sm text-muted-foreground">
                  You need to open a Lightning channel with this node to trade assets
                </p>
              </div>
            </div>
            
            <button
              onClick={handleOpenChannel}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
            >
              <Zap className="w-4 h-4" />
              Open Channel with Node
            </button>
          </div>
        )}
      </div>

      {/* Node Information */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Node Information</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Node Public Key</p>
            <p className="font-mono text-sm break-all bg-accent/50 p-2 rounded">
              {nodePubkey}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Your Public Key</p>
            <p className="font-mono text-sm break-all bg-accent/50 p-2 rounded">
              {userPubkey}
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(userPubkey);
                alert('Public key copied to clipboard!');
              }}
              className="mt-2 px-3 py-1 text-xs border border-border rounded hover:bg-accent transition-colors"
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => onNavigate("asset-purchase", { 
            assetId: asset.id, 
            nodePubkey: nodePubkey,
            hasChannel: hasChannel 
          })}
          disabled={!hasChannel}
          className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4" />
          {hasChannel ? 'Purchase Asset' : 'Open Channel First'}
        </button>
        
        <button
          onClick={() => onNavigate("node-profile", { nodePubkey: nodePubkey })}
          className="px-6 py-3 border border-border hover:bg-accent rounded-lg transition-colors flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          View Node Profile
        </button>
      </div>
    </div>
  );
} 