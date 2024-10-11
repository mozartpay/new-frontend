import React, { useState, ChangeEvent, useEffect } from 'react';
import { Link, useNavigate, Form, useActionData, useNavigation } from '@remix-run/react';
import { json, redirect, ActionFunction, LoaderFunction } from '@remix-run/node';
import { getSession, commitSession } from '~/sessions';
import { encrypt } from '~/utils/encryption';
import { useUser } from '~/context/UserContext';
import invariant from 'tiny-invariant';

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  if (session.has("user")) {
    return redirect("/admin");
  }
  return null;
};

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const email = form.get('email');
  const password = form.get('password');

  invariant(process.env.API_URL, "API_URL must be set");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // Ensure no double slashes in the URL
    const apiUrl = `${process.env.API_URL}/signin`.replace(/([^:]\/)\/+/g, "$1");

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    console.log('Raw server response:', responseText); // Log the raw response

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse response as JSON:', responseText);
      return json({ error: 'Unexpected server response. Please try again later.' });
    }

    if (response.ok) {
      const session = await getSession(request.headers.get("Cookie"));
      const encryptedUser = encrypt(JSON.stringify(data.user));
      session.set("user", encryptedUser);

      return redirect("/admin", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    } else {
      return json({ error: data.message || 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Signin error:', error);
    return json({ error: 'An error occurred during sign in. Please try again.' });
  }
};

function SignIn() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const actionData = useActionData<{ error?: string }>();
  const navigation = useNavigation();

  const isLoading = navigation.state === "submitting";

  useEffect(() => {
    if (user && user.isAuthorized) {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleClick = () => setShow(!show);

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Sign In</h1>
      <p style={{ marginBottom: '1.5rem', color: 'gray' }}>Enter your email and password to sign in!</p>
      
      {actionData?.error && (
        <p style={{ color: 'red', marginBottom: '1rem' }}>{actionData.error}</p>
      )}

      <Form method="post">
        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'left' }}>
            Email <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="mail@example.com"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              marginBottom: '1.5rem',
              border: '1px solid #ccc',
              borderRadius: '5px',
            }}
            required
          />
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'left' }}>
            Password <span style={{ color: 'red' }}>*</span>
          </label>
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ccc',
                borderRadius: '5px',
              }}
              required
            />
            <span
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                fontSize: '1.2rem',
                color: 'gray',
              }}
              onClick={handleClick}
            >
              {show ? '🙈' : '👁️'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input type="checkbox" style={{ marginRight: '0.5rem' }} /> Keep me logged in
          </label>
          <Link to="/forgot_password" style={{ color: '#f56565' }}>
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: isLoading ? '#ccc' : '#f56565',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isLoading ? (
            <>
              <Spinner />
              <span style={{ marginLeft: '0.5rem' }}>Signing In...</span>
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </Form>

      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <p>
          Not registered yet?{' '}
          <Link to="/signup" style={{ color: '#f56565' }}>
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        strokeDasharray="31.4 31.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default SignIn;