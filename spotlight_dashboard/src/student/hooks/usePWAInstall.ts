import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface UsePWAInstall {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const subscribers = new Set<() => void>();
const notify = () => subscribers.forEach((fn) => fn());

/**
 * Captures the browser's install prompt as soon as the app starts. The event can fire before
 * any component using usePWAInstall is mounted, so listening only inside the hook misses it.
 */
export function listenForInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installed = true;
    notify();
  });
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function usePWAInstall(): UsePWAInstall {
  const [canInstall, setCanInstall] = useState(() => !!deferredPrompt);
  const [isInstalled, setIsInstalled] = useState(() => installed || isStandalone());

  // Detect iOS (Safari has no install prompt; the app shows manual "Add to Home Screen" steps)
  const isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window.navigator as Navigator & { standalone?: boolean }).standalone;

  useEffect(() => {
    const sync = () => {
      setCanInstall(!!deferredPrompt);
      setIsInstalled(installed || isStandalone());
    };
    subscribers.add(sync);
    return () => {
      subscribers.delete(sync);
    };
  }, []);

  const install = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt = null;
      installed = true;
      notify();
    }
    return outcome;
  };

  return { canInstall, isInstalled, isIOS, install };
}
