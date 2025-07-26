import { Zap, Star, Shield } from "lucide-react";

interface NodeProfilePageProps {
  onNavigate: (page: string, params?: any) => void;
}

export function NodeProfilePage({
  onNavigate,
}: NodeProfilePageProps) {
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
                  <h1 className="text-2xl">
                    ⚡ Lightning Trader Pro
                  </h1>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Verified
                  </span>
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-bitcoin-yellow fill-current" />
                    <span>4.8</span>
                    <span>(892 trades)</span>
                  </div>
                  <span>•</span>
                  <span>Joined Mar 2023</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pubkey */}
          <div className="mt-6 p-3 bg-accent/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Public Key
                </p>
                <p className="font-mono text-sm break-all">
                  03a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789ab
                </p>
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
              <p className="text-sm text-muted-foreground">
                Uptime
              </p>
              <p className="text-xl">99.7%</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lightning-orange/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-lightning-orange" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Capacity
              </p>
              <p className="text-xl">5.2 BTC</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Channels
              </p>
              <p className="text-xl">47</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Last Seen
              </p>
              <p className="text-xl">2 min ago</p>
            </div>
          </div>
        </div>
      </div>

      {/* Assets */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl mb-4">Assets (3)</h2>
        <p className="text-muted-foreground">
          Node assets and trading history will be displayed
          here.
        </p>
      </div>
    </div>
  );
}