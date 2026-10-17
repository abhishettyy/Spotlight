// The student app is served under /student of the dashboard site (respecting VITE_BASE_PATH).
const SITE_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export const STUDENT_BASE = `${SITE_BASE}/student`;

/** Absolute URL of a student route, for places that leave the router (full reloads, share links). */
export function studentUrl(path: string): string {
  return `${STUDENT_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

/** The site's landing page (Login as Student / Club / Admin). */
export const LANDING_URL = `${SITE_BASE}/`;

/** The club sign-in page of the dashboard. */
export const CLUB_LOGIN_URL = `${SITE_BASE}/?view=auth&authTab=login`;
