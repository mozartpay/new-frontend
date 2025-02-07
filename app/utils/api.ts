import axios from 'axios';

const DEFAULT_API_URL = 'http://localhost:8000/api';

function getValidApiUrl(apiUrl?: string): string {
  if (!apiUrl) {
    console.warn('API URL not provided, using default:', DEFAULT_API_URL);
    return DEFAULT_API_URL;
  }
  return apiUrl;
}

export async function getBalances(email: string, token: string, apiUrl?: string, network?: string) {
  try {
    const baseUrl = getValidApiUrl(apiUrl);
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

export async function getStellarAccount(email: string, token: string, apiUrl?: string) {
  try {
    const baseUrl = getValidApiUrl(apiUrl);
    const response = await axios.get(
      `${baseUrl}/stellar/account`,
      {
        params: { email },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching Stellar account:', error);
    throw error;
  }
}

export async function createTrustline(email: string, currency: string, token: string, apiUrl?: string) {
  try {
    const baseUrl = getValidApiUrl(apiUrl);
    const response = await axios.post(
      `${baseUrl}/stellar/trustline`,
      { email, currency },
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

export async function createXLMAccount(email: string, token: string, apiUrl?: string) {
  try {
    const baseUrl = getValidApiUrl(apiUrl);
    const response = await axios.post(
      `${baseUrl}/stellar/account`,
      { email },
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
    const baseUrl = getValidApiUrl(apiUrl);
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
