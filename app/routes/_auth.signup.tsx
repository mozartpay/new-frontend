import React, { useState, useEffect } from "react";
import { Form, useActionData, useLoaderData, useNavigation, useSubmit, useNavigate, Link } from "@remix-run/react";
import { json, LoaderFunction, ActionFunction, redirect } from "@remix-run/node";
import { createUserSession, getSession } from "~/sessions/index";
import { useUser } from "~/context/UserContext";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request);
  const userId = session.get("userId");
  if (userId) {
    return redirect('/admin');
  }
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    console.error("API_URL is not defined");
    return json({ message: "API_URL is not configured properly", error: true }, { status: 500 });
  }
  return json({ apiUrl, message: "Signup page loaded successfully", error: false });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullname = formData.get('name') as string;
  const phone = formData.get('phone') as string;

  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return json({ error: "API_URL is not configured properly" }, { status: 500 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${apiUrl}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, fullname, number: phone }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (response.ok) {
      const userWithAuth = { 
        ...data.user, 
        isAuthorized: true,
        token: data.token 
      };
      // Create user session and redirect to verification page
      return createUserSession(JSON.stringify(userWithAuth), '/verification');
    } else {
      return json({ error: data.message || 'An error occurred during sign up' }, { status: response.status });
    }
  } catch (error) {
    console.error('Signup error:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      return json({ error: 'The request timed out. Please try again.' }, { status: 408 });
    }
    return json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
};

export default function SignUp() {
  const loaderData = useLoaderData<{ message: string, error: boolean, apiUrl: string }>();
  const actionData = useActionData<{ error?: string, user?: any }>();
  const navigation = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const submit = useSubmit();
  const { setUser } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (actionData && !actionData.error && actionData.user) {
      if (actionData.user.isVerified) {
        setUser(actionData.user);
        navigate('/admin');
      } else {
        navigate('/verification');
      }
    }
  }, [actionData, setUser, navigate]);

  const handlePasswordVisibility = () => setShowPassword(!showPassword);

  const isSubmitting = navigation.state === "submitting";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set('phone', phoneNumber);
    submit(formData, { method: 'post', replace: true });
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Sign Up</h1>
      
      {loaderData.error ? (
        <p style={{ color: 'red', marginBottom: '1rem' }}>{loaderData.message}</p>
      ) : (
        <p style={{ marginBottom: '1.5rem', color: 'gray' }}>Create your account to get started!</p>
      )}
      
      {actionData?.error && <p style={{ color: 'red', marginBottom: '1rem' }}>{actionData.error}</p>}
      
      <Form method="post" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'left' }}>
            Name <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Your full name"
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
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'left' }}>
            Email <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="mail@example.com"
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
          <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'left' }}>
            Phone Number <span style={{ color: 'red' }}>*</span>
          </label>
          <PhoneInput
            international
            countryCallingCodeEditable={false}
            defaultCountry="CO"
            value={phoneNumber}
            onChange={(value) => setPhoneNumber(value || "")}
            style={{
              marginBottom: '1.5rem',
            }}
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
              type={showPassword ? "text" : "password"}
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
              onClick={handlePasswordVisibility}
            >
              {showPassword ? '🙈' : '👁️'}
            </span>
          </div>
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
          {isSubmitting ? 'Signing Up...' : 'Sign Up'}
        </button>
      </Form>

      <p style={{ marginTop: '1rem' }}>
        Already have an account? <Link to="/signin" style={{ color: '#4a5568', textDecoration: 'none' }}>Sign in</Link>
      </p>
    </div>
  );
}
