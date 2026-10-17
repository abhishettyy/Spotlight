import { useState } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft, CheckCircle, Copy, Loader2, QrCode } from 'lucide-react';
import { useEventsStore } from '@student/store/eventsStore';
import { useNotificationsStore } from '@student/store/notificationsStore';
import { submitPayment } from '@student/api/registrations';
import PasskeyDialog from '@student/components/ui/PasskeyDialog';
import { toast } from 'sonner';

/** What the caller knows about the payment, like the arguments of Flutter's PaymentScreen. */
export interface PaymentRouteState {
  eventName: string;
  price: number;
  qrUrl?: string | null;
  upiId?: string | null;
  teamSizeLimit?: number | null;
  referenceCode?: string;
}

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get('registrationId') ?? '';
  const navigate = useNavigate();
  const routeState = useLocation().state as PaymentRouteState | null;
  const { events, loadEvents } = useEventsStore();
  const loadNotifications = useNotificationsStore((s) => s.load);
  const event = events.find((e) => e.id === id);

  const eventName = routeState?.eventName ?? event?.title ?? '';
  const price = routeState?.price ?? event?.price ?? 0;
  const qrUrl = routeState ? routeState.qrUrl : event?.qrUrl;
  const upiId = routeState ? routeState.upiId : event?.upiId;
  const teamSizeLimit = routeState ? routeState.teamSizeLimit : event?.teamSizeLimit;

  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passkey, setPasskey] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    const utr = transactionId.trim();
    if (!utr) {
      toast.error('Please enter your Transaction ID.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitPayment({ registrationId, transactionId: utr });
      loadEvents();
      loadNotifications();
      toast.success('Registration & Payment submitted successfully!');
      if (res.passkey) {
        setPasskey(res.passkey);
      } else {
        setSubmitted(true);
      }
    } catch (e) {
      toast.error(`Submission failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) return <PaymentPendingView onHome={() => navigate('/', { replace: true })} />;

  return (
    <div className="stu-page stu-page--form">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex', padding: 4 }}
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Payment</h1>
      </div>

      {/* Mobile keeps the Flutter order (summary, UPI, QR, form); desktop puts summary + QR left, UPI + form right */}
      <div className={`stu-pay${upiId ? '' : ' stu-pay--no-upi'}`}>
      {/* Summary */}
      <div className="stu-pay-summary" style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, textAlign: 'center', marginBottom: 24 }}>
        <p style={{ color: 'var(--subtext)', fontSize: 14 }}>Paying for</p>
        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginTop: 8 }}>{eventName}</p>
        {teamSizeLimit != null && (
          <span style={{
            display: 'inline-block', marginTop: 6, padding: '4px 10px', borderRadius: 12,
            background: 'var(--color-crimson-dim)', color: 'var(--color-crimson)', fontSize: 12, fontWeight: 600,
          }}>
            Team Event · Max {teamSizeLimit} members per team
          </span>
        )}
        <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-crimson)', marginTop: 16 }}>₹{price.toFixed(0)}</p>
      </div>

      {/* UPI ID */}
      {upiId && (
        <div className="stu-pay-upi">
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, color: 'var(--subtext)' }}>UPI ID</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginTop: 4, wordBreak: 'break-all' }}>{upiId}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(upiId);
                toast.success('UPI ID copied to clipboard!');
              }}
              aria-label="Copy UPI ID"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex', padding: 8 }}
            >
              <Copy size={20} />
            </button>
          </div>
          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--sk-brand)', lineHeight: 1.4, marginTop: 8, marginBottom: 24 }}>
            ⚠️ Make sure you enter a valid Transaction ID. If incorrect, your registration request will not be approved.
          </p>
        </div>
      )}

      {/* QR */}
      <div className="stu-pay-qr" style={{ textAlign: 'center', marginBottom: 24 }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Scan QR to Pay</p>
        <div style={{
          width: 200, height: 200, margin: '0 auto', background: '#ffffff', borderRadius: 16,
          border: '1px solid #e0e0e0', overflow: 'hidden', display: 'grid', placeItems: 'center',
        }}>
          {qrUrl ? (
            <img src={qrUrl} alt="Payment QR" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <QrCode size={150} color="#424242" strokeWidth={1.2} />
          )}
        </div>
      </div>

      {/* Transaction ID */}
      <div className="stu-pay-form">
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Transaction ID</p>
      <input
        type="text"
        placeholder="Enter Transaction ID"
        value={transactionId}
        onChange={(e) => setTransactionId(e.target.value)}
        className="input-field"
      />

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="btn-primary"
        style={{ width: '100%', marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        {isSubmitting ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Submit Payment'}
      </button>
      </div>
      </div>

      {passkey && (
        <PasskeyDialog
          title="Team Passkey Unlocked!"
          message="Payment details submitted! Share this Team Passkey with your teammates so they can join:"
          passkey={passkey}
          actionLabel="Got it"
          onAction={() => {
            setPasskey(null);
            setSubmitted(true);
          }}
        />
      )}
    </div>
  );
}

function PaymentPendingView({ onHome }: { onHome: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 40, textAlign: 'center' }}>
      <CheckCircle size={80} color="var(--sk-ok)" strokeWidth={1.5} />
      <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginTop: 24 }}>Payment Pending</h2>
      <p style={{ fontSize: 16, color: 'var(--subtext)', lineHeight: 1.5, marginTop: 16, maxWidth: 360 }}>
        Your payment details have been submitted. It will be verified by the organizers shortly.
      </p>
      <button onClick={onHome} className="btn-primary" style={{ marginTop: 40 }}>
        Back to Home
      </button>
    </div>
  );
}
