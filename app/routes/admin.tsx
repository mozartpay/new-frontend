import { LoaderFunction, redirect, json } from "@remix-run/node";
import { useLoaderData, Link, Outlet } from "@remix-run/react";
import { getUserFromSession } from "~/sessions";
import { useUser } from '~/context/UserContext';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import "../styles/admin.css";
import { useNavigate } from 'react-router-dom';
import { UserProvider } from '~/context/UserContext';
import { getBalances } from "~/utils/api";

type BalanceObj = {
  asset_code: string;
  balance: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserFromSession(request);

  if (!user || !user.isAuthorized) {
    return redirect("/signin");
  }

  try {
    let balances: BalanceObj[] = [];
    let error: string | null = null;

    try {
      balances = await getBalances(user.email, user.token);
    } catch (balanceError: any) {
      console.error("Error fetching balances:", balanceError.response?.data || balanceError.message);
      error = balanceError.response?.data?.error || "Failed to fetch balances";
    }
    
    // Ensure API_URL is defined before returning it
    const apiUrl = process.env.API_URL || '';
    if (!apiUrl) {
      console.warn('API URL is not defined. Some features may not work correctly.');
    }
    
    return json({ user, balances, apiUrl, token: user.token, error });
  } catch (error) {
    console.error("Error processing user data:", error);
    return redirect("/signin");
  }
};

export default function Admin() {
  const data = useLoaderData<{ user: any, balances: BalanceObj[], apiUrl: string, token: string, error: string | null }>();
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const [balances, setBalances] = useState<BalanceObj[]>(data.balances);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(data.error);

  const initialUser = {
    ...data.user,
    preferences: {
      hideBalances: false,
      preferredCurrency: '',
    },
  };

  useEffect(() => {
    if (data.user && (!user || !user.isAuthorized)) {
      setUser({ ...data.user, isAuthorized: true });
    } else if (!data.user) {
      navigate('/signin');
    }
    
    // Check if apiUrl is available
    if (!data.apiUrl) {
      console.warn('API URL is not defined. Some features may not work correctly.');
    }
  }, [data.user, user, setUser, navigate, data.apiUrl]);

  if (!user || !user.isAuthorized) {
    return <div>Error: User not authorized. Please <a href="/signin">sign in</a> again.</div>;
  }

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 },
  };

  const loadingVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { yoyo: Infinity, duration: 0.6 },
    },
  };

  return (
    <UserProvider initialUser={initialUser}>
      <div className="dashboard">
        <aside className="sidebar">
          <h1>Mozart</h1>
          <nav>
            <ul>
              <li><Link to="/admin">Dashboard</Link></li>
              <li><Link to="/admin/add">Add</Link></li>
              <li><Link to="/admin/withdraw">Withdraw</Link></li>
              <li><Link to="/admin/profile">Profile</Link></li>
              <li><Link to="/admin/send">Send Money</Link></li>
              <li><Link to="/admin/request">Request Money</Link></li>
              <li><Link to="/admin/identity">Identity Verification</Link></li>
              <li><Link to="/admin/manage">Manage Requests</Link></li>
              <li><Link to="/admin/oas">OAs</Link></li>
              <li><Link to="/admin/swap">Swap</Link></li>
            </ul>
          </nav>
        </aside>
        <main className="main-content">
          {error && <div className="error-message">{error}</div>}
          <Outlet context={{ balances, isLoading, error, cardVariants, loadingVariants }} />
        </main>
      </div>
    </UserProvider>
  );
}
