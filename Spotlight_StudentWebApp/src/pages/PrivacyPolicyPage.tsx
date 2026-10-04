import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

interface Section {
  title: string;
  content: string | string[];
}

const sections: Section[] = [
  {
    title: '1. Information We Collect',
    content: [
      'Account Information: When you register, we collect your name, email address, college/university affiliation, branch, year, and semester.',
      'Profile Data: Optional profile picture and academic details you choose to provide.',
      'Event & Registration Data: Details of events you register for, team information, and payment proof images you upload.',
      'Usage Data: Pages visited, features used, and interactions within the app to improve your experience.',
      'Device Information: Browser type, operating system, and IP address for security and analytics purposes.',
    ],
  },
  {
    title: '2. How We Use Your Information',
    content: [
      'To create and manage your Spotlight account.',
      'To process your event registrations and team formations.',
      'To send you notifications about events, registrations, and updates.',
      'To display your profile to other members within the same campus community.',
      'To verify payment proofs submitted for paid events.',
      'To improve and personalize your app experience.',
      'To ensure the security and integrity of the platform.',
    ],
  },
  {
    title: '3. Information Sharing',
    content:
      'We do not sell, rent, or trade your personal information to third parties. Your information may be shared with:\n\n• Club Organizers: Event organizers and club admins can see registration details for their events.\n• Campus Administrators: Platform administrators may access data for moderation and support.\n• Service Providers: We use trusted third-party services (e.g., Firebase by Google) to operate the platform. These providers are bound by confidentiality agreements.',
  },
  {
    title: '4. Data Storage & Security',
    content:
      'Your data is stored securely using Firebase (Google Cloud infrastructure). We implement industry-standard security measures including encrypted data transmission (HTTPS), secure authentication, and restricted database access rules. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.',
  },
  {
    title: '5. Your Rights & Choices',
    content: [
      'Access & Update: You can view and update your profile information at any time from the Profile section.',
      'Delete Account: You may request account deletion by contacting us. This will permanently remove your data from our systems.',
      'Notifications: You can manage notification preferences within the app settings.',
      'Data Portability: You may request a copy of your personal data by contacting our support team.',
    ],
  },
  {
    title: '6. Cookies & Local Storage',
    content:
      'Spotlight uses browser local storage to maintain your login session and store preferences (such as dark/light mode). We do not use third-party advertising cookies. You can clear this data at any time through your browser settings.',
  },
  {
    title: "7. Children's Privacy",
    content:
      'Spotlight is intended for college and university students (18 years and older). We do not knowingly collect personal information from individuals under 18. If you believe a minor has provided us with their information, please contact us immediately.',
  },
  {
    title: '8. Changes to This Policy',
    content:
      'We may update this Privacy Policy from time to time. We will notify you of significant changes via email or an in-app notification. Continued use of Spotlight after changes constitutes acceptance of the updated policy.',
  },
  {
    title: '9. Contact Us',
    content:
      'If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us at:\n\nSpotlight Support Team\nEmail: support@spotlight.app\n\nWe aim to respond to all inquiries within 48 hours.',
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
      {/* Header */}
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
          Privacy Policy
        </h1>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px' }}>
        {/* Hero */}
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
              This Privacy Policy explains how Spotlight collects, uses, and
              protects your personal information when you use our campus event
              discovery platform.
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
              Last updated: October 2026
            </p>
          </div>
        </div>

        {/* Sections */}
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

        {/* Footer note */}
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
