import { useState } from "react";
import { Zap, Search, Settings, Menu, X, User, LogOut } from "lucide-react";

import { AlbyUser } from "../services/albyAuth";
// import Image from "next/image";

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
            <div className="w-8 h-8 white rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xl">Tap</span>
              <span className="text-xl bg-[#ff8c00] text-black px-2 py-1 rounded-lg">Hub</span>
            </div>
            {/* <Image src="/Tap.png" alt="Taphub" width={32} height={32} /> */}
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
                <button
                  onClick={() => onNavigate("profile")}
                  className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm">
                    {user.alias || (user.type === 'node' ? 'Node Runner' : 'Alby User')}
                  </span>
                </button>
                <button
                  onClick={onLogout}
                  className="px-3 py-2 text-muted-foreground hover:text-foreground rounded-lg text-sm transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate("login")}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm transition-colors"
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