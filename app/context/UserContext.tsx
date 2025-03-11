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
  publicKeyXlmTestnet: string;
  publicKeyXlmMainnet: string;
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

export const UserProvider: React.FC<{ children: ReactNode; initialUser: User | null }> = ({ children, initialUser }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      // Validate the initial user data
      if (initialUser && 
          typeof initialUser === 'object' && 
          'email' in initialUser &&
          'token' in initialUser) {
        return initialUser;
      }
      return null;
    } catch (error) {
      console.error('Error initializing user state:', error);
      return null;
    }
  });

  const navigate = useNavigate();

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      // Navigate to logout endpoint which will handle session cleanup
      window.location.href = '/logout';
    }
  };

  const refreshUser = async () => {
    try {
      if (!user?.token) {
        throw new Error('No user token available');
      }
      
      const apiUrl = window.ENV?.API_URL;
      if (!apiUrl) {
        throw new Error('API_URL not configured');
      }

      const response = await fetch(`${apiUrl}/profile`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to refresh user data');
      }

      const data = await response.json();
      setUser(prevUser => ({
        ...prevUser!,
        ...data.user
      }));
    } catch (error) {
      console.error('Error refreshing user:', error);
      logout();
    }
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
