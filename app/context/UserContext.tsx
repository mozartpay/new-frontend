import React, { createContext, useState, useContext } from 'react';
import { useNavigate } from '@remix-run/react';

interface UserContextType {
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider = ({ children, initialUser }: { children: React.ReactNode, initialUser: any }) => {
  const [user, setUser] = useState(initialUser);
  const navigate = useNavigate();

  const logout = () => {
    setUser(null);
    navigate('/logout', { replace: true });
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
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
