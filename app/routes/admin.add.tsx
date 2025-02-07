import React, { useState, useEffect } from 'react';
import { useNavigate, useLoaderData } from '@remix-run/react';
import { json, LoaderFunction, redirect } from '@remix-run/node';
import { motion } from 'framer-motion';
import { getUserFromSession } from '~/sessions/index';
import { useUser } from '~/context/UserContext';
import axios from 'axios';
import "~/styles/admin.css";
import { User } from '~/types/user';

// Import your images
import USDC from '~/assets/img/dashboards/USDC.png';
import XLM from '~/assets/img/dashboards/XLM.png';
import EURC from '~/assets/img/dashboards/EURC.png';

import { getStellarAccount, createTrustline, createXLMAccount } from '~/utils/api';

interface StellarAccount {
  publicKey: string;
  balance: string;
  hasUSDCTrustline: boolean;
  hasEURCTrustline: boolean;
  preferredNetwork: 'testnet' | 'mainnet';
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
    const stellarAccount = await getStellarAccount(user.email, user.token, apiUrl);
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
  const [stellarAccount, setStellarAccount] = useState<StellarAccount | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<JSX.Element | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user, setUser } = useUser();

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
        ...loaderUser,
        token: loaderUser.token || '',
        isPhoneVerified: false,
        preferences: {
          hideBalances: false,
          currency: '',
          network: ''
        },
      });
    }
  }, [loaderUser, user, setUser, navigate]);

  useEffect(() => {
    if (!user?.email || stellarAccount) {
      return;
    }

    const storedStellarAccount = localStorage.getItem('stellarAccount');
    if (storedStellarAccount) {
      try {
        const parsed = JSON.parse(storedStellarAccount);
        if (parsed.preferredNetwork === user.preferredNetwork) {
          setStellarAccount(parsed);
          return;
        }
      } catch (e) {
        localStorage.removeItem('stellarAccount');
      }
    }

    fetchStellarAccount();
  }, [user, stellarAccount]);

  const fetchStellarAccount = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      setError(null);
      
      // Default to testnet if no user or no preferred network is set
      const network = user?.preferredNetwork || 'testnet';
      
      const response = await axios.get(
        `${apiUrl}/balance?email=${encodeURIComponent(user.email)}&network=${network}`,
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          } 
        }
      );

      if (!response.data) {
        throw new Error('No data received from server');
      }

      const { balances, publicKey } = response.data;

      const xlmBalance = balances?.find((b: any) => b.asset_type === 'native' || b.asset_code === 'XLM');
      
      const updatedAccount: StellarAccount = {
        publicKey,
        balance: xlmBalance?.balance || '0',
        hasUSDCTrustline: balances?.some((b: any) => b.asset_code === 'USDC') || false,
        hasEURCTrustline: balances?.some((b: any) => b.asset_code === 'EURC') || false,
        preferredNetwork: user?.preferredNetwork === "testnet" || user?.preferredNetwork === "mainnet"
          ? user?.preferredNetwork
          : "testnet"
      };

      setStellarAccount(updatedAccount);
      localStorage.setItem('stellarAccount', JSON.stringify(updatedAccount));
      
    } catch (error) {
      console.error('Error fetching Stellar account and balance:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          setStellarAccount(null);
          localStorage.removeItem('stellarAccount');
          return;
        }
        setError(error.response?.data?.message || 'Failed to fetch account data');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrency(event.target.value);
    setError(null);
  };

  const handleAddPayment = async () => {
    setError(null);
    try {
      let response;
      // Default to testnet if no user or no preferred network is set
      const network = user?.preferredNetwork || 'testnet';
      
      switch (currency) {
        case 'USD':
          response = await createTrustline(user?.email || '', 'USDC', token, apiUrl);
          break;
        case 'EUR':
          response = await createTrustline(user?.email || '', 'EURC', token, apiUrl);
          break;
        case 'XLM':
          response = await createXLMAccount(user?.email || '', token, apiUrl);
          break;
        default:
          throw new Error('Invalid currency');
      }

      if (response.data?.result?.hash) {
        const explorerUrl = `https://stellar.expert/explorer/${network}/tx/${response.data.result.hash}`;
        setSuccess(
          <div className="success-message" style={{ margin: '1rem 0', padding: '1rem', backgroundColor: '#e6ffe6', borderRadius: '4px' }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>Transaction successful! 🎉</p>
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

      const updatedAccount: StellarAccount = {
        publicKey: response.data.publicKey,
        hasUSDCTrustline: currency === 'USD' ? true : stellarAccount?.hasUSDCTrustline || false,
        hasEURCTrustline: currency === 'EUR' ? true : stellarAccount?.hasEURCTrustline || false,
        balance: stellarAccount?.balance || '0',
        preferredNetwork: user?.preferredNetwork === "mainnet" ? "mainnet" : "testnet" as const
      };
      setStellarAccount(updatedAccount);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error creating trustline or account:', error);
      setError('An error occurred while creating the account or trustline. Please try again later.');
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

  const PaymentMethodCard = ({ imgSrc, title, description, onClick, displayInfo, network }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="payment-method-card"
    >
      <img src={imgSrc} alt={title} className="payment-method-image" />
      <h3>{title}</h3>
      <p>{description}</p>
      {network && <span className="network-badge">{network}</span>}
      {displayInfo || (
        <button onClick={onClick} disabled={loading}>
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
        <select value={currency} onChange={handleCurrencyChange}>
          <option value="">Select currency</option>
          <option value="USD">USD</option>
          <option value="XLM">XLM</option>
          <option value="EUR">EUR</option>
        </select>

        {error && <p className="error">{error}</p>}
        {success && success}

        <div className="payment-methods">
          {currency === 'USD' && stellarAccount?.hasUSDCTrustline ? (
            <PaymentMethodCard
              imgSrc={USDC}
              title="USDC"
              description="You already have a USDC trustline."
              displayInfo={
                <div>
                  <p>Public Key: {maskedPublicKey}</p>
                  <button onClick={() => handleCopy(stellarAccount.publicKey)}>Copy</button>
                </div>
              }
              network={user?.preferredNetwork || 'testnet'}
            />
          ) : currency === 'USD' ? (
            <PaymentMethodCard
              imgSrc={USDC}
              title="USDC"
              description={`USDC is a digital dollar always redeemable 1:1 (${user?.preferredNetwork || 'testnet'})`}
              onClick={handleAddPayment}
              network={user?.preferredNetwork || 'testnet'}
            />
          ) : null}

          {currency === 'EUR' && stellarAccount?.hasEURCTrustline ? (
            <PaymentMethodCard
              imgSrc={EURC}
              title="EURC"
              description="You already have a EURC trustline."
              displayInfo={
                <div>
                  <p>Public Key: {maskedPublicKey}</p>
                  <button onClick={() => handleCopy(stellarAccount.publicKey)}>Copy</button>
                </div>
              }
              network={user?.preferredNetwork || 'testnet'}
            />
          ) : currency === 'EUR' ? (
            <PaymentMethodCard
              imgSrc={EURC}
              title="EURC"
              description={`EURC is a digital euro always redeemable 1:1 (${user?.preferredNetwork || 'testnet'})`}
              onClick={handleAddPayment}
              network={user?.preferredNetwork || 'testnet'}
            />
          ) : null}

          {currency === 'XLM' && stellarAccount && stellarAccount.publicKey ? (
            <PaymentMethodCard
              imgSrc={XLM}
              title="XLM"
              description="Your Stellar account is already created."
              displayInfo={
                <div>
                  <p>Public Key: {maskedPublicKey}</p>
                  <button onClick={() => handleCopy(stellarAccount.publicKey)}>Copy</button>
                </div>
              }
              network={user?.preferredNetwork || 'testnet'}
            />
          ) : currency === 'XLM' ? (
            <PaymentMethodCard
              imgSrc={XLM}
              title="XLM"
              description={`Create a Stellar account to start using XLM (${user?.preferredNetwork || 'testnet'})`}
              onClick={handleAddPayment}
              network={user?.preferredNetwork || 'testnet'}
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