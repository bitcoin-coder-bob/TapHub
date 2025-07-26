import { useState } from "react";
import { Zap, User, Server, Eye, EyeOff, ArrowRight } from "lucide-react";

interface LoginPageProps {
  onNavigate: (page: string) => void;
  onLogin: (userType: 'user' | 'node', userData: any) => void;
}

export function LoginPage({ onNavigate, onLogin }: LoginPageProps) {
  const [authType, setAuthType] = useState<'user' | 'node'>('user');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [userForm, setUserForm] = useState({
    email: '',
    password: ''
  });
  
  const [nodeForm, setNodeForm] = useState({
    pubkey: '',
    signature: '',
    message: ''
  });

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate authentication
    setTimeout(() => {
      onLogin('user', { email: userForm.email, type: 'user' });
      setIsLoading(false);
      onNavigate('discover');
    }, 1000);
  };

  const handleNodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate node authentication
    setTimeout(() => {
      onLogin('node', { 
        pubkey: nodeForm.pubkey, 
        type: 'node',
        alias: 'Node Operator'
      });
      setIsLoading(false);
      onNavigate('dashboard');
    }, 1000);
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl mb-2">Sign In to TapHub</h1>
        <p className="text-muted-foreground">
          Access your Lightning Network marketplace
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

        {/* User Login Form */}
        {authType === 'user' && (
          <form onSubmit={handleUserLogin} className="space-y-4">
            <div>
              <label className="block text-sm mb-2">Email</label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                placeholder="your@email.com"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2 pr-10 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Node Runner Login Form */}
        {authType === 'node' && (
          <form onSubmit={handleNodeLogin} className="space-y-4">
            <div>
              <label className="block text-sm mb-2">Node Public Key</label>
              <input
                type="text"
                value={nodeForm.pubkey}
                onChange={(e) => setNodeForm({...nodeForm, pubkey: e.target.value})}
                placeholder="03a1b2c3d4e5f6789abcdef..."
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Authentication Message</label>
              <input
                type="text"
                value={nodeForm.message}
                onChange={(e) => setNodeForm({...nodeForm, message: e.target.value})}
                placeholder="TapHub-login-2024"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Signature</label>
              <textarea
                value={nodeForm.signature}
                onChange={(e) => setNodeForm({...nodeForm, signature: e.target.value})}
                placeholder="Cryptographic signature proving node ownership..."
                rows={3}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm resize-none"
                required
              />
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
                  <Zap className="w-4 h-4" />
                  Verify & Sign In
                </>
              )}
            </button>
          </form>
        )}

        {/* Help Text */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {authType === 'user' 
              ? 'Regular users can browse and purchase Taproot Assets from verified Lightning nodes.'
              : 'Node runners can list assets for sale and access the seller dashboard. Sign the authentication message with your node\'s private key to verify ownership.'
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
              ? 'Are you a Lightning node operator? Sign in here'
              : 'Regular user? Sign in with email instead'
            }
          </button>
        </div>

        {/* Register Links */}
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <button
              className="text-primary hover:underline"
              onClick={() => onNavigate('register')}
            >
              Register your node
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}