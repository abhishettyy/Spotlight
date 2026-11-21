import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Toaster } from 'sonner';

import { useAuthStore } from '@student/store/authStore';
import { useUserStore } from '@student/store/userStore';
import { useEventsStore } from '@student/store/eventsStore';
import { useClubsStore } from '@student/store/clubsStore';
import { useNotificationsStore } from '@student/store/notificationsStore';
import { getProfile } from '@student/api/profiles';
import { isProfileIncomplete } from '@student/types/user';
import { STUDENT_BASE } from '@student/basePath';

import ProtectedRoute from '@student/routes/ProtectedRoute';
import PublicRoute from '@student/routes/PublicRoute';

import AppShell from '@student/components/layout/AppShell';

import AuthPage from '@student/pages/AuthPage';
import HomePage from '@student/pages/HomePage';

const pageLoaders = {
  OnboardingPage: () => import('@student/pages/OnboardingPage'),
  ForgotPasswordPage: () => import('@student/pages/ForgotPasswordPage'),
  AllEventsPage: () => import('@student/pages/AllEventsPage'),
  EventDetailPage: () => import('@student/pages/EventDetailPage'),
  RegisterPage: () => import('@student/pages/RegisterPage'),
  PaymentPage: () => import('@student/pages/PaymentPage'),
  TicketsPage: () => import('@student/pages/TicketsPage'),
  TicketDetailPage: () => import('@student/pages/TicketDetailPage'),
  ClubsPage: () => import('@student/pages/ClubsPage'),
  ClubEventsPage: () => import('@student/pages/ClubEventsPage'),
  NotificationsPage: () => import('@student/pages/NotificationsPage'),
  ProfilePage: () => import('@student/pages/ProfilePage'),
  AboutPage: () => import('@student/pages/AboutPage'),
  MyClubsPage: () => import('@student/pages/MyClubsPage'),
  PrivacyPolicyPage: () => import('@student/pages/PrivacyPolicyPage'),
};
const OnboardingPage = lazy(pageLoaders.OnboardingPage);
const ForgotPasswordPage = lazy(pageLoaders.ForgotPasswordPage);
const AllEventsPage = lazy(pageLoaders.AllEventsPage);
const EventDetailPage = lazy(pageLoaders.EventDetailPage);
const RegisterPage = lazy(pageLoaders.RegisterPage);
const PaymentPage = lazy(pageLoaders.PaymentPage);
const TicketsPage = lazy(pageLoaders.TicketsPage);
const TicketDetailPage = lazy(pageLoaders.TicketDetailPage);
const ClubsPage = lazy(pageLoaders.ClubsPage);
const ClubEventsPage = lazy(pageLoaders.ClubEventsPage);
const NotificationsPage = lazy(pageLoaders.NotificationsPage);
const ProfilePage = lazy(pageLoaders.ProfilePage);
const AboutPage = lazy(pageLoaders.AboutPage);
const MyClubsPage = lazy(pageLoaders.MyClubsPage);
const PrivacyPolicyPage = lazy(pageLoaders.PrivacyPolicyPage);

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { tryAutoLogin, isAuthenticated, userId } = useAuthStore();
  const { setCurrentUser, loadFromCache } = useUserStore();
  const { loadEvents } = useEventsStore();
  const { load: loadClubs } = useClubsStore();
  const { load: loadNotifications } = useNotificationsStore();

  useEffect(() => {
    const didLogin = tryAutoLogin();
    if (didLogin) {
      loadFromCache();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && userId) {
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

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const currentUser = useUserStore((s) => s.currentUser);
  if (currentUser && isProfileIncomplete(currentUser)) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    const prefetch = () => Object.values(pageLoaders).forEach((load) => load().catch(() => {}));
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(prefetch);
    else setTimeout(prefetch, 1500);
  }, []);

  return (
    <BrowserRouter basename={STUDENT_BASE}>
      <AppInitializer>
        <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />
          <Route path="/login/:tab" element={<PublicRoute><AuthPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

          <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

          <Route path="/privacy" element={<PrivacyPolicyPage />} />

          <Route path="/*" element={
            <ProtectedRoute>
              <OnboardingGate>
              <AppShell>
                <Suspense fallback={null}>
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
                </Suspense>
              </AppShell>
              </OnboardingGate>
            </ProtectedRoute>
          } />
        </Routes>
        </Suspense>

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
