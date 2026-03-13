import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Colors } from '../constants/theme';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    accent: string;
  };
}

const lightColors = {
  primary: Colors.light.primary,
  secondary: Colors.light.secondary,
  background: Colors.light.background,
  surface: Colors.light.surfaceVariant,
  text: Colors.light.text,
  textSecondary: Colors.light.textSecondary,
  border: Colors.light.border,
  error: Colors.light.error,
  success: Colors.light.success,
  warning: Colors.light.warning,
  info: Colors.light.info,
  accent: Colors.light.accent,
};

const darkColors = {
  primary: Colors.dark.primary,
  secondary: Colors.dark.secondary,
  background: Colors.dark.background,
  surface: Colors.dark.surfaceVariant,
  text: Colors.dark.text,
  textSecondary: Colors.dark.textSecondary,
  border: Colors.dark.border,
  error: Colors.dark.error,
  success: Colors.dark.success,
  warning: Colors.dark.warning,
  info: Colors.dark.info,
  accent: Colors.dark.accent,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const colors = isDarkMode ? darkColors : lightColors;

  const value = {
    isDarkMode,
    toggleTheme,
    colors,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
