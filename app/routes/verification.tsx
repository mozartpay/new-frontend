import { useState, ChangeEvent, useEffect } from 'react';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, useFetcher, useNavigate } from '@remix-run/react';
import { getUserFromSession, createUserSession } from '~/sessions';
import '../styles/verification.css';
import type { LoaderFunction } from '@remix-run/node';
import { ActionFunctionArgs } from '@remix-run/node';
import { useUser } from '~/context/UserContext';

type ActionData = { 
  error?: string, 
  success?: boolean,
  resendSuccess?: boolean 
};

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const user = await getUserFromSession(request);
    
    if (!user || !user.email) {
      return redirect("/signin");
    }
    
    if (user.isPhoneVerified) {
      return redirect("/admin");
    }
    
    return json({ email: user.email });
  } catch (error) {
    console.error("Error in verification loader:", error);
    return redirect("/signin");
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const user = await getUserFromSession(request);

    if (!user || !user.email) {
      return json({ error: 'Please sign in again.' }, { status: 400 });
    }

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "resend") {
      const response = await fetch('https://mozart-api-21ea5fd801a8.herokuapp.com/api/signup/resend-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({ 
          email: user.email
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return json({ 
          error: data.message || 'Failed to resend verification code. Please try again.' 
        }, { status: response.status });
      }

      const data = await response.json();
      return json({ resendSuccess: true });
    }

    const code = formData.get("code");

    if (!code) {
      return json({ error: 'Verification code is required.' }, { status: 400 });
    }

    const response = await fetch('https://mozart-api-21ea5fd801a8.herokuapp.com/api/signup/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
      },
      body: JSON.stringify({ 
        email: user.email, 
        code: code.toString() 
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        return redirect('/signin');
      }
      return json({ 
        error: data.message || 'Invalid or expired verification code. Please try again.' 
      }, { status: response.status });
    }

    const data = await response.json();
    
    if (data.message === 'Phone number verified successfully.') {
      const updatedUser = {
        ...user,
        isPhoneVerified: true
      };
      
      return createUserSession(JSON.stringify(updatedUser), '/admin');
    }

    return json({ 
      error: 'Verification failed. Please try again.' 
    }, { status: 400 });
  } catch (error) {
    console.error("Error in verification action:", error);
    return json({ 
      error: 'An error occurred during verification. Please try again.' 
    }, { status: 500 });
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
  const fetcher = useFetcher<ActionData>();
  const navigate = useNavigate();
  const { user, refreshUser } = useUser();
  const [mounted, setMounted] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let mounted = true;

    if (fetcher.data?.success && mounted) {
      refreshUser().then(() => {
        if (mounted) {
          navigate('/admin');
        }
      });
    }
    if (fetcher.data?.resendSuccess && mounted) {
      setResendCooldown(60);
    }

    return () => {
      mounted = false;
    };
  }, [fetcher.data?.success, fetcher.data?.resendSuccess, navigate, refreshUser]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;

    if (resendCooldown > 0) {
      timeoutId = setTimeout(() => {
        setResendCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [resendCooldown]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code.trim()) {
      return;
    }
    const form = event.currentTarget;
    fetcher.submit(form);
  };

  const handleResendCode = () => {
    if (resendCooldown === 0) {
      const formData = new FormData();
      formData.append("intent", "resend");
      fetcher.submit(formData, { method: "post" });
    }
  };

  // Check if we're in a submitting or loading state
  const isSubmitting = fetcher.state === "submitting";
  const error = fetcher.data?.error;
  const resendSuccess = fetcher.data?.resendSuccess;

  if (!mounted) {
    return null; // Prevent flash of unhydrated content
  }

  return (
    <div className="verification-container">
      <div className="verification-content">
        <h1 className="verification-title">Account Verification</h1>
        <p className="verification-description">
          Please enter the Verification Code that has been sent to your phone number!
        </p>
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        {resendSuccess && (
          <div className="success-message" role="alert">
            A new verification code has been sent to your phone number.
          </div>
        )}
      </div>
      <div className="verification-form-container">
        <fetcher.Form method="post" onSubmit={handleSubmit} className="verification-form">
          <div className="form-group">
            <label htmlFor="code" className="form-label">
              Verification Code<span className="required">*</span>
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              placeholder="Enter verification code"
              className="form-input"
              value={code}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <button 
            type="submit" 
            className="submit-button"
            disabled={isSubmitting || !code.trim()}
          >
            {isSubmitting ? 'Verifying...' : 'Verify'}
          </button>
        </fetcher.Form>
        <div className="resend-section">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resendCooldown > 0 || isSubmitting}
            className="resend-button"
          >
            {resendCooldown > 0 
              ? `Resend code (${resendCooldown}s)` 
              : 'Resend verification code'}
          </button>
        </div>
      </div>
    </div>
  );
}
