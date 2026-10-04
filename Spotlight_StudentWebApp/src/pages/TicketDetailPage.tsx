import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, MapPin, Copy, Check, Users, Key,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchUserTickets } from '@/api/registrations';
import { TicketModel, ticketHasPaid } from '@/types/event';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

function formatTicketDates(
  eventDate?: Date | string | null,
  eventEndDate?: Date | string | null,
  rawDateStr?: string | null
) {
  let startDate: Date | null = null;
  if (eventDate instanceof Date) {
    startDate = eventDate;
  } else if (typeof eventDate === 'string' && eventDate.trim()) {
    const d = new Date(eventDate);
    if (!isNaN(d.getTime())) startDate = d;
  } else if (rawDateStr) {
    const d = new Date(rawDateStr);
    if (!isNaN(d.getTime())) startDate = d;
  }

  let endDate: Date | null = null;
  if (eventEndDate instanceof Date) {
    endDate = eventEndDate;
  } else if (typeof eventEndDate === 'string' && eventEndDate.trim()) {
    const d = new Date(eventEndDate);
    if (!isNaN(d.getTime())) endDate = d;
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formatTime = (d: Date) => {
    let hour = d.getHours() % 12;
    if (hour === 0) hour = 12;
    const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hour}:${mins} ${ampm}`;
  };

  let formattedDate = 'TBD';
  let formattedTime = '';

  if (startDate) {
    formattedDate = `${startDate.getDate()} ${months[startDate.getMonth()]}, ${startDate.getFullYear()}`;
    const startTimeStr = formatTime(startDate);
    if (endDate) {
      const endTimeStr = formatTime(endDate);
      const sameDay =
        startDate.getFullYear() === endDate.getFullYear() &&
        startDate.getMonth() === endDate.getMonth() &&
        startDate.getDate() === endDate.getDate();

      if (sameDay) {
        formattedTime = `${startTimeStr} - ${endTimeStr}`;
      } else {
        formattedTime = `${startTimeStr} → ${months[endDate.getMonth()]} ${endDate.getDate()}, ${endTimeStr}`;
      }
    } else {
      formattedTime = startTimeStr;
    }
  } else if (rawDateStr) {
    formattedDate = rawDateStr;
  }

  return { formattedDate, formattedTime };
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchUserTickets()
      .then((tickets) => {
        setTicket(tickets.find((t) => t.id === id) ?? null);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <PageLoader />;

  if (!ticket) {
    return (
      <div style={{ minHeight: '100vh', background: '#000000', color: '#ffffff', padding: 24 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          <ArrowLeft size={20} /> Back
        </button>
        <p style={{ color: '#a0a0a0', marginTop: 32, textAlign: 'center' }}>Ticket not found.</p>
      </div>
    );
  }

  const event = ticket.event;
  const isTeamTicket = !!(ticket.team && ticket.team.name);
  const qrCodeString = (ticket.team?.passkey && ticket.team.passkey.trim())
    ? ticket.team.passkey.trim()
    : ticket.id;

  const { formattedDate, formattedTime } = formatTicketDates(
    event?.eventDate,
    event?.eventEndDate,
    event?.date
  );

  const venue = event?.venue || 'TBD';
  const price = event?.price ?? 0;
  const hasPaid = ticketHasPaid(ticket);
  const isPendingPayment = !hasPaid && price > 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrCodeString);
    setCopied(true);
    toast.success(isTeamTicket ? 'Passkey copied to clipboard!' : 'Ticket ID copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#ffffff', padding: '16px 20px 48px' }}>
      
      {/* ── Top Bar ────────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 440,
          margin: '0 auto 20px',
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
          My Ticket
        </h1>
      </div>

      {/* ── Main Ticket Card ───────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 440,
          margin: '0 auto',
          background: '#141416',
          borderRadius: 24,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Top Half */}
        <div style={{ padding: '28px 24px 20px', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.4px',
              lineHeight: 1.3,
              marginBottom: 16,
            }}
          >
            {event?.title || 'Event Pass'}
          </h2>

          {/* Info Chips */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            {/* Date Chip */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 20,
                background: '#1E1E22',
                color: 'rgba(255, 255, 255, 0.75)',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <Calendar size={13} color="rgba(255, 255, 255, 0.75)" />
              <span>{formattedDate}</span>
            </div>

            {/* Time Chip */}
            {formattedTime && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 20,
                  background: '#1E1E22',
                  color: 'rgba(255, 255, 255, 0.75)',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                <Clock size={13} color="rgba(255, 255, 255, 0.75)" />
                <span>{formattedTime}</span>
              </div>
            )}
          </div>

          {/* Venue Chip */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 20,
              background: '#1E1E22',
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <MapPin size={13} color="rgba(255, 255, 255, 0.75)" />
            <span>{venue}</span>
          </div>

          {/* Team Info if Team Event */}
          {ticket.team && (
            <div style={{ marginTop: 16 }}>
              <div
                onClick={() => {
                  if (ticket.team?.passkey) {
                    navigator.clipboard.writeText(ticket.team.passkey);
                    toast.success(`Passkey copied: ${ticket.team.passkey}`);
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 14px',
                  borderRadius: 20,
                  background: '#1E1E22',
                  cursor: 'pointer',
                }}
              >
                <Users size={14} color="#a0a0a0" />
                <span style={{ fontSize: 12, color: '#ffffff', fontWeight: 500 }}>
                  {ticket.team.name}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: 'rgba(230, 57, 70, 0.15)',
                    color: 'var(--color-crimson, #e63946)',
                  }}
                >
                  {ticket.team.passkey || 'Pending'}
                </span>
                <Copy size={12} color="#a0a0a0" />
              </div>

              {/* Members */}
              {ticket.team.members && ticket.team.members.length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: '#1E1E22',
                    textAlign: 'left',
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--color-crimson, #e63946)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Users size={13} /> Team Members
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ticket.team.members.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: 12,
                        }}
                      >
                        <span style={{ color: '#ffffff', fontWeight: m.isLeader ? 600 : 400 }}>
                          {m.name}
                        </span>
                        {m.isLeader && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: 'rgba(230, 57, 70, 0.15)',
                              color: 'var(--color-crimson, #e63946)',
                            }}
                          >
                            Leader
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Perforation Divider ────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            position: 'relative',
          }}
        >
          {/* Left Notch */}
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#000000',
              marginLeft: -10,
              flexShrink: 0,
            }}
          />
          {/* Dashed Line */}
          <div
            style={{
              flex: 1,
              height: 0,
              borderTop: '1.5px dashed rgba(255, 255, 255, 0.15)',
              margin: '0 8px',
            }}
          />
          {/* Right Notch */}
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#000000',
              marginRight: -10,
              flexShrink: 0,
            }}
          />
        </div>

        {/* ── Bottom Half ──────────────────────────────────────────────── */}
        <div
          style={{
            padding: '24px 24px 28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Real QR Code SVG Box */}
          <div
            style={{
              padding: 16,
              background: '#ffffff',
              borderRadius: 16,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
            }}
          >
            <QRCodeSVG
              value={qrCodeString}
              size={180}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
          </div>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 12,
              color: '#A0A0A0',
              marginTop: 14,
              textAlign: 'center',
              fontWeight: 400,
            }}
          >
            Scan at the venue
          </p>

          {/* Ticket ID / Passkey pill */}
          <div
            onClick={handleCopy}
            title="Click to copy"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.06)',
              marginTop: 8,
              cursor: 'pointer',
              maxWidth: '100%',
              transition: 'background 0.15s ease',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#A0A0A0',
                fontFamily: 'monospace',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
              }}
            >
              {isTeamTicket ? 'PASSKEY: ' : 'TICKET ID: '}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--color-crimson, #e63946)',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 190,
              }}
            >
              {qrCodeString}
            </span>
            {copied ? (
              <Check size={12} color="#22c55e" strokeWidth={2.5} />
            ) : (
              <Copy size={12} color="var(--color-crimson, #e63946)" strokeWidth={2} />
            )}
          </div>

          {/* Registration Fee Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginTop: 24,
              paddingTop: 4,
            }}
          >
            <span style={{ fontSize: 13, color: '#A0A0A0', fontWeight: 500 }}>
              Registration Fee
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--color-crimson, #e63946)',
              }}
            >
              {price > 0 ? `₹${price}` : 'Free'}
            </span>
          </div>
        </div>
      </div>

      {/* Complete payment banner if pending */}
      {isPendingPayment && (
        <div style={{ maxWidth: 440, margin: '20px auto 0' }}>
          <button
            onClick={() => navigate(`/events/${event?.id}/payment?registrationId=${ticket.id}`)}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 24,
              background: '#f59e0b',
              border: 'none',
              color: '#000000',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
            }}
          >
            Complete Payment →
          </button>
        </div>
      )}
    </div>
  );
}
