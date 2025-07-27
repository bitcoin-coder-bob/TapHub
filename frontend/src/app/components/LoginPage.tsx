import { useState, useEffect } from "react";
import { Zap, User, Server, ArrowRight, Wallet, AlertCircle, Network } from "lucide-react";
import { albyAuth, AlbyUser, NetworkConfig } from "../services/albyAuth";

interface LoginPageProps {
  onNavigate: (page: string) => void;
  onLogin: (userType: 'user' | 'node', userData: AlbyUser) => void;
}

export function LoginPage({ onNavigate, onLogin }: LoginPageProps) {
  const [authType, setAuthType] = useState<'user' | 'node'>('user');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nwcCredentials, setNwcCredentials] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkConfig>(albyAuth.getCurrentNetwork());
  
  // Check for existing credentials on mount
  useEffect(() => {
    const storedCredentials = albyAuth.getStoredCredentials();
    if (storedCredentials) {
      setNwcCredentials(storedCredentials);
    }
  }, []);

  const handleAlbyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (!nwcCredentials.trim()) {
        throw new Error('Please enter your Nostr Wallet Connect credentials');
      }

      // Set the selected network before connecting
      albyAuth.setNetwork(selectedNetwork.name);
      
      const user = await albyAuth.connectWithAlby(nwcCredentials);
      onLogin(user.type, user);
      
      // Navigate based on user type
      if (user.type === 'node') {
        onNavigate('dashboard');
      } else {
        onNavigate('discover');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect with Alby');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (!nwcCredentials.trim()) {
        throw new Error('Please enter your Nostr Wallet Connect credentials');
      }

      // Set the selected network before connecting
      albyAuth.setNetwork(selectedNetwork.name);
      
      // First connect as a user
      const user = await albyAuth.connectWithAlby(nwcCredentials);
      
      // Then register as a node
      const nodeUser = await albyAuth.registerAsNode({
        pubkey: user.pubkey,
        alias: 'Node Runner',
        credentials: nwcCredentials
      });
      
      onLogin('node', nodeUser);
      onNavigate('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register as node');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl mb-2">Sign In to TapHub</h1>
        <p className="text-muted-foreground">
          Connect your Alby wallet to access the Lightning Network marketplace
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        {/* Auth Type Toggle */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg mb-6">
          <button
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors ${
              authType === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setAuthType('user')}
          >
            <User className="w-4 h-4" />
            User
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors ${
              authType === 'node'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setAuthType('node')}
          >
            <Server className="w-4 h-4" />
            Node Runner
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {/* Network Selector */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-4 h-4 text-primary" />
            <label className="block text-sm font-medium">Network</label>
          </div>
          <div className="space-y-2">
            {albyAuth.getAvailableNetworks().map((network) => (
              <label key={network.name} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="network"
                  value={network.name}
                  checked={selectedNetwork.name === network.name}
                  onChange={() => setSelectedNetwork(network)}
                  className="w-4 h-4 text-primary"
                />
                <div>
                  <div className="text-sm font-medium">{network.displayName}</div>
                  <div className="text-xs text-muted-foreground">{network.description}</div>
                </div>
              </label>
            ))}
          </div>
          {selectedNetwork.name === 'mutinynet' && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">Mutinynet Selected</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                Perfect for testing! Get test sats from{' '}
                <a 
                  href="https://faucet.mutinynet.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  faucet.mutinynet.com
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Alby Connection Form */}
        <form onSubmit={authType === 'user' ? handleAlbyLogin : handleNodeRegistration} className="space-y-4">
          <div>
            <label className="block text-sm mb-2">Nostr Wallet Connect Credentials</label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={nwcCredentials}
                onChange={(e) => setNwcCredentials(e.target.value)}
                placeholder="nostr+walletconnect://..."
                className="w-full pl-10 pr-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Get your NWC credentials from Alby Hub, coinos, Primal, or other NWC-enabled wallets
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {authType === 'user' ? 'Connect Wallet' : 'Register as Node'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {authType === 'user' 
              ? 'Connect your Alby wallet to browse and purchase Taproot Assets from verified Lightning nodes.'
              : 'Register your Lightning node to list assets for sale and access the seller dashboard. You&apos;ll need NWC credentials from your node.'
            }
          </p>
        </div>

        {/* Switch Auth Type */}
        <div className="mt-6 text-center">
          <button
            className="text-sm text-primary hover:underline"
            onClick={() => setAuthType(authType === 'user' ? 'node' : 'user')}
          >
            {authType === 'user' 
              ? 'Are you a Lightning node operator? Register here'
              : 'Regular user? Connect your wallet instead'
            }
          </button>
        </div>

        {/* Help Links */}
        <div className="mt-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have NWC credentials?{' '}
            <a 
              href="https://nwc.getalby.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Get them from Alby Hub
            </a>
          </p>
          <p className="text-sm text-muted-foreground">
            Need help?{' '}
            <button
              className="text-primary hover:underline"
              onClick={() => onNavigate('register')}
            >
              View setup guide
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}