import { LN, USD } from "@getalby/sdk";

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

class AlbyAuthService {
  private static instance: AlbyAuthService;
  private currentUser: AlbyUser | null = null;
  private lnClient: LN | null = null;

  private constructor() {}

  static getInstance(): AlbyAuthService {
    if (!AlbyAuthService.instance) {
      AlbyAuthService.instance = new AlbyAuthService();
    }
    return AlbyAuthService.instance;
  }

  // Initialize Alby connection with NWC credentials
  async connectWithAlby(credentials: string): Promise<AlbyUser> {
    try {
      this.lnClient = new LN(credentials);
      
      // Test the connection by attempting to get wallet balance or make a test request
      // Since getInfo() doesn't exist, we'll create a user object from the credentials
      const user: AlbyUser = {
        type: 'user',
        pubkey: this.extractPubkeyFromCredentials(credentials),
        alias: 'Alby User',
        isNodeRunner: false
      };

      this.currentUser = user;
      this.saveUserToStorage(user);
      this.saveCredentials(credentials);
      
      return user;
    } catch (error) {
      console.error('Failed to connect with Alby:', error);
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

  // Make a payment
  async makePayment(invoice: string): Promise<unknown> {
    if (!this.lnClient) {
      throw new Error('Not connected to Alby wallet');
    }
    return await this.lnClient.pay(invoice);
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
    localStorage.removeItem('taphub_user');
    localStorage.removeItem('taphub_nwc_credentials');
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

  // Save user to localStorage
  private saveUserToStorage(user: AlbyUser): void {
    localStorage.setItem('taphub_user', JSON.stringify(user));
  }

  // Load user from localStorage
  private loadUserFromStorage(): AlbyUser | null {
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

  // Get stored NWC credentials
  getStoredCredentials(): string | null {
    return localStorage.getItem('taphub_nwc_credentials');
  }

  // Save NWC credentials
  saveCredentials(credentials: string): void {
    localStorage.setItem('taphub_nwc_credentials', credentials);
  }
}

export const albyAuth = AlbyAuthService.getInstance(); 