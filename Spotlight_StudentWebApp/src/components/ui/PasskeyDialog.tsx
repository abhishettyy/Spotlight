import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface PasskeyDialogProps {
  title: string;
  message: string;
  /** Omit to show the message only (e.g. a paid team before payment). */
  passkey?: string;
  actionLabel: string;
  onAction: () => void;
}

/** Non-dismissible dialog used after team creation and payment, like Flutter's AlertDialogs. */
export default function PasskeyDialog({ title, message, passkey, actionLabel, onAction }: PasskeyDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
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
          background: 'var(--surface)',
          borderRadius: 24,
          padding: 28,
          maxWidth: 380,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>{title}</h3>
        <p style={{ fontSize: 14, color: 'var(--subtext)', marginBottom: passkey ? 20 : 24, lineHeight: 1.5 }}>{message}</p>

        {passkey && (
          <>
            <button
              onClick={() => {
                navigator.clipboard.writeText(passkey);
                toast.success('Passkey copied to clipboard!');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 24px',
                borderRadius: 16,
                background: 'var(--sk-brand-soft)',
                border: '1px solid var(--sk-brand)',
                cursor: 'pointer',
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '4px', color: 'var(--text)', fontFamily: 'var(--sk-mono)' }}>
                {passkey}
              </span>
              <Copy size={22} color="var(--sk-brand)" />
            </button>
            <p style={{ fontSize: 12, color: 'var(--sk-faint)', marginBottom: 24 }}>Tap to copy passkey</p>
          </>
        )}

        <button onClick={onAction} className="btn-primary" style={{ width: '100%' }}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
