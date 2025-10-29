import React, { useState, useEffect } from 'react';
import { useNavigate, useLoaderData } from '@remix-run/react';
import { json, LoaderFunction, redirect } from '@remix-run/node';
import axios from 'axios';
import { getUserFromSession } from '~/sessions/index';
import { requestCarbonSink, getBalances, getStellarAccount, Network, submitTransaction } from '~/utils/api';
import { useUser } from '~/context/UserContext';
import { User } from '~/types/user';
import { motion } from 'framer-motion';
import "~/styles/admin.css";

// Import your images
import USDC from '~/assets/img/dashboards/USDC.png';
import XLM from '~/assets/img/dashboards/XLM.png';
import EURC from '~/assets/img/dashboards/EURC.png';

// Define the Balance type
interface Balance {
  asset_code: string;
  balance: string;
}

interface CarbonQuoteResponse {
  success: boolean;
  quote: {
    carbonAmount: string;
    usdcAmount: string;
    total_carbon: string;
    usd_amount: string;
  };
  originalAmount: number;
  calculatedAmount: number;
  adjustedAmount?: number;
  note?: string;
}

interface WithdrawalData {
  amount: string;
  email: string;
  network: string;
  xlmAddress: string;
  assetType: 'XLM' | 'USDC';
  carbonCredits?: {
    enabled: boolean;
    quote: CarbonQuoteResponse;
    percentage: number;
  };
}

interface StellarAccountInfo {
  publicKey: string;
  balance: string;
  hasUSDCTrustline: boolean;
  hasEURCTrustline: boolean;
  preferredNetwork: 'testnet' | 'mainnet';
}

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserFromSession(request);

  if (!user) {
    return redirect("/signin");
  }

  try {
    const response = await getBalances(user.email, user.token, 'testnet' as Network, 'testnet');
    return json({
      user,
      apiUrl: process.env.API_URL,
      token: user.token,
      balances: response.balances || []
    });
  } catch (error) {
    console.error('Error in loader:', error);
    return json({
      user,
      apiUrl: process.env.API_URL,
      token: user.token,
      balances: []
    });
  }
};

export default function AdminWithdraw() {
  const { user: loaderUser, apiUrl, token, balances: initialBalances } = useLoaderData<{ 
    user: User, 
    apiUrl: string, 
    token: string, 
    balances: Balance[] 
  }>();
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('');
  const [balances, setBalances] = useState<Balance[]>(initialBalances || []);
  const [xlmAddress, setXlmAddress] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [carbonCreditsEnabled, setCarbonCreditsEnabled] = useState<boolean>(false);
  const [showCarbonCreditsOption, setShowCarbonCreditsOption] = useState<boolean>(false);
  const [explorerUrls, setExplorerUrls] = useState<string[]>([]);
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>(
    (loaderUser?.preferredNetwork as 'testnet' | 'mainnet') || 'testnet'
  );
  const [stellarAccount, setStellarAccount] = useState<StellarAccountInfo | null>(null);
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const [carbonQuote, setCarbonQuote] = useState<CarbonQuoteResponse | null>(null);

  // Set default API URL if not provided
  const baseApiUrl = apiUrl;

  useEffect(() => {
    console.log('Component mounted with:', {
      baseApiUrl,
      token: token ? 'present' : 'missing',
      user: user ? 'present' : 'missing'
    });
  }, []);

  useEffect(() => {
    if (!loaderUser) {
      navigate('/signin');
    } else if (!user) {
      setUser({
        ...loaderUser,
        isPhoneVerified: loaderUser.isPhoneVerified ?? false,
        preferences: loaderUser.preferences ?? {
          hideBalances: false,
          currency: 'USD',
          network: 'testnet'
        }
      });
    }
  }, [loaderUser, user, setUser, navigate]);

  useEffect(() => {
    if (user && user.email) {
      fetchBalances();
    }
  }, [user]);

  const fetchBalances = async () => {
    if (!user?.email || !token) return;
    
    try {
      setLoading(true);
      const response = await getBalances(user.email, token, network as Network, network);
      if (response.balances) {
        setBalances(response.balances);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
      setError('Failed to fetch balances');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    console.log('Amount changed:', value);
    setAmount(value);
    setShowCarbonCreditsOption(Number(value) >= 155);
  };

  const handleCurrencyChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    console.log('Currency changed:', value);
    setCurrency(value);
    setError(null);
    
    // Reset carbon credits if not USD/USDC
    if (value !== 'USDC' && value !== 'USD') {
      setCarbonCreditsEnabled(false);
      setShowCarbonCreditsOption(false);
    }

    // Check for USDC trustline if USD is selected
    if (value === 'USD' || value === 'USDC') {
      try {
        setLoading(true);
        const accountInfo = await getStellarAccount(
          loaderUser.email,
          token,
          network as Network,
          apiUrl
        );
        
        setStellarAccount(accountInfo);
        
        if (!accountInfo?.hasUSDCTrustline) {
          setError('You need to add a USDC trustline before withdrawing in USD. Please visit the Add Assets page to set this up.');
          setCurrency('');
        }
      } catch (err) {
        console.error('Error checking USDC trustline:', err);
        setError('Failed to verify USDC trustline status. Please try again.');
        setCurrency('');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCarbonCreditsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    console.log('Carbon credits toggled:', enabled);
    setCarbonCreditsEnabled(enabled);
  };

  const handleNetworkChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newNetwork = event.target.value as 'testnet' | 'mainnet';
    setNetwork(newNetwork);
    setCurrency(''); // Reset currency selection
    setError(null);
    
    // Reset carbon credits
    setCarbonCreditsEnabled(false);
    setShowCarbonCreditsOption(false);
    
    // Reset amount
    setAmount('');
    
    // Fetch new balances for the selected network
    try {
      setLoading(true);
      const response = await getBalances(user?.email || '', token, newNetwork as Network, newNetwork);
      if (response.balances) {
        setBalances(response.balances);
      }
    } catch (error) {
      console.error('Error fetching balances for new network:', error);
      setError('Failed to fetch balances for the selected network');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email && token) {
      fetchBalances();
    }
  }, [network, user?.email]);

  const handleWithdrawClick = async () => {
    console.log('Withdraw button clicked with:', {
      amount,
      currency,
      carbonCreditsEnabled,
      showCarbonCreditsOption
    });
    setIsModalOpen(true);
  };

  const handleConfirmWithdraw = async () => {
    console.log('Withdrawal confirmed, proceeding with:', {
      amount,
      currency,
      xlmAddress,
      carbonCreditsEnabled
    });
    
    if (!xlmAddress) {
      setError('Please enter a Stellar address');
      return;
    }
    
    await submitWithdrawRequest();
  };

  const submitWithdrawRequest = async () => {
    console.log('Submit withdraw request called');
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('Starting withdrawal process:', {
        baseApiUrl,
        hasToken: !!token,
        amount,
        currency,
        carbonCreditsEnabled,
        user: loaderUser.email,
        xlmAddress,
        network
      });

      if (!loaderUser) {
        throw new Error('User is not available');
      }
      if (!currency) {
        throw new Error('Please select a currency');
      }
      if (!xlmAddress) {
        throw new Error('Please enter a Stellar address');
      }

      const assetType = currency as 'XLM' | 'USDC';

      let carbonQuote = null;
      let carbonSinkData = null;
      
      if (carbonCreditsEnabled && assetType === 'USDC') {
        console.log('Initiating carbon credits flow for USDC withdrawal');
        const amountNum = Number(amount);
        
        console.log('Requesting carbon quote for amount:', amountNum);
        try {
          carbonQuote = await axios({
            method: 'post',
            url: `${baseApiUrl}/carbon/quote`,
            data: { usdAmount: amountNum },
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          console.log('Carbon quote response:', JSON.stringify(carbonQuote.data, null, 2));
          
          // Update UI with minimum amount message if present
          if (carbonQuote.data.note) {
            setSuccess(carbonQuote.data.note);
          }
          
          carbonQuote = carbonQuote.data;
          carbonQuote.calculatedAmount = parseFloat(carbonQuote.calculatedAmount);
          if (carbonQuote.adjustedAmount) {
            carbonQuote.adjustedAmount = parseFloat(carbonQuote.adjustedAmount);
          }
          carbonQuote.originalAmount = parseFloat(carbonQuote.originalAmount);
          setCarbonQuote(carbonQuote);
        } catch (error) {
          console.error('Error getting carbon quote:', error);
          throw new Error('Failed to get carbon credits quote: ' + (error as Error).message);
        }
        
        if (!carbonQuote) {
          console.error('No carbon quote received');
          throw new Error('Failed to get carbon credits quote');
        }

        console.log('Requesting carbon sink with address:', xlmAddress);
        try {
          // Get the appropriate public key based on network
          const userPublicKey = network.toLowerCase() === 'testnet' 
            ? loaderUser.publicKeyXlmTestnet 
            : loaderUser.publicKeyXlmMainnet;

          if (!userPublicKey) {
            throw new Error(`No public key found for ${network} network`);
          }

          carbonSinkData = await requestCarbonSink(
            userPublicKey,
            carbonQuote.quote.total_carbon,  // Changed from carbonAmount
            carbonQuote.quote.usd_amount,    // Changed from usdcAmount
            loaderUser.email,
            token,
            network as Network,
            1360,  // vcsProjectId as number
            'USDC',
            userPublicKey,  // Using the same key for recipient
            baseApiUrl     // optional apiUrl parameter
          );
          console.log('Carbon sink response:', carbonSinkData);
        } catch (error) {
          console.error('Error getting carbon sink:', error);
          throw new Error('Failed to prepare carbon sink transaction: ' + (error as Error).message);
        }

        if (!carbonSinkData) {
          console.error('No carbon sink data received');
          throw new Error('Failed to prepare carbon sink transaction');
        }
      }
      
      const withdrawalData: WithdrawalData = {
        amount,
        email: loaderUser.email,
        network,
        xlmAddress,
        assetType
      };

      if (carbonQuote && carbonSinkData) {
        withdrawalData.carbonCredits = {
          enabled: true,
          quote: carbonQuote,
          percentage: 0.01
        };
      }

      console.log('Preparing to send withdrawal request:', {
        url: `${baseApiUrl}/withdraw`,
        data: withdrawalData
      });

      // First transaction: Send the original amount to the destination address
      const withdrawalResponse = await axios.post(
        `${baseApiUrl}/withdraw`,
        withdrawalData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        }
      );

      console.log('Withdrawal response received:', withdrawalResponse.data);

      let newExplorerUrls = [];
      
      if (withdrawalResponse.data?.result?.hash) {
        const networkPath = network === 'mainnet' ? 'public' : 'testnet';
        newExplorerUrls.push(`https://stellar.expert/explorer/${networkPath}/tx/${withdrawalResponse.data.result.hash}`);
      }
      
      setExplorerUrls(newExplorerUrls);

      // Second transaction: Process carbon sink response if carbon credits are enabled
      if (carbonQuote && carbonSinkData) {
        try {
          console.log('Processing carbon sink response:', carbonSinkData);
          
          if (!carbonSinkData.tx_xdr) {
            throw new Error('Carbon sink XDR is missing from the response');
          }

          // Add the carbon sink transaction hash to explorer URLs if available
          if (carbonSinkData.hash) {
            const networkPath = network === 'mainnet' ? 'public' : 'testnet';
            newExplorerUrls.push(`https://stellar.expert/explorer/${networkPath}/tx/${carbonSinkData.hash}`);
            setExplorerUrls(newExplorerUrls);
          }

        } catch (error) {
          console.error('Error processing carbon sink transaction:', error);
          setError('Failed to process carbon sink transaction: ' + (error as Error).message);
          return;
        }
      }

      setSuccess('Withdrawal request processed successfully');
      setIsModalOpen(false);
      setIsConfirmationOpen(true);
      // fetchBalances();
    } catch (error: any) {
      console.error('Error creating withdrawal request:', error);
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error ||
                         error.message ||
                         'An error occurred while processing your withdrawal. Please try again.';
      console.error('Server error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: errorMessage
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmationClose = () => {
    setIsConfirmationOpen(false);
    // fetchBalances();
  };

  if (!loaderUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="admin-withdraw">
      <h1>Withdraw Funds</h1>

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
          onChange={handleCurrencyChange}
          className="w-full p-2 border border-gray-300 rounded-md"
          disabled={loading}
        >
          <option value="">Select currency</option>
          {balances.map((balance) => (
            <option key={balance.asset_code} value={balance.asset_code}>
              {balance.asset_code} ({balance.balance})
            </option>
          ))}
        </select>
        {loading && (
          <p className="mt-2 text-sm text-gray-500">
            Verifying asset requirements...
          </p>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      {currency && (
        <div className="balance-info">
          <p>Current {currency} Balance: {balances.find(b => b.asset_code === currency)?.balance || '0.00'}</p>
        </div>
      )}

      <input
        type="number"
        placeholder="Enter amount to withdraw"
        value={amount}
        onChange={handleAmountChange}
      />

      {showCarbonCreditsOption && (
        <div className="mb-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="carbonCredits"
                type="checkbox"
                checked={carbonCreditsEnabled}
                onChange={handleCarbonCreditsChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="carbonCredits" className="font-medium text-gray-700">
                Enable Carbon Offset (1% of withdrawal amount)
              </label>
              <p className="text-gray-500">
                Your contribution will help offset carbon emissions through verified carbon credits
              </p>
              {carbonCreditsEnabled && carbonQuote && (
                <div className="mt-2 p-3 bg-green-50 rounded-md">
                  <h4 className="font-medium text-green-800">Carbon Offset Details</h4>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-green-700">
                      Original Amount: ${carbonQuote.originalAmount.toFixed(2)} USD
                    </p>
                    <p className="text-green-700">
                      Carbon Offset: ${carbonQuote.calculatedAmount.toFixed(2)} USD
                    </p>
                    {carbonQuote.adjustedAmount && (
                      <p className="text-green-700">
                        Adjusted Amount: ${carbonQuote.adjustedAmount.toFixed(2)} USD
                      </p>
                    )}
                    {carbonQuote.note && (
                      <p className="text-yellow-600 mt-2">
                        Note: {carbonQuote.note}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <div className="payment-methods">
        {currency === 'XLM' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="payment-method-card"
          >
            <img src={XLM} alt="XLM" className="payment-method-image" />
            <h3>Stellar (XLM)</h3>
            <p>Withdraw XLM to your Stellar wallet</p>
            <button onClick={handleWithdrawClick} disabled={!amount || currency !== 'XLM'}>
              Withdraw
            </button>
          </motion.div>
        )}

        {currency === 'USDC' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="payment-method-card"
          >
            <img src={USDC} alt="USDC" className="payment-method-image" />
            <h3>USDC (USD Coin)</h3>
            <p>Withdraw USDC to your preferred wallet</p>
            <button onClick={handleWithdrawClick} disabled={!amount || currency !== 'USDC'}>
              Withdraw
            </button>
          </motion.div>
        )}

        {currency === 'EURC' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="payment-method-card"
          >
            <img src={EURC} alt="EURC" className="payment-method-image" />
            <h3>EURC (Euro Coin)</h3>
            <p>Withdraw EURC to your preferred wallet</p>
            <button onClick={handleWithdrawClick} disabled={!amount || currency !== 'EURC'}>
              Withdraw
            </button>
          </motion.div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Confirm Withdrawal</h2>
            <div className="mb-4">
              <p className="text-gray-600 mb-2">Amount: {amount} {currency}</p>
              {carbonCreditsEnabled && carbonQuote && (
                <div className="text-sm text-gray-500">
                  <p>Carbon Offset: ${carbonQuote.calculatedAmount.toFixed(2)} USD</p>
                  {carbonQuote.adjustedAmount && (
                    <p>Adjusted Amount: ${carbonQuote.adjustedAmount.toFixed(2)} USD</p>
                  )}
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Stellar Address
              </label>
              <input
                type="text"
                placeholder="Enter the recipient's Stellar address"
                value={xlmAddress}
                onChange={(e) => {
                  const address = e.target.value.trim();
                  setXlmAddress(address);
                  // Clear any previous errors
                  setError(null);
                  // Basic Stellar address validation
                  try {
                    if (address && !address.startsWith('G')) {
                      setError('Invalid Stellar address. Address must start with G');
                    }
                  } catch (err) {
                    setError('Invalid Stellar address format');
                  }
                }}
                className={`w-full p-2 border rounded ${error ? 'border-red-500' : 'border-gray-300'}`}
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              <p className="text-sm text-gray-500 mt-1">
                Make sure this is the correct address. Transactions cannot be reversed.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setXlmAddress('');
                  setError(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmWithdraw} 
                disabled={loading || !xlmAddress || !!error}
                className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 
                  ${(loading || !xlmAddress || !!error) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Processing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isConfirmationOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Withdrawal Successful</h2>
            <p>Your withdrawal request has been successfully processed.</p>
            {explorerUrls.length > 0 && (
              <p>
                View on{' '}
                <a href={explorerUrls[0]} target="_blank" rel="noopener noreferrer">
                  stellar.expert
                </a>
              </p>
            )}
            <button onClick={handleConfirmationClose}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
