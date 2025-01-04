import React, { useState, useEffect } from 'react';
import Nav from '../../components/nav';
import Footer from '../../components/footer';
import '../../styles/global.css';

function useClientOnlyDarkMode() {
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check local storage first
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      setIsDarkMode(stored === 'true');
    } else {
      // Fall back to system preference
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      document.body.className = isDarkMode ? 'dark-mode' : 'light-mode';
      localStorage.setItem('darkMode', isDarkMode.toString());
    }
  }, [isDarkMode, mounted]);

  return {
    isDarkMode,
    setIsDarkMode,
    mounted
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isDarkMode, setIsDarkMode, mounted } = useClientOnlyDarkMode();

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  // Render a blank page until mounted to avoid hydration mismatch
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <div className={isDarkMode ? 'dark-mode' : 'light-mode'}>
      <Nav isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} />
      <main>{children}</main>
      <Footer isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} />
    </div>
  );
}