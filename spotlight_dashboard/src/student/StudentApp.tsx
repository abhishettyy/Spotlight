import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Toaster } from 'sonner';

// Stores
import { useAuthStore } from '@student/store/authStore';
import { useUserStore } from '@student/store/userStore';
import { useEventsStore } from '@student/store/eventsStore';
import { useClubsStore } from '@student/store/clubsStore';
import { useNotificationsStore } from '@student/store/notificationsStore';
import { getProfile } from '@student/api/profiles';
import { isProfileIncomplete } from '@student/types/user';
import { STUDENT_BASE } from '@student/basePath';

// Route guards
import ProtectedRoute from '@student/routes/ProtectedRoute';
import PublicRoute from '@student/routes/PublicRoute';

// Layout
import AppShell from '@student/components/layout/AppShell';

// Pages
import AuthPage from '@student/pages/AuthPage';
import OnboardingPage from '@student/pages/OnboardingPage';
import HomePage from '@student/pages/HomePage';
import AllEventsPage from '@student/pages/AllEventsPage';
import EventDetailPage from '@student/pages/EventDetailPage';
import RegisterPage from '@student/pages/RegisterPage';
import PaymentPage from '@student/pages/PaymentPage';
import TicketsPage from '@student/pages/TicketsPage';
import TicketDetailPage from '@student/pages/TicketDetailPage';
import ClubsPage from '@student/pages/ClubsPage';
import ClubEventsPage from '@student/pages/ClubEventsPage';
import NotificationsPage from '@student/pages/NotificationsPage';
import ProfilePage from '@student/pages/ProfilePage';
import AboutPage from '@student/pages/AboutPage';
import MyClubsPage from '@student/pages/MyClubsPage';
import PrivacyPolicyPage from '@student/pages/PrivacyPolicyPage';

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
    <BrowserRouter basename={STUDENT_BASE}>
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
