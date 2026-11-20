import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { normalizeBranch, INVALID_BRANCH_MESSAGE } from '../utils/branches';
import { signToken, requireAuth } from '../middlewares/auth';
import { verifyGoogleUser } from '../utils/google';
import { ADMIN_PROFILE_ID } from '../utils/admin';
import { clubSignInBlock } from '../utils/clubStatus';
import { submitClubApplication, readApplicationDetails, ClubApplicationError } from '../utils/clubApplications';

const router = Router();
const SALT_ROUNDS = 10;

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

    // Branch must be one of the college's branches (the apps show it as a dropdown)
    const cleanBranch = branch ? normalizeBranch(branch) : null;
    if (branch && !cleanBranch) {
      return res.status(400).json({ error: INVALID_BRANCH_MESSAGE });
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
        branch: cleanBranch,
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
        clubId: null,
        NOT: { id: ADMIN_PROFILE_ID },
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

    const blocked = clubSignInBlock(club);
    if (blocked) return res.status(403).json(blocked);

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

// Club sign-in with Google, and Google sign-up: with `signup` details and an email no club uses yet
// (or whose sign-up was rejected), it files a pending registration for the admin to review.
router.post('/google', async (req: Request, res: Response): Promise<any> => {
  const { credential, access_token, signup } = req.body;

  if (!credential && !access_token) {
    return res.status(400).json({ error: 'Google credential or access token is required.' });
  }

  try {
    const payload = await verifyGoogleUser(credential, access_token);
    if (!payload) {
      return res.status(401).json({ error: 'Google sign-in could not be verified. Please try again.' });
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name || 'Spotlight User';
    const googleUserId = `google_${payload.sub || crypto.createHash('md5').update(email).digest('hex')}`;

    let club = await prisma.club.findUnique({ where: { email } });

    // Sign-up always goes through the application checks, so an email that already belongs to a
    // pending or approved club, or to a student, gets a clear message instead of a sign-in
    if (signup) {
      const details = readApplicationDetails(signup);
      if (!details.logoUrl && payload.picture) details.logoUrl = payload.picture;
      const created = await submitClubApplication({ email, passwordHash: null, details, profileId: googleUserId });
      console.log(`Club registration submitted with Google: "${created.name}" (${created.id})`);
      return res.status(202).json({ pending: true, message: 'Registration submitted. You can sign in once an admin approves your club.' });
    }

    if (!club) {
      return res.status(404).json({ error: 'No club exists with this email address. Please register your club first.' });
    }

    const blocked = clubSignInBlock(club);
    if (blocked) return res.status(403).json(blocked);

    let profile = await prisma.profile.findFirst({ where: { email } });
    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          id: googleUserId,
          fullName: name,
          email: email,
          clubId: club.id,
        }
      });
    } else if (profile.id === ADMIN_PROFILE_ID) {
      return res.status(403).json({ error: 'This account cannot sign in here.' });
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
    if (error instanceof ClubApplicationError) {
      return res.status(400).json({ error: error.message });
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
    const profile = await prisma.profile.findFirst({ where: { email: cleanEmail, clubId: null, NOT: { id: ADMIN_PROFILE_ID } } });

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
