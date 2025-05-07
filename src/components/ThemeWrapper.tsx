'use client';

import React from 'react';
import { useTheme } from '@/contexts/theme-context';

interface ThemeWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function ThemeWrapper({ children, className }: ThemeWrapperProps) {
  const { theme } = useTheme();
  
  const themeClasses = {
    dbz: 'bg-yellow-950/20',
    naruto: 'bg-orange-950/20',
    hogwarts: 'bg-purple-950/20',
    classic: 'bg-blue-950/20'
  };
  
  return (
    <div className={`${themeClasses[theme as keyof typeof themeClasses]} ${className || ''}`}>
      {children}
    </div>
  );
} 