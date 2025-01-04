import React, { useState, useEffect } from 'react';
import { Form, useActionData, useLoaderData, useNavigation, useSubmit, useNavigate, Link } from '@remix-run/react';
import { json, LoaderFunction, ActionFunction, redirect } from '@remix-run/node';
import { createUserSession, checkAuthenticatedRedirect } from '~/sessions/index';
import { useUser } from '~/context/UserContext';

export const loader: LoaderFunction = async ({ request }) => {
  // Check if user is already logged in and redirect if they are
  await checkAuthenticatedRedirect(request);

  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    console.error("API_URL is not defined");
    return json({ message: "API_URL is not configured properly", error: true }, { status: 500 });
  }
  return json({ apiUrl, message: "Signin page loaded successfully", error: false });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return json({ error: "API_URL is not configured properly" }, { status: 500 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${apiUrl}/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (response.ok) {
      // Store the complete user data including token and preferences
      const hideBalances = data.user.preferences?.hideBalances ?? true; // Default to true if not set
      
      // Update the backend with the initial preference if not set
      if (data.user.preferences?.hideBalances === undefined) {
        await fetch(`${apiUrl}/profile/${data.user.email}/preferences`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.token}`
          },
          body: JSON.stringify({ hideBalances })
        });
      }
      
      const userSession = {
        ...data.user,
        isAuthorized: true,
        token: data.token,
        preferences: {
          ...data.user.preferences,
          hideBalances
        }
      };
      // Create user session with the complete user data
      return createUserSession(JSON.stringify(userSession), '/admin');
    } else {
      return json({ error: data.message || 'An error occurred during sign in' }, { status: response.status });
    }
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      return json({ error: 'The request timed out. Please try again.' }, { status: 408 });
    }
    return json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
};

export default function SignIn() {
  const loaderData = useLoaderData<{ message: string, error: boolean, apiUrl: string }>();
  const actionData = useActionData<{ error?: string }>();
  const navigation = useNavigation();
  const [show, setShow] = useState(false);
  const submit = useSubmit();
  const { setUser } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (actionData && !actionData.error) {
      // The user data is now handled by the server-side redirect
      // No need to manually set the user or navigate here
    }
  }, [actionData, setUser, navigate]);

  const handleClick = () => setShow(!show);

  const isSubmitting = navigation.state === "submitting";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.checkValidity()) {
      submit(form, { method: 'post', replace: true });
    } else {
      // Handle invalid form
      console.error('Form is invalid');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Sign In</h1>
      
      {loaderData.error ? (
        <p style={{ color: 'red', marginBottom: '1rem' }}>{loaderData.message}</p>
      ) : (
        <p style={{ marginBottom: '1.5rem', color: 'gray' }}>Enter your email and password to sign in!</p>
      )}
      
      {actionData?.error && <p style={{ color: 'red', marginBottom: '1rem' }}>{actionData.error}</p>}
      
      <Form method="post" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'left' }}>
            Email <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="your@email.com"
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
            <input type="checkbox" name="remember" style={{ marginRight: '0.5rem' }} />
            Remember me
          </label>
          <Link to="/forgot-password" style={{ color: '#4a5568', textDecoration: 'none' }}>Forgot Password?</Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: isSubmitting ? '#ccc' : '#f56565',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isSubmitting ? 'Signing In...' : 'Sign In'}
        </button>
      </Form>

      <p style={{ marginTop: '1rem' }}>
        Don't have an account? <Link to="/signup" style={{ color: '#4a5568', textDecoration: 'none' }}>Sign up</Link>
      </p>
    </div>
  );
}
