import { useState } from "react";
import { Zap } from "lucide-react";

interface RegisterNodePageProps {
  onNavigate: (page: string, params?: any) => void;
}

export function RegisterNodePage({ onNavigate }: RegisterNodePageProps) {
  const [formData, setFormData] = useState({
    pubkey: "",
    alias: "",
    description: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would verify the node
    onNavigate("dashboard");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl mb-2">Register Your Node</h1>
        <p className="text-muted-foreground">
          Connect your Lightning Network node to start listing assets
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm mb-2">Node Public Key</label>
            <input
              type="text"
              value={formData.pubkey}
              onChange={(e) => setFormData({...formData, pubkey: e.target.value})}
              placeholder="03a1b2c3d4e5f6789abcdef..."
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
              required
            />
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
              placeholder="Brief description of your node..."
              rows={3}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Register Node
          </button>
        </form>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Your node will be verified before you can start listing assets. 
            This helps maintain trust in the TapHub marketplace.
          </p>
        </div>
      </div>
    </div>
  );
}