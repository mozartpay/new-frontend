import axios from 'axios';

export type Network = 'testnet' | 'mainnet';

interface NetworkConfig {
  apiUrl: string;
  horizonUrl: string;
}

// Declare the ENV property on the Window interface
declare global {
  interface Window {
    ENV: {
      [key: string]: string;
    };
  }
}

// Get environment variables from window.ENV on the client side
function getEnvVar(name: string): string {
  if (typeof window !== 'undefined' && window.ENV && window.ENV[name]) {
    return window.ENV[name];
  }
  return process.env[name] || '';
}

const NETWORK_CONFIGS: Record<Network, NetworkConfig> = {
  testnet: {
    apiUrl: getEnvVar('API_URL'),
    horizonUrl: 'https://horizon-testnet.stellar.org',
  },
  mainnet: {
    apiUrl: getEnvVar('API_URL'),
    horizonUrl: 'https://horizon.stellar.org',
  },
};

function getValidApiUrl(apiUrl?: string, network: Network = 'testnet'): string {
  if (apiUrl) return apiUrl;
  const config = NETWORK_CONFIGS[network];
  
  if (!config.apiUrl) {
    throw new Error(`API URL not configured for network: ${network}. Please check your environment variables.`);
  }
  
  return config.apiUrl;
}

export async function getBalances(email: string, token: string, apiUrl?: string, network: Network = 'testnet') {
  try {
    const baseUrl = getValidApiUrl(apiUrl, network);
    const response = await axios.get(
      `${baseUrl}/balance`,
      {
        params: { email, network },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    // Ensure we always return an array of balances
    const balances = response.data?.balances || [];
    return { balances };
  } catch (error) {
    console.error('Error fetching balances:', error);
    throw error;
  }
}

export async function getStellarAccount(email: string, token: string, apiUrl?: string, network: Network = 'testnet'): Promise<{
  publicKey: string;
  balance: string;
  hasUSDCTrustline: boolean;
  hasEURCTrustline: boolean;
  preferredNetwork: Network;
} | null> {
  try {
    const baseUrl = getValidApiUrl(apiUrl, network);
    const response = await axios.get(
      `${baseUrl}/balance`,
      {
        params: { email, network },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.data) {
      return null;
    }

    const { balances, publicKey } = response.data;
    if (!publicKey) {
      return null;
    }

    const xlmBalance = balances?.find((b: any) => b.asset_type === 'native' || b.asset_code === 'XLM');

    return {
      publicKey,
      balance: xlmBalance?.balance || '0',
      hasUSDCTrustline: balances?.some((b: any) => b.asset_code === 'USDC'),
      hasEURCTrustline: balances?.some((b: any) => b.asset_code === 'EURC'),
      preferredNetwork: network
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      return null;
    }
    console.error('Error fetching Stellar account:', error);
    throw error;
  }
}

export async function createTrustline(email: string, currency: string, token: string, apiUrl?: string, network: string = 'testnet') {
  try {
    const baseUrl = getValidApiUrl(apiUrl, network as Network);
    const response = await axios.post(
      `${baseUrl}/stellar/trustline`,
      { email, currency, network },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating trustline:', error);
    throw error;
  }
}

export async function createXLMAccount(email: string, token: string, apiUrl?: string, network: string = 'testnet') {
  try {
    const baseUrl = getValidApiUrl(apiUrl, network as Network);
    const response = await axios.post(
      `${baseUrl}/xlm/`,
      { email, network, currency: 'XLM' },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating XLM account:', error);
    throw error;
  }
}

export async function requestCarbonSink(xlmAddress: string, carbonAmount: string, usdcAmount: string, email: string, token: string, apiUrl?: string) {
  try {
    const baseUrl = getValidApiUrl(apiUrl, 'testnet');
    console.log('Requesting carbon sink with params:', {
      email,
      funder: xlmAddress,
      carbon_amount: carbonAmount,
      usdc_amount: usdcAmount,
      baseUrl
    });

    const response = await axios.post(
      `${baseUrl}/carbon/sink-carbon/xdr`,
      {
        email,
        funder: xlmAddress,
        recipient: xlmAddress,
        carbon_amount: carbonAmount,
        usdc_amount: usdcAmount,
        payment_asset: 'USDC',
        vcs_project_id: 1360
      },
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error requesting carbon sink:', error);
    throw error;
  }
}
