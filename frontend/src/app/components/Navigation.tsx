import { useState, useEffect } from "react";
import { Zap, Search, Settings, Menu, X, User, LogOut, Wallet, Circle, History, RefreshCw } from "lucide-react";

import { AlbyUser, albyAuth, ConnectionState } from "../services/albyAuth";
// import Image from "next/image";

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  user?: AlbyUser | null;
  onLogout?: () => void;
}



export function Navigation({ currentPage, onNavigate, user, onLogout }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBalance();
      // Subscribe to connection state changes
      const unsubscribe = albyAuth.onConnectionStateChange(setConnectionState);
      // Get initial state
      setConnectionState(albyAuth.getConnectionState());
      return unsubscribe;
    } else {
      setBalance(null);
      setBalanceError(null);
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isUserDropdownOpen) {
        const target = event.target as Element;
        if (target && !target.closest('[data-dropdown]')) {
          setIsUserDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserDropdownOpen]);

  // Refresh balance when connection is restored
  useEffect(() => {
    if (connectionState === 'connected' && user) {
      fetchBalance();
    }
  }, [connectionState, user]);

  const fetchBalance = async () => {
    try {
      const balanceMsat = await albyAuth.getBalance();
      setBalance(balanceMsat);
      setBalanceError(null);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setBalanceError('Balance unavailable');
    }
  };

  const handleReconnectWallet = async () => {
    setIsReconnecting(true);
    try {
      const credentials = albyAuth.getStoredCredentials();
      if (credentials) {
        await albyAuth.connectWithAlby(credentials);
        await fetchBalance();
      }
    } catch (error) {
      console.error('Reconnection failed:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  const navItems = [
    { id: "home", label: "Home" },
    { id: "discover", label: "Browse", icon: Search },
    { id: "dashboard", label: "List", icon: Settings },
  ];

  return (
    <nav className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
            onClick={() => onNavigate("home")}
          >
            <div className="w-8 h-8 white rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xl font-semibold">Tap</span>
              <span className="text-xl font-semibold bg-[#ff8c00] text-black px-2.5 py-1 rounded-lg">Hub</span>
            </div>
            {/* <Image src="/Tap.png" alt="Taphub" width={32} height={32} /> */}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center gap-6 flex-shrink-0">
            {user ? (
              <div className="flex items-center gap-6">
                {/* Connection Status Indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/50 rounded-lg">
                  <Circle
                    className={`w-2.5 h-2.5 fill-current ${
                      connectionState === 'connected'
                        ? 'text-green-500'
                        : connectionState === 'connecting'
                        ? 'text-yellow-500 animate-pulse'
                        : 'text-red-500'
                    }`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {connectionState === 'connected'
                      ? 'Connected'
                      : connectionState === 'connecting'
                      ? 'Connecting...'
                      : 'Disconnected'}
                  </span>
                  {connectionState === 'disconnected' && (
                    <button
                      onClick={handleReconnectWallet}
                      disabled={isReconnecting}
                      className="text-xs px-2 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors disabled:opacity-50"
                      title="Reconnect wallet"
                    >
                      {isReconnecting ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
                {/* Balance Display */}
                {balance !== null ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400 border border-green-500/20">
                    <Wallet className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {albyAuth.formatBalance(balance)}
                    </span>
                  </div>
                ) : balanceError ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 rounded-lg text-red-600 dark:text-red-400 border border-red-500/20">
                    <Wallet className="w-4 h-4" />
                    <span className="text-sm">Balance unavailable</span>
                  </div>
                ) : null}
                
                <div className="relative" data-dropdown>
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors cursor-pointer border border-primary/20"
                  >
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-sm">
                      {user.alias || (user.type === 'node' ? 'Node Runner' : 'Alby User')}
                    </span>
                  </button>
                  
                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50" data-dropdown>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            onNavigate("profile");
                            setIsUserDropdownOpen(false);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors text-left"
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </button>
                        <button
                          onClick={() => {
                            onNavigate("transactions");
                            setIsUserDropdownOpen(false);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors text-left"
                        >
                          <History className="w-4 h-4" />
                          Transaction History
                        </button>
                        <div className="border-t border-border my-1"></div>
                        <button
                          onClick={() => {
                            onLogout?.();
                            setIsUserDropdownOpen(false);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={() => onNavigate("login")}
                className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                      currentPage === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    {item.label}
                  </button>
                );
              })}
              <div className="pt-2 border-t border-border mt-2 space-y-2">
                {user ? (
                  <>
                    {/* Mobile Connection Status */}
                    <div className="w-full px-3 py-2 bg-accent/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Circle
                            className={`w-2.5 h-2.5 fill-current ${
                              connectionState === 'connected'
                                ? 'text-green-500'
                                : connectionState === 'connecting'
                                ? 'text-yellow-500 animate-pulse'
                                : 'text-red-500'
                            }`}
                          />
                          <span className="text-sm text-muted-foreground">
                            {connectionState === 'connected'
                              ? 'Connected'
                              : connectionState === 'connecting'
                              ? 'Connecting...'
                              : 'Disconnected'}
                          </span>
                        </div>
                        {connectionState === 'disconnected' && (
                          <button
                            onClick={handleReconnectWallet}
                            disabled={isReconnecting}
                            className="text-xs px-2 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors disabled:opacity-50"
                          >
                            {isReconnecting ? (
                              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Mobile Balance Display */}
                    {balance !== null ? (
                      <div className="w-full px-3 py-2 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {albyAuth.formatBalance(balance)}
                          </span>
                        </div>
                      </div>
                    ) : balanceError ? (
                      <div className="w-full px-3 py-2 bg-red-500/10 rounded-lg text-red-600 dark:text-red-400">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4" />
                          <span className="text-sm">Balance unavailable</span>
                        </div>
                      </div>
                    ) : null}
                    
                    <button
                      className="w-full px-3 py-2 bg-primary/10 rounded-lg text-sm hover:bg-primary/20 transition-colors text-left"
                      onClick={() => {
                        onNavigate("profile");
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <span>
                          {user.alias || (user.type === 'node' ? 'Node Runner' : 'Alby User')}
                        </span>
                      </div>
                    </button>
                    <button
                      className="w-full px-3 py-2 text-muted-foreground hover:text-foreground rounded-lg text-sm transition-colors text-left"
                      onClick={() => {
                        onNavigate("transactions");
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        <span>Transaction History</span>
                      </div>
                    </button>
                    <button
                      className="w-full px-3 py-2 text-muted-foreground hover:text-foreground rounded-lg text-sm transition-colors flex items-center gap-2"
                      onClick={() => {
                        onLogout?.();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="w-full px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm transition-colors"
                      onClick={() => {
                        onNavigate("login");
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}