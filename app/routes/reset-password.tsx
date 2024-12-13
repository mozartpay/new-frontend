import { useState, useEffect } from 'react';
import { Form, Link, useLoaderData, useActionData, useSubmit } from '@remix-run/react';
import { json, ActionFunction } from '@remix-run/node';
import axios from 'axios';
import '../styles/reset-password.css';

import type { LoaderFunction } from '@remix-run/node';

interface LoaderData {
  tokenValid: boolean;
  token?: string;
}

const API_URL = process.env.API_URL;

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return json({ tokenValid: false });
  }

  try {
    const response = await axios.post(`${API_URL}/signin/validate-reset-token`, { token });
    return json({ tokenValid: response.data.tokenValid, token });
  } catch (error) {
    console.error('Error validating reset token:', error);
    return json({ tokenValid: false });
  }
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');
  const token = formData.get('token');

  if (password !== confirmPassword) {
    return json({ error: "Passwords don't match." });
  }

  try {
    await axios.post(`${API_URL}/signin/reset-password/${token}`, { password });
    return json({ success: true, message: 'Password reset successfully!' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return json({ error: 'Error resetting password! Please try again in a moment!' });
  }
};

// Add this type definition
type ActionData = {
  success?: boolean;
  message?: string;
  error?: string;
};

export default function ResetPassword() {
  const { tokenValid, token } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const submit = useSubmit();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (actionData?.success) {
      setSuccessMessage(actionData.message ?? ''); // Set success message with default empty string
      alert(actionData.message);
      setTimeout(() => {
        window.location.href = '/signin'; // Redirect after 3 seconds
      }, 500);
    } else if (actionData?.error) {
      alert(actionData.error);
    }
  }, [actionData]);

  if (!tokenValid) {
    return <p>Invalid or expired reset token.</p>;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(event.currentTarget);
  };

  return (
    <div className="container">
      <div className="content">
        <h1>New Password</h1>
        <Form method="post" onSubmit={handleSubmit}>
          <input type="hidden" name="token" value={token} />
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              placeholder="********"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="reset-button">Reset</button>
        </Form>
        {successMessage && <p className="success-message">{successMessage}</p>} {/* Display success message */}
        <p className="signin-link">
          Go back to Sign in? <Link to="/signin">Signin</Link>
        </p>
      </div>
    </div>
  );
}
