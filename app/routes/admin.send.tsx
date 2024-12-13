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

export default function AdminSend() {
  const { user: loaderUser, apiUrl, token } = useLoaderData<{ user: any, apiUrl: string, token: string }>();
  const [amount, setAmount] = useState<number | string>(0);
  const [sourceCurrency, setSourceCurrency] = useState<string>('XLM');
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [balances, setBalances] = useState<{ [key: string]: string }>({});
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
    if (user && user.email) {
      fetchBalances();
    }
  }, [user]);

  const fetchBalances = async () => {
    try {
      if (!user || !user.email) return;

      const response = await axios.get(
        `${apiUrl}/balance?email=${encodeURIComponent(user.email)}`, 
        { headers: { 'Content-Type': 'application/json' } }
      );
      const apiBalances = response.data.balances || [];

      const formattedBalances: { [key: string]: string } = {};
      apiBalances.forEach((balance: any) => {
        const currency = balance.asset_code || 'XLM';
        formattedBalances[currency] = balance.balance;
      });

      setBalances(formattedBalances);
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  useEffect(() => {
    const sourceBalance = parseFloat(balances[sourceCurrency] || '0');
    if (parseFloat(amount as string) > sourceBalance) {
      setAmountError('Insufficient funds');
    } else {
      setAmountError('');
    }
  }, [amount, sourceCurrency, balances]);

  const handleForwardClick = () => {
    if (!receiverEmail || !receiverName) {
      setShowErrorModal(true);
      return;
    }
    setShowModal(true);
  };

  const handleSend = async () => {
    if (!receiverEmail || !receiverName || !user) {
      setShowErrorModal(true);
      return;
    }

    setIsSending(true);
    try {
      const response = await axios.post(
        `${apiUrl}/send`,
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
      console.error('Error sending data:', error);
      setShowErrorModal(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleCurrencyChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setSourceCurrency(event.target.value);
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
        <label htmlFor="currency">Select currency to send:</label>
        <select id="currency" value={sourceCurrency} onChange={handleCurrencyChange}>
          {Object.keys(balances).map((key) => (
            <option key={key} value={key}>{key}</option>
          ))}
        </select>
      </div>

      {sourceCurrency && (
        <p className="balance-info">
          Current {sourceCurrency} Balance: {currencySymbols[sourceCurrency]}{balances[sourceCurrency] || '0.00'}
        </p>
      )}

      <div className="form-group">
        <label htmlFor="amount">Amount to send:</label>
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
            <h2>Transaction Successful</h2>
            <p>Amount: {currencySymbols[sourceCurrency]}{amount}</p>
            <p>Receiver: {receiverName} ({receiverEmail})</p>
            <p>Transaction completed successfully!</p>
            <button onClick={handleCloseSuccessModal}>Close</button>
          </div>
        </div>
      )}

      {showErrorModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Error</h2>
            <p>There was an issue processing your transaction. Please make sure all details are correct.</p>
            <button onClick={() => setShowErrorModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
