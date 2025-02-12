import { useState, useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'mozartpay_cookie_consent';

interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  timestamp: number;
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);

  useEffect(() => {
    try {
      const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (storedConsent) {
        setConsent(JSON.parse(storedConsent));
      }
    } catch (error) {
      console.error('Error reading cookie consent:', error);
    }
  }, []);

  const acceptCookies = (types: string[]) => {
    try {
      const newConsent: CookieConsent = {
        necessary: types.includes('necessary'),
        analytics: types.includes('analytics'),
        timestamp: Date.now()
      };
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newConsent));
      setConsent(newConsent);
    } catch (error) {
      console.error('Error saving cookie consent:', error);
    }
  };

  const isAccepted = (type: 'necessary' | 'analytics'): boolean => {
    return consent?.[type] || false;
  };

  return {
    consent,
    acceptCookies,
    isAccepted
  };
}
