import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Loader2, Info } from 'lucide-react';
import { useEventsStore } from '@/store/eventsStore';
import { useUserStore } from '@/store/userStore';
import { useAuthStore } from '@/store/authStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import { getProfile } from '@/api/profiles';
import { registerSolo, createTeam, joinTeam } from '@/api/registrations';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import PasskeyDialog from '@/components/ui/PasskeyDialog';
import type { PaymentRouteState } from '@/pages/PaymentPage';
import { toast } from 'sonner';

type Mode = 'solo' | 'create-team' | 'join-team';

export default function RegisterPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events, loadEvents } = useEventsStore();
  const { currentUser, setCurrentUser } = useUserStore();
  const { userId } = useAuthStore();

  const event = events.find((e) => e.id === id);
  const isTeamEvent = event?.eventType?.toLowerCase() === 'team';

  const [mode, setMode] = useState<Mode>(isTeamEvent ? 'create-team' : 'solo');
  const [teamName, setTeamName] = useState('');
  const [passkey, setPasskey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamCreatedModal, setTeamCreatedModal] = useState<{ passkey: string; registrationId: string } | null>(null);
  const loadNotifications = useNotificationsStore((s) => s.load);

  useEffect(() => {
    if (events.length === 0) loadEvents();
  }, []);

  useEffect(() => {
    if (!currentUser && userId) {
      getProfile(userId).then((user) => {
        if (user) setCurrentUser(user);
      });
    }
  }, [currentUser, userId]);

  useEffect(() => {
    if (isTeamEvent) {
      setMode('create-team');
    } else {
      setMode('solo');
    }
  }, [isTeamEvent]);

  if (!event) return <PageLoader />;

  // Locked non-editable credentials from user account profile
  const fullName = currentUser?.name ?? '';
  const usn = currentUser?.usn ?? '';
  const phone = currentUser?.phone ?? '';

  // Mirrors the tail of RegisterScreen._submit: paid solo/create-team go to payment,
  // everything else refreshes data and returns home.
  const finish = (registrationId?: string, referenceCode?: string) => {
    if (event.price > 0 && mode !== 'join-team' && registrationId) {
      const state: PaymentRouteState = {
        eventName: event.title,
        price: event.price,
        qrUrl: event.qrUrl ?? null,
        upiId: event.upiId ?? null,
        teamSizeLimit: event.teamSizeLimit ?? null,
        referenceCode,
      };
      navigate(`/events/${event.id}/payment?registrationId=${registrationId}`, { replace: true, state });
      return;
    }
    loadEvents();
    loadNotifications();
    toast.success('Registration submitted successfully!');
    navigate('/', { replace: true });
  };

  const handleSubmit = async () => {
    if (mode === 'create-team' && !teamName.trim()) {
      toast.error('Team name is required');
      return;
    }
    if (mode === 'join-team' && passkey.trim().length !== 5) {
      toast.error('Passkey must be 5 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'solo') {
        const regId = await registerSolo({ eventId: event.id, name: fullName.trim(), usn: usn.trim() });
        finish(regId, regId);
      } else if (mode === 'create-team') {
        const result = await createTeam({ eventId: event.id, teamName: teamName.trim(), leaderUsn: usn.trim() });
        // The dialog's button continues the flow via finish()
        setTeamCreatedModal({ passkey: result.passkey, registrationId: result.registrationId });
      } else {
        await joinTeam({ eventId: event.id, passkey: passkey.trim() });
        finish();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '16px 20px 48px' }}>
      
      {/* ── Top Bar ────────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 440,
          margin: '0 auto 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
          }}
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
          Register
        </h1>
      </div>

      <div style={{ maxWidth: 440, margin: '0 auto' }}>

        {/* ── Team Mode Switcher (if team event) ────────────────────────── */}
        {isTeamEvent && (
          <div
            style={{
              height: 52,
              padding: 4,
              background: 'var(--surface)',
              borderRadius: 28,
              display: 'flex',
              marginBottom: 28,
            }}
          >
            <button
              onClick={() => setMode('create-team')}
              style={{
                flex: 1,
                borderRadius: 24,
                border: 'none',
                background: mode === 'create-team' ? 'var(--sk-brand)' : 'transparent',
                color: mode === 'create-team' ? '#ffffff' : 'var(--subtext)',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Create Team
            </button>
            <button
              onClick={() => setMode('join-team')}
              style={{
                flex: 1,
                borderRadius: 24,
                border: 'none',
                background: mode === 'join-team' ? 'var(--sk-brand)' : 'transparent',
                color: mode === 'join-team' ? '#ffffff' : 'var(--subtext)',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Join Team
            </button>
          </div>
        )}

        {/* ── Form Fields ──────────────────────────────────────────────── */}
        {mode === 'solo' && (
          <>
            {/* Full Name (locked) */}
            <LockedCredentialField label="Full Name" value={fullName} />

            {/* USN (locked) */}
            <LockedCredentialField label="USN" value={usn} />

            {/* Phone Number (locked) */}
            <LockedCredentialField label="Phone Number" value={phone} />
          </>
        )}

        {mode === 'create-team' && (
          <>
            {/* Team Name (editable) */}
            <div
              style={{
                background: 'var(--raised)',
                borderRadius: 16,
                padding: '12px 20px',
                marginBottom: 16,
              }}
            >
              <p style={{ fontSize: 12, color: 'var(--subtext)', fontWeight: 500, marginBottom: 4 }}>
                Team Name
              </p>
              <input
                type="text"
                placeholder="Enter team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontSize: 16,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Your USN (locked) */}
            <LockedCredentialField label="Your USN" value={usn} />

            {/* Phone Number (locked) */}
            <LockedCredentialField label="Phone Number" value={phone} />

            {/* Team Passkey Notice */}
            <div
              style={{
                padding: '14px 18px',
                background: 'var(--surface)',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                marginTop: 8,
                marginBottom: 16,
              }}
            >
              <Info size={18} color="var(--sk-brand)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 13, color: 'var(--subtext)', lineHeight: 1.5 }}>
                A unique passkey will be generated after you submit. Share it with your teammates.
                {event.teamSizeLimit ? ` Team size limit is ${event.teamSizeLimit} members.` : ''}
              </p>
            </div>
          </>
        )}

        {mode === 'join-team' && (
          <>
            {/* Team Passkey (editable) */}
            <div
              style={{
                background: 'var(--raised)',
                borderRadius: 16,
                padding: '12px 20px',
                marginBottom: 16,
              }}
            >
              <p style={{ fontSize: 12, color: 'var(--subtext)', fontWeight: 500, marginBottom: 4 }}>
                Team Passkey
              </p>
              <input
                type="text"
                placeholder="Enter 5-character passkey"
                maxLength={5}
                value={passkey}
                onChange={(e) => setPasskey(e.target.value.toUpperCase())}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: '2px',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            {/* Phone Number (locked) */}
            <LockedCredentialField label="Phone Number" value={phone} />
          </>
        )}

        {/* ── Confirm Registration Button ──────────────────────────────── */}
        <button
          disabled={isSubmitting}
          onClick={handleSubmit}
          style={{
            width: '100%',
            height: 52,
            borderRadius: 30,
            background: 'var(--sk-brand)',
            border: 'none',
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 700,
            cursor: isSubmitting ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 32,
            transition: 'opacity 0.15s ease',
            opacity: isSubmitting ? 0.7 : 1,
            boxShadow: 'none',
          }}
        >
          {isSubmitting ? (
            <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
          ) : (
            'Confirm Registration'
          )}
        </button>
      </div>

      {/* ── Team Created Dialog ────────────────────────────────────────── */}
      {teamCreatedModal && (
        teamCreatedModal.passkey ? (
          <PasskeyDialog
            title="Team Created!"
            message="Share this passkey with your teammates:"
            passkey={teamCreatedModal.passkey}
            actionLabel="Got it"
            onAction={() => finish(teamCreatedModal.registrationId, teamCreatedModal.passkey)}
          />
        ) : (
          <PasskeyDialog
            title="Team Created!"
            message="Your team has been created. Next, submit your payment details to receive your Team Passkey."
            actionLabel="Proceed to Payment"
            onAction={() => finish(teamCreatedModal.registrationId, teamCreatedModal.registrationId)}
          />
        )
      )}
    </div>
  );
}

// ── Locked Non-Editable Credential Field ──────────────────────────────────────
function LockedCredentialField({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 16,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}
    >
      <div>
        <p
          style={{
            fontSize: 12,
            color: 'var(--subtext)',
            fontWeight: 500,
            marginBottom: 4,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: 16,
            color: value ? 'var(--text)' : 'var(--sk-faint)',
            fontWeight: 500,
          }}
        >
          {value || `${label} from profile`}
        </p>
      </div>
      <Lock size={18} color="var(--subtext)" strokeWidth={1.8} />
    </div>
  );
}
