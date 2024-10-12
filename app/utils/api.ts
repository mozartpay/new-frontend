import axios from 'axios';

export async function getBalances(email: string, token: string) {
  if (!email || !token) {
    throw new Error("Email and token are required");
  }

  try {
    const response = await axios({
      method: 'get',
      url: `${process.env.API_URL}/balance?email=${encodeURIComponent(email)}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data.balances || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error fetching balances:", error.response?.data || error.message);
      if (error.response?.status === 401) {
        throw new Error("Unauthorized: Please check your authentication token");
      } else if (error.response?.status === 400) {
        throw new Error("Bad Request: Please check the provided email");
      }
    }
    throw error;
  }
}

export async function getStellarAccount(email: string, token: string, apiUrl: string) {
  try {
    const response = await axios.get(
      `${apiUrl}/balance?email=${encodeURIComponent(email)}`,
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        } 
      }
    );

    const { balance, publicKey } = response.data;

    if (balance && publicKey) {
      return {
        publicKey,
        balance,
        hasUSDCTrustline: false,
        hasEURCTrustline: false,
      };
    }
    return null;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        console.log('User not found or no Stellar account exists');
        return null;
      } else if (error.response?.status === 400 && error.response.data.error === 'Private key not available') {
        console.log('Private key not available for this account');
        return null;
      }
    }
    console.error('Error fetching Stellar account:', error);
    throw error;
  }
}

export async function createTrustline(email: string, currency: string, token: string, apiUrl: string) {
  try {
    const response = await axios.post(
      `${apiUrl}/trustline`,
      { email, currency },
      { 
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': '*/*',
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

export async function createXLMAccount(email: string, token: string, apiUrl: string) {
  try {
    const response = await axios.post(
      `${apiUrl}/xlm/`,
      { email, currency: 'XLM' },
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
