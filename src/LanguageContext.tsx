/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { translations, TranslationSet } from "./translations";

interface LanguageContextProps {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: keyof TranslationSet) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    return localStorage.getItem("halomedical_language") || "EN";
  });

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    localStorage.setItem("halomedical_language", lang);

    // Sync on session user level
    const sessionUser = localStorage.getItem("halomedical_session_user");
    if (sessionUser) {
      try {
        const u = JSON.parse(sessionUser);
        u.language = lang;
        localStorage.setItem("halomedical_session_user", JSON.stringify(u));
        
        // Call profile preference endpoint
        fetch("/api/users/profile/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: lang })
        }).catch(err => console.error("API sync of language failed:", err));
      } catch (err) {
        console.error("Failed to parse or write user session update:", err);
      }
    }
  }, []);

  const t = useCallback((key: keyof TranslationSet): string => {
    const currentSet = translations[language] || translations.EN;
    return currentSet[key] || translations.EN[key] || String(key);
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t
  }), [language, setLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
