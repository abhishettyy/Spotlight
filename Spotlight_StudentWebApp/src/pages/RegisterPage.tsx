import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Loader2, Info, Copy, Check } from 'lucide-react';
import { useEventsStore } from '@/store/eventsStore';
import { useUserStore } from '@/store/userStore';
import { useAuthStore } from '@/store/authStore';
import { getProfile } from '@/api/profiles';
import { registerSolo, createTeam, joinTeam } from '@/api/registrations';
import { PageLoader } from '@/components/ui/LoadingSpinner';
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
  const [copied, setCopied] = useState(false);

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
  const fullName = currentUser?.name || 'Student';
  const usn = currentUser?.usn || '—';
  const phone = currentUser?.phone || '—';

  const handleSubmit = async () => {
    if (mode === 'solo') {
      if (!usn || usn === '—') {
        toast.error('USN missing from profile. Please complete your profile first.');
        return;
      }
      setIsSubmitting(true);
      try {
        const regId = await registerSolo({
          eventId: event.id,
          name: fullName,
          usn: usn.toUpperCase(),
        });
        toast.success('Registration submitted successfully!');
        if (event.price > 0) {
          navigate(`/events/${event.id}/payment?registrationId=${regId}`, { replace: true });
        } else {
          navigate('/tickets', { replace: true });
        }
      } catch (err: any) {
        toast.error(err.message || 'Registration failed.');
      } finally {
        setIsSubmitting(false);
      }
    } else if (mode === 'create-team') {
      if (!teamName.trim()) {
        toast.error('Team name is required.');
        return;
      }
      if (!usn || usn === '—') {
        toast.error('USN missing from profile. Please complete your profile first.');
        return;
      }
      setIsSubmitting(true);
      try {
        const result = await createTeam({
          eventId: event.id,
          teamName: teamName.trim(),
          leaderUsn: usn.toUpperCase(),
        });
        if (result.passkey) {
          setTeamCreatedModal({ passkey: result.passkey, registrationId: result.registrationId });
        } else if (event.price > 0) {
          navigate(`/events/${event.id}/payment?registrationId=${result.registrationId}`, { replace: true });
        } else {
          toast.success('Team registered successfully!');
          navigate('/tickets', { replace: true });
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to create team.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // join team
      if (!passkey.trim() || passkey.trim().length !== 5) {
        toast.error('Passkey must be 5 characters.');
        return;
      }
      setIsSubmitting(true);
      try {
        await joinTeam({
          eventId: event.id,
          passkey: passkey.trim().toUpperCase(),
        });
        toast.success('Joined team successfully!');
        navigate('/tickets', { replace: true });
      } catch (err: any) {
        toast.error(err.message || 'Failed to join team. Please check the passkey.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCopyPasskey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    toast.success('Passkey copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#ffffff', padding: '16px 20px 48px' }}>
      
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
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
          }}
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.3px' }}>
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
              background: '#141416',
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
                background: mode === 'create-team' ? 'var(--color-crimson, #e63946)' : 'transparent',
                color: mode === 'create-team' ? '#ffffff' : '#9ca3af',
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
                background: mode === 'join-team' ? 'var(--color-crimson, #e63946)' : 'transparent',
                color: mode === 'join-team' ? '#ffffff' : '#9ca3af',
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
                background: '#1E1E22',
                borderRadius: 16,
                padding: '12px 20px',
                marginBottom: 16,
              }}
            >
              <p style={{ fontSize: 12, color: '#A09B9B', fontWeight: 500, marginBottom: 4 }}>
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
                  color: '#FFFFFF',
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
                background: '#141416',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                marginTop: 8,
                marginBottom: 16,
              }}
            >
              <Info size={18} color="var(--color-crimson, #e63946)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 13, color: '#A09B9B', lineHeight: 1.5 }}>
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
                background: '#1E1E22',
                borderRadius: 16,
                padding: '12px 20px',
                marginBottom: 16,
              }}
            >
              <p style={{ fontSize: 12, color: '#A09B9B', fontWeight: 500, marginBottom: 4 }}>
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
                  color: '#FFFFFF',
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
            background: 'var(--color-crimson, #e63946)',
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
            boxShadow: '0 4px 14px rgba(230, 57, 70, 0.3)',
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#141416',
              borderRadius: 24,
              padding: 28,
              maxWidth: 380,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>
              Team Created!
            </h3>
            <p style={{ fontSize: 14, color: '#A09B9B', marginBottom: 20 }}>
              Share this passkey with your teammates:
            </p>

            <div
              onClick={() => handleCopyPasskey(teamCreatedModal.passkey)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 24px',
                borderRadius: 16,
                background: 'rgba(230, 57, 70, 0.12)',
                border: '1px solid rgba(230, 57, 70, 0.3)',
                cursor: 'pointer',
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: '4px',
                  color: 'var(--color-crimson, #e63946)',
                  fontFamily: 'monospace',
                }}
              >
                {teamCreatedModal.passkey}
              </span>
              {copied ? (
                <Check size={20} color="#22c55e" strokeWidth={2.5} />
              ) : (
                <Copy size={20} color="var(--color-crimson, #e63946)" strokeWidth={2} />
              )}
            </div>

            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 24 }}>
              Tap to copy passkey
            </p>

            <button
              onClick={() => {
                if (event.price > 0) {
                  navigate(`/events/${event.id}/payment?registrationId=${teamCreatedModal.registrationId}`, { replace: true });
                } else {
                  navigate('/tickets', { replace: true });
                }
              }}
              style={{
                width: '100%',
                height: 48,
                borderRadius: 24,
                background: 'var(--color-crimson, #e63946)',
                border: 'none',
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {event.price > 0 ? 'Proceed to Payment' : 'View My Ticket'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Locked Non-Editable Credential Field ──────────────────────────────────────
function LockedCredentialField({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: '#141416',
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
            color: '#A09B9B',
            fontWeight: 500,
            marginBottom: 4,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: 16,
            color: '#FFFFFF',
            fontWeight: 500,
          }}
        >
          {value}
        </p>
      </div>
      <Lock size={18} color="#A09B9B" strokeWidth={1.8} />
    </div>
  );
}
