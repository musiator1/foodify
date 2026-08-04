import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Dodaj to pod importami w main.tsx
const savedTheme = localStorage.getItem('theme') || 'zinc';
document.documentElement.setAttribute('data-theme', savedTheme);

const isDark = localStorage.getItem('darkMode') === 'true' || 
               (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
if (isDark) document.documentElement.classList.add('dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Rejestracja Service Workera dla trybu PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}