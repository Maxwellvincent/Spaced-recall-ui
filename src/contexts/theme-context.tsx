'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeType = 'dbz' | 'naruto' | 'hogwarts' | 'classic';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Safe localStorage access
const getLocalStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null; // Return null during SSR
  }
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return null;
  }
};

const setLocalStorageItem = (key: string, value: string): void => {
  if (typeof window === 'undefined') {
    return; // Do nothing during SSR
  }
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error('Error setting localStorage:', error);
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>('classic');
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true once component is mounted
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load theme from localStorage on initial client-side render
  useEffect(() => {
    if (!isClient) return;
    
    const savedTheme = getLocalStorageItem('userTheme') as ThemeType;
    console.log('ThemeContext: Loading theme from localStorage:', savedTheme);
    
    if (savedTheme && ['dbz', 'naruto', 'hogwarts', 'classic'].includes(savedTheme)) {
      setThemeState(savedTheme);
    }
  }, [isClient]);

  // Wrapper function to set theme and save to localStorage
  const setTheme = (newTheme: ThemeType) => {
    console.log('ThemeContext: Setting theme to:', newTheme);
    setThemeState(newTheme);
    
    if (isClient) {
      setLocalStorageItem('userTheme', newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 