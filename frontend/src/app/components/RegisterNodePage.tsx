import { useState, useEffect } from "react";
import { Zap, Wallet, Server, ArrowRight, ExternalLink, CheckCircle } from "lucide-react";
import { albyAuth, AlbyUser, NetworkConfig } from "../services/albyAuth";

interface RegisterNodePageProps {
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
  onLogin: (userType: 'user' | 'node', userData: AlbyUser) => void;
  params?: Record<string, unknown>;
}

export function RegisterNodePage({ onNavigate, onLogin, params }: RegisterNodePageProps) {
  const [step, setStep] = useState<'setup' | 'register'>(params?.nwcCredentials ? 'register' : 'setup');
  const [formData, setFormData] = useState({
    pubkey: "",
    alias: "",
    description: "",
    nwcCredentials: (params?.nwcCredentials as string) || ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params?.selectedNetwork) {
      const selectedNetwork = params.selectedNetwork as NetworkConfig;
      albyAuth.setNetwork(selectedNetwork.name);
    }
  }, [params?.selectedNetwork]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (!formData.nwcCredentials.trim()) {
        throw new Error('Please enter your Nostr Wallet Connect credentials');
      }

      if (!formData.alias.trim()) {
        throw new Error('Please enter a node alias');
      }

      // First connect with Alby to test credentials and get client
      const user = await albyAuth.connectWithAlby(formData.nwcCredentials);
      
      // Sign a verification message to prove node ownership
      const verificationMessage = `TapHub Node Registration - ${formData.alias} - ${Date.now()}`;
      const signResult = await albyAuth.signMessage(verificationMessage);
      
      if (!signResult.signature) {
        throw new Error('Failed to sign verification message. Please check your NWC credentials.');
      }

      // Then register as a node with signature proof
      const nodeUser = await albyAuth.registerAsNode({
        pubkey: formData.pubkey || user.pubkey,
        alias: formData.alias,
        description: formData.description,
        credentials: formData.nwcCredentials
      });

      // Save the node to the database
      const response = await fetch('/api/verfiedNodes/saveVerifiedNodes', {
        method: 'POST',
        body: JSON.stringify(nodeUser)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save node to database');
      }
      
      onLogin('node', nodeUser);
      onNavigate('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register node');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'setup') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Server className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl mb-2">Register Your Lightning Node</h1>
          <p className="text-muted-foreground">
            Connect your Lightning Network node to start listing Taproot Assets
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Setup Requirements</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Lightning Node</h3>
                    <p className="text-sm text-muted-foreground">
                      A running Lightning Network node (LND, Core Lightning, etc.)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Nostr Wallet Connect</h3>
                    <p className="text-sm text-muted-foreground">
                      NWC credentials to connect your node to Alby
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Taproot Assets</h3>
                    <p className="text-sm text-muted-foreground">
                      Assets you want to list for sale on the marketplace
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h2 className="text-lg font-semibold mb-4">Getting Started</h2>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-medium mb-2">1. Get NWC Credentials</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Connect your Lightning node to Alby Hub to get Nostr Wallet Connect credentials.
                  </p>
                  <a 
                    href="https://nwc.getalby.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
                  >
                    Visit Alby Hub
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-medium mb-2">2. Configure Your Node</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Ensure your Lightning node is properly configured for Taproot Assets and has sufficient liquidity.
                  </p>
                  <a 
                    href="https://docs.lightning.engineering/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
                  >
                    Lightning Documentation
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-medium mb-2">3. Prepare Your Assets</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create or acquire Taproot Assets that you want to list on the marketplace.
                  </p>
                  <a 
                    href="https://docs.taprootassets.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
                  >
                    Taproot Assets Guide
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('register')}
              className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Continue to Registration
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
          <Server className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl mb-2">Register Your Node</h1>
        <p className="text-muted-foreground">
          Connect your Lightning Network node to start listing assets
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm mb-2">Nostr Wallet Connect Credentials</label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={formData.nwcCredentials}
                onChange={(e) => setFormData({...formData, nwcCredentials: e.target.value})}
                placeholder="nostr+walletconnect://..."
                className="w-full pl-10 pr-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Get your NWC credentials from Alby Hub or your Lightning node
            </p>
          </div>

          <div>
            <label className="block text-sm mb-2">Node Public Key (Optional)</label>
            <input
              type="text"
              value={formData.pubkey}
              onChange={(e) => setFormData({...formData, pubkey: e.target.value})}
              placeholder="03a1b2c3d4e5f6789abcdef..."
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Will be extracted from NWC credentials if not provided
            </p>
          </div>

          <div>
            <label className="block text-sm mb-2">Node Alias</label>
            <input
              type="text"
              value={formData.alias}
              onChange={(e) => setFormData({...formData, alias: e.target.value})}
              placeholder="My Lightning Node"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Brief description of your node and the assets you&apos;ll be listing..."
              rows={3}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Verifying & Registering...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Register Node
              </>
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            During registration, we&apos;ll verify your node ownership by having you sign a message with your NWC credentials. 
            This helps maintain trust and security in the TapHub marketplace.
          </p>
        </div>

        <div className="mt-4 text-center">
          <button
            className="text-sm text-primary hover:underline"
            onClick={() => setStep('setup')}
          >
            ← Back to Setup Guide
          </button>
        </div>
      </div>
    </div>
  );
}