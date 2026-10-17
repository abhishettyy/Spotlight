import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Calendar, Clock, MapPin, Copy, Check, Users,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchUserTickets, loadCachedTickets } from '@student/api/registrations';
import { TicketModel, isTicketConfirmed } from '@student/types/event';
import { PageLoader } from '@student/components/ui/LoadingSpinner';
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
    formattedDate = `${String(startDate.getDate()).padStart(2, '0')} ${months[startDate.getMonth()]}, ${startDate.getFullYear()}`;
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
  // Cached tickets first so the QR shows offline, like the Flutter app
  const cached = loadCachedTickets().find((t) => t.id === id) ?? null;
  const [ticket, setTicket] = useState<TicketModel | null>(cached);
  const [isLoading, setIsLoading] = useState(!cached);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchUserTickets()
      .then((tickets) => setTicket(tickets.find((t) => t.id === id) ?? null))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <PageLoader />;

  // Only confirmed tickets have a QR pass (the tickets list never opens any other)
  if (!ticket || !isTicketConfirmed(ticket)) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: 24 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          <ArrowLeft size={20} /> Back
        </button>
        <p style={{ color: 'var(--subtext)', marginTop: 32, textAlign: 'center' }}>
          {ticket ? 'Your registration is pending organizer approval.' : 'Ticket not found.'}
        </p>
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

  const venue = event?.venue || 'No Venue';
  const price = event?.price ?? 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrCodeString);
    setCopied(true);
    toast.success(isTeamTicket ? 'Passkey copied to clipboard!' : 'Ticket ID copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="stu-page" style={{ color: 'var(--text)' }}>

      {/* ── Top Bar ────────────────────────────────────────────────────── */}
      <div
        className="stu-pass-head"
        style={{
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
          My Ticket
        </h1>
      </div>

      {/* ── Main Ticket Card ───────────────────────────────────────────── */}
      <div
        className="stu-pass"
        style={{
          background: 'var(--surface)',
          borderRadius: 24,
          boxShadow: 'var(--sk-shadow-lg)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Top Half (left side on desktop) */}
        <div className="stu-pass-main" style={{ padding: '28px 24px 20px', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--text)',
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
                background: 'var(--raised)',
                color: 'var(--subtext)',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <Calendar size={13} color="var(--subtext)" />
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
                  background: 'var(--raised)',
                  color: 'var(--subtext)',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                <Clock size={13} color="var(--subtext)" />
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
              background: 'var(--raised)',
              color: 'var(--subtext)',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <MapPin size={13} color="var(--subtext)" />
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
                  background: 'var(--raised)',
                  cursor: 'pointer',
                }}
              >
                <Users size={14} color="var(--subtext)" />
                <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>
                  {ticket.team.name}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: 'var(--sk-brand-soft)',
                    color: 'var(--sk-brand)',
                  }}
                >
                  {ticket.team.passkey || 'Pending Payment'}
                </span>
                <Copy size={12} color="var(--subtext)" />
              </div>

              {/* Members */}
              {ticket.team.members && ticket.team.members.length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'var(--raised)',
                    textAlign: 'left',
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--sk-brand)',
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
                        <span style={{ color: 'var(--text)', fontWeight: m.isLeader ? 600 : 400 }}>
                          {m.name}
                        </span>
                        {m.isLeader && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: 'var(--sk-brand-soft)',
                              color: 'var(--sk-brand)',
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

        {/* ── Perforation Divider (horizontal on mobile, vertical on desktop) ── */}
        <div className="stu-pass-divider" style={{ position: 'relative' }}>
          <div
            className="stu-pass-notch"
            style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg)', marginLeft: -10, flexShrink: 0 }}
          />
          <div className="stu-pass-dash" />
          <div
            className="stu-pass-notch"
            style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg)', marginRight: -10, flexShrink: 0 }}
          />
        </div>

        {/* ── Bottom Half (QR stub; right side on desktop) ─────────────── */}
        <div
          style={{
            padding: '24px 24px 28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
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
              boxShadow: 'var(--sk-shadow-lg)',
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
              color: 'var(--subtext)',
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
              background: 'var(--raised)',
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
                color: 'var(--subtext)',
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
                color: 'var(--sk-brand)',
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
              <Check size={12} color="var(--sk-ok)" strokeWidth={2.5} />
            ) : (
              <Copy size={12} color="var(--sk-brand)" strokeWidth={2} />
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
            <span style={{ fontSize: 13, color: 'var(--subtext)', fontWeight: 500 }}>
              Registration Fee
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--sk-brand)',
              }}
            >
              {price > 0 ? `₹${price}` : 'Free'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
