import { CSSProperties, ReactNode, useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';

interface EventImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  loading?: 'lazy' | 'eager';
  /** Shown when there is no image or it fails to load; defaults to a calendar icon. */
  fallback?: ReactNode;
  onStatusChange?: (ok: boolean) => void;
}

/**
 * Event banner with a placeholder for missing or unreachable images
 * (deleted storage, a host with an invalid certificate), so cards never show an empty box.
 */
export default function EventImage({ src, alt = '', className, style, loading, fallback, onStatusChange }: EventImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const ok = !!src && !failed;

  useEffect(() => {
    onStatusChange?.(ok);
  }, [ok, onStatusChange]);

  if (!ok) {
    return (
      <>
        {fallback ?? (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--sk-faint)' }}>
            <Calendar size={28} />
          </div>
        )}
      </>
    );
  }

  return (
    <img
      src={src!}
      alt={alt}
      loading={loading}
      className={className}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }}
      onError={() => setFailed(true)}
    />
  );
}
