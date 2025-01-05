import React, { createContext, useState, useContext, ReactNode } from 'react';
import { useNavigate } from '@remix-run/react';

interface User {
  email: string;
  token: string;
  isAuthorized: boolean;
  isPhoneVerified: boolean;
  preferences: {
    hideBalances: boolean;
    currency: string;
    network: string;
  };
  preferredNetwork?: string;
  // Add other relevant properties
}

export interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updatePreferences: (preferences: Partial<User['preferences']>) => void;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
  refreshUser: async () => {},
  updatePreferences: () => {},
});

export const UserProvider: React.FC<{ children: ReactNode; initialUser: User }> = ({ children, initialUser }) => {
  const [user, setUser] = useState<User | null>(initialUser);
  const navigate = useNavigate();

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      // Navigate to logout endpoint which will handle session cleanup
      window.location.href = '/logout';
    }
  };

  const refreshUser = async () => {
    // Add logic to refresh user data if needed
    // For now just forcing a re-render with current user
    setUser({ ...user! });
  };

  const updatePreferences = (preferences: Partial<User['preferences']>) => {
    setUser(prevUser => 
      prevUser ? {
        ...prevUser,
        preferences: {
          ...prevUser.preferences,
          ...preferences
        }
      } : null
    );
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      logout, 
      refreshUser,
      updatePreferences 
    }}>
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
