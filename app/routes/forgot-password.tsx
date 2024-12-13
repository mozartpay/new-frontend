import React, { useState, ChangeEvent, useEffect } from 'react';
import { Form, useSubmit, Link, json, useActionData } from '@remix-run/react';
import { ActionFunction } from '@remix-run/node';
import '../styles/forgot-password.css'; // Import your custom styles

// Add this type definition
type ActionData = {
  message?: string;
  error?: string;
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get('email');

  const apiUrl = process.env.API_URL; // Ensure this is set correctly
  if (!apiUrl) {
    return json({ error: "API_URL is not configured properly" }, { status: 500 });
  }

  try {
    const response = await fetch(`${apiUrl}/signin/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const data = await response.json();
      return json({ error: data.message || 'An error occurred during password reset.' }, { status: response.status });
    }

    return json({ message: 'A reset link has been sent to your email with further instructions!' });
  } catch (error) {
    console.error('Error during password reset:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
};

function ForgotPassword() {
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submit = useSubmit();
  const actionData = useActionData<ActionData>();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.checkValidity()) {
      submit(form, { method: 'post' });
    } else {
      console.error('Form is invalid');
    }
  };

  useEffect(() => {
    if (actionData) {
      if (actionData.message) {
        setMessage(actionData.message);
        setError(null);
      } else if (actionData.error) {
        setError(actionData.error);
        setMessage(null);
      }
    }
  }, [actionData]);

  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  return (
    <div className="forgot-password-container">
      <h1 className="forgot-password-title">Reset Password</h1>
      <p className="forgot-password-description">
        Enter your email so we can send you a link to reset your password!
      </p>
      {message && <p className="success-message" style={{ color: 'green' }}>{message}</p>}
      {error && <p className="error-message" style={{ color: 'red' }}>{error}</p>}
      <Form method="post" onSubmit={handleSubmit} className="forgot-password-form">
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email <span className="required">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="mail@example.com"
            className="form-input"
            required
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit" className="submit-button">
          Reset
        </button>
      </Form>
      <p className="forgot-password-footer">
        Not registered yet? <Link to="/signup" className="signup-link">Create an Account</Link>
      </p>
    </div>
  );
}

export default ForgotPassword;
