const SITE_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export const STUDENT_BASE = `${SITE_BASE}/student`;

export function studentUrl(path: string): string {
  return `${STUDENT_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export const LANDING_URL = `${SITE_BASE}/`;

export const CLUB_LOGIN_URL = `${SITE_BASE}/?view=auth&authTab=login`;
