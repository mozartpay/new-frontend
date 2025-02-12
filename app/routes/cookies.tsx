import { ActionFunction, json, LoaderFunction, redirect } from '@remix-run/node';
import { createCookie } from '@remix-run/node';
import { useLoaderData, useFetcher } from '@remix-run/react';
import styles from '~/styles/cookies.module.css';

// Create a cookie instance
export const cookieConsent = createCookie('cookie_consent', {
  maxAge: 31536000, // 1 year in seconds
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  httpOnly: true,
});

export const action: ActionFunction = async ({ request }) => {
  let consent: string | null = null;
  const isAjax = request.headers.get('X-Requested-With') === 'XMLHttpRequest';

  try {
    // Check content type to determine how to parse the request
    const contentType = request.headers.get('Content-Type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      consent = body.consent;
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      consent = formData.get('consent')?.toString() || null;
    }

    if (!consent || !['necessary', 'all'].includes(consent)) {
      throw new Error('Invalid consent value');
    }

    const response = json(
      { success: true },
      {
        headers: {
          'Set-Cookie': await cookieConsent.serialize(consent),
        },
      }
    );

    return isAjax ? response : redirect('/');
  } catch (error) {
    console.error('Error processing consent:', error);
    const errorResponse = json(
      { error: 'Invalid consent value' },
      { status: 400 }
    );
    return isAjax ? errorResponse : redirect('/error');
  }
};

export const loader: LoaderFunction = async ({ request }) => {
  const cookieHeader = request.headers.get('Cookie');
  const consent = await cookieConsent.parse(cookieHeader);
  
  // Check if it's an AJAX request
  const isAjax = request.headers.get('X-Requested-With') === 'XMLHttpRequest';
  if (isAjax) {
    return json({ consent: consent || null });
  }

  // For regular requests, return the component
  return json({ consent: consent || null });
};

export default function CookieConsent() {
  const { consent } = useLoaderData<{ consent: string | null }>();
  const fetcher = useFetcher();

  if (typeof consent === 'string') return null;

  const handleConsent = (type: 'necessary' | 'all') => {
    fetcher.submit(
      { consent: type },
      { method: 'post', encType: 'application/x-www-form-urlencoded' }
    );
  };

  return (
    <div className={styles.cookieModal}>
      <h2 className={styles.title}>We use cookies!</h2>
      <p className={styles.description}>
        This website uses essential cookies to ensure its proper operation
        and tracking cookies to understand how you interact with it. The
        latter will be set only after consent.
      </p>
      <div className={styles.buttonContainer}>
        <button
          onClick={() => handleConsent('necessary')}
          className={`${styles.button} ${styles.buttonNecessary}`}
        >
          Accept necessary
        </button>
        <button
          onClick={() => handleConsent('all')}
          className={`${styles.button} ${styles.buttonAcceptAll}`}
        >
          Accept all
        </button>
      </div>
    </div>
  );
}
