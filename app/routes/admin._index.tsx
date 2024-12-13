import { useOutletContext } from "@remix-run/react";
import { motion } from 'framer-motion';
import { useUser } from '~/context/UserContext';
import { redirect } from "@remix-run/node";
import React from '@remix-run/react';
import { useNavigate } from "@remix-run/react";
import { useEffect } from "react";

// Add this type definition
type User = {
  preferredCurrency?: string;
  isPhoneVerified: boolean;
  // ... other user properties
};

type ContextType = {
  balances: Array<{ asset_code: string; balance: string }>;
  isLoading: boolean;
  error: string | null;
  cardVariants: any;
  loadingVariants: any;
};

export default function AdminIndex() {
  const { balances, isLoading, error, cardVariants, loadingVariants } = useOutletContext<ContextType>();
  const { user } = useUser() as { user: User | null };
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.isPhoneVerified === false && window.location.pathname !== '/verification') {
      navigate('/verification');
    }
  }, [user, navigate]);

  const filteredBalances = user?.preferredCurrency
    ? balances.filter(balance => balance.asset_code === user.preferredCurrency)
    : balances;

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      <p>Welcome to the admin dashboard.</p>

      <h2>Your Balances</h2>
      {isLoading ? (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={loadingVariants}
        >
          <p>Loading...</p>
        </motion.div>
      ) : error ? (
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
                color: '#1f2937'
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
