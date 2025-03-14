import axios from 'axios';

export type Network = 'testnet' | 'mainnet';

interface NetworkConfig {
  apiUrl: string;
  horizonUrl: string;
}

interface StellarBalance {
  asset_code: string;
  balance: string;
}

// Declare the ENV property on the Window interface
declare global {
  interface Window {
    ENV: {
      [key: string]: string;
    };
  }
}

// Get environment variables from window.ENV on the client side or process.env on the server
function getEnvVar(name: string): string {
  if (typeof window !== 'undefined') {
    // Client-side
    return window.ENV?.[name] || '';
  }
  // Server-side
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name] || '';
  }
  return '';
}

const NETWORK_CONFIGS: Record<Network, NetworkConfig> = {
  testnet: {
    apiUrl: 'https://mozart-api-21ea5fd801a8.herokuapp.com/api',
    horizonUrl: 'https://horizon-testnet.stellar.org',
  },
  mainnet: {
    apiUrl: 'https://mozart-api-21ea5fd801a8.herokuapp.com/api',
    horizonUrl: 'https://horizon.stellar.org',
  },
};

function getValidApiUrl(network: Network, apiUrl?: string): string {
  // First try the provided apiUrl if it's a valid URL
  if (apiUrl && (apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))) {
    return apiUrl;
  }
  
  // Fallback to network-specific config
  return NETWORK_CONFIGS[network].apiUrl;
}

export async function getBalances(email: string, token: string, network: Network, apiUrl?: string) {
  // Ensure network is valid, default to testnet if not
  const validNetwork: Network = (network === 'mainnet' || network === 'testnet') ? network : 'testnet';
  
  try {
    const baseUrl = getValidApiUrl(validNetwork, apiUrl);
    console.log('Fetching balances with config:', {
      baseUrl,
      apiUrl,
      network: validNetwork,
      fullUrl: `${baseUrl}/user/balance/${encodeURIComponent(email)}?network=${validNetwork}`
    });

    const encodedEmail = encodeURIComponent(email);
    const response = await axios.get(
      `${baseUrl}/user/balance/${encodedEmail}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        params: {
          network: validNetwork
        },
        withCredentials: true
      }
    );
    
    // Parse the response data if it's a string
    const responseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    
    // Use the network from the response, fallback to validNetwork if not present
    const responseNetwork = responseData.network || validNetwork;
    
    console.log('Balance Response:', {
      status: response.status,
      network: responseNetwork,
      data: JSON.stringify(responseData, null, 2),
      url: response.config.url,
      params: response.config.params
    });

    // Ensure we always return an array of balances
    const balances = responseData?.balances || [];
    return { balances, network: responseNetwork };
  } catch (error: any) {
    console.error('Error fetching balances:', error);
    if (error.response?.status === 404) {
      return { balances: [], network: validNetwork };
    }
    throw new Error(error.response?.data?.error || 'Failed to fetch balances');
  }
}

export async function getStellarAccount(email: string, token: string, network: Network, apiUrl?: string) {
  try {
    const baseUrl = getValidApiUrl(network, apiUrl);
    const encodedEmail = encodeURIComponent(email);
    const response = await axios.get(
      `${baseUrl}/user/balance/${encodedEmail}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        params: {
          network
        },
        withCredentials: true
      }
    );

    // If we get balances, it means the account exists
    const balances = response.data?.balances || [];
    if (balances.length === 0) return null;

    // Find XLM balance
    const xlmBalance = balances.find((b: StellarBalance) => b.asset_code === 'XLM' || !b.asset_code)?.balance || '0';

    // Check for trustlines
    const hasUSDCTrustline = balances.some((b: StellarBalance) => b.asset_code === 'USDC');
    const hasEURCTrustline = balances.some((b: StellarBalance) => b.asset_code === 'EURC');

    // Get the public key from the response
    const publicKey = response.data?.account || '';

    return {
      publicKey,
      balance: xlmBalance,
      hasUSDCTrustline,
      hasEURCTrustline,
      preferredNetwork: network
    };
  } catch (error: any) {
    console.error('Error fetching Stellar account:', error);
    if (error.response?.status === 404) {
      return null; // Return null for non-existent accounts
    }
    throw new Error(error.response?.data?.error || 'Failed to fetch account details');
  }
}

export async function createTrustline(
  email: string,
  currency: string,
  token: string,
  apiUrl: string,
  network: Network = 'testnet'
) {
  try {
    console.log('API URL Config:', {
      baseUrl: apiUrl,
      apiUrl,
      network,
      fullUrl: `${apiUrl}/stellar/trustline` // Updated URL path
    });

    const response = await axios.post(
      `${apiUrl}/stellar/trustline`, // Changed from /user/trustline to /stellar/trustline
      { 
        email, 
        currency,
        network 
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('Trustline creation response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating trustline:', error);
    throw error;
  }
}

export async function createXLMAccount(email: string, token: string, network: Network, apiUrl?: string) {
  try {
    console.log('Creating XLM account with:', { email, network, apiUrl });
    const baseUrl = getValidApiUrl(network, apiUrl);
    console.log('Using API URL:', baseUrl);
    
    // Log token information to debug authorization issues
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        console.log('Token info:', {
          exp: new Date(payload.exp * 1000).toISOString(),
          iat: new Date(payload.iat * 1000).toISOString(),
          isExpired: payload.exp * 1000 < Date.now()
        });
      }
    } catch (e) {
      console.error('Error parsing token:', e);
    }
    
    const response = await axios.post(
      `${baseUrl}/xlm`,  // Keep the original endpoint
      { email, network, currency: 'XLM' },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('XLM account creation response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating XLM account:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response:', error.response?.data);
      console.error('Status:', error.response?.status);
      console.error('Headers:', error.response?.headers);
      
      // Check if token is expired
      if (error.response?.status === 401) {
        console.error('Authentication failed. Token may be expired or invalid.');
      }
      
      throw new Error(error.response?.data?.message || error.message);
    }
    throw error;
  }
}

export interface CarbonSinkResponse {
  tx_xdr: string;
  txrep?: string;
  carbon_amount?: string;
  usdc_amount?: string;
  funder?: string;
  recipient?: string;
  vcs_project_id?: number;
  success?: boolean;
  error?: string;
  details?: string;
  hash?: string;  // Add back hash field since backend will submit and return it
}

export async function requestCarbonSink(
  xlmAddress: string,
  carbonAmount: string,
  usdcAmount: string,
  email: string,
  token: string,
  network: Network,
  vcsProjectId: number,
  paymentAsset: string,
  recipient: string,
  apiUrl?: string
): Promise<CarbonSinkResponse> {
  try {
    const baseUrl = getValidApiUrl(network, apiUrl);
    console.log('Requesting carbon sink with params:', {
      email,
      funder: xlmAddress,
      quote: {
        usd_amount: usdcAmount,
        total_carbon: carbonAmount
      },
      baseUrl
    });

    const response = await axios.post<CarbonSinkResponse>(
      `${baseUrl}/carbon/sink-carbon/xdr`,
      {
        email,
        funder: xlmAddress,
        recipient,
        payment_asset: paymentAsset,
        vcs_project_id: vcsProjectId,
        quote: {
          usd_amount: usdcAmount,
          total_carbon: carbonAmount
        }
      },
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Carbon sink response:', response.data);
    
    if (!response.data.tx_xdr) {
      throw new Error('XDR is missing from the carbon sink response');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error requesting carbon sink:', error);
    throw error;
  }
}

export async function getUserProfile(email: string, token: string, network: Network, apiUrl?: string) {
  try {
    const baseUrl = getValidApiUrl(network, apiUrl);
    const encodedEmail = encodeURIComponent(email);
    const response = await axios.get(
      `${baseUrl}/api/profile/${encodedEmail}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        params: {
          network
        },
        withCredentials: true
      }
    );
    
    return response.data;
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

export async function submitTransaction(
  xdr: string,
  email: string,
  token: string,
  network: Network,
  apiUrl?: string
): Promise<{ hash: string }> {
  try {
    const baseUrl = getValidApiUrl(network, apiUrl);
    const response = await axios.post(
      `${baseUrl}/transactions/submit`,
      {
        email,
        xdr
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.data?.hash) {
      throw new Error('Transaction hash missing from response');
    }

    return { hash: response.data.hash };
  } catch (error) {
    console.error('Error submitting transaction:', error);
    throw error;
  }
}
