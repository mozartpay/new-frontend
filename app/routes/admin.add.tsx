import React, { useState, useEffect } from 'react';
import { useNavigate, useLoaderData } from '@remix-run/react';
import { json, LoaderFunction, redirect } from '@remix-run/node';
import { motion } from 'framer-motion';
import { getUserFromSession } from '~/sessions/index';
import { useUser } from '~/context/UserContext';
import axios from 'axios';
import "~/styles/admin.css";
import { User } from '~/types/user';
import { getStellarAccount, createTrustline, createXLMAccount, Network } from '~/utils/api';
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

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserFromSession(request);

  if (!user || !user.email || !user.isPhoneVerified) {
    return redirect("/signin");
  }

  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    throw new Error("API_URL is not defined in environment variables");
  }

  try {
    const stellarAccount = await getStellarAccount(user.email, user.token, apiUrl, 'testnet');
    return json({ user, apiUrl, token: user.token ?? '', stellarAccount });
  } catch (error) {
    console.error("Error processing user data:", error);
    if (error instanceof Error) {
      return json({ user, apiUrl, token: user.token ?? '', stellarAccount: null, error: error.message });
    }
    return json({ user, apiUrl, token: user.token ?? '', stellarAccount: null, error: "An unexpected error occurred" });
  }
};

export default function AdminAdd() {
  const { user: loaderUser, apiUrl, token, stellarAccount: initialStellarAccount } = useLoaderData<{
    user: User;
    apiUrl: string;
    token: string;
    stellarAccount: StellarAccount | null;
  }>();
  
  const [currency, setCurrency] = useState<string>('');
  const [network, setNetwork] = useState<Network>('testnet');
  const [stellarAccount, setStellarAccount] = useState<StellarAccount | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setStellarAccount(initialStellarAccount);
  }, [initialStellarAccount]);

  useEffect(() => {
    if (!loaderUser) {
      navigate('/signin');
      return;
    }
    
    if (!user) {
      setUser({
        email: loaderUser.email,
        name: loaderUser.name,
        publicKeyXlmTestnet: loaderUser.publicKeyXlmTestnet,
        publicKeyXlmMainnet: loaderUser.publicKeyXlmMainnet,
        isAuthorized: loaderUser.isAuthorized,
        token: loaderUser.token || '',
        preferredCurrency: loaderUser.preferredCurrency,
        preferredNetwork: loaderUser.preferredNetwork,
        image: loaderUser.image,
        preferences: {
          hideBalances: false,
          currency: loaderUser.preferredCurrency || '',
          network: loaderUser.preferredNetwork || ''
        }
      });
    }
  }, [loaderUser, user, setUser, navigate]);

  useEffect(() => {
    const fetchStellarAccount = async () => {
      try {
        if (user?.email && user?.token) {
          const account = await getStellarAccount(user.email, user.token, undefined, network);
          setStellarAccount(account);
          setError(null);
        }
      } catch (error) {
        console.error('Error fetching Stellar account:', error);
        if (error instanceof Error) {
          setError(error.message);
        }
      }
    };

    fetchStellarAccount();
  }, [user?.email, user?.token, network]);

  const handleNetworkChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newNetwork = event.target.value as Network;
    setNetwork(newNetwork);
    setStellarAccount(null);
    setError(null);
  };

  const handleCurrencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrency(event.target.value);
    setError(null);
  };

  const handleAddPayment = async () => {
    try {
      setError('');
      setSuccess('');
      setLoading(true);
      
      if (!user?.email || !user?.token) {
        throw new Error('User information not found');
      }

      if (!currency) {
        setError('Please select a currency');
        return;
      }

      if (currency === 'XLM') {
        const result = await createXLMAccount(user.email, user.token, undefined, network);
        if (result?.publicKey) {
          const account = await getStellarAccount(user.email, user.token, undefined, network);
          setStellarAccount(account);
          setSuccess('XLM account created successfully!');
        }
      } else {
        await createTrustline(user.email, currency, user.token, undefined, network);
        const account = await getStellarAccount(user.email, user.token, undefined, network);
        setStellarAccount(account);
        setSuccess(`${currency} trustline added successfully!`);
      }
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      setError(error.message || 'Failed to add payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (publicKey: string) => {
    try {
      await navigator.clipboard.writeText(publicKey);
      alert('Public key copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy public key', error);
    }
  };

  const PaymentMethodCard = ({ imgSrc, title, description, onClick, displayInfo, network, loading }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="payment-method-card"
    >
      <img src={imgSrc} alt={title} className="payment-method-image" />
      <h3>{title}</h3>
      <p>{description}</p>
      {network && <span className="network-badge">{network}</span>}
      {displayInfo || (
        <button onClick={onClick} disabled={loading} className={loading ? 'loading' : ''}>
          {loading ? 'Creating...' : 'Create Account'}
        </button>
      )}
    </motion.div>
  );

  const maskedPublicKey = stellarAccount
    ? `${stellarAccount.publicKey.slice(0, 10)}...${stellarAccount.publicKey.slice(-10)}`
    : '';

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="admin-add">
      <h1>Add Payment Method</h1>
      <>
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
            <option value="">Select a currency</option>
            <option value="XLM">XLM</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <div className="payment-methods">
          {currency === 'USD' && stellarAccount?.hasUSDCTrustline ? (
            <PaymentMethodCard
              imgSrc={USDCImage}
              title="USDC"
              description="You already have a USDC trustline."
              displayInfo={
                <div>
                  <p>Public Key: {maskedPublicKey}</p>
                  <button onClick={() => handleCopy(stellarAccount.publicKey)}>Copy</button>
                </div>
              }
              network={network}
            />
          ) : currency === 'USD' ? (
            <PaymentMethodCard
              imgSrc={USDCImage}
              title="USDC"
              description="Add a USDC trustline to start using USD"
              onClick={handleAddPayment}
              network={network}
            />
          ) : null}

          {currency === 'EUR' && stellarAccount?.hasEURCTrustline ? (
            <PaymentMethodCard
              imgSrc={EURCImage}
              title="EURC"
              description="You already have a EURC trustline."
              displayInfo={
                <div>
                  <p>Public Key: {maskedPublicKey}</p>
                  <button onClick={() => handleCopy(stellarAccount.publicKey)}>Copy</button>
                </div>
              }
              network={network}
            />
          ) : currency === 'EUR' ? (
            <PaymentMethodCard
              imgSrc={EURCImage}
              title="EURC"
              description="Add a EURC trustline to start using EUR"
              onClick={handleAddPayment}
              network={network}
            />
          ) : null}

          {currency === 'XLM' && stellarAccount ? (
            <PaymentMethodCard
              imgSrc={XLMImage}
              title="XLM"
              description="Your Stellar account is already created."
              displayInfo={
                <div>
                  <p>Public Key: {maskedPublicKey}</p>
                  <button onClick={() => handleCopy(stellarAccount.publicKey)}>Copy</button>
                </div>
              }
              network={network}
            />
          ) : currency === 'XLM' ? (
            <PaymentMethodCard
              imgSrc={XLMImage}
              title="XLM"
              description={`Create a Stellar account to start using XLM (${network})`}
              onClick={handleAddPayment}
              loading={loading}
              network={network}
            />
          ) : null}
        </div>
      </>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Stellar Account Creation</h2>
            <p>Your account has been successfully created. You can now receive payments at this address:</p>
            <p>Public Key: {maskedPublicKey}</p>
            <button onClick={() => handleCopy(stellarAccount!.publicKey)}>Copy</button>
            <button onClick={() => setIsModalOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}