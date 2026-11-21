import { useNavigate } from 'react-router';
import { ArrowLeft, Shield } from 'lucide-react';

interface Section {
  title: string;
  content: string | string[];
}

const sections: Section[] = [
  {
    title: '1. Information We Collect',
    content: [
      'Account: your name, email address, phone number, USN, branch, year and semester.',
      'Sign-in: if you sign up with email, your password is stored only as a secure hash. With Google Sign-In we receive your name and email from Google and store no password.',
      'Registrations: the events you register for, their status, your team name, team members and team passkey, and the time your ticket is scanned at the event.',
      'No payments: All events on Spotlight are free, so we never ask for or store any payment details.',
      'Notifications: in-app messages about your registrations and upcoming events.',
      'Technical: our servers and hosting providers keep standard request logs (such as IP address and time) for security. We do not use analytics, advertising or tracking tools.',
    ],
  },
  {
    title: '2. Stored Only on Your Device',
    content:
      'Your sign-in session, a cached copy of your profile, tickets and clubs, your saved events and your theme choice are kept in your browser\'s local storage. Saved events are never sent to our servers. Signing out or clearing your browser data removes them. We do not use cookies for advertising or tracking.',
  },
  {
    title: '3. How We Use Your Information',
    content: [
      'To create your account and keep your sign-in secure.',
      'To register you for events and teams, issue QR entry tickets and check you in.',
      'To show in-app notifications about your registrations and events. We do not send push notifications or marketing emails.',
      'To prevent duplicate registrations, misuse and unauthorized access.',
    ],
  },
  {
    title: '4. Who Can See Your Information',
    content:
      'We do not sell, rent or share your personal information with advertisers or data brokers.\n\n• The club running an event you register for sees your name, email, phone, USN, branch, year, semester, team name, and registration and check-in status. Clubs may use this only to run that event.\n• The Spotlight admin may access data for support and moderation.\n• Service providers: Render hosts our server, GoDaddy hosts our database, website and images, and Google provides Google Sign-In.\n• We may disclose information if required by law or by college authorities.',
  },
  {
    title: '5. Data Security',
    content:
      'All data travels over HTTPS, passwords are stored only as secure hashes, and sign-in sessions use signed tokens. Each club can see registrations for its own events only. No system is completely secure, but we work to protect your information.',
  },
  {
    title: '6. Your Rights & Account Deletion',
    content: [
      'View and update your profile any time from the Profile page.',
      'To delete your account, email spotlightapp.help@gmail.com with the subject "Account Deletion Request" from your registered email and include your USN. Your account, profile, registrations and team memberships are permanently deleted within 7 business days.',
      'To get a copy of your data, email us from your registered address.',
    ],
  },
  {
    title: '7. Using Spotlight',
    content: [
      'Give accurate details when you sign up and register; clubs rely on them to verify you.',
      'All events are free. Venue, timings and entry rules are set by the organizing club; contact the club for questions about a specific event.',
      'Keep your password and team passkeys private; you are responsible for activity on your account.',
      'Do not create fake registrations or misuse the platform. We may suspend accounts that do.',
    ],
  },
  {
    title: "8. Children's Privacy",
    content:
      'Spotlight is meant for college students. We do not knowingly collect personal information from children under 13, and we delete it if we learn that we have.',
  },
  {
    title: '9. Changes to This Policy',
    content:
      'We may update this policy when Spotlight changes. The new version will appear on this page with an updated date. Continuing to use Spotlight after an update means you accept it.',
  },
  {
    title: '10. Contact Us',
    content:
      'For questions, privacy concerns or deletion requests, email the Spotlight team:\n\nspotlightapp.help@gmail.com',
  },
];

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        paddingBottom: 60,
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            padding: 4,
            borderRadius: 8,
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.2px',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Terms &amp; Privacy Policy
        </h1>
      </div>

      <div className="stu-page stu-page--read">
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 20,
            padding: 28,
            marginBottom: 28,
            display: 'flex',
            gap: 18,
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'var(--color-crimson-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Shield size={26} color="var(--color-crimson)" />
          </div>
          <div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: 'var(--text)',
                marginBottom: 6,
                fontFamily: 'var(--font-sans)',
                letterSpacing: '-0.2px',
              }}
            >
              Your Privacy Matters
            </h2>
            <p
              style={{
                fontSize: 14,
                color: 'var(--subtext)',
                lineHeight: 1.7,
                fontFamily: 'var(--font-sans)',
              }}
            >
              This page explains what Spotlight collects, how it is used, who
              can see it, and the terms for using Spotlight.
            </p>
            <p
              style={{
                fontSize: 12,
                color: 'var(--subtext)',
                marginTop: 10,
                fontFamily: 'var(--font-sans)',
                opacity: 0.7,
              }}
            >
              Last updated: November 21, 2026
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sections.map((section) => (
            <div
              key={section.title}
              style={{
                background: 'var(--surface)',
                borderRadius: 16,
                padding: '22px 24px',
              }}
            >
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: 'var(--text)',
                  marginBottom: 12,
                  fontFamily: 'var(--font-sans)',
                  letterSpacing: '-0.1px',
                }}
              >
                {section.title}
              </h3>
              {Array.isArray(section.content) ? (
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {section.content.map((item, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--color-crimson)',
                          flexShrink: 0,
                          marginTop: 7,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 14,
                          color: 'var(--subtext)',
                          lineHeight: 1.7,
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--subtext)',
                    lineHeight: 1.8,
                    fontFamily: 'var(--font-sans)',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {section.content}
                </p>
              )}
            </div>
          ))}
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--subtext)',
            marginTop: 32,
            opacity: 0.6,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {`© ${new Date().getFullYear()} Spotlight. All rights reserved.`}
        </p>
      </div>
    </div>
  );
}
