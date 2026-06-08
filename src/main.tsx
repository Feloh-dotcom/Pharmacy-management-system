import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './LanguageContext';
import './index.css';

// Dynamically route frontend API requests starting with /api/ to the configured backend URL
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  try {
    Object.defineProperty(window, 'fetch', {
      value: function (input: any, init: any) {
        let url = input;
        const envUrl = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL;
        const apiUrl = envUrl && envUrl !== "placeholder_not_configured" ? envUrl : "";
        
        if (apiUrl) {
          if (typeof url === "string" && url.startsWith("/api/")) {
            url = `${apiUrl.replace(/\/$/, "")}${url}`;
          } else if (url instanceof URL && url.pathname.startsWith("/api/")) {
            url = new URL(url.pathname + url.search + url.hash, apiUrl);
          }
        }
        return originalFetch(url, init);
      },
      writable: true,
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    console.warn("Could not override window.fetch with Object.defineProperty, trying direct assignment:", e);
    try {
      (window as any).fetch = function (input: any, init: any) {
        let url = input;
        const envUrl = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL;
        const apiUrl = envUrl && envUrl !== "placeholder_not_configured" ? envUrl : "";

        if (apiUrl) {
          if (typeof url === "string" && url.startsWith("/api/")) {
            url = `${apiUrl.replace(/\/$/, "")}${url}`;
          } else if (url instanceof URL && url.pathname.startsWith("/api/")) {
            url = new URL(url.pathname + url.search + url.hash, apiUrl);
          }
        }
        return originalFetch(url, init);
      };
    } catch (err2) {
      console.error("Failed to override fetch entirely:", err2);
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
