import { useState, ChangeEvent, useEffect } from 'react';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, useSubmit, Form } from '@remix-run/react';
import { getUserFromSession } from '~/sessions';
import'../styles/verification.css';

export const loader = async ({ request }) => {
  try {
    const user = await getUserFromSession(request);
    
    if (!user || !user.email) {
      return redirect("/signin");
    }
    
    return json({ email: user.email });
  } catch (error) {
    console.error("Error in verification loader:", error);
    return redirect("/signin");
  }
};

export const action = async ({ request }) => {
  try {
    const user = await getUserFromSession(request);

    if (!user || !user.email) {
      return redirect("/signin");
    }

    const formData = await request.formData();
    const code = formData.get("code");

    if (!code) {
      return json({ error: 'Verification code is required.' }, { status: 400 });
    }

    const response = await fetch('https://mozart-api-21ea5fd801a8.herokuapp.com/api/signup/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: user.email, code }),
    });

    const data = await response.json();

    if (response.ok && data.message === 'Verification code is valid.') {
      return redirect('/admin');
    } else {
      return json({ error: data.message || 'Invalid verification code.' }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in verification action:", error);
    return json({ error: 'An error occurred during verification.' }, { status: 500 });
  }
};

function useHydrated() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

export default function Verify() {
  const { email } = useLoaderData<{ email: string }>();
  const [code, setCode] = useState<string>('');
  const submit = useSubmit();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(event.currentTarget, { replace: true });
  };

  const isHydrated = useHydrated();

  if (isHydrated) {
    return (
      <div className="verification-container">
        <div className="verification-content">
          <h1 className="verification-title">Account Verification</h1>
          <p className="verification-description">
            Please enter the Verification Code that has been sent to your phone number!
          </p>
        </div>
        <div className="verification-form-container">
          <Form method="post" onSubmit={handleSubmit} className="verification-form">
            <div className="form-group">
              <label htmlFor="code" className="form-label">
                Verification Code<span className="required">*</span>
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                placeholder="Verification Code"
                className="form-input"
                value={code}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
              />
              <input type="hidden" name="email" value={email} />
            </div>
            <button type="submit" className="submit-button">
              Verify
            </button>
          </Form>
        </div>
      </div>
    );
  }

  return null;
}
