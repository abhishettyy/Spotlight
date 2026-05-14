import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import crypto from 'crypto';
import { ClerkExpressWithAuth, StrictAuthProp } from '@clerk/clerk-sdk-node';

dotenv.config();

// Extend Express Request to include Clerk's auth property
declare global {
  namespace Express {
    interface Request extends StrictAuthProp {}
  }
}

// Initialize Express & Middlewares
const app = express();
app.use(cors());
app.use(express.json());

// Clerk Auth Middleware - verifies incoming requests if a token is present
app.use(ClerkExpressWithAuth() as any);

// Set up the pg connection pool using your connection string
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Instantiate a single PrismaClient with the pg adapter (Required in Prisma 7)
const prisma = new PrismaClient({
  adapter,
  log: ['info', 'warn', 'error'], // Adds console logs for debugging DB connections
});

const PORT = process.env.PORT || 5000;

// Health Check
app.get('/', (req: Request, res: Response): any => {
  return res.status(200).json({ status: 'success', message: 'Spotlight API Server is live!' });
});


app.post('/clubs', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ error: 'Unauthenticated. Please log in.' });
    }

    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    const club = await prisma.clubs.create({
      data: { name, email }
    });
    
    return res.status(201).json({ message: 'Club registered successfully', club });
  } catch (error) {
    console.error('Error in POST /clubs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/events', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ error: 'Unauthenticated. Only admins can create events.' });
    }

    const { club_id, name, description, event_type, fee, registration_limit, registration_deadline, event_date, qr_url } = req.body;
    
    if (!name || !club_id) {
      return res.status(400).json({ error: 'Event name and club_id are required' });
    }

    const event = await prisma.events.create({
      data: {
        club_id,
        name,
        description,
        event_type, 
        fee: fee ? parseInt(fee, 10) : 0,
        registration_limit: registration_limit ? parseInt(registration_limit, 10) : null,
        registration_deadline: registration_deadline ? new Date(registration_deadline) : null,
        event_date: event_date ? new Date(event_date) : null,
        qr_url
      }
    });

    return res.status(201).json({ message: 'Event created successfully', event });
  } catch (error) {
    console.error('Error in POST /events:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/events', async (req: Request, res: Response): Promise<any> => {
  try {
    const now = new Date();
    // Only fetch events that haven't happened yet
    const events = await prisma.events.findMany({
      where: {
        OR: [
          { event_date: { gte: now } },
          { event_date: null } // Include events without strict dates just in case
        ]
      },
      include: { clubs: true }, // Join with clubs table to get organizer info
      orderBy: { event_date: 'asc' }
    });
    
    return res.status(200).json({ status: 'success', events });
  } catch (error) {
    console.error('Error in GET /events:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/register', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ error: 'Unauthenticated. Please log in to register.' });
    }

    const user_id = req.auth.userId;
    const { event_id, payment_proof_url } = req.body;

    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    // 1. Fetch Event Details
    const event = await prisma.events.findUnique({ where: { id: event_id } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // 2. Check if Registration Deadline has passed
    if (event.registration_deadline && new Date() > event.registration_deadline) {
      return res.status(403).json({ error: 'Registration deadline has already passed.' });
    }

    // 3. Check if Registration Limit is reached
    if (event.registration_limit && event.registration_limit > 0) {
      const currentRegistrations = await prisma.registrations.count({ where: { event_id } });
      if (currentRegistrations >= event.registration_limit) {
        return res.status(403).json({ error: 'Registration limit reached. The event is full.' });
      }
    }

    // Prevent double registration
    const existingRegistration = await prisma.registrations.findFirst({
      where: { event_id, user_id }
    });
    if (existingRegistration) {
      return res.status(400).json({ error: 'You are already registered for this event.' });
    }

    // 4. Payment Bypass & Status Logic
    let status = 'pending';
    if (!event.fee || event.fee === 0) {
      // Free events get auto-confirmed
      status = 'confirmed';
    } else {
      // Paid events require proof and manual confirmation
      if (!payment_proof_url) {
        return res.status(400).json({ error: 'payment_proof_url is required for paid events.' });
      }
    }

    // 5. Create the Registration
    const registration = await prisma.registrations.create({
      data: {
        event_id,
        user_id,
        payment_proof_url,
        status
      }
    });

    return res.status(201).json({ message: 'Registration successful', registration });
  } catch (error) {
    console.error('Error in POST /register:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/* =========================================
   MODERATED PASSKEY SYSTEM (TEAMS)
========================================= */

// Generate a random 5-character uppercase alphanumeric string
const generatePasskey = () => crypto.randomBytes(3).toString('hex').slice(0, 5).toUpperCase();

// POST /teams/create
app.post('/teams/create', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ error: 'Unauthenticated.' });
    }

    const leader_id = req.auth.userId;
    const { event_id, team_name } = req.body;

    if (!event_id || !team_name) {
      return res.status(400).json({ error: 'event_id and team_name are required' });
    }

    const passkey = generatePasskey();

    const team = await prisma.teams.create({
      data: {
        event_id,
        leader_id,
        team_name,
        passkey
      }
    });

    return res.status(201).json({ message: 'Team created successfully. Share the passkey with members.', team });
  } catch (error) {
    console.error('Error in POST /teams/create:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /teams/join
app.post('/teams/join', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ error: 'Unauthenticated.' });
    }

    const user_id = req.auth.userId;
    const { passkey } = req.body;

    if (!passkey) {
      return res.status(400).json({ error: 'passkey is required' });
    }

    // Validate Passkey
    const team = await prisma.teams.findUnique({ where: { passkey } });
    if (!team) {
      return res.status(404).json({ error: 'Invalid passkey. Team not found.' });
    }

    // Link user to the team via registration
    const registration = await prisma.registrations.create({
      data: {
        event_id: team.event_id,
        user_id,
        team_id: team.id,
        status: 'pending' // Admin or payment logic resolves this later
      }
    });

    return res.status(201).json({ message: 'Successfully joined the team', registration });
  } catch (error) {
    console.error('Error in POST /teams/join:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/* =========================================
   WEB DASHBOARD ACTIONS
========================================= */

// PATCH /registrations/:id - Admin flips status to unlock Digital Ticket
app.patch('/registrations/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ error: 'Unauthenticated. Only admins can update status.' });
    }

    const id = req.params.id as string;
    const { status } = req.body; // e.g., 'confirmed'

    if (!status) {
      return res.status(400).json({ error: 'Status update payload is required' });
    }

    const registration = await prisma.registrations.update({
      where: { id },
      data: { status }
    });

    return res.status(200).json({ message: 'Registration status updated successfully', registration });
  } catch (error) {
    console.error('Error in PATCH /registrations/:id:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Spotlight API Server is running on port ${PORT}`);
  console.log('🔗 Database connection initialized via Prisma.');
  console.log('🔐 Clerk Authentication Middleware is active.');
});
