import React, { useState, useEffect, useCallback } from 'react';
import { Form, useNavigate, useLoaderData, useSubmit } from '@remix-run/react';
import { json, LoaderFunction, redirect, ActionFunction } from '@remix-run/node';
import { motion } from 'framer-motion';
import { getUserFromSession } from '~/sessions';
import { useUser } from '~/context/UserContext';
import axios from 'axios';
import "~/styles/admin.css";
import "~/styles/payment-method.css";
import { User } from '~/types/user';
import { getBalances, createTrustline, createXLMAccount, getStellarAccount, Network } from '~/utils/api';
import USDCImage from '~/assets/img/dashboards/USDC.png';
import EURCImage from '~/assets/img/dashboards/EURC.png';
import XLMImage from '~/assets/img/dashboards/XLM.png';

interface StellarAccount {
  publicKey: string;
  balance: string;
  hasUSDCTrustline: boolean;
  hasEURCTrustline: boolean;
  preferredNetwork: Network;
}

type StellarAccountState = {
  [K in Network]?: {
    publicKey: string;
    balance: string;
    hasUSDCTrustline: boolean;
    hasEURCTrustline: boolean;
    preferredNetwork: Network;
  } | null;
};

interface Balance {
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

interface LoaderData {
  success: boolean;
  user: User;
  apiUrl: string;
  token: string;
}

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserFromSession(request);
  
  if (!user) {
    return redirect("/signin");
  }

  try {
    if (!user.email || !user.isAuthorized) {
      return redirect("/signin");
    }

    const apiUrl = process.env.API_URL || 'https://mozart-api-21ea5fd801a8.herokuapp.com/api';
    if (!apiUrl) {
      throw new Error("API_URL is not configured");
    }

    return json({ 
      success: true, 
      user,
      apiUrl,
      token: user.token
    });
  } catch (error) {
    console.error("Error processing user data:", error);
    return redirect("/signin");
  }
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  let currency = formData.get('currency') as string;
  const network = formData.get('network') as Network;
  
  // Map USD to USDC for the API
  if (currency === 'USD') {
    currency = 'USDC';
    console.log('Mapped USD to USDC for API compatibility');
  }
  
  // Get the user session
  const user = await getUserFromSession(request);
  
  if (!user || !user.email || !user.token) {
    return json({ error: "Session expired. Please sign in again." }, { status: 401 });
  }
  
  try {
    const apiUrl = process.env.API_URL || 'https://mozart-api-21ea5fd801a8.herokuapp.com/api';
    
    if (currency === 'XLM') {
      // Create XLM account
      await createXLMAccount(user.email, user.token, network, apiUrl);
    } else {
      // Create trustline for other currencies
      await createTrustline(user.email, currency, user.token, apiUrl, network);
    }
    
    return json({ success: true });
  } catch (error: any) {
    console.error('Action error:', error);
    
    // Check if it's an authentication error
    if (error.response?.status === 401) {
      return json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }
    
    return json({ 
      error: error.message || `Failed to add ${currency} payment method` 
    }, { 
      status: error.response?.status || 500 
    });
  }
};

export default function AdminAdd() {
  const { user: loaderUser, apiUrl, token } = useLoaderData<LoaderData>();
  const { user, setUser, updatePreferences } = useUser();
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<string>('XLM');
  // Initialize network from user preferences, ensuring it's never undefined
  const [network, setNetwork] = useState<Network>(loaderUser?.preferences?.network === 'mainnet' ? 'mainnet' : 'testnet');
  const [stellarAccount, setStellarAccount] = useState<StellarAccountState>({});
  const [balances, setBalances] = useState<{ [key in Network]: Balance[] }>({
    testnet: [],
    mainnet: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
    }
  }, [user, navigate]);

  const fetchUserData = useCallback(async () => {
    if (!user?.email || !token) return;

    try {
      setLoading(true);
      const response = await getBalances(user.email, token, network, apiUrl);
      
      // Update balances for the current network
      setBalances(prev => ({
        ...prev,
        [network]: response.balances || []
      }));
      
      // Get Stellar account info
      const stellarInfo = await getStellarAccount(user.email, token, network, apiUrl);
      if (stellarInfo) {
        setStellarAccount(prev => ({
          ...prev,
          [network]: stellarInfo
        }));
      }

    } catch (error: any) {
      console.error('Error fetching user data:', error);
      if ((error as any).response?.status !== 404) {
        setError('Failed to load user data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [user?.email, token, apiUrl, network]);

  useEffect(() => {
    if (user?.email && isClient) {
      fetchUserData();
    }
  }, [user?.email, isClient, network, fetchUserData]);

  useEffect(() => {
    if (user && network !== user.preferences?.network) {
      updatePreferences({ network });
    }
  }, [network, user, updatePreferences]);

  const truncateKey = (key: string | null) => {
    if (!key) return '';
    return key.length > 10 ? `${key.slice(0, 5)}...${key.slice(-5)}` : key;
  };

  const copyToClipboard = (text: string | null) => {
    if (text) {
      navigator.clipboard.writeText(text);
      setSuccess('Address copied to clipboard!');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleCopy = useCallback((text: string | null) => {
    copyToClipboard(text);
  }, []);

  const handleNetworkChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newNetwork = event.target.value as Network;
    setNetwork(newNetwork);
    setLoading(true);
    setError(null);
    try {
      // Update user preferences
      await updatePreferences({ network: newNetwork });
      
      // Clear current state
      setStellarAccount({});
      setBalances({
        testnet: [],
        mainnet: []
      });
      
      // Fetch fresh data for the new network
      await fetchUserData();
    } catch (error: any) {
      console.error('Error switching network:', error);
      setError('Failed to switch network. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getBalance = (assetCode: string): string => {
    const networkBalances = balances[network] || [];
    const balance = networkBalances.find(b => {
      if (assetCode === 'XLM') {
        return b.asset_code === 'XLM' || !b.asset_code;
      }
      return b.asset_code === (assetCode === 'USD' ? 'USDC' : assetCode);
    });
    return balance ? balance.balance : '0';
  };

  const submit = useSubmit();

  const handleAddPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('currency', currency);
      formData.append('network', network);
      
      // Log the data being sent
      console.log('Submitting form with data:', { 
        currency, 
        network,
        apiUrl,
        userEmail: user?.email 
      });
  
      // Try to submit the form
      try {
        const response = await submit(formData, { method: 'post' });
        console.log('Form submission response:', response);
      } catch (submitError: unknown) {
        console.error('Form submission error:', submitError);
        throw new Error(`Form submission failed: ${submitError instanceof Error ? submitError.message : 'Unknown error'}`);
      }
      
      // Wait a moment before fetching updated data
      setTimeout(async () => {
        try {
          // Fetch updated account data
          await fetchUserData();
          
          // Set success message immediately since the backend operation was successful
          setSuccess(currency === 'XLM' 
            ? 'XLM account created successfully!' 
            : `${currency} trustline created successfully!`
          );
          
          // Still check for trustline existence, but don't show an error if not found immediately
          // as it might take time to appear in the blockchain
          const currentAccount = stellarAccount?.[network];
          const trustlineExists = currency === 'USD' 
            ? currentAccount?.hasUSDCTrustline 
            : currency === 'EUR' 
              ? currentAccount?.hasEURCTrustline
              : true;
              
          if (currency !== 'XLM' && !trustlineExists) {
            console.log('Trustline not immediately visible - may take a moment to appear on the blockchain');
          }
        } catch (fetchError) {
          console.error('Error fetching updated data:', fetchError);
          // Don't set an error here, as the operation was successful
        } finally {
          setLoading(false);
        }
      }, 2000);
      
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      setError(error.message || `Failed to add ${currency} payment method`);
      setLoading(false);
    }
  };

  const getTrustlineStatus = (currencyCode: string) => {
    if (currencyCode === 'XLM') {
      const balance = getBalance('XLM');
      return {
        exists: true,
        message: `Ready to use (${balance} XLM)`
      };
    }

    const networkAccount = stellarAccount?.[network];
    if (!networkAccount) {
      return {
        exists: false,
        message: 'Account not found'
      };
    }

    const hasUSDC = networkAccount.hasUSDCTrustline;
    const hasEURC = networkAccount.hasEURCTrustline;

    if (currencyCode === 'USD') {
      const balance = getBalance('USDC');
      return {
        exists: hasUSDC,
        message: hasUSDC ? `Ready to use (${balance} USDC)` : 'Create USDC trustline'
      };
    }

    if (currencyCode === 'EUR') {
      const balance = getBalance('EURC');
      return {
        exists: hasEURC,
        message: hasEURC ? `Ready to use (${balance} EURC)` : 'Create EUR trustline'
      };
    }

    return {
      exists: false,
      message: 'Unknown currency'
    };
  };

  const shouldShowWallet = () => {
    if (!currency) return Boolean(stellarAccount?.[network]);

    if (currency === 'XLM') {
      return Boolean(stellarAccount?.[network]);
    }

    if (currency === 'USD' || currency === 'EUR') {
      return Boolean(stellarAccount?.[network]?.hasUSDCTrustline);
    }

    return false;
  };

  const maskedPublicKey = stellarAccount?.[network]?.publicKey 
    ? `${stellarAccount[network]?.publicKey?.slice(0, 10) || ''}...${stellarAccount[network]?.publicKey?.slice(-10) || ''}`
    : '';

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="admin-add">
      <h1>Add Payment Method</h1>
      <>
        <Form method="post" onSubmit={handleAddPayment}>
          <input type="hidden" name="currency" value={currency} />
          <input type="hidden" name="network" value={network} />
          <div className="mb-4">
            <label htmlFor="network" className="block text-sm font-medium text-gray-700 mb-2">
              Network
            </label>
            <select
              id="network"
              value={network}
              onChange={handleNetworkChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="testnet">Testnet</option>
              <option value="mainnet">Mainnet</option>
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={loading}
            >
              <option value="">Select a currency</option>
              <option value="XLM">XLM</option>
              <option value="USD">USD (USDC)</option>
              <option value="EUR">EUR</option>
            </select>
            {loading && (
              <p className="mt-2 text-sm text-gray-500">
                Verifying asset requirements...
              </p>
            )}
            {currency === 'USD' && (
              <p className="mt-2 text-sm text-gray-600">
                USD payments are handled through USDC (USD Coin) on the Stellar network.
              </p>
            )}
          </div>

          {/* Create Account Section */}
          {!loading && currency === 'XLM' && !stellarAccount?.[network] && (
            <div className="create-account">
              <h2>Create Your First Wallet</h2>
              <p>Start by creating a Stellar account to access digital currencies</p>
              <div className="currency-item">
                <img src={XLMImage} alt="XLM" className="currency-icon" />
                <div className="currency-info">
                  <h3>XLM</h3>
                  <p>Create a Stellar account on {network}</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                  Create Account
                </button>
              </div>
            </div>
          )}

          {/* Create Trustline Section */}
          {!loading && stellarAccount?.[network] && !shouldShowWallet() && (
            <div className="create-trustline">
              <h2>Add {currency} to Your Wallet</h2>
              <p>
                {currency === 'USD' 
                  ? 'Create a USDC trustline to start using USD in your wallet' 
                  : currency === 'XLM'
                  ? 'Your XLM account is ready to use'
                  : `Create a ${currency} trustline to start using it in your wallet`}
              </p>
              {currency !== 'XLM' && (
                <div className="trustline-info">
                  <div className="flex items-center space-x-2 mb-4">
                    <img 
                      src={currency === 'USD' ? USDCImage : EURCImage} 
                      alt={currency} 
                      className="w-8 h-8" 
                    />
                    <span className="text-lg font-medium">
                      {currency === 'USD' ? 'USD (USDC)' : currency}
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                  >
                    {loading ? 'Creating trustline...' : `Create ${currency === 'USD' ? 'USDC' : currency} Trustline`}
                  </button>
                  {currency === 'USD' && (
                    <p className="mt-2 text-sm text-gray-600">
                      USD payments are handled through USDC (USD Coin) on the Stellar network
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Wallet Status Section */}
          {shouldShowWallet() && stellarAccount?.[network] && (
            <div className="wallet-status">
              <h2>Your {network} Wallet</h2>
              <div className="wallet-info">
                <div className="public-key-display">
                  <span className="font-medium">Public Key:</span>
                  <code className="ml-2 bg-gray-100 p-2 rounded">
                    {truncateKey(network === 'testnet' ? user?.publicKeyXlmTestnet : user?.publicKeyXlmMainnet)}
                  </code>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCopy(network === 'testnet' ? user?.publicKeyXlmTestnet : user?.publicKeyXlmMainnet);
                    }} 
                    className="ml-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="available-currencies">
                <h3>Available Currencies</h3>
                <div className="currency-list">
                  {['XLM', 'USD', 'EUR'].map((code) => {
                    const status = getTrustlineStatus(code);
                    
                    if (!status.exists && code !== currency) return null;
                    
                    return (
                      <div 
                        key={code} 
                        className={`currency-item ${status.exists ? 'available' : ''}`}
                      >
                        <img 
                          src={code === 'XLM' ? XLMImage : code === 'USD' ? USDCImage : EURCImage} 
                          alt={code} 
                          className="currency-icon" 
                        />
                        <span>{code === 'USD' ? 'USD (USDC)' : code}</span>
                        <span className={`status-badge ${status.exists ? 'available' : ''}`}>
                          {status.message}
                        </span>
                        {code === 'USD' && (
                          <p className="text-xs text-gray-500 mt-1">
                            Powered by USDC stablecoin
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Create Wallet Section */}
          {!loading && !stellarAccount?.[network] && currency !== 'XLM' && (
            <div className="create-wallet">
              <h2>Create Your First Wallet</h2>
              <p>Start by creating a Stellar account to access digital currencies</p>
              <div className="payment-method-card">
                <img src={XLMImage} alt="XLM" className="payment-method-image" />
                <div className="payment-method-content">
                  <h3>XLM</h3>
                  <p>Create a Stellar account on {network}</p>
                  <button
                    onClick={() => {
                      setCurrency('XLM');
                      handleAddPayment(new Event('click') as unknown as React.FormEvent);
                    }}
                    className="action-button mt-2"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
        </Form>
      </>
    </div>
  );
}