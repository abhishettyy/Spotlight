import http from 'http';
import app from '../index';
import { prisma } from '../config/db';

const TEST_PORT = 5999;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let server: http.Server;

// Utility for making HTTP requests in tests
async function apiRequest(
  method: string,
  path: string,
  body?: any,
  token?: string,
  extraHeaders: Record<string, string> = {}
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedCount++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function runE2ETests() {
  console.log('🚀 Starting Spotlight Backend E2E Test Suite on port', TEST_PORT);

  // 1. Start test server
  server = app.listen(TEST_PORT);
  await new Promise((resolve) => setTimeout(resolve, 500));

  const testSuffix = Math.floor(Math.random() * 100000);
  const leaderEmail = `e2e_leader_${testSuffix}@spotlight.test`;
  const teammateEmail = `e2e_member_${testSuffix}@spotlight.test`;
  const clubEmail = `e2e_club_${testSuffix}@spotlight.test`;
  const testPassword = 'TestPassword123!';

  let leaderToken = '';
  let leaderUserId = '';
  let teammateToken = '';
  let teammateUserId = '';
  let clubId = '';
  let clubToken = '';
  let regKey = '';
  let soloEventId = '';
  let teamEventId = '';
  let teamPasskey = '';
  let teamId = '';
  let leaderRegistrationId = '';
  let teammateRegistrationId = '';

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: System Health & Public Stats
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 1: System Health & Public Stats ---');
    {
      const res = await apiRequest('GET', '/');
      assert(res.status === 200, 'GET / returned 200 OK');
      assert(res.data.status === 'success', 'GET / returns success status');
    }
    {
      const res = await apiRequest('GET', '/api/public/stats');
      assert(res.status === 200, 'GET /api/public/stats returned 200 OK');
      assert(typeof res.data.liveEvents === 'number', 'Public stats contains liveEvents count');
      assert(typeof res.data.registrations === 'number', 'Public stats contains registrations count');
      assert(typeof res.data.clubs === 'number', 'Public stats contains clubs count');
    }

    // -------------------------------------------------------------------------
    // SUITE 2: Admin & Registration Key Management
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 2: Admin & Registration Key Management ---');
    {
      const adminSecret = process.env.ADMIN_SECRET || 'spotlightDev@sam2005';
      const res = await apiRequest('POST', '/api/clubs/verify-admin-secret', { secret: adminSecret });
      assert(res.status === 200, 'Verify admin secret returned 200 OK');
      assert(res.data.valid === true, 'Admin secret is verified as valid');
    }
    {
      const adminSecret = process.env.ADMIN_SECRET || 'spotlightDev@sam2005';
      const res = await apiRequest('GET', '/api/clubs/registration-keys', undefined, undefined, {
        'x-admin-secret': adminSecret,
      });
      assert(res.status === 200, 'GET /api/clubs/registration-keys returned 200 OK');
      assert(Array.isArray(res.data.keys), 'Returned keys is an array');
    }
    {
      const adminSecret = process.env.ADMIN_SECRET || 'spotlightDev@sam2005';
      const res = await apiRequest('POST', '/api/clubs/registration-keys/generate', {}, undefined, {
        'x-admin-secret': adminSecret,
      });
      assert(res.status === 201, 'Generate registration key returned 201 Created');
      assert(res.data.key && typeof res.data.key.code === 'string', 'Generated key code exists');
      regKey = res.data.key.code;
    }
    {
      const res = await apiRequest('POST', '/api/clubs/verify-key', { key: regKey });
      assert(res.status === 200, 'Verify registration key returned 200 OK');
      assert(res.data.valid === true, 'Registration key is verified as valid');
    }

    // -------------------------------------------------------------------------
    // SUITE 3: Student Authentication & Profile Sync
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 3: Student Authentication & Profile Sync ---');
    {
      const res = await apiRequest('POST', '/api/auth/signup', {
        email: leaderEmail,
        password: testPassword,
        name: 'E2E Leader Student',
        usn: `1SP23CS${testSuffix}1`,
        branch: 'CSE',
        phone: '9876543210',
        year: '3',
        sem: '5',
      });
      assert(res.status === 201, 'Signup Student 1 (Leader) returned 201 Created');
      assert(!!res.data.token, 'Signup returned JWT token');
      assert(res.data.profile.fullName === 'E2E Leader Student', 'Signup profile name matches');
      leaderToken = res.data.token;
      leaderUserId = res.data.profile.id;
    }
    {
      const res = await apiRequest('POST', '/api/auth/signup', {
        email: teammateEmail,
        password: testPassword,
        name: 'E2E Teammate Student',
        usn: `1SP23CS${testSuffix}2`,
        branch: 'ISE',
        phone: '9876543211',
        year: '3',
        sem: '5',
      });
      assert(res.status === 201, 'Signup Student 2 (Teammate) returned 201 Created');
      teammateToken = res.data.token;
      teammateUserId = res.data.profile.id;
    }
    {
      const res = await apiRequest('POST', '/api/auth/login', {
        email: leaderEmail,
        password: testPassword,
      });
      assert(res.status === 200, 'Student login returned 200 OK');
      assert(!!res.data.token, 'Login returned valid token');
    }
    {
      const res = await apiRequest('GET', `/api/profiles/${leaderUserId}`);
      assert(res.status === 200, 'GET /api/profiles/:id returned 200 OK');
      assert(res.data.profile.email === leaderEmail, 'Profile endpoint returns correct profile email');
    }
    {
      const res = await apiRequest(
        'POST',
        '/api/auth/sync',
        {
          email: leaderEmail,
          name: 'E2E Leader Student Updated',
          branch: 'CSE AI/ML',
        },
        leaderToken
      );
      assert(res.status === 200, 'POST /api/auth/sync returned 200 OK');
      assert(res.data.profile.fullName === 'E2E Leader Student', 'Sync preserves existing non-placeholder profile name');
    }

    // -------------------------------------------------------------------------
    // SUITE 4: Club Creation & Manager Auth
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 4: Club Creation & Manager Auth ---');
    {
      const res = await apiRequest(
        'POST',
        '/api/clubs',
        {
          name: `E2E Club ${testSuffix}`,
          email: clubEmail,
          password: testPassword,
          registrationKey: regKey,
        },
        leaderToken
      );
      assert(res.status === 201 || res.status === 200, 'POST /api/clubs returned success status');
      assert(res.data.club && typeof res.data.club.id === 'string', 'Club created with valid ID');
      clubId = res.data.club.id;
    }
    {
      const res = await apiRequest('POST', '/api/auth/club-login', {
        email: clubEmail,
        password: testPassword,
      });
      assert(res.status === 200, 'Club login returned 200 OK');
      assert(!!res.data.token, 'Club login returned JWT token');
      clubToken = res.data.token;
    }
    {
      const res = await apiRequest('GET', '/api/clubs');
      assert(res.status === 200, 'GET /api/clubs returned 200 OK');
      assert(Array.isArray(res.data.clubs), 'Clubs list returned as array');
      const found = res.data.clubs.some((c: any) => c.id === clubId);
      assert(found, 'Newly created club present in public clubs list');
    }

    // -------------------------------------------------------------------------
    // SUITE 5: Liquid Event Builder (Solo & Team Events)
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 5: Liquid Event Builder (Solo & Team Events) ---');
    {
      const eventDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      const deadline = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
      const res = await apiRequest(
        'POST',
        '/api/events/create',
        {
          name: `E2E Solo Hackathon ${testSuffix}`,
          description: 'Automated end to end solo event test description',
          venue: 'Auditorium 1',
          eventDate,
          registrationDeadline: deadline,
          fee: 0,
          registrationLimit: 50,
          eventType: 'Solo',
          clubId,
        },
        clubToken
      );
      assert(res.status === 201, 'Create Solo Event returned 201 Created');
      assert(res.data.event && typeof res.data.event.id === 'string', 'Solo event created with ID');
      soloEventId = res.data.event.id;
    }
    {
      const eventDate = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString();
      const deadline = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
      const res = await apiRequest(
        'POST',
        '/api/events/create',
        {
          name: `E2E Team Hackathon ${testSuffix}`,
          description: 'Automated end to end team event test description',
          venue: 'Main Lab 3',
          eventDate,
          registrationDeadline: deadline,
          fee: 150,
          registrationLimit: 100,
          eventType: 'Team',
          teamSizeLimit: 4,
          minTeamSize: 2,
          clubId,
        },
        clubToken
      );
      assert(res.status === 201, 'Create Paid Team Event returned 201 Created');
      assert(res.data.event && res.data.event.eventType === 'Team', 'Team event created properly');
      teamEventId = res.data.event.id;
    }
    {
      const res = await apiRequest('GET', '/api/events');
      assert(res.status === 200, 'GET /api/events returned 200 OK');
      const foundSolo = res.data.events.some((e: any) => e.id === soloEventId);
      const foundTeam = res.data.events.some((e: any) => e.id === teamEventId);
      assert(foundSolo && foundTeam, 'Both created events appear in public events list');
    }

    // -------------------------------------------------------------------------
    // SUITE 6: Solo Registration & Duplicate Prevention
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 6: Solo Registration & Duplicate Prevention ---');
    {
      const res = await apiRequest(
        'POST',
        '/api/register',
        {
          eventId: soloEventId,
          name: 'E2E Leader Student Updated',
          usn: `1SP23CS${testSuffix}1`,
        },
        leaderToken
      );
      assert(res.status === 201, 'Register for free solo event returned 201 Created');
      assert(res.data.registration.status === 'CONFIRMED', 'Free event auto-confirms status to CONFIRMED');
    }
    {
      const res = await apiRequest(
        'POST',
        '/api/register',
        {
          eventId: soloEventId,
          name: 'E2E Leader Student Updated',
          usn: `1SP23CS${testSuffix}1`,
        },
        leaderToken
      );
      assert(res.status === 400, 'Duplicate registration attempt returned 400 Bad Request');
      assert(res.data.error.includes('already registered'), 'Error message contains duplicate registration warning');
    }

    // -------------------------------------------------------------------------
    // SUITE 7: Team Registration & Passkey Lifecycle
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 7: Team Registration & Passkey Lifecycle ---');
    {
      const res = await apiRequest(
        'POST',
        '/api/teams/create',
        {
          eventId: teamEventId,
          teamName: `Code ninjas ${testSuffix}`,
          leaderUsn: `1SP23CS${testSuffix}1`,
        },
        leaderToken
      );
      assert(res.status === 201, 'Leader team creation returned 201 Created');
      assert(typeof res.data.passkey === 'string' && res.data.passkey.length === 5, 'Generated passkey is 5 chars alphanumeric');
      teamPasskey = res.data.passkey;
      teamId = res.data.teamId;
      leaderRegistrationId = res.data.registrationId;
      console.log(`  ℹ️ Team created with passkey: ${teamPasskey}`);
    }
    {
      const res = await apiRequest(
        'POST',
        '/api/teams/join',
        {
          eventId: teamEventId,
          passkey: teamPasskey,
        },
        teammateToken
      );
      assert(res.status === 201, 'Teammate join via passkey returned 201 Created');
      assert(res.data.registration.teamId === teamId, 'Teammate registration linked to leader team ID');
      teammateRegistrationId = res.data.registration.id;
    }
    {
      const res = await apiRequest(
        'POST',
        '/api/teams/join',
        {
          eventId: teamEventId,
          passkey: 'INVALIDKEY99',
        },
        leaderToken
      );
      assert(res.status === 404, 'Invalid passkey attempt returned 404 Not Found');
    }
    {
      const fakePaymentProof = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const res = await apiRequest(
        'PUT',
        `/api/registrations/${leaderRegistrationId}/payment`,
        {
          paymentProof: fakePaymentProof,
          transactionId: `TXN${testSuffix}`,
        },
        leaderToken
      );
      assert(res.status === 200, 'Upload payment proof returned 200 OK');
      assert(res.data.success === true, 'Payment proof upload flagged as success');
    }

    // -------------------------------------------------------------------------
    // SUITE 8: Admin Moderation & Approval Pipeline
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 8: Admin Moderation & Approval Pipeline ---');
    {
      const res = await apiRequest('GET', `/api/clubs/${clubId}/dashboard-stats`, undefined, clubToken);
      assert(res.status === 200, 'GET club dashboard stats returned 200 OK');
      assert(typeof res.data.totalRegistrations === 'number', 'Dashboard stats contains totalRegistrations');
      assert(Array.isArray(res.data.recentActivity), 'Dashboard stats contains recentActivity list');
    }
    {
      const res = await apiRequest('PUT', `/api/registrations/${leaderRegistrationId}/approve`, {}, clubToken);
      assert(res.status === 200, 'Approve team registration returned 200 OK');
      assert(res.data.message.includes('approved'), 'Approval response confirms success');
    }
    {
      // Verify in DB that both leader and teammate registrations are now CONFIRMED
      const regLeader = await prisma.registration.findUnique({ where: { id: leaderRegistrationId } });
      const regTeammate = await prisma.registration.findUnique({ where: { id: teammateRegistrationId } });
      assert(regLeader?.status === 'CONFIRMED', 'Leader status updated to CONFIRMED');
      assert(regTeammate?.status === 'CONFIRMED', 'Teammate status cascade-updated to CONFIRMED');
    }

    // -------------------------------------------------------------------------
    // SUITE 9: Digital Ticket & QR Verification
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 9: Digital Ticket & QR Verification ---');
    {
      const res = await apiRequest('GET', '/api/user/tickets', undefined, leaderToken);
      assert(res.status === 200, 'GET /api/user/tickets (Leader) returned 200 OK');
      assert(Array.isArray(res.data.tickets), 'User tickets is an array');
      const teamTicket = res.data.tickets.find((t: any) => t.event?.id === teamEventId);
      assert(!!teamTicket, 'Team ticket present in leader tickets list');
      assert(teamTicket.status === 'CONFIRMED', 'Ticket status is CONFIRMED');
      assert(teamTicket.team && teamTicket.team.members.length === 2, 'Ticket contains team member roster');
    }
    {
      const res = await apiRequest('GET', '/api/user/tickets', undefined, teammateToken);
      assert(res.status === 200, 'GET /api/user/tickets (Teammate) returned 200 OK');
      const teamTicket = res.data.tickets.find((t: any) => t.event?.id === teamEventId);
      assert(!!teamTicket, 'Team ticket present in teammate tickets list');
      assert(teamTicket.status === 'CONFIRMED', 'Teammate ticket status is CONFIRMED');
    }

    // -------------------------------------------------------------------------
    // SUITE 10: Notifications & Reminders Service
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 10: Notifications & Reminders Service ---');
    {
      const res = await apiRequest('GET', '/api/notifications', undefined, leaderToken);
      assert(res.status === 200, 'GET /api/notifications returned 200 OK');
      assert(Array.isArray(res.data.notifications), 'Notifications list is an array');
      const approvedNotif = res.data.notifications.find((n: any) => n.type === 'registration_approved');
      assert(!!approvedNotif, 'Registration approved notification received by student');
    }
    {
      const res = await apiRequest('PUT', '/api/notifications/read', {}, leaderToken);
      assert(res.status === 200, 'Mark all notifications as read returned 200 OK');
    }
    {
      const res = await apiRequest('POST', '/api/notifications/event-reminders', {});
      assert(res.status === 200, 'POST /api/notifications/event-reminders returned 200 OK');
    }

    // -------------------------------------------------------------------------
    // SUITE 11: Password Verification & Security
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 11: Password Verification & Security ---');
    {
      const res = await apiRequest(
        'POST',
        '/api/auth/verify-password',
        { userId: leaderUserId, password: testPassword },
        leaderToken
      );
      assert(res.status === 200, 'Verify user password returned 200 OK');
      assert(res.data.valid === true, 'Password verification returned valid=true');
    }

  } catch (err: any) {
    console.error('💥 Unhandled Exception during E2E Execution:', err);
    failedCount++;
  } finally {
    console.log('\n--- 🧹 CLEANUP TEST DATA ---');
    try {
      if (teamId) {
        await prisma.registration.deleteMany({ where: { teamId } });
        await prisma.team.delete({ where: { id: teamId } }).catch(() => {});
      }
      if (soloEventId) {
        await prisma.registration.deleteMany({ where: { eventId: soloEventId } });
        await prisma.event.delete({ where: { id: soloEventId } }).catch(() => {});
      }
      if (teamEventId) {
        await prisma.registration.deleteMany({ where: { eventId: teamEventId } });
        await prisma.event.delete({ where: { id: teamEventId } }).catch(() => {});
      }
      if (clubId) {
        await prisma.club.delete({ where: { id: clubId } }).catch(() => {});
      }
      if (leaderUserId) {
        await prisma.notification.deleteMany({ where: { userId: leaderUserId } });
        await prisma.profile.delete({ where: { id: leaderUserId } }).catch(() => {});
      }
      if (teammateUserId) {
        await prisma.notification.deleteMany({ where: { userId: teammateUserId } });
        await prisma.profile.delete({ where: { id: teammateUserId } }).catch(() => {});
      }
      if (regKey) {
        await prisma.registrationKey.deleteMany({ where: { code: regKey } }).catch(() => {});
      }
      console.log('  ✅ Cleaned up all test entities successfully.');
    } catch (cleanErr) {
      console.error('  ⚠️ Error during cleanup:', cleanErr);
    }

    server.close(() => {
      console.log('🔒 Test server closed.');
    });

    console.log(`\n==================================================`);
    console.log(`E2E TEST SUMMARY: PASSED: ${passedCount} | FAILED: ${failedCount}`);
    console.log(`==================================================\n`);

    if (failedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runE2ETests();
