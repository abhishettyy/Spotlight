import { useAuthStore } from '@student/store/authStore';
import { useUserStore } from '@student/store/userStore';
import { useSavedEventsStore } from '@student/store/savedEventsStore';
import { useNotificationsStore } from '@student/store/notificationsStore';
import { LANDING_URL } from '@student/basePath';

/** Ends the student session, clears per-user data and returns to the site's landing page. */
export function useSignOut() {
  const logout = useAuthStore((s) => s.logout);
  const clearUser = useUserStore((s) => s.clearUser);
  const clearSaved = useSavedEventsStore((s) => s.clear);

  return () => {
    logout();
    clearSaved();
    clearUser();
    useNotificationsStore.setState({ notifications: [], unreadCount: 0, error: null });
    // The landing page belongs to the dashboard app, outside the student router
    window.location.replace(LANDING_URL);
  };
}
