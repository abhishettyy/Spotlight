import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { signToken, requireAuth } from '../middlewares/auth';

const router = Router();
const SALT_ROUNDS = 10;

/** Returns true if the string looks like a bcrypt hash. */
function isBcryptHash(value: string): boolean {
  return value.startsWith('$2b$') || value.startsWith('$2a$');
}

/**
 * Filter out emails or generic placeholders ('Spotlight User', 'Club Admin') 
 * to ensure that real user names are preferred and preserved.
 */
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

/**
 * Compares a plaintext password against a stored value.
 * Handles both bcrypt hashes and legacy plaintext passwords.
 * If a legacy plaintext match is found, upgrades the stored value to bcrypt.
 */
async function checkPassword(
  plain: string,
  stored: string,
  upgradeId: string
): Promise<boolean> {
  if (isBcryptHash(stored)) {
    return bcrypt.compare(plain, stored);
  }
  // Legacy plaintext comparison
  const match = plain === stored;
  if (match) {
    // Silently upgrade to bcrypt
    const hashed = await bcrypt.hash(plain, SALT_ROUNDS);
    await prisma.profile.update({ where: { id: upgradeId }, data: { password: hashed } });
  }
  return match;
}

// ── Auth Signup ──────────────────────────────────────────────────────────────
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

// ── Auth Login ───────────────────────────────────────────────────────────────
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

// ── Club Login (Dashboard Direct) ───────────────────────────────────────────
router.post('/club-login', async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and Password are required.' });
  }

  try {
    const club = await prisma.club.findUnique({ where: { email: email.toLowerCase() } });
    if (!club) {
      return res.status(404).json({ error: 'Club account with this email does not exist.' });
    }

    if (!club.password) {
      return res.status(400).json({ error: 'This club account uses social sign-in. Please use the Google button.' });
    }

    const isMatch = await bcrypt.compare(password, club.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    // Find or auto-create a profile linked to this club
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

// ── Verify Password ──────────────────────────────────────────────────────────
router.post('/verify-password', requireAuth, async (req: Request, res: Response): Promise<any> => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ error: 'userId and password are required.' });
  }

  // Permissions validation: verify requesting user owns this request
  if (req.auth!.userId !== userId) {
    return res.status(403).json({ error: 'Forbidden: You cannot verify password for another user.' });
  }

  try {
    const profile = await prisma.profile.findUnique({ where: { id: userId } });

    if (!profile) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!profile.password) {
      // Social login — no password set, allow through
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

// ── Change Password ──────────────────────────────────────────────────────────
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

// ── Social Sync ──────────────────────────────────────────────────────────────
router.post('/sync', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const clerkUserId = req.auth!.userId;
    const { email, name, usn, branch, phone } = req.body;


    if (!email) {
      return res.status(400).json({ error: 'Email is required to sync profile.' });
    }

    // Gracefully handle case where a profile with this email already exists under a different Clerk ID
    let profile = await prisma.profile.findUnique({ where: { email: email.toLowerCase() } });
    if (profile) {
      if (profile.id !== clerkUserId) {
        console.log(`[Sync] Profile with email ${email} already exists under different ID: ${profile.id}. Merging to new Clerk ID: ${clerkUserId}`);
        
        // Fetch target profile by the incoming clerkUserId to merge existing fields (e.g. clubId)
        const targetProfile = await prisma.profile.findUnique({ where: { id: clerkUserId } });
        
        const existingClubId = targetProfile?.clubId || profile.clubId;
        const finalUsn = usn || targetProfile?.usn || profile.usn;
        const finalBranch = branch || targetProfile?.branch || profile.branch;
        const finalPhone = phone || targetProfile?.phone || profile.phone;
        const year = targetProfile?.year || profile.year;
        const sem = targetProfile?.sem || profile.sem;
        const passwordVal = targetProfile?.password || profile.password;

        // Atomic migration: transfer all references to the new Clerk ID before deleting the old profile record
        profile = await prisma.$transaction(async (tx) => {
          // 1. Clear unique constraints on the old profile record to avoid unique violations during upsert
          await tx.profile.update({
            where: { id: profile!.id },
            data: {
              email: `${profile!.id}@temp.local`,
              usn: null,
            }
          });

          // 2. Create/upsert the new profile record with the merged data
          const newProfile = await tx.profile.upsert({
            where: { id: clerkUserId },
            update: {
              fullName: getPreferredName(targetProfile?.fullName || profile!.fullName, name),
              email: email.toLowerCase(),
              clubId: existingClubId,
              usn: finalUsn,
              branch: finalBranch,
              phone: finalPhone,
              year,
              sem,
              password: passwordVal,
            },
            create: {
              id: clerkUserId,
              fullName: getPreferredName(targetProfile?.fullName || profile!.fullName, name),
              email: email.toLowerCase(),
              clubId: existingClubId,
              usn: finalUsn,
              branch: finalBranch,
              phone: finalPhone,
              year,
              sem,
              password: passwordVal,
            }
          });

          // 3. Transfer registrations
          await tx.registration.updateMany({
            where: { userId: profile!.id },
            data: { userId: clerkUserId }
          });

          // 4. Transfer notifications
          await tx.notification.updateMany({
            where: { userId: profile!.id },
            data: { userId: clerkUserId }
          });

          // 5. Transfer teams led by this user
          await tx.team.updateMany({
            where: { leaderId: profile!.id },
            data: { leaderId: clerkUserId }
          });

          // 6. Safely delete the old profile row (it has no active relations remaining)
          await tx.profile.delete({ where: { id: profile!.id } });

          return newProfile;
        });
      } else {
        // Just update the name
        profile = await prisma.profile.update({
          where: { id: clerkUserId },
          data: { fullName: getPreferredName(profile.fullName, name) },
        });
      }
    } else {
      // Upsert by ID if no email conflict exists
      const existingProfileById = await prisma.profile.findUnique({ where: { id: clerkUserId } });
      profile = await prisma.profile.upsert({
        where: { id: clerkUserId },
        update: { 
          fullName: getPreferredName(existingProfileById?.fullName, name), 
          email: email || undefined 
        },
        create: { 
          id: clerkUserId, 
          fullName: getPreferredName(null, name), 
          email: email || '' 
        },
      });
    }

    // Check if a club is already registered with this administrator's email!
    if (!profile.clubId) {
      const existingClub = await prisma.club.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingClub) {
        // Automatically link their profile to the existing club!
        profile = await prisma.profile.update({
          where: { id: clerkUserId },
          data: { clubId: existingClub.id },
        });
        console.log(`Auto-linked user ${profile.email} to existing club ID: ${existingClub.id}`);
      }
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
