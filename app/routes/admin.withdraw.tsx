import React, { useState, useEffect } from 'react';
import { useNavigate, useLoaderData } from '@remix-run/react';
import { json, LoaderFunction, redirect } from '@remix-run/node';
import axios from 'axios';
import { getUserFromSession } from '~/sessions/index';
import { useUser } from '~/context/UserContext';
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

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserFromSession(request);

  if (!user) {
    return redirect("/signin");
  }

  try {
    if (!user.email || !user.isAuthorized) {
      return redirect("/signin");
    }
    return json({ user, apiUrl: process.env.API_URL, token: user.token });
  } catch (error) {
    console.error("Error processing user data:", error);
    return redirect("/signin");
  }
};

export default function AdminWithdraw() {
  const { user: loaderUser, apiUrl, token } = useLoaderData<{ user: any, apiUrl: string, token: string }>();
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('');
  const [balances, setBalances] = useState<Balance[]>([]);
  const [xlmAddress, setXlmAddress] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<JSX.Element | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const navigate = useNavigate();
  const { user, setUser } = useUser();

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
      if (!user || !user.email) {
        throw new Error('User or email is not available');
      }
      const response = await axios.get(
        `${apiUrl}/balance?email=${encodeURIComponent(user.email)}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      const apiBalances = response.data.balances || [];

      const formattedBalances: Balance[] = apiBalances.map((balance: any) => ({
        asset_code: balance.asset_code || 'XLM',
        balance: balance.balance
      }));

      setBalances(formattedBalances);
    } catch (error) {
      console.error('Error fetching balances:', error);
      setError('Failed to fetch balances. Please try again later.');
    }
  };

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(event.target.value);
  };

  const handleCurrencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrency(event.target.value);
  };

  const validateAmount = () => {
    const balance = balances.find(b => b.asset_code === currency);
    const withdrawalAmount = parseFloat(amount);
    return withdrawalAmount > 0 && balance && withdrawalAmount <= parseFloat(balance.balance);
  };

  const handleWithdraw = () => {
    if (validateAmount()) {
      setIsModalOpen(true);
    } else {
      setError("Invalid amount. Please ensure the withdrawal amount is valid and doesn't exceed your balance.");
    }
  };

  const submitWithdrawRequest = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!user) {
        throw new Error('User is not available');
      }
      const network = user.preferredNetwork || 'testnet';
      const response = await axios.post(
        `${apiUrl}/withdraw`,
        {
          amount: amount,
          currency: currency,
          xlmAddress: xlmAddress,
          email: user.email,
          network: network
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        }
      );

      if (response.data?.result?.hash) {
        const explorerUrl = `https://stellar.expert/explorer/${network}/tx/${response.data.result.hash}`;
        setSuccess(
          <div className="success-message" style={{ margin: '1rem 0', padding: '1rem', backgroundColor: '#e6ffe6', borderRadius: '4px' }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>Withdrawal successful! 🎉</p>
            <p style={{ margin: '0' }}>
              View on Stellar Expert:{' '}
              <a 
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#0066cc', textDecoration: 'underline' }}
              >
                {response.data.result.hash}
              </a>
            </p>
          </div>
        );
      }

      setIsModalOpen(false);
      setIsConfirmationOpen(true);
      fetchBalances();
    } catch (error: any) {
      console.error('Error creating withdrawal request:', error);
      setError(error.response?.data?.message || 'An error occurred while processing your withdrawal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmationClose = () => {
    setIsConfirmationOpen(false);
    fetchBalances();
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="admin-withdraw">
      <h1>Withdraw Funds</h1>
      <select value={currency} onChange={handleCurrencyChange}>
        <option value="">Select currency</option>
        {balances.map((balance) => (
          <option key={balance.asset_code} value={balance.asset_code}>
            {balance.asset_code}
          </option>
        ))}
      </select>

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

      {error && <p className="error">{error}</p>}
      {success && success}

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
            <button onClick={handleWithdraw} disabled={!amount || currency !== 'XLM'}>
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
            <button onClick={handleWithdraw} disabled={!amount || currency !== 'USDC'}>
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
            <button onClick={handleWithdraw} disabled={!amount || currency !== 'EURC'}>
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
              placeholder="Stellar Wallet Address"
              value={xlmAddress}
              onChange={(e) => setXlmAddress(e.target.value)}
            />
            <button onClick={submitWithdrawRequest} disabled={loading}>
              {loading ? 'Processing...' : 'Submit'}
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
            <button onClick={handleConfirmationClose}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
