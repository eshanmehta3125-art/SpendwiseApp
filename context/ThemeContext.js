import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme } from '../constants/appTheme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  
  // Default to system theme, but allow explicit override
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  const currencyMap = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'JPY': '¥', 
    'CAD': 'C$', 'AUD': 'A$', 'CNY': '¥', 'RUB': '₽', 'BRL': 'R$'
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const togglePrivacyMode = () => {
    setIsPrivacyMode(prev => !prev);
  };

  const updateCurrency = (code) => {
    setCurrency(code);
    setCurrencySymbol(currencyMap[code] || code);
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ 
      isDarkMode, toggleTheme, theme, 
      currency, currencySymbol, updateCurrency,
      isPrivacyMode, togglePrivacyMode 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
