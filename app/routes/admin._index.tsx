import { useOutletContext } from "@remix-run/react";
import { motion } from 'framer-motion';
import { useUser } from '~/context/UserContext';
import { redirect, json, ActionFunctionArgs } from "@remix-run/node";
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSubmit } from "@remix-run/react";
import { getUserFromSession, updateUserPreferences } from '~/sessions/index';
import axios from 'axios';

declare global {
  interface Window {
    ENV: {
      API_URL: string;
    }
  }
}

// Add this type definition
type User = {
  email: string;
  isPhoneVerified: boolean;
  token: string;
  preferences: {
    hideBalances: boolean;
    currency: string;
    network: string;
  };
  // ... other user properties
};

type ContextType = {
  balances: Array<{ asset_code: string; balance: string }>;
  isLoading: boolean;
  error: string | null;
  cardVariants: any;
  loadingVariants: any;
};

// Add loader and action functions
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const hideBalances = formData.get("hideBalances") === "true";
  
  const result = await updateUserPreferences(request, {
    hideBalances
  });

  if (!result) {
    throw new Error("Failed to update preferences");
  }

  return json(result.user, {
    headers: result.headers
  });
}

export default function AdminIndex() {
  const { balances, isLoading, cardVariants, loadingVariants } = useOutletContext<ContextType>();
  const { user, updatePreferences } = useUser() as { 
    user: User | null;
    updatePreferences: (preferences: Partial<User['preferences']>) => void;
  };
  const navigate = useNavigate();
  const [hideBalances, setHideBalances] = useState(() => {
    return user?.preferences?.hideBalances ?? true;
  });
  const [isMounted, setIsMounted] = useState(false);
  const submit = useSubmit();
  const [userData, setUserData] = useState<User | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Set the component as mounted after the first render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update the hideBalances state if user preferences change
  useEffect(() => {
    if (user?.preferences?.hideBalances !== undefined) {
      setHideBalances(user.preferences.hideBalances);
    } else {
      setHideBalances(true);
    }
  }, [user?.preferences?.hideBalances]);

  // Redirect to verification page if user's phone is not verified
  useEffect(() => {
    if (user && user.isPhoneVerified === false && window.location.pathname !== '/verification') {
      navigate('/verification');
    }
  }, [user, navigate]);

  // Filter balances based on user's preferred currency
  const filteredBalances = user?.preferences?.currency
    ? balances.filter(balance => balance.asset_code === user.preferences.currency)
    : balances;

  // Toggle balance visibility and update the server
  const toggleBalanceVisibility = async (newState: boolean) => {
    if (!user) {
      console.error('User is not defined');
      return;
    }

    try {
      // Update local state first for immediate feedback
      setHideBalances(newState);

      // Update session
      const formData = new FormData();
      formData.append("hideBalances", String(newState));
      submit(formData, { method: "post" });

      // Update context
      updatePreferences({ hideBalances: newState });

      // Update backend
      const localApiUrl = window.ENV.API_URL;
      const response = await axios.post(`${localApiUrl}/profile/hideBalances`, {
        email: user.email,
        hideBalances: newState
      }, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true // Important for cookie handling
      });

      // Store preference in localStorage as backup
      localStorage.setItem('userPreferences', JSON.stringify({
        ...JSON.parse(localStorage.getItem('userPreferences') || '{}'),
        hideBalances: newState
      }));

    } catch (error) {
      console.error('Error updating balance visibility:', error);
      // Revert local state if there's an error
      setHideBalances(!newState);
      alert('An unexpected error occurred. Please try again later.');
    }
  };

  // Initialize preferences from multiple sources
  useEffect(() => {
    const initializePreferences = async () => {
      try {
        // Try to get preferences from backend first
        const localApiUrl = window.ENV.API_URL;
        const response = await axios.get(`${localApiUrl}/profile/${user?.email}`, {
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });

        if (response.data?.preferences?.hideBalances !== undefined) {
          setHideBalances(response.data.preferences.hideBalances);
          return;
        }

        // Fallback to localStorage if backend fails or doesn't have the preference
        const storedPreferences = localStorage.getItem('userPreferences');
        if (storedPreferences) {
          const { hideBalances: storedHideBalances } = JSON.parse(storedPreferences);
          if (storedHideBalances !== undefined) {
            setHideBalances(storedHideBalances);
            // Sync with backend
            toggleBalanceVisibility(storedHideBalances);
          }
        }
      } catch (error) {
        console.error('Error initializing preferences:', error);
        // Fallback to default state
        setHideBalances(true);
      }
    };

    if (user?.email) {
      initializePreferences();
    }
  }, [user?.email]);

  const fetchUserData = useCallback(async () => {
    if (!user?.email) return;

    try {
      const localApiUrl = window.ENV.API_URL;
      const response = await axios.get(`${localApiUrl}/profile/${user.email}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      const userData = response.data;
      
      // Update hideBalances state based on user preferences from API
      if (userData.preferences?.hideBalances !== undefined) {
        setHideBalances(userData.preferences.hideBalances);
        // Update localStorage
        localStorage.setItem('userPreferences', JSON.stringify({
          ...JSON.parse(localStorage.getItem('userPreferences') || '{}'),
          hideBalances: userData.preferences.hideBalances
        }));
      }
      
      setUserData(prevUser => {
        if (JSON.stringify(prevUser) !== JSON.stringify(userData)) {
          return { 
            ...prevUser, 
            ...userData,
            preferences: {
              ...prevUser?.preferences,
              ...userData.preferences
            }
          };
        }
        return prevUser;
      });
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data. Please try again later.');
    }
  }, [user?.email]);

  // Make sure to call fetchUserData when component mounts
  useEffect(() => {
    if (user?.email) {
      fetchUserData();
    }
  }, [user?.email, fetchUserData]);

  return (
    <div className="admin-dashboard">
      {user?.preferences?.currency && (
        <p>Preferred Currency: {user.preferences.currency}</p>
      )}

      <h2>Your Balances</h2>
      <button 
        onClick={() => toggleBalanceVisibility(!hideBalances)}
        style={{
          marginBottom: '1rem',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          border: '1px solid #ccc',
          background: '#fff',
          cursor: 'pointer'
        }}
      >
        {hideBalances ? 'Show' : 'Hide'} Balances
      </button>

      {isLoading && isMounted && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={loadingVariants}
        >
          <p>Loading...</p>
        </motion.div>
      )}

      {error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <p>{error}</p>
        </motion.div>
      ) : (
        <div className="balance-grid">
          {filteredBalances.map((balance, index) => (
            <motion.div
              key={index}
              className="balance-card"
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.5, delay: index * 0.2 }}
              variants={cardVariants}
              style={{
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '150px',
              }}
            >
              <h3 style={{ margin: '0 0 10px 0', color: '#4b5563' }}>Balance ({balance.asset_code})</h3>
              <p style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                margin: 0,
                color: '#1f2937',
                filter: hideBalances ? 'blur(8px)' : 'none',
                userSelect: hideBalances ? 'none' : 'auto'
              }}>
                {balance.asset_code} {parseFloat(balance.balance).toFixed(7)}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}