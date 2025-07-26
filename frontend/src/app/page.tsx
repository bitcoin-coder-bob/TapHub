"use client";

import { useState } from "react";
import { Navigation } from "./components/Navigation";
import { LandingPage } from "./components/LandingPage";
import { LoginPage } from "./components/LoginPage";
import { AssetDiscoveryPage } from "./components/AssetDiscoveryPage";
import { NodeProfilePage } from "./components/NodeProfilePage";
import { RegisterNodePage } from "./components/RegisterNodePage";
import { AssetListingDashboard } from "./components/AssetListingDashboard";
import { AssetPurchaseFlow } from "./components/AssetPurchaseFlow";

interface User {
  type: 'user' | 'node';
  email?: string;
  pubkey?: string;
  alias?: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [pageParams, setPageParams] = useState<Record<string, unknown>>({});
  const [user, setUser] = useState<User | null>(null);

  const navigate = (page: string, params: Record<string, unknown> = {}) => {
    setCurrentPage(page);
    setPageParams(params);
    window.scrollTo(0, 0);
  };

  const handleLogin = (userType: 'user' | 'node', userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
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
        return <RegisterNodePage onNavigate={navigate} />;
      case "dashboard":
        return <AssetListingDashboard onNavigate={navigate} />;
      case "purchase":
      case "asset-detail":
        return (
          <AssetPurchaseFlow
            assetId={pageParams.assetId as string}
            onNavigate={navigate}
          />
        );
      case "orders":
        return (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center py-20">
              <h1 className="text-2xl mb-4">Order History</h1>
              <p className="text-muted-foreground mb-8">
                Your Lightning Network transaction history
              </p>
              <div className="bg-card border border-border p-8 rounded-lg">
                <p className="text-muted-foreground">
                  Coming soon - track all your TapHub transactions
                </p>
              </div>
            </div>
          </div>
        );
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

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Navigation 
        currentPage={currentPage} 
        onNavigate={navigate}
        user={user}
        onLogout={handleLogout}
      />
      <main>{renderPage()}</main>
    </div>
  );
}