import { useNavigate } from 'react-router';
import { ArrowLeft, ExternalLink } from 'lucide-react';

// Content ported from about_us_screen.dart
const DEVELOPERS = [
  {
    name: 'Abhish Shetty',
    role: 'Full Stack Developer (MERN)',
    linkedInUrl: 'https://www.linkedin.com/in/abhish-shetty-10b39232b/',
  },
  {
    name: 'Shyamanth Nagaraja Shetty',
    role: 'Frontend Developer',
    linkedInUrl: 'https://www.linkedin.com/in/shyamanth-shetty-864b61311',
  },
];

const TESTERS = [
  {
    name: 'Patel Jashmin Kumar',
    role: 'Manual Testing & UX',
    linkedInUrl: 'https://www.linkedin.com/in/pateljashmin/',
  },
];

const BRANCH = 'Information Science & Engineering';
const COLLEGE = 'Ramaiah Institute of Technology, Bangalore';

function SectionLabel({ children }: { children: string }) {
  return (
    <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '1.2px', color: 'var(--subtext)', margin: '14px 0 6px' }}>
      {children}
    </p>
  );
}

function PersonTile({ name, role, linkedInUrl }: { name: string; role: string; linkedInUrl: string }) {
  return (
    <a
      href={linkedInUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="spotlight-card"
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginBottom: 8, textDecoration: 'none' }}
    >
      <span style={{
        width: 40, height: 40, borderRadius: '50%', background: 'var(--color-crimson-dim)', color: 'var(--color-crimson)',
        display: 'grid', placeItems: 'center', fontWeight: 700, flexShrink: 0,
      }}>
        {name.charAt(0)}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{name}</span>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-crimson)', marginTop: 2 }}>{role}</span>
        <span style={{ display: 'block', fontSize: 11, color: 'var(--subtext)', marginTop: 2 }}>{BRANCH}</span>
        <span style={{ display: 'block', fontSize: 11, color: 'var(--subtext)' }}>{COLLEGE}</span>
      </span>
      <ExternalLink size={16} color="var(--subtext)" style={{ flexShrink: 0 }} />
    </a>
  );
}

export default function AboutPage() {
  const navigate = useNavigate();
  return (
    <div className="stu-page stu-page--read">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex', padding: 4 }}
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <h1 style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginRight: 28 }}>
          About Spotlight
        </h1>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '4px', color: 'var(--text)', fontFamily: "'Cinzel', Georgia, serif" }}>
          SPOTLIGHT
        </h2>
        <p style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--subtext)', marginTop: 2 }}>The Unified Campus Event Hub</p>
        <span style={{
          display: 'inline-block', marginTop: 4, padding: '2px 8px', borderRadius: 10, fontSize: 10.5, fontWeight: 600,
          color: 'var(--color-crimson)', background: 'var(--color-crimson-dim)',
        }}>
          Version 1.0.0
        </span>
      </div>

      <SectionLabel>WHY SPOTLIGHT?</SectionLabel>
      <div className="spotlight-card" style={{ padding: 16, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
        <p>An event gets announced in class.</p>
        <p style={{ marginTop: 4 }}>
          The announcement's rushed, half the room isn't really listening, and by the time the organizers ask someone to
          click a pic of the poster and forward it, it's buried under a hundred other messages in the group.
        </p>
        <p style={{ marginTop: 10 }}>
          Posters scattered across a dozen WhatsApp groups. No single place to check what's happening on campus this week.
          You'd find out about a hackathon a day after registrations closed, from a friend, by accident.
        </p>
        <p style={{ marginTop: 10, fontWeight: 600, color: 'var(--color-crimson)' }}>
          Spotlight fixes that. One app. Every event, every club, in one feed. Register, pay, get your ticket, show up.
          Never let another event get buried.
        </p>
      </div>

      <SectionLabel>DEVELOPERS</SectionLabel>
      {DEVELOPERS.map((p) => <PersonTile key={p.name} {...p} />)}

      <SectionLabel>TESTING</SectionLabel>
      {TESTERS.map((p) => <PersonTile key={p.name} {...p} />)}

      <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 500, color: 'var(--sk-faint)', marginTop: 16 }}>
        Spotlight v1.0.0
      </p>
    </div>
  );
}
