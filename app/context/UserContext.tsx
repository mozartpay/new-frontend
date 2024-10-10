import React, { createContext, useState, useContext, useEffect } from 'react';

interface User {
  email: string;
  name?: string;
  isAuthorized?: boolean;
  preferredCurrency?: string;
}

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => void;
  updatePreferredCurrency: (currency: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode; initialUser?: User | null }> = ({ children, initialUser = null }) => {
  const [user, setUser] = useState<User | null>(initialUser);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    }
  }, [initialUser]);

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
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
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};