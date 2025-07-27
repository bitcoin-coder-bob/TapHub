export interface PolarNodeConfig {
  grpcHost: string;
  restHost: string;
  p2pInternal: string;
  p2pExternal: string;
}

export interface NetworkConfiguration {
  name: 'mainnet' | 'testnet' | 'regtest';
  displayName: string;
  description: string;
  polarConfig?: PolarNodeConfig;
}

export const NETWORK_CONFIGS: Record<string, NetworkConfiguration> = {
  regtest: {
    name: 'regtest',
    displayName: 'Regtest',
    description: 'Bitcoin Regtest for Lightning Network development',
    polarConfig: {
      grpcHost: '127.0.0.1:10001',
      restHost: 'https://127.0.0.1:8081',
      p2pInternal: '020...4@172.18.0.3:9735',
      p2pExternal: '020...74@127.0.0.1:9736'
    }
  },
  testnet: {
    name: 'testnet',
    displayName: 'Bitcoin Testnet',
    description: 'Bitcoin test network'
  },
  mainnet: {
    name: 'mainnet',
    displayName: 'Bitcoin Mainnet',
    description: 'Production Bitcoin network (Real money!)'
  }
};

export function getNetworkConfig(networkName: string): NetworkConfiguration | null {
  return NETWORK_CONFIGS[networkName] || null;
}

export function getPolarConfig(networkName: string): PolarNodeConfig | null {
  const config = getNetworkConfig(networkName);
  return config?.polarConfig || null;
}