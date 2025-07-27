"use client";

import { useState, useEffect } from "react";
import { Navigation } from "./components/Navigation";
import { LandingPage } from "./components/LandingPage";
import { LoginPage } from "./components/LoginPage";
import { AssetDiscoveryPage } from "./components/AssetDiscoveryPage";
import { NodeProfilePage } from "./components/NodeProfilePage";
import { RegisterNodePage } from "./components/RegisterNodePage";
import { AssetListingDashboard } from "./components/AssetListingDashboard";
import { AssetPurchaseFlow } from "./components/AssetPurchaseFlow";
import { AssetDetailPage } from "./components/AssetDetailPage";
import { TransactionHistory } from "./components/TransactionHistory";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { auth, User as AuthUser } from "./services/auth";

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [pageParams, setPageParams] = useState<Record<string, unknown>>({});
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authentication on mount
  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setIsLoading(false);
  }, []);

  const navigate = (page: string, params: Record<string, unknown> = {}) => {
    setCurrentPage(page);
    setPageParams(params);
    window.scrollTo(0, 0);
  };

  const handleLogin = (userType: 'user' | 'node', userData: AuthUser) => {
    setUser(userData);
  };

  const handleLogout = () => {
    auth.logout();
    setUser(null);
    navigate('home');
  };

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <LandingPage onNavigate={navigate} />;
      case "login":
        return <LoginPage onNavigate={navigate} onLogin={handleLogin} />;
      case "discover":
        return <AssetDiscoveryPage onNavigate={navigate as (page: string, params: unknown) => void} />;
      case "profile":
        return <NodeProfilePage onNavigate={navigate} />;
      case "register":
        return <RegisterNodePage onNavigate={navigate} onLogin={handleLogin} params={pageParams} />;
      case "dashboard":
        // Check if user is a node runner
        if (!user || !auth.isNodeRunner()) {
          // Redirect non-node runners to discover page
          navigate('discover');
          return <AssetDiscoveryPage onNavigate={navigate as (page: string, params: unknown) => void} />;
        }
        return <AssetListingDashboard onNavigate={navigate} />;
      case "purchase":
        return (
          <AssetPurchaseFlow
            assetId={pageParams.assetId as string}
            onNavigate={navigate}
          />
        );
      case "asset-detail":
        return (
          <AssetDetailPage
            assetId={pageParams.assetId as string}
            nodePubkey={pageParams.nodePubkey as string}
            onNavigate={navigate}
          />
        );
      case "orders":
      case "transactions":
        return <TransactionHistory onNavigate={navigate} />;
      case "rate":
        return (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center py-20">
              <h1 className="text-2xl mb-4">Rate & Review</h1>
              <p className="text-muted-foreground mb-8">
                Share your experience with this Lightning node
              </p>
              <div className="bg-card border border-border p-8 rounded-lg">
                <p className="text-muted-foreground">
                  Coming soon - rate and review node operators
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return <LandingPage onNavigate={navigate} />;
    }
  };

  if (isLoading) {
    return (
      <div className="dark min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Navigation 
        currentPage={currentPage} 
        onNavigate={navigate}
        user={user}
        onLogout={handleLogout}
      />
      <ErrorBoundary>
        <main>{renderPage()}</main>
      </ErrorBoundary>
    </div>
  );
}