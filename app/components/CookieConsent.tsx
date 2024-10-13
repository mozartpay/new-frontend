import { useEffect, useState } from 'react';
import { useCookieConsent } from '~/hooks/useCookieConsent';
import '../styles/cookieconsent.css';

export function CookieConsent() {
  const [error, setError] = useState<string | null>(null);
  const { isAccepted, initCookieConsent } = useCookieConsent();
  const [showConsent, setShowConsent] = useState(true);

  useEffect(() => {
    try {
      console.log('Initializing cookie consent...');
      initCookieConsent({
        current_lang: 'en',
        autoclear_cookies: true,
        page_scripts: true,
        languages: {
          en: {
            consent_modal: {
              title: 'We use cookies!',
              description: 'Hi, this website uses essential cookies to ensure its proper operation and tracking cookies to understand how you interact with it. The latter will be set only after consent.',
              primary_btn: {
                text: 'Accept all',
                role: 'accept_all'
              },
              secondary_btn: {
                text: 'Accept necessary',
                role: 'accept_necessary'
              }
            },
            settings_modal: {
              title: 'Cookie preferences',
              save_settings_btn: 'Save settings',
              accept_all_btn: 'Accept all',
              reject_all_btn: 'Accept necessary',
              close_btn_label: 'Close',
              cookie_table_headers: [
                {col1: 'Name'},
                {col2: 'Domain'},
                {col3: 'Expiration'},
                {col4: 'Description'}
              ],
              blocks: [
                {
                  title: 'Cookie usage',
                  description: 'We use cookies to ensure the basic functionalities of the website and to enhance your online experience.'
                }, {
                  title: 'Strictly necessary cookies',
                  description: 'These cookies are essential for the proper functioning of my website. Without these cookies, the website would not work properly',
                  toggle: {
                    value: 'necessary',
                    enabled: true,
                    readonly: true
                  }
                }, {
                  title: 'Analytics cookies',
                  description: 'These cookies collect information about how you use the website, which pages you visited and which links you clicked on. All of the data is anonymized and cannot be used to identify you',
                  toggle: {
                    value: 'analytics',
                    enabled: false,
                    readonly: false
                  }
                }
              ]
            }
          }
        }
      });
    } catch (err) {
      setError('Failed to initialize cookie consent');
      console.error(err);
    }
  }, [initCookieConsent]);

  const handleAcceptAll = () => {
    // Replace with the actual method to accept all cookies
    console.log('Accept all cookies');
    setShowConsent(false);
  };

  const handleAcceptNecessary = () => {
    // Replace with the actual method to accept only necessary cookies
    console.log('Accept necessary cookies');
    setShowConsent(false);
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!showConsent) {
    return null;
  }

  return (
    <div className="cookieConsentOverlay">
      <div className="cookieConsentCard">
        <h2 className="cookieConsentTitle">We use cookies!</h2>
        <p className="cookieConsentDescription">
          This website uses essential cookies to ensure its proper operation and tracking cookies to understand how you interact with it. The latter will be set only after consent.
        </p>
        <div className="cookieConsentButtons">
          <button className="acceptAllButton" onClick={handleAcceptAll}>
            Accept all
          </button>
          <button className="acceptNecessaryButton" onClick={handleAcceptNecessary}>
            Accept necessary
          </button>
        </div>
      </div>
    </div>
  );
}
