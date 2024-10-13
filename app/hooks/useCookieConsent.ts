import { useState, useEffect, useCallback } from 'react';

interface CookieConsentConfig {
  current_lang: string;
  autoclear_cookies: boolean;
  page_scripts: boolean;
  languages: {
    [key: string]: {
      consent_modal: {
        title: string;
        description: string;
        primary_btn: {
          text: string;
          role: string;
        };
        secondary_btn: {
          text: string;
          role: string;
        };
      };
      settings_modal: {
        title: string;
        save_settings_btn: string;
        accept_all_btn: string;
        reject_all_btn: string;
        close_btn_label: string;
        cookie_table_headers: Array<{ [key: string]: string }>;
        blocks: Array<{
          title: string;
          description: string;
          toggle?: {
            value: string;
            enabled: boolean;
            readonly: boolean;
          };
        }>;
      };
    };
  };
}

export function useCookieConsent() {
  const [cookieConsent, setCookieConsent] = useState<{ [key: string]: boolean }>({});
  const [isInitialized, setIsInitialized] = useState(false);

  const isAccepted = useCallback((category: string) => {
    return cookieConsent[category] || false;
  }, [cookieConsent]);

  const initCookieConsent = useCallback((config: CookieConsentConfig) => {
    if (isInitialized) return;
    
    console.log('Cookie consent initialized with config:', config);
    
    const categories = config.languages[config.current_lang].settings_modal.blocks
      .filter(block => block.toggle)
      .reduce((acc, block) => {
        acc[block.toggle!.value] = true;
        return acc;
      }, {} as { [key: string]: boolean });

    setCookieConsent(categories);
    setIsInitialized(true);
  }, [isInitialized]);

  return { isAccepted, initCookieConsent };
}
