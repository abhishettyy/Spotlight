import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/db';
import { signToken, requireAuth } from '../middlewares/auth';
import { claimRegistrationKey, KeyAlreadyUsed } from '../utils/registrationKeys';

const router = Router();
const SALT_ROUNDS = 10;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '614014299614-n10khe2om4g50ehpqb6h82tdtumkh5ot.apps.googleusercontent.com';
const googleOAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

interface GoogleUser {
  email: string;
  sub: string | null;
  name?: string;
  picture?: string;
}

/**
 * Checks a Google ID token or access token was issued to Spotlight's own client and belongs to a
 * verified email. Returns that account, or null. A token issued to any other app is rejected.
 */
async function verifyGoogleUser(credential?: string, accessToken?: string): Promise<GoogleUser | null> {
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

function isBcryptHash(value: string): boolean {
  return value.startsWith('$2b$') || value.startsWith('$2a$');
}

function getPreferredName(existingName: string | null | undefined, incomingName: string | null | undefined): string {
  const isPlaceholder = (n: string) => 
    !n || 
    n.toLowerCase() === 'spotlight user' || 
    n.toLowerCase() === 'club admin' || 
    n.includes('@');

  if (existingName && !isPlaceholder(existingName)) {
    return existingName;
  }
  if (incomingName && !isPlaceholder(incomingName)) {
    return incomingName;
  }
  return existingName || incomingName || 'Spotlight User';
}

async function checkPassword(
  plain: string,
  stored: string,
  upgradeId: string
): Promise<boolean> {
  if (isBcryptHash(stored)) {
    return bcrypt.compare(plain, stored);
  }

  const match = plain === stored;
  if (match) {

    const hashed = await bcrypt.hash(plain, SALT_ROUNDS);
    await prisma.profile.update({ where: { id: upgradeId }, data: { password: hashed } });
  }
  return match;
}

router.post('/signup', async (req: Request, res: Response): Promise<any> => {
  const { email, password, name, usn, branch, phone, year, sem } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, Password, and Name are required.' });
  }

  try {
    const existing = await prisma.profile.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const existingClub = await prisma.club.findUnique({ where: { email: email.toLowerCase() } });
    if (existingClub) {
      return res.status(400).json({ error: 'This email is registered to a club account.' });
    }

    if (usn) {
      const existingUsn = await prisma.profile.findUnique({ where: { usn: usn.trim() } });
      if (existingUsn) {
        return res.status(400).json({ error: 'An account with this USN already exists.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = `user_${crypto.randomBytes(6).toString('hex')}`;

    const profile = await prisma.profile.create({
      data: {
        id: userId,
        email: email.toLowerCase(),
        password: hashedPassword,
        fullName: name,
        usn: usn || null,
        branch: branch || null,
        phone: phone || null,
        year: year ? parseInt(year, 10) : null,
        sem: sem ? parseInt(sem, 10) : null,
      }
    });

    const token = signToken(userId);
    console.log(`New user signed up: ${profile.email}`);

    const { password: _pw, ...safeProfile } = profile as any;
    safeProfile.hasPassword = !!profile.password;
    return res.status(201).json({ message: 'Account created successfully', profile: safeProfile, token });
  } catch (error: any) {
    console.error('Signup Error:', error);
    return res.status(500).json({ error: 'Failed to create account: ' + error.message });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and Password are required.' });
  }

  try {
    let profile = await prisma.profile.findFirst({
      where: {
        email: email.toLowerCase(),
        clubId: null
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'No student account found with this email. Please sign up first.' });
    }

    if (!profile.password) {
      return res.status(401).json({ error: 'This account uses Google sign-in. Please use the Google button.' });
    }

    const match = await checkPassword(password, profile.password, profile.id);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const token = signToken(profile.id);
    console.log(`User logged in: ${profile.email}`);

    const { password: _pw, ...safeProfile } = profile as any;
    safeProfile.hasPassword = !!profile.password;
    return res.status(200).json({ message: 'Logged in successfully', profile: safeProfile, token });
  } catch (error: any) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Login failed: ' + error.message });
  }
});

router.post('/club-login', async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and Password are required.' });
  }

  try {
    const cleanEmail = email.toLowerCase().trim();
    const club = await prisma.club.findUnique({ where: { email: cleanEmail } });
    if (!club) {
      const existingProfile = await prisma.profile.findFirst({ where: { email: cleanEmail } });
      if (!existingProfile) {
        return res.status(404).json({ error: 'No account exists with this email address.' });
      } else {
        return res.status(404).json({ error: 'No club exists with this email address. Please register your club first.' });
      }
    }

    if (!club.password) {
      return res.status(400).json({ error: 'This club account uses social sign-in. Please use the Google button.' });
    }

    const isMatch = await bcrypt.compare(password, club.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please check your password and try again.' });
    }

    let profile = await prisma.profile.findFirst({ where: { clubId: club.id } });
    if (!profile) {
      const userId = `user_${crypto.randomBytes(6).toString('hex')}`;
      profile = await prisma.profile.create({
        data: {
          id: userId,
          email: email.toLowerCase(),
          password: club.password,
          fullName: `${club.name} Admin`,
          clubId: club.id,
        }
      });
      console.log(`Auto-created profile ${profile.email} during direct club login`);
    }

    const token = signToken(profile.id);
    const { password: _pw, ...safeProfile } = profile as any;
    safeProfile.hasPassword = !!profile.password;
    return res.status(200).json({ message: 'Logged in successfully', profile: safeProfile, token });
  } catch (error: any) {
    console.error('Club Login Error:', error);
    return res.status(500).json({ error: 'Login failed: ' + error.message });
  }
});

router.post('/google', async (req: Request, res: Response): Promise<any> => {
  const { credential, access_token, registrationKey, clubName } = req.body;

  if (!credential && !access_token) {
    return res.status(400).json({ error: 'Google credential or access token is required.' });
  }

  try {
    const payload = await verifyGoogleUser(credential, access_token);
    if (!payload) {
      return res.status(401).json({ error: 'Google sign-in could not be verified. Please try again.' });
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name || clubName || 'Spotlight User';
    const googleUserId = `google_${payload.sub || crypto.createHash('md5').update(email).digest('hex')}`;

    let club = await prisma.club.findUnique({ where: { email } });
    let profile = await prisma.profile.findFirst({ where: { email } });

    if (!club && registrationKey) {
      const cleanKey = registrationKey.trim().toUpperCase();
      const keyRecord = await prisma.registrationKey.findFirst({
        where: { code: cleanKey, isUsed: false },
      });

      if (!keyRecord) {
        return res.status(400).json({ error: 'Invalid or expired registration key.' });
      }

      // A new club needs an email no account uses yet, as with email sign-up (/clubs/check-email)
      if (profile) {
        return res.status(400).json({ error: 'This email address is already registered to another account.' });
      }

      club = await prisma.$transaction(async (tx) => {
        await claimRegistrationKey(tx, keyRecord.id);

        const createdClub = await tx.club.create({
          data: {
            name: clubName?.trim() || name,
            email: email,
            logoUrl: payload.picture || null,
          }
        });

        const createdProfile = await tx.profile.upsert({
          where: { id: googleUserId },
          update: {
            fullName: name,
            email: email,
            clubId: createdClub.id,
          },
          create: {
            id: googleUserId,
            fullName: name,
            email: email,
            clubId: createdClub.id,
          }
        });

        await tx.registrationKey.update({
          where: { id: keyRecord.id },
          data: { usedByClubId: createdClub.id },
        });

        profile = createdProfile;
        return createdClub;
      });
    }

    if (!club) {
      return res.status(404).json({ error: 'No club exists with this email address. Please register your club first.' });
    }

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          id: googleUserId,
          fullName: name,
          email: email,
          clubId: club.id,
        }
      });
    } else if (profile.clubId !== club.id) {
      profile = await prisma.profile.update({
        where: { id: profile.id },
        data: { clubId: club.id }
      });
    }

    const token = signToken(profile.id);
    const { password: _pw, ...safeProfile } = profile as any;
    safeProfile.hasPassword = !!profile.password;
    return res.status(200).json({
      message: 'Google login successful',
      profile: safeProfile,
      club,
      token
    });
  } catch (error: any) {
    if (error instanceof KeyAlreadyUsed) {
      return res.status(400).json({ error: 'This registration key has just been used. Please ask Spotlight admins for a new one.' });
    }
    console.error('Google Auth Error:', error);
    return res.status(500).json({ error: 'Google authentication failed: ' + error.message });
  }
});

// Student sign-in with Google. Signs in existing student accounts only; new students sign up with email and password.
router.post('/google-student', async (req: Request, res: Response): Promise<any> => {
  const { credential, access_token } = req.body;

  if (!credential && !access_token) {
    return res.status(400).json({ error: 'Google credential or access token is required.' });
  }

  try {
    const googleUser = await verifyGoogleUser(credential, access_token);
    if (!googleUser) {
      return res.status(401).json({ error: 'Google sign-in could not be verified. Please try again.' });
    }

    const cleanEmail = googleUser.email.toLowerCase().trim();
    const profile = await prisma.profile.findFirst({ where: { email: cleanEmail, clubId: null } });

    if (!profile) {
      const club = await prisma.club.findUnique({ where: { email: cleanEmail } });
      if (club) {
        return res.status(400).json({ error: 'This email is registered to a club account. Please use the club login.' });
      }
      return res.status(404).json({ error: 'No student account found with this Google email. Please sign up first.' });
    }

    const token = signToken(profile.id);
    console.log(`Student logged in with Google: ${profile.email}`);

    const { password: _pw, ...safeProfile } = profile as any;
    safeProfile.hasPassword = !!profile.password;
    return res.status(200).json({ message: 'Logged in successfully', profile: safeProfile, token });
  } catch (error: any) {
    console.error('Student Google Auth Error:', error);
    return res.status(500).json({ error: 'Google sign-in failed: ' + error.message });
  }
});

router.post('/verify-password', requireAuth, async (req: Request, res: Response): Promise<any> => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ error: 'userId and password are required.' });
  }

  if (req.auth!.userId !== userId) {
    return res.status(403).json({ error: 'Forbidden: You cannot verify password for another user.' });
  }

  try {
    const profile = await prisma.profile.findUnique({ where: { id: userId } });

    if (!profile) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!profile.password) {

      return res.status(200).json({ valid: true });
    }

    const match = await checkPassword(password, profile.password, userId);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    return res.status(200).json({ valid: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/change-password', requireAuth, async (req: Request, res: Response): Promise<any> => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old password and new password are required.' });
  }

  try {
    const userId = req.auth!.userId;
    const profile = await prisma.profile.findUnique({ where: { id: userId } });

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    let targetPasswordHash: string | null = null;
    let club = null;

    if (profile.clubId) {
      club = await prisma.club.findUnique({ where: { id: profile.clubId } });
      if (!club) {
        return res.status(404).json({ error: 'Club associated with this profile not found.' });
      }
      targetPasswordHash = club.password;
    } else {
      targetPasswordHash = profile.password;
    }

    if (!targetPasswordHash) {
      return res.status(400).json({ error: 'No password is set for this account.' });
    }

    let match = false;
    if (profile.clubId && club) {
      match = await bcrypt.compare(oldPassword, targetPasswordHash);
    } else {
      match = await checkPassword(oldPassword, targetPasswordHash, userId);
    }

    if (!match) {
      return res.status(401).json({ error: 'Incorrect old password.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.profile.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    if (profile.clubId) {
      await prisma.club.update({
        where: { id: profile.clubId },
        data: { password: hashedPassword }
      });
      console.log(`Updated password for club: ${profile.clubId}`);
    }

    return res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error: any) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Returns the signed-in user's own profile, replacing a placeholder name if a better one is sent.
// The posted email is never used to find a profile: merging by email let any signed-in user
// take over another account (password, club, registrations).
router.post('/sync', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth!.userId;
    const { name } = req.body;

    let profile = await prisma.profile.findUnique({ where: { id: userId } });
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const preferredName = getPreferredName(profile.fullName, name);
    if (preferredName !== profile.fullName) {
      profile = await prisma.profile.update({ where: { id: userId }, data: { fullName: preferredName } });
    }

    const { password: _pw, ...safeProfile } = profile as any;
    safeProfile.hasPassword = !!profile.password;
    return res.status(200).json({ message: 'Profile synced', profile: safeProfile });
  } catch (error: any) {
    console.error('Profile Sync Error:', error);
    return res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
});

export default router;
