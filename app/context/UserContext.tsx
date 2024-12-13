import React, { createContext, useState, useContext, ReactNode } from 'react';
import { useNavigate } from '@remix-run/react';

interface User {
  // Define user properties here
  email: string;
  isAuthorized: boolean;
  // Add other relevant properties
}

export interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => void;
  updatePreferredCurrency: (currency: string) => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider: React.FC<{ children: ReactNode; initialUser: User }> = ({ children, initialUser }) => {
  const [user, setUser] = useState<User | null>(initialUser);
  const navigate = useNavigate();

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      // Clear localStorage
      localStorage.clear();
      // Clear client-side cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      // Navigate to logout page and refresh
      window.location.href = '/logout';
    }
  };

  const updatePreferredCurrency = (currency: string) => {
    setUser(prevUser => prevUser ? { ...prevUser, preferredCurrency: currency } : null);
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout, updatePreferredCurrency }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
