import { OAuth2Client } from 'google-auth-library';

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '614014299614-n10khe2om4g50ehpqb6h82tdtumkh5ot.apps.googleusercontent.com';
const googleOAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export interface GoogleUser {
  email: string;
  sub: string | null;
  name?: string;
  picture?: string;
}

/**
 * Checks a Google ID token or access token was issued to Spotlight's own client and belongs to a
 * verified email. Returns that account, or null. A token issued to any other app is rejected.
 */
export async function verifyGoogleUser(credential?: string, accessToken?: string): Promise<GoogleUser | null> {
  if (credential) {
    try {
      const ticket = await googleOAuthClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      if (!payload?.email || !payload.email_verified) return null;
      return { email: payload.email, sub: payload.sub ?? null, name: payload.name || payload.given_name, picture: payload.picture };
    } catch {
      return null;
    }
  }

  if (accessToken) {
    const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
    if (!infoRes.ok) return null;
    const info = await infoRes.json() as any;
    if (info.aud !== GOOGLE_CLIENT_ID && info.azp !== GOOGLE_CLIENT_ID) return null;
    const emailVerified = info.email_verified === true || info.email_verified === 'true';
    if (!info.email || !emailVerified) return null;

    // tokeninfo carries no name or picture; userinfo does
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userInfo = userRes.ok ? await userRes.json() as any : {};
    return { email: info.email, sub: info.sub ?? userInfo.sub ?? null, name: userInfo.name || userInfo.given_name, picture: userInfo.picture };
  }

  return null;
}
