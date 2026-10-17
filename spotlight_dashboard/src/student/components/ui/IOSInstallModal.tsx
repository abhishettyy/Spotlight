import { X, Share, PlusSquare } from 'lucide-react';

interface IOSInstallModalProps {
  onClose: () => void;
}

export function IOSInstallModal({ onClose }: IOSInstallModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 0 24px',
        animation: 'fade-in 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 24,
          padding: '28px 24px',
          maxWidth: 400,
          width: '100%',
          margin: '0 16px',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--subtext)',
          }}
        >
          <X size={16} />
        </button>

        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'var(--color-crimson)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#fff', fontSize: 22, fontWeight: 900 }}>S</span>
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>
              Install Spotlight
            </p>
            <p style={{ fontSize: 12, color: 'var(--subtext)', fontFamily: 'var(--font-sans)' }}>
              Add to your Home Screen
            </p>
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            {
              icon: <Share size={20} color="var(--color-crimson)" />,
              title: 'Tap the Share button',
              desc: 'Tap the Share icon at the bottom of your Safari browser.',
            },
            {
              icon: <PlusSquare size={20} color="var(--color-crimson)" />,
              title: 'Add to Home Screen',
              desc: 'Scroll down and tap "Add to Home Screen" in the share sheet.',
            },
            {
              icon: (
                <span style={{ fontSize: 20, lineHeight: 1 }}>✅</span>
              ),
              title: 'Tap Add',
              desc: 'Confirm by tapping "Add" in the top right to install Spotlight.',
            },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'var(--color-crimson-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {step.icon}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-sans)', marginBottom: 2 }}>
                  {step.title}
                </p>
                <p style={{ fontSize: 13, color: 'var(--subtext)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p
          style={{
            marginTop: 20,
            fontSize: 11,
            color: 'var(--subtext)',
            textAlign: 'center',
            fontFamily: 'var(--font-sans)',
            opacity: 0.6,
          }}
        >
          Only available in Safari on iOS
        </p>
      </div>
    </div>
  );
}
