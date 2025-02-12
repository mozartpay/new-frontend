import { useState, useEffect } from 'react';
import { useCookieConsent } from '~/hooks/useCookieConsent';
import styles from '../styles/cookies.module.css';

export function CookieConsent() {
  const { acceptCookies } = useCookieConsent();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  const handleAccept = () => {
    acceptCookies(['necessary']);
  };

  return (
    <div className={styles.cookieConsent}>
      <div className={styles.content}>
        <p>
          We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.
        </p>
        <div className={styles.buttons}>
          <button onClick={handleAccept} className={styles.acceptButton}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}