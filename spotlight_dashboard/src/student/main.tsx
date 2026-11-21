import { StrictMode } from 'react';
import type { Root } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { registerSW } from 'virtual:pwa-register';
import './student.css';
import StudentApp from './StudentApp';
import { listenForInstallPrompt } from './hooks/usePWAInstall';

const SITE_BASE = import.meta.env.BASE_URL;
const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function addPwaHeadTags() {
  const tags: Array<[string, Record<string, string>]> = [
    ['link', { rel: 'manifest', href: `${SITE_BASE}student.webmanifest` }],
    ['link', { rel: 'apple-touch-icon', href: `${SITE_BASE}student-icons/apple-touch-icon.png` }],
    ['meta', { name: 'theme-color', content: '#000000' }],
    ['meta', { name: 'mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }],
    ['meta', { name: 'apple-mobile-web-app-title', content: 'Spotlight' }],
  ];
  for (const [tag, attrs] of tags) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    document.head.appendChild(el);
  }
}

export function mountStudentApp(root: Root) {
  document.title = 'Spotlight';
  addPwaHeadTags();
  listenForInstallPrompt();
  registerSW({ immediate: true });

  root.render(
    <StrictMode>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <StudentApp />
      </GoogleOAuthProvider>
    </StrictMode>,
  );
}
