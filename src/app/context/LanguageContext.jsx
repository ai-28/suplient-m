"use client"

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import enTranslations from '@/app/lib/translations/en.json';
import daTranslations from '@/app/lib/translations/da.json';

const LanguageContext = createContext();

const translations = {
  en: enTranslations,
  da: daTranslations
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [languageVersion, setLanguageVersion] = useState(0); // Force re-render counter

  // Load language from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('appLanguage');
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'da')) {
        setLanguage(savedLanguage);
      } else {
        // Default to browser language if supported, otherwise English
        const browserLang = navigator.language.split('-')[0];
        const initialLang = (browserLang === 'da') ? 'da' : 'en';
        setLanguage(initialLang);
        localStorage.setItem('appLanguage', initialLang);
      }
    }
  }, []);

  const changeLanguage = useCallback((newLanguage) => {
    if (newLanguage === 'en' || newLanguage === 'da') {
      setLanguage(newLanguage);
      setLanguageVersion(prev => prev + 1); // Increment to force re-render
      if (typeof window !== 'undefined') {
        localStorage.setItem('appLanguage', newLanguage);
        // Trigger a custom event to notify all components
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: newLanguage }));
      }
    }
  }, []);

  // Memoize the translation function so it updates when language changes
  const t = useMemo(() => {
    return (key, defaultValue = null) => {
      const keys = key.split('.');
      let value = translations[language];
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return defaultValue !== null ? defaultValue : key;
        }
      }
      
      return value || defaultValue || key;
    };
  }, [language]);

  // Memoize the context value to ensure components re-render when language changes
  const contextValue = useMemo(() => ({
    language,
    languageVersion, // Include version to force updates
    changeLanguage,
    t
  }), [language, languageVersion, changeLanguage, t]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

export function useTranslation() {
  const { t } = useLanguage();
  return t;
}

