// routes/blog.tsx
import type { MetaFunction } from '@remix-run/node';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Outlet } from '@remix-run/react';
import { format } from 'date-fns';
import "../styles/blog.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Blog" },
    { name: "description", content: "Welcome to our blog" },
  ];
};

// UserContext.tsx
interface User { email: string; }
interface UserContextProps { user: User | null; setUser: React.Dispatch<React.SetStateAction<User | null>>; }
const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    console.error('useUser must be used within a UserProvider');
    return { user: null, setUser: () => {} };
  }
  return context;
};

// SidebarContext.js
interface SidebarContextProps { isOpen: boolean; setIsOpen: React.Dispatch<React.SetStateAction<boolean>>; }
export const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

// Add this new context for dark mode
interface DarkModeContextProps { isDarkMode: boolean; setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>; }
export const DarkModeContext = createContext<DarkModeContextProps | undefined>(undefined);

// Blog components
interface BlogTagsProps { marginTop?: number; tags: string[]; }
export const BlogTags = ({ marginTop = 0, tags }: BlogTagsProps) => (
  <div className="tags" style={{ marginTop }}>
    {tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}
  </div>
);

interface BlogAuthorProps { date: Date; name: string; }
export const BlogAuthor = ({ date, name }: BlogAuthorProps) => {
  const { isDarkMode } = useContext(DarkModeContext) || { isDarkMode: false };
  return (
    <div className={`author ${isDarkMode ? 'dark-mode' : ''}`}>
      <img
        className="author-image"
        src="https://pbs.twimg.com/profile_images/1346878845622890506/GPNnoIeT_400x400.jpg"
        alt={`Avatar of ${name}`}
        style={{ width: '50px', height: '50px' }}
        loading="lazy"
      />
      <span className="author-name">{name}</span>
      <span className="author-date">{format(date, 'MM/dd/yyyy')}</span>
    </div>
  );
};

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const DarkModeProvider = ({ children }: { children: ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  return (
    <DarkModeContext.Provider value={{ isDarkMode, setIsDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const Blog = () => {
  return (
    <UserProvider>
      <DarkModeProvider>
        <div className="blog">
          <main>
            <Outlet />
          </main>
        </div>
      </DarkModeProvider>
    </UserProvider>
  );
};

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div>
      <h1>Error</h1>
      <p>{error.message}</p>
    </div>
  );
}

export default Blog;



