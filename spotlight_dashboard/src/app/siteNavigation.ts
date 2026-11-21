const SITE_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const ADMIN_URL = `${SITE_BASE}/admin`;

export function isAdminPath(): boolean {
  const path = window.location.pathname.slice(SITE_BASE.length) || "/";
  return /^\/admin(\/|$)/.test(path);
}

export function openAdminConsole() {
  window.history.pushState(null, "", ADMIN_URL);
  window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
  window.scrollTo(0, 0);
}
