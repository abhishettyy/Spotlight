import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Stores
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { useEventsStore } from '@/store/eventsStore';
import { useClubsStore } from '@/store/clubsStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import { getProfile } from '@/api/profiles';
import { isProfileIncomplete } from '@/types/user';

// Route guards
import ProtectedRoute from '@/routes/ProtectedRoute';
import PublicRoute from '@/routes/PublicRoute';

// Layout
import AppShell from '@/components/layout/AppShell';

// Pages
import AuthPage from '@/pages/AuthPage';
import OnboardingPage from '@/pages/OnboardingPage';
import HomePage from '@/pages/HomePage';
import AllEventsPage from '@/pages/AllEventsPage';
import EventDetailPage from '@/pages/EventDetailPage';
import RegisterPage from '@/pages/RegisterPage';
import PaymentPage from '@/pages/PaymentPage';
import TicketsPage from '@/pages/TicketsPage';
import TicketDetailPage from '@/pages/TicketDetailPage';
import ClubsPage from '@/pages/ClubsPage';
import ClubEventsPage from '@/pages/ClubEventsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import ProfilePage from '@/pages/ProfilePage';
import AboutPage from '@/pages/AboutPage';
import MyClubsPage from '@/pages/MyClubsPage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { tryAutoLogin, isAuthenticated, userId } = useAuthStore();
  const { setCurrentUser, loadFromCache } = useUserStore();
  const { loadEvents } = useEventsStore();
  const { load: loadClubs } = useClubsStore();
  const { load: loadNotifications } = useNotificationsStore();

  useEffect(() => {
    // Try to restore session from localStorage (equivalent to Flutter's tryAutoLogin)
    const didLogin = tryAutoLogin();
    if (didLogin) {
      loadFromCache();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && userId) {
      // Prefetch profile, events, clubs, notifications (parallel like Flutter providers)
      getProfile(userId).then((user) => {
        if (user) setCurrentUser(user);
      });
      loadEvents();
      loadClubs();
      loadNotifications();
    }
  }, [isAuthenticated, userId]);

  return <>{children}</>;
}

// Like Flutter's AppInitializer: a signed-in user with an incomplete profile goes to onboarding
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const currentUser = useUserStore((s) => s.currentUser);
  if (currentUser && isProfileIncomplete(currentUser)) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInitializer>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />
          <Route path="/login/:tab" element={<PublicRoute><AuthPage /></PublicRoute>} />

          {/* Onboarding — protected but pre-main */}
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

          {/* Privacy policy — always accessible */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />

          {/* Protected app routes */}
          <Route path="/*" element={
            <ProtectedRoute>
              <OnboardingGate>
              <AppShell>
                <Routes>
                  <Route index element={<HomePage />} />
                  <Route path="events" element={<AllEventsPage />} />
                  <Route path="events/:id" element={<EventDetailPage />} />
                  <Route path="events/:id/register" element={<RegisterPage />} />
                  <Route path="events/:id/payment" element={<PaymentPage />} />
                  <Route path="tickets" element={<TicketsPage />} />
                  <Route path="tickets/:id" element={<TicketDetailPage />} />
                  <Route path="clubs" element={<ClubsPage />} />
                  <Route path="clubs/:id" element={<ClubEventsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="my-clubs" element={<MyClubsPage />} />
                  <Route path="about" element={<AboutPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppShell>
              </OnboardingGate>
            </ProtectedRoute>
          } />
        </Routes>

        {/* Toast notifications — equivalent to Flutter's showSpotlightToast */}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-sans)',
              borderRadius: 14,
            },
          }}
        />
      </AppInitializer>
    </BrowserRouter>
  );
}
