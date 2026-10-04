import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar, BottomNav } from './Navigation';

interface AppShellProps {
  children: ReactNode;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isDesktop;
}

// Main app shell — responsive layout equivalent to Flutter's MainLayout
// Desktop: Fixed sidebar (220px) + scrollable main content
// Mobile:  No sidebar + fixed bottom navigation
export default function AppShell({ children }: AppShellProps) {
  const isDesktop = useIsDesktop();
  const location = useLocation();

  // Hide mobile bottom navigation on detail screens that have their own action bars
  const isDetailScreen =
    /^\/events\/[^/]+/.test(location.pathname) ||
    /^\/tickets\/[^/]+/.test(location.pathname);

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {isDesktop && <Sidebar />}

      <main
        style={{
          marginLeft: isDesktop ? 220 : 0,
          minHeight: '100dvh',
          paddingBottom: isDesktop ? 0 : (isDetailScreen ? 0 : 100),
        }}
      >
        {children}
      </main>

      {!isDesktop && !isDetailScreen && <BottomNav />}
    </div>
  );
}
