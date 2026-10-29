// The club site and the admin console are one app (see mountDashboard.tsx), so moving between them
// is a history change, not a page load: instant, and the browser's Back button returns without a reload.
const SITE_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const ADMIN_URL = `${SITE_BASE}/admin`;

export function isAdminPath(): boolean {
  const path = window.location.pathname.slice(SITE_BASE.length) || "/";
  return /^\/admin(\/|$)/.test(path);
}

/** Shows the admin console, adding it to history so Back returns to the landing page. */
export function openAdminConsole() {
  window.history.pushState(null, "", ADMIN_URL);
  window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
  window.scrollTo(0, 0);
}
