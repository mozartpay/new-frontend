import React, { useState, useEffect } from 'react';
import { useNavigate, useLoaderData } from '@remix-run/react';
import { json, LoaderFunction, redirect } from '@remix-run/node';
import axios from 'axios';
import { getUserFromSession } from '~/sessions/index';
import { useUser } from '~/context/UserContext';
import "~/styles/admin.css";

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

export default function AdminRequest() {
  const { user: loaderUser, apiUrl, token } = useLoaderData<{ user: any, apiUrl: string, token: string }>();
  const [amount, setAmount] = useState<number | string>(0);
  const [sourceCurrency, setSourceCurrency] = useState<string>('XLM');
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [amountError, setAmountError] = useState<string>('');
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
    const sourceBalance = 1000; // Simulate fetching user's available balance for the currency (e.g., 1000 XLM)
    if (parseFloat(amount as string) > sourceBalance) {
      setAmountError('Insufficient funds to request.');
    } else {
      setAmountError('');
    }
  }, [amount, sourceCurrency]);

  const handleForwardClick = () => {
    if (!receiverEmail || !receiverName) {
      setShowErrorModal(true);
      return;
    }
    setShowModal(true);
  };

  const handleRequest = async () => {
    if (!receiverEmail || !receiverName) {
      setShowErrorModal(true);
      return;
    }

    setIsRequesting(true);
    try {
      const response = await axios.post(
        `${process.env.API_URL}/request`,
        {
          senderEmail: user.email,
          amount: amount.toString(),
          sourceCurrency,
          receiverEmail,
          receiverName,
        }
      );

      if (response.status === 201) {
        setShowModal(false);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error requesting money:', error);
      setShowErrorModal(true);
    } finally {
      setIsRequesting(false);
    }
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
    <div className="admin-request">
      <h1>Request Money</h1>
      
      <div className="form-group">
        <label htmlFor="currency">Select currency to request:</label>
        <select id="currency" value={sourceCurrency} onChange={(e) => setSourceCurrency(e.target.value)}>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="XLM">XLM</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="amount">Amount to request:</label>
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
        <label htmlFor="receiverName">Receiver Name:</label>
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
        <label htmlFor="receiverEmail">Receiver Email:</label>
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
        disabled={!amount || amount <= 0 || amountError !== ''}
        className="request-button"
      >
        Forward
      </button>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Confirm Request</h2>
            <p>You're about to request:</p>
            <p><strong>{currencySymbols[sourceCurrency]}{amount} {sourceCurrency}</strong></p>
            <p>From: {receiverName} ({receiverEmail})</p>
            <div className="modal-actions">
              <button onClick={() => setShowModal(false)}>Cancel</button>
              <button onClick={handleRequest} disabled={isRequesting}>
                {isRequesting ? 'Requesting...' : 'Confirm & Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Request Successful</h2>
            <p>Amount: {currencySymbols[sourceCurrency]}{amount} {sourceCurrency}</p>
            <p>Requested from: {receiverName} ({receiverEmail})</p>
            <button onClick={handleCloseSuccessModal}>Close</button>
          </div>
        </div>
      )}

      {showErrorModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Error</h2>
            <p>There was an issue processing your request. Please make sure all details are correct.</p>
            <button onClick={() => setShowErrorModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
