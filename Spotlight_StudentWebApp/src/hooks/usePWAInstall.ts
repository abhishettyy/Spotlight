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

export function usePWAInstall(): UsePWAInstall {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Detect iOS
  const isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window.navigator as Navigator & { standalone?: boolean }).standalone;

  useEffect(() => {
    // Already installed (running in standalone mode)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (standalone) {
      setIsInstalled(true);
      return;
    }

    // Use globally cached prompt if already captured
    if (deferredPrompt) {
      setCanInstall(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      deferredPrompt = null;
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt = null;
      setCanInstall(false);
      setIsInstalled(true);
    }
    return outcome;
  };

  return { canInstall, isInstalled, isIOS, install };
}
