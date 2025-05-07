'use client';

import { useTheme } from '@/contexts/theme-context';
import { useState, useEffect } from 'react';

export function ThemeDebug() {
  const { theme } = useTheme();
  const [localStorageTheme, setLocalStorageTheme] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const storedTheme = localStorage.getItem('userTheme');
      setLocalStorageTheme(storedTheme);
    } catch (error) {
      console.error('Error reading theme from localStorage:', error);
    }
  }, [theme]);

  if (!isClient) return null;

  return (
    <div className="fixed bottom-2 right-2 bg-black/70 text-white p-2 rounded text-xs z-50">
      <div>Context Theme: {theme}</div>
      <div>LocalStorage Theme: {localStorageTheme || 'none'}</div>
    </div>
  );
} 