export enum SorobanNetwork {
  TESTNET = 'TESTNET',
  MAINNET = 'MAINNET',
  FUTURENET = 'FUTURENET'
}

export interface VaultConfig {
  network: SorobanNetwork;
  contractId: string;
}

export interface SorobanContext {
  server: string;
  networkPassphrase: string;
  // Add other necessary Soroban context properties
}

export interface TransactionResult {
  hash: string;
  success: boolean;
  error?: string;
} 
