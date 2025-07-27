export interface User {
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
  credentials: string;
}

export interface NetworkConfig {
  name: 'mainnet' | 'testnet4' | 'regtest';
  displayName: string;
  description: string;
}

export type ConnectionState = 'connected' | 'connecting' | 'disconnected';

export interface InvoiceInfo {
  amount?: number;
  description?: string;
  expired: boolean;
  valid: boolean;
  errorMessage?: string;
}

class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private permissions: string[] = [];
  private currentNetwork: NetworkConfig = {
    name: 'regtest',
    displayName: 'Regtest',
    description: 'Bitcoin Regtest for Lightning Network development'
  };
  private connectionState: ConnectionState = 'disconnected';
  private connectionStateListeners: ((state: ConnectionState) => void)[] = [];

  private constructor() {
    this.initializeNetwork();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async connectWithCredentials(credentials: string): Promise<User> {
    try {
      this.setConnectionState('connecting');
      
      // Mock connection for demo purposes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const username = this.extractUsernameFromCredentials(credentials);
      
      const user: User = {
        type: 'user',
        pubkey: this.generateMockPubkey(),
        alias: username,
        isNodeRunner: false
      };

      this.currentUser = user;
      this.saveUserToStorage(user);
      this.saveCredentials(credentials);
      this.setConnectionState('connected');
      
      return user;
    } catch (error) {
      console.error('Failed to connect:', error);
      this.setConnectionState('disconnected');
      throw new Error('Failed to connect wallet');
    }
  }

  async authenticateWithSignature(message: string, signature: string): Promise<User> {
    try {
      this.setConnectionState('connecting');
      
      // Call the verification API
      const response = await fetch('/api/verifyMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, signature }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }

      const result = await response.json();
      
      if (!result.verified) {
        throw new Error('Message verification failed');
      }

      const user: User = {
        type: 'user',
        pubkey: result.pubkey,
        alias: result.alias,
        isNodeRunner: false
      };

      this.currentUser = user;
      this.saveUserToStorage(user);
      this.setConnectionState('connected');
      
      return user;
    } catch (error) {
      console.error('Failed to authenticate:', error);
      this.setConnectionState('disconnected');
      throw new Error(error instanceof Error ? error.message : 'Authentication failed');
    }
  }

  async generateChallenge(): Promise<{ challenge: string; message: string }> {
    try {
      const response = await fetch('/api/generateChallenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate challenge');
      }

      const result = await response.json();
      return {
        challenge: result.challenge,
        message: result.message
      };
    } catch (error) {
      console.error('Failed to generate challenge:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to generate challenge');
    }
  }

  async registerAsNode(data: NodeRegistrationData): Promise<User> {
    try {
      const nodeUser: User = {
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

  getCurrentUser(): User | null {
    if (!this.currentUser) {
      this.currentUser = this.loadUserFromStorage();
    }
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  isNodeRunner(): boolean {
    return this.currentUser?.isNodeRunner === true;
  }

  async signMessage(message: string): Promise<{ signature: string; message: string }> {
    // Mock signing
    return {
      signature: 'mock_signature_' + Date.now(),
      message: message
    };
  }

  getPermissions(): string[] {
    return ['get_balance', 'pay_invoice', 'make_invoice', 'get_info', 'list_transactions'];
  }

  hasPermission(method: string): boolean {
    return this.getPermissions().includes(method);
  }

  async getBalance(): Promise<number> {
    // Mock balance in millisats
    return 50000000; // 50,000 sats
  }

  formatBalance(balanceMsat: number): string {
    const sats = Math.floor(balanceMsat / 1000);
    return sats.toLocaleString() + ' sats';
  }

  async getWalletInfo(): Promise<{ balance?: number; alias?: string; pubkey?: string }> {
    return { 
      alias: this.currentUser?.alias || 'Mock Wallet',
      pubkey: this.currentUser?.pubkey
    };
  }

  async makePayment(invoice: string): Promise<unknown> {
    // Mock payment
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { payment_hash: 'mock_payment_hash_' + Date.now() };
  }

  async requestPayment(amount: number): Promise<unknown> {
    // Mock payment request
    return { invoice: 'mock_invoice_' + amount };
  }

  logout(): void {
    this.currentUser = null;
    this.setConnectionState('disconnected');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('taphub_user');
      localStorage.removeItem('taphub_credentials');
    }
  }

  private generateMockPubkey(): string {
    return Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  private extractUsernameFromCredentials(credentials: string): string {
    try {
      // Simple extraction for demo
      if (credentials.includes('@')) {
        return credentials.split('@')[0];
      }
      return 'MockUser';
    } catch {
      return 'MockUser';
    }
  }

  private saveUserToStorage(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('taphub_user', JSON.stringify(user));
    }
  }

  private loadUserFromStorage(): User | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    const userStr = localStorage.getItem('taphub_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Failed to parse user from storage:', error);
        return null;
      }
    }
    return null;
  }

  getStoredCredentials(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem('taphub_credentials');
  }

  saveCredentials(credentials: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('taphub_credentials', credentials);
    }
  }

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
      testnet4: {
        name: 'testnet4',
        displayName: 'Bitcoin Testnet4',
        description: 'Bitcoin test network (testnet4)'
      },
      regtest: {
        name: 'regtest',
        displayName: 'Regtest',
        description: 'Bitcoin Regtest for Lightning Network development'
      }
    };
    
    this.currentNetwork = networkConfigs[network] || networkConfigs['regtest'];
    if (typeof window !== 'undefined') {
      localStorage.setItem('taphub_network', this.currentNetwork.name);
    }
  }

  getAvailableNetworks(): NetworkConfig[] {
    return [
      {
        name: 'regtest',
        displayName: 'Regtest',
        description: 'Bitcoin Regtest for Lightning Network development (Recommended for testing)'
      },
      {
        name: 'testnet4',
        displayName: 'Bitcoin Testnet4',
        description: 'Bitcoin test network (testnet4)'
      },
      {
        name: 'mainnet',
        displayName: 'Bitcoin Mainnet',
        description: 'Production Bitcoin network (Real money!)'
      }
    ];
  }

  private initializeNetwork(): void {
    if (typeof window !== 'undefined') {
      const storedNetwork = localStorage.getItem('taphub_network') as string | null;
      if (storedNetwork && ['mainnet', 'testnet4', 'regtest'].includes(storedNetwork)) {
        this.setNetwork(storedNetwork as NetworkConfig['name']);
      }
    }
  }

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
    return () => {
      this.connectionStateListeners = this.connectionStateListeners.filter(l => l !== listener);
    };
  }

  private notifyConnectionStateListeners(state: ConnectionState): void {
    this.connectionStateListeners.forEach(listener => listener(state));
  }

  validateInvoice(invoiceString: string): InvoiceInfo {
    if (!invoiceString || invoiceString.trim() === '') {
      return {
        valid: false,
        expired: false,
        errorMessage: 'Invoice cannot be empty'
      };
    }

    // Mock validation
    if (invoiceString.startsWith('lnbc') || invoiceString.startsWith('lntb')) {
      return {
        valid: true,
        expired: false,
        amount: 1000,
        description: 'Mock invoice'
      };
    }

    return {
      valid: false,
      expired: false,
      errorMessage: 'Invalid invoice format'
    };
  }

  async getTransactions(): Promise<unknown[]> {
    // Mock transactions
    return [
      {
        type: 'outgoing',
        amount: 1000,
        description: 'Test payment',
        settled_at: Date.now() / 1000
      }
    ];
  }

  async makeInvoice(amount: number, description?: string): Promise<{ invoice: string; payment_hash: string }> {
    // Mock invoice creation
    return {
      invoice: `lnbc${amount}u1mock_invoice_${Date.now()}`,
      payment_hash: 'mock_payment_hash_' + Date.now()
    };
  }
}

export const auth = AuthService.getInstance();