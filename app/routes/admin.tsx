import { LoaderFunction, redirect } from "@remix-run/node";
import { useLoaderData, Link, Outlet } from "@remix-run/react";
import { getSession } from "~/sessions";
import { decrypt } from '~/utils/encryption';
import { useUser } from '~/context/UserContext';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import "../styles/admin.css";

type BalanceObj = {
  asset_code: string;
  balance: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const userJson = session.get("user");

  if (!userJson) {
    return redirect("/signin");
  }

  try {
    const decryptedUser = decrypt(userJson);
    if (!decryptedUser) {
      return redirect("/signin");
    }
    const user = JSON.parse(decryptedUser);
    if (!user || !user.email) {
      return redirect("/signin");
    }
    // Pass the API URL to the client
    return { user, apiUrl: process.env.API_URL };
  } catch (error) {
    return redirect("/signin");
  }
};

export default function Admin() {
  const data = useLoaderData<{ user: any, apiUrl: string }>();
  const { user, setUser } = useUser();
  const [balances, setBalances] = useState<BalanceObj[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data.user && (!user || !user.isAuthorized)) {
      setUser({ ...data.user, isAuthorized: true });
    }
  }, [data.user, user, setUser]);

  useEffect(() => {
    if (user && user.email) {
      setIsLoading(true);
      setError(null);
      axios({
        method: 'get',
        url: `${data.apiUrl}/balance?email=${encodeURIComponent(user.email)}`,
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then(response => {
        const { balances } = response.data;
        setBalances(balances || []);
      })
      .catch(error => {
        console.error("Error fetching balances:", error.response ? error.response.data : error.message);
        setError('Failed to load balances. Please try again later.');
      })
      .finally(() => {
        setIsLoading(false);
      });
    }
  }, [user, data.apiUrl]);

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
          </ul>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet context={{ balances, isLoading, error, cardVariants, loadingVariants }} />
      </main>
    </div>
  );
}
