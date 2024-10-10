import React, { useState, useEffect } from 'react';
import { useNavigate, useLoaderData } from '@remix-run/react';
import { json, LoaderFunction } from '@remix-run/node';
import { motion } from 'framer-motion';
import axios from 'axios';
import { getSession } from '~/sessions';
import { decrypt } from '~/utils/encryption';
import { useUser } from '~/context/UserContext';
import "~/styles/admin.css";

// Import your images
import USDC from '~/assets/img/dashboards/USDC.png';
import XLM from '~/assets/img/dashboards/XLM.png';
import EURC from '~/assets/img/dashboards/EURC.png';

interface StellarAccount {
  publicKey: string;
  balance: string;
  hasUSDCTrustline: boolean;
  hasEURCTrustline: boolean;
}

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const userJson = session.get("user");

  if (!userJson) {
    return json({ user: null });
  }

  try {
    const decryptedUser = decrypt(userJson);
    const user = JSON.parse(decryptedUser);
    return json({ user });
  } catch (error) {
    console.error("Error decrypting user data:", error);
    return json({ user: null });
  }
};

export default function AdminAdd() {
  const { user: loaderUser } = useLoaderData<{ user: any }>();
  const [currency, setCurrency] = useState<string>('');
  const [stellarAccount, setStellarAccount] = useState<StellarAccount | null>(null);
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
        `https://mozart-api-21ea5fd801a8.herokuapp.com/api/balance?email=${user.email}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      const { balance, publicKey } = response.data;

      if (balance && publicKey) {
        const updatedAccount: StellarAccount = {
          publicKey,
          balance,
          hasUSDCTrustline: false,
          hasEURCTrustline: false,
        };

        setStellarAccount(updatedAccount);
        localStorage.setItem('stellarAccount', JSON.stringify(updatedAccount));
      }
    } catch (error) {
      console.error('Error fetching Stellar account and balance:', error);
      setError('Failed to fetch balance and public key. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrency(event.target.value);
    setError(null);
  };

  const handleAddPayment = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      switch (currency) {
        case 'USD':
        case 'EUR':
          response = await axios.post(
            'https://mozart-api-21ea5fd801a8.herokuapp.com/api/trustline',
            { email: user.email, currency },
            { headers: { 'Content-Type': 'application/json', Accept: '*/*' } }
          );
          break;
        case 'XLM':
          response = await axios.post(
            'https://mozart-api-21ea5fd801a8.herokuapp.com/api/xlm/',
            { email: user.email, currency: 'XLM' },
            { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
          );
          break;
        default:
          throw new Error(`Currency ${currency} not supported yet.`);
      }

      const { publicKey, hasUSDCTrustline, hasEURCTrustline } = response.data;
      const updatedAccount = {
        ...stellarAccount,
        publicKey,
        hasUSDCTrustline: currency === 'USD' ? true : stellarAccount?.hasUSDCTrustline || false,
        hasEURCTrustline: currency === 'EUR' ? true : stellarAccount?.hasEURCTrustline || false,
      };
      setStellarAccount(updatedAccount);
      localStorage.setItem('stellarAccount', JSON.stringify(updatedAccount));
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

        {currency === 'XLM' && stellarAccount ? (
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
            description="Stellar payment method"
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