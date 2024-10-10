import React, { useState } from 'react';
import { FaTwitter, FaLinkedin } from 'react-icons/fa';
import { BiMailSend } from 'react-icons/bi';
import { motion } from 'framer-motion';
import { Link as RemixLink, useFetcher } from '@remix-run/react'; // Use Remix's Link and useFetcher for navigation
// import logo from 'https://i.imgur.com/pMtUEEC.png';
import logo from "../../assets/img/home/mozart.png"

interface FetcherData {
  user?: boolean;
}

const SocialButton = ({
  children,
  label,
  href,
}: {
  children: React.ReactNode;
  label: string;
  href: string;
}) => {
  return (
    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
      <a
        href={href}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'inline-flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'background 0.3s ease',
          color: '#4a5568',
        }}
      >
        {children}
        <span style={{ display: 'none' }}>{label}</span>
      </a>
    </motion.div>
  );
};

const ListHeader = ({ children, isDarkMode }: { children: React.ReactNode, isDarkMode: boolean }) => {
  return <h3 style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '12px', color: isDarkMode ? '#ffffff' : '#2d3748' }}>{children}</h3>;
};

export default function Footer({ isDarkMode, onToggleDarkMode }: { isDarkMode: boolean, onToggleDarkMode: () => void }) {
  const [email, setEmail] = useState('');
  const [popupMessage, setPopupMessage] = useState<string | null>(null); // Add state for popup message
  const fetcher = useFetcher<FetcherData>();
  const isSubscribed = fetcher.data?.user;

  const handleSubscribe = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setPopupMessage('Please enter a valid email address.');
      return;
    }

    try {
      const response = await fetch('https://mozart-api-21ea5fd801a8.herokuapp.com/api/subscribe', { // Update with your backend URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setPopupMessage('Subscription successful!');
      } else {
        setPopupMessage(data.message || 'Subscription failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during subscription:', error);
      setPopupMessage('An error occurred. Please try again later.');
    }
  };

  return (
    <div style={{ backgroundColor: 'inherit', color: 'inherit', padding: '60px 20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Move the toggle button inside the main footer div */}
      <button
        className="toggle-button"
        onClick={onToggleDarkMode}
      >
        {isDarkMode ? 'Day Light' : 'Night Light'}
      </button>
      
      {/* Rest of the footer content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '40px',
              textAlign: 'left',
            }}
          >
            <div>
              <motion.div whileHover={{ scale: 1.05 }}>
                <img src={logo} style={{ width: '120px', height: 'auto', marginBottom: '16px' }} alt="Logo" />
              </motion.div>
              <p style={{ fontSize: '0.875rem', color: '#718096', marginBottom: '16px' }}>
                Join us and start receiving payments today.
              </p>
              <div style={{ display: 'flex', gap: '16px' }}>
                <SocialButton label={'Twitter'} href={'https://twitter.com/Mozartpay'}>
                  <FaTwitter />
                </SocialButton>
                <SocialButton label={'LinkedIn'} href={'https://www.linkedin.com/company/mozartpay'}>
                  <FaLinkedin />
                </SocialButton>
              </div>
            </div>

            <div>
              <ListHeader isDarkMode={isDarkMode}>Company</ListHeader>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>
                  <RemixLink to="/contact" style={linkStyle}>Contact</RemixLink>
                </li>
                <li>
                  <RemixLink to="/blog" style={linkStyle}>Blog</RemixLink>
                </li>
              </ul>
            </div>

            <div>
              <ListHeader isDarkMode={isDarkMode}>Support</ListHeader>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>
                  <RemixLink to="/terms" style={linkStyle}>Terms of Service</RemixLink>
                </li>
                <li>
                  <RemixLink to="/imprint" style={linkStyle}>Imprint</RemixLink>
                </li>
                <li>
                  <RemixLink to="/privacy" style={linkStyle}>Privacy Policy</RemixLink>
                </li>
                <li>
                  <RemixLink to="/docs" style={linkStyle}>Docs</RemixLink>
                </li>
              </ul>
            </div>

            <div>
              <ListHeader isDarkMode={isDarkMode}>Stay up to date</ListHeader>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                <input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    backgroundColor: '#edf2f7',
                    border: '1px solid #cbd5e0',
                    padding: '12px',
                    borderRadius: '4px',
                    width: '100%',
                    color: '#4a5568',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border 0.3s ease',
                  }}
                />
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <button
                    onClick={handleSubscribe}
                    style={{
                      backgroundColor: '#38a169',
                      color: 'white',
                      padding: '12px 16px',
                      borderRadius: '4px',
                      border: 'none',
                      marginLeft: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <BiMailSend />
                  </button>
                </motion.div>
              </div>
              {popupMessage && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '10px',
                    backgroundColor: '#c6f6d5',
                    color: '#2f855a',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <span role="img" aria-label="info">
                    ℹ️
                  </span>
                  <span style={{ marginLeft: '8px' }}>{popupMessage}</span>
                </div>
              )}
              {isSubscribed && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '10px',
                    backgroundColor: '#c6f6d5',
                    color: '#2f855a',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <span role="img" aria-label="checkmark">
                    ✅
                  </span>
                  <span style={{ marginLeft: '8px' }}>Subscription successful!</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Common styles for navigation links
const linkStyle = {
  color: 'inherit',
  textDecoration: 'none',
  fontSize: '1rem',
  marginBottom: '8px',
  display: 'block',
  transition: 'color 0.3s ease',
};