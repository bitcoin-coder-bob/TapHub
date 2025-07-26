import { useState } from "react";
import { Zap, Search, Settings, Menu, X, User, LogOut } from "lucide-react";

import { AlbyUser } from "../services/albyAuth";

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  user?: AlbyUser | null;
  onLogout?: () => void;
}



export function Navigation({ currentPage, onNavigate, user, onLogout }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Home" },
    { id: "discover", label: "Browse", icon: Search },
    { id: "dashboard", label: "List", icon: Settings },
  ];

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onNavigate("home")}
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl">TapHub</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
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
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm">
                    {user.type === 'node' ? (user.alias || 'Node Runner') : (user.email || 'User')}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="px-3 py-2 text-muted-foreground hover:text-foreground rounded-lg text-sm transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onNavigate("login")}
                  className="px-4 py-2 text-primary hover:bg-primary/10 rounded-lg text-sm transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onNavigate("register")}
                  className="px-4 py-2 border border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg text-sm transition-colors"
                >
                  Register Node
                </button>
              </>
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
                    <div className="px-3 py-2 bg-primary/10 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <span>
                          {user.type === 'node' ? (user.alias || 'Node Runner') : (user.email || 'User')}
                        </span>
                      </div>
                    </div>
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
                      className="w-full px-3 py-2 text-primary hover:bg-primary/10 rounded-lg text-sm transition-colors"
                      onClick={() => {
                        onNavigate("login");
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Sign In
                    </button>
                    <button
                      className="w-full px-3 py-2 border border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg text-sm transition-colors"
                      onClick={() => {
                        onNavigate("register");
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Register Node
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