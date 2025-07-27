import { Zap, Shield, Network } from "lucide-react";
import { albyAuth, AlbyUser } from "../services/albyAuth";
import { useEffect, useState } from "react";

interface NodeProfilePageProps {
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

export function NodeProfilePage({
  onNavigate: _,
}: NodeProfilePageProps) {
  const [user, setUser] = useState<AlbyUser | null>(null);
  const [walletInfo, setWalletInfo] = useState<{ alias?: string; balance?: number; pubkey?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = albyAuth.getCurrentUser();
        setUser(currentUser);
        
        if (currentUser && albyAuth.isAuthenticated()) {
          try {
            const info = await albyAuth.getWalletInfo();
            setWalletInfo(info);
          } catch (error) {
            console.log('Could not fetch wallet info:', error);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <h1 className="text-2xl mb-4">Not Connected</h1>
          <p className="text-muted-foreground">Please connect your wallet to view your profile.</p>
        </div>
      </div>
    );
  }

  const currentNetwork = albyAuth.getCurrentNetwork();
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
                    ⚡ {user.alias || user.email || 'Lightning User'}
                  </h1>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Connected
                  </span>
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Network className="w-4 h-4 text-primary" />
                    <span>{currentNetwork.displayName}</span>
                  </div>
                  <span>•</span>
                  <span>{user.type === 'node' ? 'Node Runner' : 'User'}</span>
                  {user.description && (
                    <>
                      <span>•</span>
                      <span>{user.description}</span>
                    </>
                  )}
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
                  {user.pubkey}
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
                Connection
              </p>
              <p className="text-xl">
                {albyAuth.isAuthenticated() ? 'Connected' : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <Network className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Network
              </p>
              <p className="text-xl">{currentNetwork.name}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                User Type
              </p>
              <p className="text-xl">{user.type === 'node' ? 'Node' : 'User'}</p>
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
                Wallet
              </p>
              <p className="text-xl">{walletInfo?.alias || 'Connected'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Assets */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl mb-4">
          {user.type === 'node' ? 'Listed Assets' : 'Activity'} (0)
        </h2>
        <p className="text-muted-foreground">
          {user.type === 'node' 
            ? 'Your Taproot Assets available for sale will be displayed here. Connect your Lightning node to start listing assets.'
            : 'Your purchase history and asset transactions will be displayed here.'
          }
        </p>
        
        {currentNetwork.name === 'mutinynet' && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Network className="w-4 h-4" />
              <span className="text-sm font-medium">Testing on {currentNetwork.displayName}</span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
              You&apos;re connected to the test network. Perfect for development and testing your Lightning setup!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}