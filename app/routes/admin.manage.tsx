import React, { useState, useEffect } from 'react';
import { useNavigate, useLoaderData } from '@remix-run/react';
import { json, LoaderFunction } from '@remix-run/node';
import { motion } from 'framer-motion';
import axios from 'axios';
import { getSession } from '~/sessions';
import { decrypt } from '~/utils/encryption';
import { useUser } from '~/context/UserContext';
import "~/styles/admin.css";

interface PaymentRequest {
  _id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  email: string;
  status: string;
  createdAt: string;
  receiverEmail: string;
  senderEmail: string;
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

export default function AdminManage() {
  const { user: loaderUser } = useLoaderData<{ user: any }>();
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
      const response = await axios.get(`${process.env.API_URL}/request/receiver/${user.email}`);
      const filteredRequests = response.data.filter((request: PaymentRequest) => request.receiverEmail === user.email);
      setPaymentRequests(filteredRequests);
    } catch (error) {
      console.error('Error fetching payment requests:', error);
      setError('Failed to fetch payment requests. Please try again later.');
    }
  };

  const handleAction = async (action: 'accept' | 'decline', requestId: string) => {
    setLoading(true);
    try {
      const response = await axios.patch(`${process.env.API_URL}/request/${requestId}`, {
        status: action === 'accept' ? 'accepted' : 'declined',
      });

      setPaymentRequests((prevRequests) =>
        prevRequests.map((req) => (req._id === requestId ? { ...req, status: response.data.status } : req))
      );

      setError(`Request ${action === 'accept' ? 'accepted' : 'declined'} successfully.`);
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      setError(`Error ${action === 'accept' ? 'accepting' : 'declining'} request.`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request: PaymentRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="admin-manage">
      <h1>Manage Payment Requests</h1>

      {error && <p className="error">{error}</p>}

      <table className="payment-requests-table">
        <thead>
          <tr>
            <th>Amount</th>
            <th>Currency</th>
            <th>Sender Email</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paymentRequests.map((request) => (
            <tr key={request._id}>
              <td>{request.amount} {request.currency}</td>
              <td>{request.currency}</td>
              <td>{request.senderEmail}</td>
              <td>{request.status}</td>
              <td>
                <button
                  onClick={() => handleAction('accept', request._id)}
                  disabled={request.status !== 'pending' || loading}
                  className="action-button accept"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleAction('decline', request._id)}
                  disabled={request.status !== 'pending' || loading}
                  className="action-button decline"
                >
                  Decline
                </button>
                <button onClick={() => handleViewDetails(request)} className="action-button view">
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && selectedRequest && (
        <div className="modal">
          <div className="modal-content">
            <h2>Payment Request Details</h2>
            <p>Amount: {selectedRequest.amount} {selectedRequest.currency}</p>
            <p>Sender Email: {selectedRequest.senderEmail}</p>
            <p>Email: {selectedRequest.email}</p>
            <p>Payment Method: {selectedRequest.paymentMethod}</p>
            <p>Status: {selectedRequest.status}</p>
            <p>Created At: {new Date(selectedRequest.createdAt).toLocaleString()}</p>
            <button onClick={() => setIsModalOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}