import React, { useState, useEffect } from 'react';
import { useNavigate, useLoaderData } from '@remix-run/react';
import { json, LoaderFunction, redirect } from '@remix-run/node';
import { motion } from 'framer-motion';
import { getUserFromSession } from '~/sessions/index';
import { useUser } from '~/context/UserContext';
import axios from 'axios';
import "~/styles/admin.css";

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
}

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserFromSession(request);

  if (!user || !user.email || !user.isAuthorized) {
    return redirect("/signin");
  }

  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    throw new Error("API_URL is not defined in environment variables");
  }

  try {
    const stellarAccount = await getStellarAccount(user.email, user.token, apiUrl);
    return json({ user, apiUrl, token: user.token, stellarAccount });
  } catch (error) {
    console.error("Error processing user data:", error);
    if (error instanceof Error) {
      return json({ user, apiUrl, token: user.token, stellarAccount: null, error: error.message });
    }
    return json({ user, apiUrl, token: user.token, stellarAccount: null, error: "An unexpected error occurred" });
  }
};

export default function AdminAdd() {
  const { user: loaderUser, apiUrl, token, stellarAccount: initialStellarAccount } = useLoaderData<{ user: any, apiUrl: string, token: string, stellarAccount: StellarAccount | null }>();
  const [currency, setCurrency] = useState<string>('');
  const [stellarAccount, setStellarAccount] = useState<StellarAccount | null>(initialStellarAccount);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    if (user && !stellarAccount) {
      const storedStellarAccount = localStorage.getItem('stellarAccount');
      if (storedStellarAccount) {
        setStellarAccount(JSON.parse(storedStellarAccount));
      } else {
        fetchStellarAccount();
      }
    }
  }, [user, stellarAccount]);

  const fetchStellarAccount = async () => {
    if (!user || !user.email) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `${apiUrl}/balance?email=${encodeURIComponent(user.email)}`,
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          } 
        }
      );

      const { balances, publicKey } = response.data;

      if (balances && publicKey) {
        const updatedAccount: StellarAccount = {
          publicKey,
          balance: balances.find((b: any) => b.asset_code === 'XLM')?.balance || '0',
          hasUSDCTrustline: balances.some((b: any) => b.asset_code === 'USDC'),
          hasEURCTrustline: balances.some((b: any) => b.asset_code === 'EURC'),
        };

        setStellarAccount(updatedAccount);
        localStorage.setItem('stellarAccount', JSON.stringify(updatedAccount));
      } else {
        setStellarAccount(null);
        localStorage.removeItem('stellarAccount');
      }
    } catch (error) {
      console.error('Error fetching Stellar account and balance:', error);
      setError('Failed to fetch balance and public key. Please try again later.');
      setStellarAccount(null);
      localStorage.removeItem('stellarAccount');
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrency(event.target.value);
    setError(null);
  };

  const handleAddPayment = async () => {
    if (!user || !user.email) {
      setError('User information is missing. Please sign in again.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let response;
      switch (currency) {
        case 'USD':
        case 'EUR':
          response = await createTrustline(user.email, currency, token, apiUrl);
          break;
        case 'XLM':
          response = await createXLMAccount(user.email, token, apiUrl);
          break;
        default:
          throw new Error(`Currency ${currency} not supported yet.`);
      }

      const { publicKey, hasUSDCTrustline, hasEURCTrustline } = response;
      const updatedAccount: StellarAccount = {
        ...stellarAccount!,
        publicKey,
        hasUSDCTrustline: currency === 'USD' ? true : stellarAccount?.hasUSDCTrustline || false,
        hasEURCTrustline: currency === 'EUR' ? true : stellarAccount?.hasEURCTrustline || false,
        balance: stellarAccount?.balance || '0'
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

  const PaymentMethodCard = ({ imgSrc, title, description, onClick, displayInfo }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="payment-method-card"
    >
      <img src={imgSrc} alt={title} className="payment-method-image" />
      <h3>{title}</h3>
      <p>{description}</p>
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
      <select value={currency} onChange={handleCurrencyChange}>
        <option value="">Select currency</option>
        <option value="USD">USD</option>
        <option value="XLM">XLM</option>
        <option value="EUR">EUR</option>
      </select>

      {error && <p className="error">{error}</p>}

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
          />
        ) : currency === 'USD' ? (
          <PaymentMethodCard
            imgSrc={USDC}
            title="USDC"
            description="USDC is a digital dollar always redeemable 1:1"
            onClick={handleAddPayment}
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
          />
        ) : currency === 'EUR' ? (
          <PaymentMethodCard
            imgSrc={EURC}
            title="EURC"
            description="EURC is a digital euro always redeemable 1:1"
            onClick={handleAddPayment}
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
          />
        ) : currency === 'XLM' ? (
          <PaymentMethodCard
            imgSrc={XLM}
            title="XLM"
            description="Create a Stellar account to start using XLM"
            onClick={handleAddPayment}
          />
        ) : null}
      </div>

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