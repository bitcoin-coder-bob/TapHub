import { Zap, Shield, Network, Copy, Plus, CheckCircle } from "lucide-react";
import { albyAuth, AlbyUser } from "../services/albyAuth";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface NodeProfilePageProps {
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

export function NodeProfilePage({
  onNavigate: _onNavigate,
}: NodeProfilePageProps) {
  const [user, setUser] = useState<AlbyUser | null>(null);
  const [walletInfo, setWalletInfo] = useState<{ alias?: string; balance?: number; pubkey?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Invoice creation state
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [createdInvoice, setCreatedInvoice] = useState<{ invoice: string; payment_hash: string } | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

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

  // Handle invoice creation
  const handleCreateInvoice = async () => {
    if (!invoiceAmount || isNaN(Number(invoiceAmount)) || Number(invoiceAmount) <= 0) {
      alert('Please enter a valid amount in sats');
      return;
    }

    setIsCreatingInvoice(true);
    try {
      const amount = Number(invoiceAmount);
      const description = invoiceDescription || `Payment request from ${user?.alias || 'TapHub'}`;
      
      const invoice = await albyAuth.makeInvoice(amount, description);
      setCreatedInvoice(invoice);
      
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(invoice.invoice, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrDataUrl);
      
    } catch (error) {
      console.error('Failed to create invoice:', error);
      alert(`Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  // Handle copy to clipboard
  const handleCopyInvoice = async () => {
    if (!createdInvoice) return;
    
    try {
      await navigator.clipboard.writeText(createdInvoice.invoice);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy invoice:', error);
      alert('Failed to copy invoice to clipboard');
    }
  };

  // Reset invoice form
  const resetInvoiceForm = () => {
    setShowInvoiceForm(false);
    setInvoiceAmount("");
    setInvoiceDescription("");
    setCreatedInvoice(null);
    setQrCodeDataUrl(null);
    setCopyStatus('idle');
  };

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

      {/* Invoice Creation for Node Runners */}
      {user.type === 'node' && albyAuth.isAuthenticated() && (
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl">Create Lightning Invoice</h2>
            {!showInvoiceForm && !createdInvoice && (
              <button
                onClick={() => setShowInvoiceForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Invoice
              </button>
            )}
          </div>

          {showInvoiceForm && !createdInvoice && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Amount (sats)</label>
                <input
                  type="number"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  placeholder="Enter amount in sats"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description (optional)</label>
                <input
                  type="text"
                  value={invoiceDescription}
                  onChange={(e) => setInvoiceDescription(e.target.value)}
                  placeholder="Payment description"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateInvoice}
                  disabled={isCreatingInvoice || !invoiceAmount}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreatingInvoice ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {isCreatingInvoice ? 'Creating...' : 'Create Invoice'}
                </button>
                <button
                  onClick={resetInvoiceForm}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {createdInvoice && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Invoice Created Successfully!</span>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* QR Code */}
                <div className="flex flex-col items-center space-y-3">
                  <h3 className="text-lg font-medium">QR Code</h3>
                  {qrCodeDataUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={qrCodeDataUrl} 
                      alt="Invoice QR Code" 
                      className="border border-border rounded-lg"
                    />
                  )}
                  <p className="text-sm text-muted-foreground text-center">
                    Scan with a Lightning wallet
                  </p>
                </div>

                {/* Invoice Details */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium">Invoice Details</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-mono">{invoiceAmount} sats</p>
                    </div>
                    {invoiceDescription && (
                      <div>
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p className="text-sm">{invoiceDescription}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Hash</p>
                      <p className="font-mono text-xs break-all">{createdInvoice.payment_hash}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice String and Copy */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium">Lightning Invoice</h3>
                <div className="relative">
                  <textarea
                    value={createdInvoice.invoice}
                    readOnly
                    className="w-full h-24 px-3 py-2 border border-border rounded-lg bg-accent/50 font-mono text-xs resize-none"
                  />
                  <button
                    onClick={handleCopyInvoice}
                    className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-background border border-border rounded text-xs hover:bg-accent transition-colors"
                  >
                    {copyStatus === 'copied' ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={resetInvoiceForm}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Another Invoice
              </button>
            </div>
          )}
        </div>
      )}

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
        
        {currentNetwork.name === 'regtest' && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Network className="w-4 h-4" />
              <span className="text-sm font-medium">Testing on {currentNetwork.displayName}</span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
              You&apos;re connected to the regtest network. Perfect for development and testing your Lightning setup!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}