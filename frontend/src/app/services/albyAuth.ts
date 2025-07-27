import { LN, USD, nwc } from "@getalby/sdk";

export interface AlbyUser {
  type: 'user' | 'node';
  pubkey: string;
  alias?: string;
  email?: string;
  isNodeRunner?: boolean;
  description?: string;
}

export interface NodeRegistrationData {
  pubkey: string;
  alias: string;
  description?: string;
  credentials: string; // NWC connection string
}

export interface NetworkConfig {
  name: 'mainnet' | 'testnet' | 'mutinynet';
  displayName: string;
  description: string;
}

export type ConnectionState = 'connected' | 'connecting' | 'disconnected';

export interface QueuedOperation {
  id: string;
  type: 'payment' | 'balance' | 'info';
  operation: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class AlbyAuthService {
  private static instance: AlbyAuthService;
  private currentUser: AlbyUser | null = null;
  private lnClient: LN | null = null;
  private nwcClient: nwc.NWCClient | null = null;
  private permissions: string[] = [];
  private currentNetwork: NetworkConfig = {
    name: 'mutinynet',
    displayName: 'Mutinynet',
    description: 'Bitcoin Testnet for Lightning Network development'
  };
  private connectionState: ConnectionState = 'disconnected';
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private maxReconnectAttempts = 5;
  private operationQueue: QueuedOperation[] = [];
  private isReconnecting = false;
  private connectionStateListeners: ((state: ConnectionState) => void)[] = [];

  private constructor() {
    this.initializeNetwork();
    this.startConnectionMonitoring();
  }

  static getInstance(): AlbyAuthService {
    if (!AlbyAuthService.instance) {
      AlbyAuthService.instance = new AlbyAuthService();
    }
    return AlbyAuthService.instance;
  }

  // Initialize Alby connection with NWC credentials
  async connectWithAlby(credentials: string): Promise<AlbyUser> {
    try {
      this.setConnectionState('connecting');
      
      // Initialize both LN and NWC clients
      this.lnClient = new LN(credentials);
      this.nwcClient = new nwc.NWCClient({ nostrWalletConnectUrl: credentials });
      
      // Test the connection with a simple message signing
      const testMessage = `TapHub auth test - ${Date.now()}`;
      const signResult = await this.nwcClient.signMessage({ message: testMessage });
      
      if (!signResult.signature) {
        throw new Error('Failed to sign test message');
      }

      // Check permissions and get wallet info
      await this.checkPermissions();
      
      // Connection successful
      this.setConnectionState('connected');
      this.reconnectAttempt = 0;
      
      // Try to get wallet info and create a meaningful username
      const extractedName = this.extractUsernameFromCredentials(credentials);
      let walletAlias = extractedName; // Default to extracted name
      
      try {
        // Try to get wallet info to see if there's a better alias
        const info = await this.nwcClient.getInfo();
        
        // Only use the wallet's alias if it's meaningful and not generic
        if (info.alias && 
            info.alias.length > 1 && 
            !['NWC', 'nwc', 'NostrWalletConnect', 'Lightning Wallet', 'Alby Wallet', 'AlbyUser'].includes(info.alias) &&
            !info.alias.toLowerCase().includes('untitled') &&
            !info.alias.toLowerCase().includes('wallet')) {
          walletAlias = info.alias;
        }
      } catch {
        // Could not fetch wallet info, use extracted name
      }

      const user: AlbyUser = {
        type: 'user',
        pubkey: this.nwcClient.walletPubkey || this.extractPubkeyFromCredentials(credentials),
        alias: walletAlias,
        isNodeRunner: false
      };

      this.currentUser = user;
      this.saveUserToStorage(user);
      this.saveCredentials(credentials);
      
      // Process any queued operations
      this.processQueuedOperations();
      
      return user;
    } catch (error) {
      console.error('Failed to connect with Alby:', error);
      this.setConnectionState('disconnected');
      throw new Error('Failed to connect with Alby wallet');
    }
  }

  // Register as a node runner
  async registerAsNode(data: NodeRegistrationData): Promise<AlbyUser> {
    try {
      if (!this.lnClient) {
        throw new Error('Not connected to Alby wallet');
      }

      // Test the connection by attempting a small operation
      // We'll just verify the client is working
      
      // Update user to be a node runner
      const nodeUser: AlbyUser = {
        type: 'node',
        pubkey: data.pubkey,
        alias: data.alias,
        description: data.description,
        isNodeRunner: true
      };

      this.currentUser = nodeUser;
      this.saveUserToStorage(nodeUser);
      
      return nodeUser;
    } catch (error) {
      console.error('Failed to register as node:', error);
      throw new Error('Failed to register as node runner');
    }
  }

  // Get current user
  getCurrentUser(): AlbyUser | null {
    if (!this.currentUser) {
      this.currentUser = this.loadUserFromStorage();
    }
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Check if user is a node runner
  isNodeRunner(): boolean {
    return this.currentUser?.isNodeRunner === true;
  }

  // Get LN client for payments
  getLNClient(): LN | null {
    return this.lnClient;
  }

  // Get NWC client for signing
  getNWCClient(): nwc.NWCClient | null {
    return this.nwcClient;
  }

  // Sign a message using Nostr Wallet Connect
  async signMessage(message: string): Promise<{ signature: string; message: string }> {
    if (!this.nwcClient) {
      throw new Error('NWC client not initialized. Please connect first.');
    }
    
    try {
      const result = await this.nwcClient.signMessage({ message });
      return {
        signature: result.signature,
        message: message
      };
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw new Error('Failed to sign message with NWC');
    }
  }

  // Check permissions before operations
  async checkPermissions(): Promise<void> {
    if (!this.nwcClient) {
      throw new Error('NWC client not initialized. Please connect first.');
    }
    
    try {
      const info = await this.nwcClient.getInfo();
      this.permissions = info.methods || [];
    } catch (error) {
      console.error('Failed to check permissions:', error);
      this.permissions = [];
    }
  }

  // Get current permissions
  getPermissions(): string[] {
    return this.permissions;
  }

  // Check if a specific permission is available
  hasPermission(method: string): boolean {
    return this.permissions.includes(method);
  }

  // Get wallet balance
  async getBalance(): Promise<number> {
    if (!this.nwcClient) {
      throw new Error('NWC client not initialized. Please connect first.');
    }

    if (!this.hasPermission('get_balance')) {
      throw new Error('Missing permission: get_balance. Please reconnect with balance reading permissions.');
    }

    try {
      const balance = await this.nwcClient.getBalance();
      return balance.balance || 0;
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw new Error('Failed to retrieve wallet balance');
    }
  }

  // Format balance in sats with comma separators
  formatBalance(balanceMsat: number): string {
    const sats = Math.floor(balanceMsat / 1000);
    return sats.toLocaleString() + ' sats';
  }

  // Check wallet info
  async getWalletInfo(): Promise<{ balance?: number; alias?: string; pubkey?: string }> {
    if (!this.nwcClient) {
      throw new Error('NWC client not initialized. Please connect first.');
    }

    if (!this.hasPermission('get_info')) {
      throw new Error('Missing permission: get_info. Please reconnect with proper wallet permissions.');
    }
    
    try {
      const info = await this.nwcClient.getInfo();
      return { 
        alias: info.alias || 'Connected Wallet',
        pubkey: info.pubkey
      };
    } catch (error) {
      console.error('Failed to get wallet info:', error);
      return { alias: 'Connected Wallet' };
    }
  }

  // Make a payment
  async makePayment(invoice: string): Promise<unknown> {
    if (!this.lnClient) {
      throw new Error('Not connected to Alby wallet');
    }

    if (!this.hasPermission('pay_invoice')) {
      throw new Error('Missing permission: pay_invoice. Please reconnect with payment permissions to make payments.');
    }

    // If we're disconnected, queue the operation
    if (this.connectionState === 'disconnected') {
      return this.queueOperation('payment', () => this.lnClient!.pay(invoice));
    }

    try {
      return await this.lnClient.pay(invoice);
    } catch (error) {
      // If payment fails due to connection issue, try to reconnect
      if (this.isConnectionError(error)) {
        this.handleDisconnection();
        return this.queueOperation('payment', () => this.lnClient!.pay(invoice));
      }
      throw error;
    }
  }

  // Request a payment
  async requestPayment(amount: number): Promise<unknown> {
    if (!this.lnClient) {
      throw new Error('Not connected to Alby wallet');
    }
    return await this.lnClient.requestPayment(USD(amount));
  }

  // Logout
  logout(): void {
    this.currentUser = null;
    this.lnClient = null;
    this.nwcClient = null;
    this.permissions = [];
    this.setConnectionState('disconnected');
    this.stopConnectionMonitoring();
    this.clearOperationQueue();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('taphub_user');
      localStorage.removeItem('taphub_nwc_credentials');
    }
  }

  // Extract pubkey from NWC credentials (simplified)
  private extractPubkeyFromCredentials(credentials: string): string {
    // This is a simplified extraction - in a real app you'd parse the NWC URI properly
    try {
      const url = new URL(credentials);
      return url.hostname || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  // Extract a meaningful username from NWC credentials
  private extractUsernameFromCredentials(credentials: string): string {
    try {
      const url = new URL(credentials);
      
      // Parse all search parameters
      const searchParams = new URLSearchParams(url.search);
      const relay = searchParams.get('relay');
      const secret = searchParams.get('secret');
      const lud16 = searchParams.get('lud16');
      
      // Try to extract from LUD16 (Lightning Address) first - this often has usernames
      if (lud16 && lud16.includes('@')) {
        const username = lud16.split('@')[0];
        if (username && username.length > 0 && username !== 'user') {
          return username;
        }
      }
      
      // Check if it's an Alby Hub URL and extract subdomain
      if (url.hostname.includes('albyhub.com') || url.hostname.includes('getalby.com')) {
        const parts = url.hostname.split('.');
        const subdomain = parts[0];
        if (subdomain && subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'relay') {
          return subdomain;
        }
      }
      
      // Parse relay URL for username hints
      if (relay) {
        try {
          const relayUrl = new URL(relay);
          
          // Check for user-specific relay endpoints
          if (relayUrl.hostname.includes('alby')) {
            const relayParts = relayUrl.hostname.split('.');
            const relaySubdomain = relayParts[0];
            
            if (relaySubdomain && !['relay', 'www', 'api', 'wss'].includes(relaySubdomain)) {
              return relaySubdomain;
            }
          }
          
          // Check relay path for user identifiers
          if (relayUrl.pathname && relayUrl.pathname !== '/') {
            const pathParts = relayUrl.pathname.split('/').filter(p => p.length > 0);
            
            // Look for user identifiers in path
            if (pathParts.length > 0) {
              const potentialUser = pathParts[0];
              if (potentialUser.length > 2 && !potentialUser.startsWith('v') && isNaN(Number(potentialUser))) {
                return potentialUser;
              }
            }
          }
        } catch {
          // Relay URL parsing failed, continue with other methods
        }
      }
      
      // Parse the nostr+walletconnect:// URL pathname for pubkey
      const pathname = url.pathname;
      if (pathname && pathname.length > 1) {
        const pubkeyHex = pathname.startsWith('/') ? pathname.slice(1) : pathname;
        
        if (pubkeyHex && pubkeyHex.length >= 16) {
          // Use a longer, more readable identifier
          const shortId = pubkeyHex.slice(0, 12);
          
          if (relay?.includes('alby') || url.hostname.includes('alby')) {
            return `alby_${shortId}`;
          }
          return `user_${shortId}`;
        }
      }
      
      // If we have a secret, create a user ID from it
      if (secret && secret.length >= 16) {
        const shortSecret = secret.slice(0, 12);
        return `user_${shortSecret}`;
      }
      
      return 'LightningUser';
      
    } catch {
      return 'LightningUser';
    }
  }

  // Save user to localStorage
  private saveUserToStorage(user: AlbyUser): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('taphub_user', JSON.stringify(user));
    }
  }

  // Load user from localStorage
  private loadUserFromStorage(): AlbyUser | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    const userStr = localStorage.getItem('taphub_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // Try to reinitialize clients from stored credentials
        this.reinitializeClients();
        return user;
      } catch (error) {
        console.error('Failed to parse user from storage:', error);
        return null;
      }
    }
    return null;
  }

  // Reinitialize clients from stored credentials
  private reinitializeClients(): void {
    const credentials = this.getStoredCredentials();
    if (credentials) {
      try {
        this.lnClient = new LN(credentials);
        this.nwcClient = new nwc.NWCClient({ nostrWalletConnectUrl: credentials });
        // Re-check permissions after reinitializing
        this.checkPermissions().catch(console.error);
      } catch (error) {
        console.error('Failed to reinitialize clients:', error);
      }
    }
  }

  // Get stored NWC credentials
  getStoredCredentials(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem('taphub_nwc_credentials');
  }

  // Save NWC credentials
  saveCredentials(credentials: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('taphub_nwc_credentials', credentials);
    }
  }

  // Network configuration methods
  getCurrentNetwork(): NetworkConfig {
    return this.currentNetwork;
  }

  setNetwork(network: NetworkConfig['name']): void {
    const networkConfigs: Record<NetworkConfig['name'], NetworkConfig> = {
      mainnet: {
        name: 'mainnet',
        displayName: 'Bitcoin Mainnet',
        description: 'Production Bitcoin network'
      },
      testnet: {
        name: 'testnet',
        displayName: 'Bitcoin Testnet',
        description: 'Bitcoin test network'
      },
      mutinynet: {
        name: 'mutinynet',
        displayName: 'Mutinynet',
        description: 'Bitcoin Testnet for Lightning Network development'
      }
    };
    
    this.currentNetwork = networkConfigs[network];
    if (typeof window !== 'undefined') {
      localStorage.setItem('taphub_network', network);
    }
  }

  getAvailableNetworks(): NetworkConfig[] {
    return [
      {
        name: 'mutinynet',
        displayName: 'Mutinynet',
        description: 'Bitcoin Testnet for Lightning Network development (Recommended for testing)'
      },
      {
        name: 'testnet',
        displayName: 'Bitcoin Testnet',
        description: 'Bitcoin test network'
      },
      {
        name: 'mainnet',
        displayName: 'Bitcoin Mainnet',
        description: 'Production Bitcoin network (Real money!)'
      }
    ];
  }

  // Initialize network from storage
  private initializeNetwork(): void {
    if (typeof window !== 'undefined') {
      const storedNetwork = localStorage.getItem('taphub_network') as NetworkConfig['name'] | null;
      if (storedNetwork) {
        this.setNetwork(storedNetwork);
      }
    }
  }

  // Connection state management methods
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.notifyConnectionStateListeners(state);
    }
  }

  onConnectionStateChange(listener: (state: ConnectionState) => void): () => void {
    this.connectionStateListeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.connectionStateListeners = this.connectionStateListeners.filter(l => l !== listener);
    };
  }

  private notifyConnectionStateListeners(state: ConnectionState): void {
    this.connectionStateListeners.forEach(listener => listener(state));
  }

  // Connection monitoring
  private startConnectionMonitoring(): void {
    if (this.connectionCheckInterval) {
      return;
    }

    this.connectionCheckInterval = setInterval(async () => {
      if (this.nwcClient && this.connectionState === 'connected') {
        try {
          // Simple ping to check connection
          await this.nwcClient.getInfo();
        } catch (error) {
          console.error('Connection check failed:', error);
          this.handleDisconnection();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private stopConnectionMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  // Handle disconnection and reconnection
  private async handleDisconnection(): Promise<void> {
    this.setConnectionState('disconnected');
    
    if (!this.isReconnecting) {
      this.isReconnecting = true;
      this.attemptReconnection();
    }
  }

  private async attemptReconnection(): Promise<void> {
    const credentials = this.getStoredCredentials();
    if (!credentials) {
      this.isReconnecting = false;
      return;
    }

    while (this.reconnectAttempt < this.maxReconnectAttempts) {
      this.reconnectAttempt++;
      const backoffDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempt - 1), 30000);
      
      console.log(`Reconnection attempt ${this.reconnectAttempt}/${this.maxReconnectAttempts} in ${backoffDelay}ms`);
      this.setConnectionState('connecting');
      
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      try {
        // Try to reinitialize the connection
        this.lnClient = new LN(credentials);
        this.nwcClient = new nwc.NWCClient({ nostrWalletConnectUrl: credentials });
        
        // Test the connection
        await this.nwcClient.getInfo();
        
        // Success!
        this.setConnectionState('connected');
        this.reconnectAttempt = 0;
        this.isReconnecting = false;
        
        // Process queued operations
        this.processQueuedOperations();
        
        console.log('Reconnection successful');
        return;
      } catch (error) {
        console.error(`Reconnection attempt ${this.reconnectAttempt} failed:`, error);
      }
    }
    
    // Max attempts reached
    console.error('Max reconnection attempts reached');
    this.isReconnecting = false;
    this.setConnectionState('disconnected');
  }

  // Operation queue management
  private queueOperation<T>(type: QueuedOperation['type'], operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedOp: QueuedOperation = {
        id: Date.now().toString(),
        type,
        operation,
        resolve,
        reject
      };
      
      this.operationQueue.push(queuedOp);
      console.log(`Operation queued (${type}), ${this.operationQueue.length} operations in queue`);
    });
  }

  private async processQueuedOperations(): Promise<void> {
    if (this.operationQueue.length === 0) return;
    
    console.log(`Processing ${this.operationQueue.length} queued operations`);
    const queue = [...this.operationQueue];
    this.operationQueue = [];
    
    for (const op of queue) {
      try {
        const result = await op.operation();
        op.resolve(result);
      } catch (error) {
        op.reject(error);
      }
    }
  }

  private clearOperationQueue(): void {
    this.operationQueue.forEach(op => {
      op.reject(new Error('Operation cancelled due to logout'));
    });
    this.operationQueue = [];
  }

  // Helper to check if an error is connection-related
  private isConnectionError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    return errorMessage.includes('connection') || 
           errorMessage.includes('network') || 
           errorMessage.includes('timeout') ||
           errorMessage.includes('relay');
  }
}

export const albyAuth = AlbyAuthService.getInstance(); 