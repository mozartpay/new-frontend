import React, { useState, useEffect } from 'react';
import { useNavigate, useLoaderData } from '@remix-run/react';
import { json, LoaderFunction } from '@remix-run/node';
import axios from 'axios';
import { getSession } from '~/sessions';
import { decrypt } from '~/utils/encryption';
import { useUser } from '~/context/UserContext';
import "~/styles/admin.css";

interface Request {
  id: string;
  type: string;
  status: string;
  _id: string;
  senderEmail: string;
  receiverEmail: string;
  amount: string;
  currency: string;
  createdAt: string;
}

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const userJson = session.get("user");

  if (!userJson) {
    return json({ user: null, apiUrl: process.env.API_URL });
  }

  try {
    const decryptedUser = decrypt(userJson);
    const user = JSON.parse(decryptedUser);
    return json({ user, apiUrl: process.env.API_URL });
  } catch (error) {
    console.error("Error decrypting user data:", error);
    return json({ user: null, apiUrl: process.env.API_URL });
  }
};

export default function AdminManage() {
  const { user: loaderUser, apiUrl } = useLoaderData<{ user: any, apiUrl: string }>();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
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
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${apiUrl}/request/${encodeURIComponent(user.email)}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (response.data && Array.isArray(response.data)) {
        setRequests(response.data);
      } else {
        setError('Invalid response format from the server.');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError('Failed to fetch requests. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="admin-page admin-manage">
      <h1>Manage Requests</h1>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading requests...</p>
      ) : (
        <div className="payment-requests-table-container">
          <table className="payment-requests-table">
            <thead>
              <tr>
                <th>Amount</th>
                <th>Currency</th>
                <th>Receiver</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request._id}>
                  <td>{request.amount}</td>
                  <td>{request.currency}</td>
                  <td>{request.receiverEmail}</td>
                  <td>{request.status}</td>
                  <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="action-button view">View</button>
                    {request.status === 'pending' && (
                      <>
                        <button className="action-button accept">Accept</button>
                        <button className="action-button decline">Decline</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
