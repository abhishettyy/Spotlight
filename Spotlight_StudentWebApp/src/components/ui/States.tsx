import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  svgSrc?: string;
  svgWidth?: number | string;
  svgHeight?: number | string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  svgSrc,
  svgWidth = 220,
  svgHeight = 150,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: 14,
      }}
    >
      {svgSrc ? (
        <div
          style={{
            width: svgWidth,
            height: svgHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
          }}
        >
          <img
            src={svgSrc}
            alt={title}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        </div>
      ) : icon ? (
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            marginBottom: 8,
          }}
        >
          {icon}
        </div>
      ) : null}
      <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: 'var(--font-sans)' }}>
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: 13,
            color: 'var(--subtext)',
            lineHeight: 1.55,
            maxWidth: 320,
            margin: 0,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 32px',
        textAlign: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(230,57,70,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
        }}
      >
        ⚠️
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Something went wrong</h3>
      <p style={{ fontSize: 14, color: 'var(--subtext)', lineHeight: 1.6, maxWidth: 300 }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-primary"
          style={{ marginTop: 8, padding: '10px 24px' }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}
