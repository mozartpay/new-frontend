import React, { useState, useEffect } from 'react';
import { useNavigate, useLoaderData } from '@remix-run/react';
import { json, LoaderFunction, redirect } from '@remix-run/node';
import axios from 'axios';
import { getUserFromSession } from '~/sessions/index';
import { useUser } from '~/context/UserContext';
import { User } from '~/types/user';
import "~/styles/admin.css";
import { motion } from 'framer-motion';

interface CurrencySymbols {
  [key: string]: string;
}

const currencySymbols: CurrencySymbols = {
  USD: '$',
  EUR: '€',
  COP: '$COP',
  BTC: '₿',
  ETH: 'Ξ',
  XLM: '*',
};

type LoaderData = {
  user: User;
  apiUrl: string;
  token: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserFromSession(request);

  if (!user || !user.email) {
    console.error("No user found in session");
    return redirect("/signin");
  }

  try {
    // Check authorization status
    if (!user.isAuthorized) {
      console.error("User is not authorized");
      return redirect("/unauthorized");
    }

    const apiUrl = process.env.API_URL;
    if (!apiUrl) {
      throw new Error('API URL not configured');
    }

    return json({ 
      user, 
      apiUrl, 
      token: user.token 
    });
  } catch (error) {
    console.error("Error in admin send loader:", error);
    throw new Error(`Admin access error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export default function AdminSend() {
  const { user: loaderUser, apiUrl, token } = useLoaderData<LoaderData>();
  const [amount, setAmount] = useState<number | string>(0);
  const [sourceCurrency, setSourceCurrency] = useState<string>('XLM');
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>(() => {
    const userNetwork = loaderUser?.preferences?.network;
    return (userNetwork === 'testnet' || userNetwork === 'mainnet') ? userNetwork : 'testnet';
  });
  const [balances, setBalances] = useState<{ [key: string]: { [currency: string]: string } }>({
    testnet: {},
    mainnet: {}
  });
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [balanceError, setBalanceError] = useState<string>('');
  const [amountError, setAmountError] = useState<string | null>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  const loadingVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const getAvailableCurrencies = () => {
    return Object.entries(balances[network] || {});
  };

  useEffect(() => {
    if (!loaderUser) {
      navigate('/signin');
    } else if (!user) {
      const completeUser = {
        ...loaderUser,
        isAuthorized: loaderUser.isAuthorized ?? false,
        token: loaderUser.token,
        isPhoneVerified: loaderUser.isPhoneVerified ?? false,
        preferences: loaderUser.preferences ?? {
          hideBalances: false,
          currency: 'USD',
          network: 'mainnet'
        },
        publicKeyXlmTestnet: loaderUser.publicKeyXlmTestnet ?? '',
        publicKeyXlmMainnet: loaderUser.publicKeyXlmMainnet ?? ''
      };
      setUser(completeUser);
    }
  }, [loaderUser, user, setUser, navigate]);

  useEffect(() => {
    if (user && user.email) {
      fetchBalances();
    }
  }, [user]);

  const handleNetworkChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newNetwork = event.target.value as 'testnet' | 'mainnet';
    setNetwork(newNetwork);
    setSourceCurrency(''); // Reset currency selection
    setAmountError(null);
    
    try {
      setIsLoadingBalances(true);
      await fetchBalances(newNetwork);
    } catch (error) {
      console.error('Error switching network:', error);
      setBalanceError('Failed to switch network. Please try again.');
    } finally {
      setIsLoadingBalances(false);
    }
  };

  const fetchBalances = async (currentNetwork?: string) => {
    try {
      if (!user?.email || !token) return;
      
      setIsLoadingBalances(true);
      setBalanceError('');

      const networkToUse = currentNetwork || network;
      const response = await axios({
        method: 'get',
        url: `${apiUrl}/user/balance/${encodeURIComponent(user.email)}`,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        params: {
          network: networkToUse
        },
        withCredentials: true
      });
      
      const apiBalances = response.data.balances || [];
      const formattedBalances: { [currency: string]: string } = {};
      
      apiBalances.forEach((balance: any) => {
        const currency = balance.asset_code || 'XLM';
        formattedBalances[currency] = balance.balance;
      });

      setBalances(prev => ({
        ...prev,
        [networkToUse]: formattedBalances
      }));
    } catch (error) {
      console.error('Error fetching balances:', error);
      setBalanceError('Failed to fetch balances. Please try again.');
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        navigate('/signin');
      }
    } finally {
      setIsLoadingBalances(false);
    }
  };

  const getCurrentBalance = (currency: string): string => {
    return balances[network]?.[currency] || '0';
  };

  useEffect(() => {
    if (user?.email && token) {
      fetchBalances();
    }
  }, [user?.email, token, network]);

  const validateInputs = (): string | null => {
    if (!receiverEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return 'Please enter a valid email address';
    }

    if (!receiverName.trim() || receiverName.length < 2) {
      return 'Please enter a valid name (minimum 2 characters)';
    }

    if (!amount || Number(amount) <= 0) {
      return 'Please enter a valid amount';
    }

    const numAmount = Number(amount);
    if (numAmount > 1000000) {
      return 'Amount exceeds maximum transfer limit';
    }

    const sourceBalance = parseFloat(getCurrentBalance(sourceCurrency) || '0');
    if (numAmount > sourceBalance) {
      return 'Insufficient funds';
    }

    return null;
  };

  const handleForwardClick = () => {
    const error = validateInputs();
    if (error) {
      setShowErrorModal(true);
      setErrorMessage(error);
      return;
    }
    setShowModal(true);
  };

  const handleSend = async () => {
    const error = validateInputs();
    if (error || !user) {
      setShowErrorModal(true);
      setErrorMessage(error || 'User session expired');
      return;
    }

    setIsSending(true);
    try {
      const response = await axios.post(
        `${apiUrl}/send`,
        {
          senderEmail: user.email,
          amount: amount.toString(),
          receiverEmail,
          receiverName,
          network: network
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        setShowModal(false);
        setSuccessMessage(
          `Transaction completed successfully! ${receiverName} will receive an email at ${receiverEmail} with instructions to access their funds.`
        );
        setShowSuccessModal(true);
        fetchBalances(); // Refresh balances after successful send
      }
    } catch (error) {
      console.error('Error sending data:', error);
      let errorMessage = 'There was an issue processing your transaction.';
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          navigate('/signin');
          return;
        }
        if (error.response?.data?.error?.includes('public key')) {
          errorMessage = `We'll create a new account for ${receiverName} and send instructions to ${receiverEmail}.`;
        } else {
          errorMessage = error.response?.data?.details || error.response?.data?.error || errorMessage;
        }
      }
      
      setErrorMessage(errorMessage);
      setShowErrorModal(true);
    } finally {
      setIsSending(false);
      setShowModal(false);
    }
  };

  const handleCurrencyChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setSourceCurrency(event.target.value);
    setAmount('');
    setAmountError('');
  };

  const handleCloseSuccessModal = () => {
    setAmount(0);
    setReceiverEmail('');
    setReceiverName('');
    setSourceCurrency('XLM');
    setShowSuccessModal(false);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="admin-send">
      <h1>Send Money</h1>
      
      <div className="form-group">
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

      <div className="form-group">
        <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
          Select currency to send:
        </label>
        <select
          id="currency"
          value={sourceCurrency}
          onChange={handleCurrencyChange}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          <option value="">Select a currency</option>
          {Object.entries(balances[network] || {}).map(([code, balance]) => (
            <option key={code} value={code}>
              {code} ({parseFloat(balance).toFixed(7)})
            </option>
          ))}
        </select>
      </div>

      {sourceCurrency && (
        <p className="balance-info text-sm text-gray-600 mt-2">
          Current {sourceCurrency} Balance: {getCurrentBalance(sourceCurrency) ? 
            `${currencySymbols[sourceCurrency]}${parseFloat(getCurrentBalance(sourceCurrency)).toFixed(7)}` : 
            `${currencySymbols[sourceCurrency]}0.0000000`
          }
        </p>
      )}

      {isLoadingBalances && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={loadingVariants}
          className="text-sm text-gray-600 mt-2"
        >
          <p>Loading balances...</p>
        </motion.div>
      )}

      {balanceError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="error text-sm text-red-600 mt-2"
        >
          <p>{balanceError}</p>
        </motion.div>
      )}

      <div className="form-group">
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
          Amount to send:
        </label>
        <div className="input-group">
          <span className="input-group-text">{currencySymbols[sourceCurrency]}</span>
          <input
            type="number"
            id="amount"
            value={amount || ''}
            onChange={(e) => setAmount(e.target.value ? parseFloat(e.target.value) : 0)}
            placeholder="Enter amount"
          />
        </div>
        {amountError && <p className="error">{amountError}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="receiverName" className="block text-sm font-medium text-gray-700 mb-2">
          Receiver Name:
        </label>
        <input
          type="text"
          id="receiverName"
          value={receiverName}
          onChange={(e) => setReceiverName(e.target.value)}
          placeholder="Enter receiver name"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="receiverEmail" className="block text-sm font-medium text-gray-700 mb-2">
          Receiver Email:
        </label>
        <input
          type="email"
          id="receiverEmail"
          value={receiverEmail}
          onChange={(e) => setReceiverEmail(e.target.value)}
          placeholder="Enter receiver email"
          required
        />
      </div>

      <button
        onClick={handleForwardClick}
        disabled={!amount || Number(amount) <= 0 || !sourceCurrency || amountError !== ''}
        className="send-button"
      >
        Forward
      </button>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Confirm Transaction</h2>
            <p>You're about to send:</p>
            <p><strong>{currencySymbols[sourceCurrency]}{amount} {sourceCurrency}</strong></p>
            <p>To: {receiverName} ({receiverEmail})</p>
            <p>Please confirm the details before proceeding.</p>
            <div className="modal-actions">
              <button onClick={() => setShowModal(false)}>Cancel</button>
              <button onClick={handleSend} disabled={isSending}>
                {isSending ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Success!</h2>
            <p>{successMessage}</p>
            <button onClick={handleCloseSuccessModal}>Close</button>
          </div>
        </div>
      )}

      {showErrorModal && (
        <div className="modal">
          <div className="modal-content error">
            <h2>Error</h2>
            <p>{errorMessage || 'An unexpected error occurred. Please try again.'}</p>
            <button onClick={() => {
              setShowErrorModal(false);
              setErrorMessage('');
            }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
