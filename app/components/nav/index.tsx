import React, { useState, useContext, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Link as RemixLink, useNavigate, useFetcher, useMatches } from "@remix-run/react";
import logo from '../../assets/img/home/mozart.png';
import { useUser } from '~/context/UserContext';
import { DarkModeContext } from '~/routes/blog';

interface NavProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Nav({ isDarkMode, onToggleDarkMode }: NavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const darkModeContext = useContext(DarkModeContext);
  const fetcher = useFetcher();
  const matches = useMatches();

  // Update user context when root loader data changes
  useEffect(() => {
    const rootLoaderData = matches[0]?.data;
    if (rootLoaderData && rootLoaderData.user) {
      setUser(rootLoaderData.user);
    } else {
      setUser(null);
    }
  }, [matches, setUser]);

  const onToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    fetcher.submit({}, { method: "post", action: "/logout" });
    setUser(null);
    sessionStorage.removeItem('user');
    navigate('/');
  };

  const MobileNav = () => (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="mobile-nav"
      style={{ overflow: 'hidden', padding: '16px', backgroundColor: isDarkMode ? '#2d3748' : '#f9f9f9' }}
    >
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {user ? (
          <>
            <RemixLink to="/admin/profile" style={{ textDecoration: 'none', color: isDarkMode ? '#f7fafc' : '#4A5568', fontSize: '18px' }}>
              Profile
            </RemixLink>
            <RemixLink to="/admin/settings" style={{ textDecoration: 'none', color: isDarkMode ? '#f7fafc' : '#4A5568', fontSize: '18px' }}>
              Settings
            </RemixLink>
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: isDarkMode ? '#f7fafc' : '#4A5568',
                fontSize: '18px',
                cursor: 'pointer',
                textAlign: 'left',
                padding: 0
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <RemixLink to="/" style={{ textDecoration: 'none', color: isDarkMode ? '#f7fafc' : '#4A5568', fontSize: '18px' }}>
              Home
            </RemixLink>
            <RemixLink to="/imprint" style={{ textDecoration: 'none', color: isDarkMode ? '#f7fafc' : '#4A5568', fontSize: '18px' }}>
              Imprint
            </RemixLink>
            <RemixLink to="/contact" style={{ textDecoration: 'none', color: isDarkMode ? '#f7fafc' : '#4A5568', fontSize: '18px' }}>
              Contact
            </RemixLink>
          </>
        )}
      </nav>
    </motion.div>
  );

  return (
    <div style={{ borderBottom: '1px solid lightgray' }}>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <nav
          style={{
            backgroundColor: isDarkMode ? '#2d3748' : '#ffffff',
            color: isDarkMode ? '#f7fafc' : '#4A5568',
            minHeight: '60px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid lightgray',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={onToggle}
              style={{
                display: 'flex',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                marginRight: '16px',
              }}
            >
              {isOpen ? (
                <span style={{ fontSize: '24px' }}>✖️</span>
              ) : (
                <span style={{ fontSize: '24px' }}>☰</span>
              )}
            </button>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            >
              <RemixLink to={user ? "/admin" : "/"}>
                <img src={logo} style={{ width: '100px', height: 'auto' }} alt="Logo" />
              </RemixLink>
            </motion.div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            {user ? (
              <>
                <div style={{ marginRight: '16px' }}>Welcome, {user.name || user.email}</div>
                <button
                  onClick={handleLogout}
                  style={{
                    backgroundColor: '#F56565',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <div style={{ marginRight: '16px' }}>
                  <RemixLink to="/signin" style={{ textDecoration: 'none', color: 'inherit' }}>
                    Sign In
                  </RemixLink>
                </div>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <RemixLink to="/signup">
                    <button
                      style={{
                        backgroundColor: '#F56565',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Sign Up
                    </button>
                  </RemixLink>
                </motion.div>
              </>
            )}
          </div>
        </nav>
      </motion.div>

      <AnimatePresence>
        {isOpen && <MobileNav />}
      </AnimatePresence>
    </div>
  );
}