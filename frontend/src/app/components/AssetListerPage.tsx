import { useState } from "react";
import { 
  Zap, 
  Star, 
  Shield, 
  TrendingUp, 
  Users, 
  Clock, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Bitcoin,
  BarChart3
} from "lucide-react";

interface NodeRunnerPageProps {
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
  nodeId?: string;
}

interface NodeRunner {
  id: string;
  name: string;
  alias: string;
  pubkey: string;
  rating: number;
  totalTrades: number;
  uptime: number;
  capacity: string;
  channels: number;
  lastSeen: string;
  joinedDate: string;
  isVerified: boolean;
  description: string;
  location: string;
  fees: {
    base: number;
    rate: number;
  };
  assets: Array<{
    id: string;
    name: string;
    symbol: string;
    type: string;
    price: string;
    priceUnit: string;
    available: string;
    trades: number;
    volume24h: string;
  }>;
  performance: {
    totalVolume: string;
    avgTradeSize: string;
    successRate: number;
    avgResponseTime: string;
  };
  recentTrades: Array<{
    id: string;
    asset: string;
    amount: string;
    price: string;
    timestamp: string;
    type: 'buy' | 'sell';
  }>;
}

export function AssetListerPage({ onNavigate, nodeId }: NodeRunnerPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'trades' | 'analytics'>('overview');

  // Mock data for different node runners
  const getNodeRunnerData = (id: string): NodeRunner => {
    const nodeRunners: Record<string, NodeRunner> = {
      "1": {
        id: "1",
        name: "⚡ Lightning Trader Pro",
        alias: "lightning_trader_pro",
        pubkey: "03a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789ab",
        rating: 4.8,
        totalTrades: 892,
        uptime: 99.7,
        capacity: "5.2 BTC",
        channels: 47,
        lastSeen: "2 min ago",
        joinedDate: "March 2023",
        isVerified: true,
        description: "Professional Lightning Network node operator specializing in Taproot Assets trading. Providing reliable, fast, and secure trading infrastructure for the Bitcoin ecosystem.",
        location: "Frankfurt, Germany",
        fees: {
          base: 1,
          rate: 0.0001
        },
        assets: [
          {
            id: "1",
            name: "Stablecoin USD",
            symbol: "SUSD",
            type: "Stablecoin",
            price: "1.00",
            priceUnit: "USD",
            available: "1,000,000",
            trades: 156,
            volume24h: "45,230 USD"
          }
        ],
        performance: {
          totalVolume: "2.4 BTC",
          avgTradeSize: "0.0027 BTC",
          successRate: 99.2,
          avgResponseTime: "45ms"
        },
        recentTrades: [
          {
            id: "1",
            asset: "SUSD",
            amount: "100",
            price: "1.00 USD",
            timestamp: "2 min ago",
            type: "buy"
          }
        ]
      },
      "2": {
        id: "2",
        name: "🎨 Artist Pro",
        alias: "artist_pro",
        pubkey: "02b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789abcd",
        rating: 4.9,
        totalTrades: 456,
        uptime: 98.9,
        capacity: "2.1 BTC",
        channels: 23,
        lastSeen: "5 min ago",
        joinedDate: "January 2024",
        isVerified: true,
        description: "Creative NFT marketplace node specializing in digital art and collectibles on the Lightning Network.",
        location: "Berlin, Germany",
        fees: {
          base: 2,
          rate: 0.0002
        },
        assets: [
          {
            id: "2",
            name: "Bitcoin Art Token",
            symbol: "BART",
            type: "NFT",
            price: "0.001",
            priceUnit: "BTC",
            available: "50",
            trades: 89,
            volume24h: "0.23 BTC"
          }
        ],
        performance: {
          totalVolume: "1.8 BTC",
          avgTradeSize: "0.0039 BTC",
          successRate: 98.5,
          avgResponseTime: "52ms"
        },
        recentTrades: [
          {
            id: "2",
            asset: "BART",
            amount: "5",
            price: "0.001 BTC",
            timestamp: "5 min ago",
            type: "sell"
          }
        ]
      },
      "3": {
        id: "3",
        name: "🎮 Game Central",
        alias: "game_central",
        pubkey: "03c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789abce",
        rating: 4.6,
        totalTrades: 1234,
        uptime: 99.1,
        capacity: "3.8 BTC",
        channels: 34,
        lastSeen: "1 min ago",
        joinedDate: "November 2023",
        isVerified: false,
        description: "Gaming-focused node providing in-game currency and digital assets for the gaming community.",
        location: "Amsterdam, Netherlands",
        fees: {
          base: 1,
          rate: 0.0001
        },
        assets: [
          {
            id: "3",
            name: "Gaming Credits",
            symbol: "GAME",
            type: "Utility",
            price: "0.00025",
            priceUnit: "BTC",
            available: "500,000",
            trades: 234,
            volume24h: "0.15 BTC"
          }
        ],
        performance: {
          totalVolume: "3.2 BTC",
          avgTradeSize: "0.0026 BTC",
          successRate: 99.8,
          avgResponseTime: "38ms"
        },
        recentTrades: [
          {
            id: "3",
            asset: "GAME",
            amount: "1000",
            price: "0.00025 BTC",
            timestamp: "8 min ago",
            type: "buy"
          }
        ]
      },
      "4": {
        id: "4",
        name: "⚡ Energy Grid",
        alias: "energy_grid",
        pubkey: "04d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789abcf",
        rating: 4.7,
        totalTrades: 678,
        uptime: 99.5,
        capacity: "4.5 BTC",
        channels: 41,
        lastSeen: "3 min ago",
        joinedDate: "February 2024",
        isVerified: true,
        description: "Energy sector node facilitating renewable energy token trading and carbon credit markets.",
        location: "Stockholm, Sweden",
        fees: {
          base: 1,
          rate: 0.0001
        },
        assets: [
          {
            id: "4",
            name: "Energy Token",
            symbol: "ENRG",
            type: "Commodity",
            price: "0.0005",
            priceUnit: "BTC",
            available: "75,000",
            trades: 127,
            volume24h: "0.08 BTC"
          }
        ],
        performance: {
          totalVolume: "1.9 BTC",
          avgTradeSize: "0.0028 BTC",
          successRate: 99.1,
          avgResponseTime: "41ms"
        },
        recentTrades: [
          {
            id: "4",
            asset: "ENRG",
            amount: "500",
            price: "0.0005 BTC",
            timestamp: "10 min ago",
            type: "buy"
          }
        ]
      }
    };

    return nodeRunners[id] || nodeRunners["1"];
  };

  const nodeRunner = getNodeRunnerData(nodeId || "1");

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'assets', label: 'Assets', icon: Bitcoin },
    { id: 'trades', label: 'Recent Trades', icon: Activity },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Node Header */}
      <div className="mb-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-lightning-orange to-bitcoin-yellow rounded-lg flex items-center justify-center">
                <span className="text-black text-xl">LN</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl">{nodeRunner.name}</h1>
                  {nodeRunner.isVerified && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-bitcoin-yellow fill-current" />
                    <span>{nodeRunner.rating}</span>
                    <span>({nodeRunner.totalTrades} trades)</span>
                  </div>
                  <span>•</span>
                  <span>Joined {nodeRunner.joinedDate}</span>
                  <span>•</span>
                  <span>{nodeRunner.location}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                  {nodeRunner.description}
                </p>
              </div>
            </div>
          </div>

          {/* Pubkey */}
          <div className="mt-6 p-3 bg-accent/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Public Key</p>
                <p className="font-mono text-sm break-all">{nodeRunner.pubkey}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Uptime</p>
              <p className="text-xl">{nodeRunner.uptime}%</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lightning-orange/20 rounded-lg flex items-center justify-center">
              <Bitcoin className="w-5 h-5 text-lightning-orange" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Capacity</p>
              <p className="text-xl">{nodeRunner.capacity}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Channels</p>
              <p className="text-xl">{nodeRunner.channels}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Seen</p>
              <p className="text-xl">{nodeRunner.lastSeen}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-muted/50 p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'assets' | 'trades' | 'analytics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-card border border-border rounded-lg p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl mb-4">Performance Overview</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-accent/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Total Volume</p>
                  <p className="text-lg font-semibold">{nodeRunner.performance.totalVolume}</p>
                </div>
                <div className="bg-accent/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Avg Trade Size</p>
                  <p className="text-lg font-semibold">{nodeRunner.performance.avgTradeSize}</p>
                </div>
                <div className="bg-accent/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Success Rate</p>
                  <p className="text-lg font-semibold">{nodeRunner.performance.successRate}%</p>
                </div>
                <div className="bg-accent/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Avg Response</p>
                  <p className="text-lg font-semibold">{nodeRunner.performance.avgResponseTime}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg mb-3">Fee Structure</h3>
              <div className="bg-accent/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span>Base Fee:</span>
                  <span className="font-mono">{nodeRunner.fees.base} sat</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span>Rate:</span>
                  <span className="font-mono">{nodeRunner.fees.rate * 1000000} ppm</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div>
            <h2 className="text-xl mb-4">Assets ({nodeRunner.assets.length})</h2>
            <div className="space-y-4">
              {nodeRunner.assets.map((asset) => (
                <div
                  key={asset.id}
                  className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => onNavigate("asset-detail", { assetId: asset.id })}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                        <span className="text-primary">{asset.symbol.slice(0, 2)}</span>
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
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {asset.trades} trades
                    </div>
                    <div>24h Volume: {asset.volume24h}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'trades' && (
          <div>
            <h2 className="text-xl mb-4">Recent Trades</h2>
            <div className="space-y-3">
              {nodeRunner.recentTrades.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      trade.type === 'buy' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {trade.type === 'buy' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{trade.asset}</p>
                      <p className="text-sm text-muted-foreground">{trade.timestamp}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{trade.amount}</p>
                    <p className="text-sm text-muted-foreground">{trade.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <h2 className="text-xl mb-4">Trading Analytics</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-accent/50 rounded-lg p-4">
                <h3 className="text-lg mb-3">Volume Trends</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Last 24h:</span>
                    <span className="font-mono">0.45 BTC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last 7d:</span>
                    <span className="font-mono">2.1 BTC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last 30d:</span>
                    <span className="font-mono">8.7 BTC</span>
                  </div>
                </div>
              </div>
              <div className="bg-accent/50 rounded-lg p-4">
                <h3 className="text-lg mb-3">Asset Distribution</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Stablecoins:</span>
                    <span>45%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>NFTs:</span>
                    <span>30%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Utility:</span>
                    <span>25%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 