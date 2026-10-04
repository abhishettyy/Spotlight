interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

export function LoadingSpinner({ size = 32, color = 'var(--color-crimson)' }: LoadingSpinnerProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `3px solid var(--border)`,
        borderTop: `3px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
}

// Centered full-page loader
export function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <LoadingSpinner size={40} />
    </div>
  );
}

// Add spin keyframe to global styles dynamically
if (!document.getElementById('spin-keyframe')) {
  const style = document.createElement('style');
  style.id = 'spin-keyframe';
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}
