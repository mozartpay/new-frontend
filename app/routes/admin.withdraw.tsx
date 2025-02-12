import React, { useState, useEffect } from 'react';
import { useNavigate, useLoaderData } from '@remix-run/react';
import { json, LoaderFunction, redirect } from '@remix-run/node';
import axios from 'axios';
import { getUserFromSession } from '~/sessions/index';
import { requestCarbonSink } from '~/utils/api';
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
    usd_amount: string;
    total_carbon: string;
  };
  originalAmount: number;
  carbonOffsetAmount: number;
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

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserFromSession(request);

  if (!user) {
    return redirect("/signin");
  }

  try {
    if (!user.email || !user.isAuthorized) {
      return redirect("/signin");
    }
    // Use default API URL if environment variable is not set
    const apiUrl = process.env.API_URL || 'http://localhost:8000/api';
    return json({ user, apiUrl, token: user.token });
  } catch (error) {
    console.error("Error processing user data:", error);
    return redirect("/signin");
  }
};

async function getCarbonQuote(amount: number): Promise<CarbonQuoteResponse> {
  try {
    // Calculate 1% of the amount for carbon offset
    const carbonAmount = amount * 0.01;
    
    const response = await axios.post('http://localhost:8000/api/carbon/quote', { 
      usdAmount: carbonAmount 
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching carbon quote:', error);
    throw new Error('Failed to fetch carbon quote');
  }
}

async function getCarbonSinkXDR(data: { carbonAmount: number }): Promise<any> {
  try {
    const response = await axios.post('http://localhost:8000/api/carbon/sink-xdr', data);
    return response.data;
  } catch (error) {
    console.error('Error fetching carbon sink XDR:', error);
    throw new Error('Failed to fetch carbon sink XDR');
  }
}

async function getBalances(email: string, token: string, apiUrl: string): Promise<any> {
  try {
    const response = await axios.get(`${apiUrl}/balance?email=${encodeURIComponent(email)}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching balances:', error);
    throw new Error('Failed to fetch balances');
  }
}

export default function AdminWithdraw() {
  const { user: loaderUser, apiUrl, token } = useLoaderData<{ user: any, apiUrl: string, token: string }>();
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('');
  const [balances, setBalances] = useState<Balance[]>([]);
  const [xlmAddress, setXlmAddress] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [carbonCreditsEnabled, setCarbonCreditsEnabled] = useState<boolean>(false);
  const [showCarbonCreditsOption, setShowCarbonCreditsOption] = useState<boolean>(false);
  const [explorerUrls, setExplorerUrls] = useState<string[]>([]);
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>(loaderUser?.preferredNetwork || 'testnet');
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  // Set default API URL if not provided
  const baseApiUrl = apiUrl || 'http://localhost:8000/api';

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
      setUser(loaderUser);
    }
  }, [loaderUser, user, setUser, navigate]);

  useEffect(() => {
    if (user && user.email) {
      fetchBalances();
    }
  }, [user]);

  const fetchBalances = async () => {
    try {
      const balancesData = await getBalances(loaderUser.email, token, baseApiUrl);
      setBalances(balancesData.balances || []);
    } catch (error) {
      console.error('Error fetching balances:', error);
      setError('Failed to fetch balances. Please try again.');
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [loaderUser.email, token, baseApiUrl]);

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    console.log('Amount changed:', value);
    setAmount(value);
    setShowCarbonCreditsOption(Number(value) >= 155);
  };

  const handleCurrencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    console.log('Currency changed:', value);
    setCurrency(value);
    if (value !== 'USDC') {
      setCarbonCreditsEnabled(false);
      setShowCarbonCreditsOption(false);
    }
  };

  const handleCarbonCreditsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    console.log('Carbon credits toggled:', enabled);
    setCarbonCreditsEnabled(enabled);
  };

  const handleNetworkChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setNetwork(event.target.value as 'testnet' | 'mainnet');
    setError(null);
  };

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
          // Send the full amount to calculate 1% on the backend
          carbonQuote = await axios({
            method: 'post',
            url: `${baseApiUrl}/carbon/quote`,
            data: { 
              usdAmount: amountNum,
              email: loaderUser.email 
            },
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          console.log('Carbon quote response:', JSON.stringify(carbonQuote.data, null, 2));
          carbonQuote = carbonQuote.data; // Store just the data
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
          // Extract and format the USDC amount from the quote
          const usdcAmount = carbonQuote.quote.usd_amount;
          console.log('Using USDC amount:', usdcAmount);
          console.log('User data:', { loaderUser });
          
          if (!loaderUser.email) {
            throw new Error('User email is required for carbon sink request');
          }
          
          carbonSinkData = await requestCarbonSink(
            xlmAddress,
            carbonQuote.quote.total_carbon,
            usdcAmount,
            loaderUser.email,
            token,
            baseApiUrl
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

      // Second transaction: Submit the carbon sink XDR if carbon credits are enabled
      if (carbonQuote && carbonSinkData) {
        try {
          console.log('Carbon sink XDR transaction handled by backend');
          
          if (!carbonSinkData.xdr) {
            throw new Error('Carbon sink XDR is missing from the response');
          }

        } catch (error) {
          console.error('Error processing carbon sink transaction:', error);
          setError('Failed to process carbon sink transaction');
        }
      }

      setSuccess('Withdrawal request processed successfully');
      setIsModalOpen(false);
      setIsConfirmationOpen(true);
      fetchBalances();
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
    fetchBalances();
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
        >
          <option value="">Select currency</option>
          {balances.map((balance) => (
            <option key={balance.asset_code} value={balance.asset_code}>
              {balance.asset_code}
            </option>
          ))}
        </select>
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

      {showCarbonCreditsOption && currency === 'USDC' && (
        <div className="carbon-credits-option">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={carbonCreditsEnabled}
              onChange={handleCarbonCreditsChange}
              className="form-checkbox"
            />
            <span>
              Offset 1% of this transaction with carbon credits (${(Number(amount) * 0.01).toFixed(2)} USDC)
            </span>
          </label>
          {carbonCreditsEnabled && (
            <p className="text-sm text-gray-600 mt-1 ml-6">
              💚 Your contribution will help offset carbon emissions through verified carbon credits
            </p>
          )}
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
            <h2>Enter Stellar Wallet Address</h2>
            <input
              type="text"
              placeholder="Enter your Stellar address"
              value={xlmAddress}
              onChange={(e) => setXlmAddress(e.target.value)}
            />
            <button 
              onClick={handleConfirmWithdraw} 
              disabled={loading || !xlmAddress}
            >
              {loading ? 'Processing...' : 'Confirm Withdrawal'}
            </button>
            <button onClick={() => setIsModalOpen(false)}>Cancel</button>
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
