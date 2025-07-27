import { useState, useEffect } from "react";
import { Zap, User, Server, ArrowRight, Wallet, AlertCircle, Network, CheckCircle, X } from "lucide-react";
import { auth, User as AuthUser, NetworkConfig } from "../services/auth";

interface LoginPageProps {
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
  onLogin: (userType: 'user' | 'node', userData: AuthUser) => void;
}

export function LoginPage({ onNavigate, onLogin }: LoginPageProps) {
  const [authType, setAuthType] = useState<'user' | 'node'>('user');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nwcCredentials, setNwcCredentials] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkConfig>(auth.getCurrentNetwork());
  const [connectionTest, setConnectionTest] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  
  // New authentication flow states
  const [authMethod, setAuthMethod] = useState<'nwc' | 'signature'>('signature');
  const [challenge, setChallenge] = useState<string>('');
  const [signature, setSignature] = useState<string>('');
  const [challengeMessage, setChallengeMessage] = useState<string>('');
  
  // Check for existing credentials on mount
  useEffect(() => {
    const storedCredentials = auth.getStoredCredentials();
    if (storedCredentials) {
      setNwcCredentials(storedCredentials);
    }
  }, []);

  // Test connection when credentials change
  useEffect(() => {
    if (nwcCredentials.trim() && nwcCredentials.startsWith('nostr+walletconnect://')) {
      testConnection();
    } else {
      setConnectionTest('idle');
      setTestError(null);
    }
  }, [nwcCredentials]);

  const testConnection = async () => {
    setConnectionTest('testing');
    setTestError(null);
    
    try {
      // Mock connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (nwcCredentials.includes('mock') || nwcCredentials.length > 10) {
        setConnectionTest('success');
      } else {
        throw new Error('Invalid credentials format');
      }
    } catch (error) {
      setConnectionTest('error');
      setTestError(error instanceof Error ? error.message : 'Connection test failed');
    }
  };

  const generateChallenge = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await auth.generateChallenge();
      setChallenge(result.challenge);
      setChallengeMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate challenge');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlbyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (authMethod === 'nwc') {
        if (!nwcCredentials.trim()) {
          throw new Error('Please enter your Nostr Wallet Connect credentials');
        }

        // Set the selected network before connecting
        auth.setNetwork(selectedNetwork.name);
        
        const user = await auth.connectWithCredentials(nwcCredentials);
        onLogin(user.type, user);
        
        // Navigate based on user type
        if (user.type === 'node') {
          onNavigate('dashboard');
        } else {
          onNavigate('discover');
        }
      } else {
        // Signature-based authentication
        if (!challenge.trim()) {
          throw new Error('Please generate a challenge first');
        }
        if (!signature.trim()) {
          throw new Error('Please paste your signature');
        }

        // Set the selected network before connecting
        auth.setNetwork(selectedNetwork.name);
        
        const user = await auth.authenticateWithSignature(challenge, signature);
        onLogin(user.type, user);
        
        // Navigate based on user type
        if (user.type === 'node') {
          onNavigate('dashboard');
        } else {
          onNavigate('discover');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigate to RegisterNodePage with pre-filled credentials
    onNavigate('register', { nwcCredentials, selectedNetwork });
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl mb-2">Sign In to TapHub</h1>
        <p className="text-muted-foreground">
          Connect your Lightning wallet to access the Lightning Network marketplace
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

        {/* Authentication Method Toggle (only for users) */}
        {authType === 'user' && (
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg mb-6">
            <button
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors ${
                authMethod === 'signature'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setAuthMethod('signature')}
            >
              <Zap className="w-4 h-4" />
              Lightning CLI
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors ${
                authMethod === 'nwc'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setAuthMethod('nwc')}
            >
              <Wallet className="w-4 h-4" />
              NWC Wallet
            </button>
          </div>
        )}

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
            {auth.getAvailableNetworks().map((network) => (
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
          {selectedNetwork.name === 'regtest' && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">Regtest Selected</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                Perfect for testing! Using local regtest environment with Polar setup.
              </p>
            </div>
          )}
        </div>

        {/* Authentication Form */}
        <form onSubmit={authType === 'user' ? handleAlbyLogin : handleNodeRegistration} className="space-y-4">
          {authType === 'user' && authMethod === 'signature' ? (
            // Signature-based authentication form
            <>
              {/* Challenge Generation */}
              <div>
                <label className="block text-sm mb-2">Authentication Challenge</label>
                <div className="space-y-3">
                  {!challenge ? (
                    <button
                      type="button"
                      onClick={generateChallenge}
                      disabled={isLoading}
                      className="w-full px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Generate Challenge
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium">Challenge Message:</div>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(challenge)}
                            className="text-xs text-primary hover:text-primary/80 transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="font-mono text-xs bg-background p-2 rounded border break-all">
                          {challenge}
                        </div>
                      </div>
                      
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                          <Zap className="w-4 h-4" />
                          <span className="text-sm font-medium">Next Steps:</span>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-300 space-y-1">
                          <p>1. Copy the challenge message above</p>
                          <p>2. Run in your Lightning CLI:</p>
                          <div className="relative">
                            <code className="block bg-blue-100 dark:bg-blue-900/30 p-1 rounded font-mono pr-12">
                              lncli signmessage &quot;{challenge}&quot;
                            </code>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(`lncli signmessage "${challenge}"`)}
                              className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                            >
                              Copy
                            </button>
                          </div>
                          <p>3. Paste the signature below</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Signature Input */}
              <div>
                <label className="block text-sm mb-2">Signature</label>
                <div className="relative">
                  <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Paste your signature here..."
                    className="w-full pl-10 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                    required
                    disabled={!challenge}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Paste the signature from your Lightning CLI
                </p>
              </div>
            </>
          ) : (
            // NWC authentication form
            <div>
              <label className="block text-sm mb-2">Nostr Wallet Connect Credentials</label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={nwcCredentials}
                  onChange={(e) => setNwcCredentials(e.target.value)}
                  placeholder="nostr+walletconnect://..."
                  className="w-full pl-10 pr-10 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                  required
                />
                {/* Connection Status Indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {connectionTest === 'testing' && (
                    <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                  )}
                  {connectionTest === 'success' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {connectionTest === 'error' && (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
              
              {/* Connection Test Results */}
              {connectionTest === 'success' && (
                <div className="mt-2 flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Connection verified successfully</span>
                </div>
              )}
              {connectionTest === 'error' && testError && (
                <div className="mt-2 flex items-center gap-2 text-red-600 dark:text-red-400">
                  <X className="w-4 h-4" />
                  <span className="text-sm">{testError}</span>
                </div>
              )}
              {connectionTest === 'testing' && (
                <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Testing connection...</span>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-1">
                Get your NWC credentials from supported Lightning wallets
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || 
              (authType === 'user' && authMethod === 'nwc' && nwcCredentials.trim() !== '' && connectionTest !== 'success') ||
              (authType === 'user' && authMethod === 'signature' && (!challenge || !signature.trim()))
            }
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
              ? authMethod === 'signature' 
                ? 'Sign a challenge message with your Lightning CLI to authenticate and browse Taproot Assets from verified Lightning nodes.'
                : 'Connect your Lightning wallet to browse and purchase Taproot Assets from verified Lightning nodes.'
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
          {authType === 'user' && authMethod === 'signature' ? (
            <>
              <p className="text-sm text-muted-foreground">
                Don&apos;t have Lightning CLI access?{' '}
                <a 
                  href="https://lightning.readthedocs.io/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Learn about Lightning CLI
                </a>
              </p>
              <p className="text-sm text-muted-foreground">
                Need help with signing?{' '}
                <button
                  className="text-primary hover:underline"
                  onClick={() => onNavigate('register')}
                >
                  View setup guide
                </button>
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Don&apos;t have NWC credentials?{' '}
                <a 
                  href="https://nwc.dev/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Learn about NWC wallets
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}