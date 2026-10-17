import { useEffect } from 'react';
import { BellOff, BellRing, Trash2, WifiOff } from 'lucide-react';
import { useNotificationsStore } from '@student/store/notificationsStore';
import { useNotificationPrefsStore } from '@student/store/notificationPrefsStore';
import { PageLoader } from '@student/components/ui/LoadingSpinner';
import { EmptyState } from '@student/components/ui/States';
import { formatDate } from '@student/utils/dateUtils';
import { toast } from 'sonner';

// Same buckets as NotificationsScreen._formatTime
function formatTime(dt?: Date | null): string {
  if (!dt) return '';
  const diffMs = Date.now() - dt.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return formatDate(dt).replace(/, \d{4}$/, '');
}

export default function NotificationsPage() {
  const { notifications, unreadCount, isLoading, error, load, markAllRead, markOneRead, remove } = useNotificationsStore();
  const { enabled, toggle } = useNotificationPrefsStore();

  useEffect(() => {
    load();
  }, []);

  const header = (subtitle?: string, action?: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', letterSpacing: '-1px' }}>Notifications</h1>
        {subtitle && <p style={{ color: 'var(--subtext)', fontSize: 14, marginTop: 4 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );

  if (!enabled) {
    return (
      <div className="stu-page stu-page--read">
        {header()}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 40px' }}>
          <div style={{ padding: 24, borderRadius: '50%', background: 'var(--raised)', display: 'flex' }}>
            <BellOff size={48} color="var(--subtext)" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginTop: 24 }}>Notifications are off</h3>
          <p style={{ fontSize: 14, color: 'var(--subtext)', lineHeight: 1.5, marginTop: 8, maxWidth: 340 }}>
            Enable notifications in your profile settings to stay updated on events and registrations.
          </p>
          <button
            onClick={toggle}
            className="btn-primary"
            style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <BellRing size={18} /> Enable Notifications
          </button>
        </div>
      </div>
    );
  }

  const handleMarkAllRead = async () => {
    await markAllRead();
    toast.success('All notifications marked as read');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await remove(id);
      toast('Notification deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const renderBody = () => {
    if (isLoading) return <PageLoader />;
    if (error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '48px 24px' }}>
          <WifiOff size={48} color="var(--subtext)" style={{ opacity: 0.6 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Could not load notifications</h3>
          <button onClick={load} className="btn-primary" style={{ padding: '8px 20px' }}>Retry</button>
        </div>
      );
    }
    if (notifications.length === 0) {
      return (
        <EmptyState
          svgSrc="/svg/empty_notifications.svg"
          svgWidth={210}
          title="No Notifications Yet"
          description="You're all caught up! We'll alert you here when new events, approvals, or updates arrive."
        />
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => { if (!n.isRead) markOneRead(n.id).catch(() => {}); }}
            style={{
              padding: 18,
              borderRadius: 20,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              cursor: n.isRead ? 'default' : 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <p style={{
                fontSize: 15, fontWeight: n.isRead ? 600 : 700, color: 'var(--text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
              }}>
                {n.title}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--sk-faint)' }}>{formatTime(n.createdAt)}</span>
                <button
                  onClick={(e) => handleDelete(n.id, e)}
                  aria-label="Delete notification"
                  title="Delete notification"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--subtext)', padding: 2, display: 'flex' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <p style={{ flex: 1, fontSize: 13, color: 'var(--subtext)', lineHeight: 1.5 }}>{n.body}</p>
              {!n.isRead && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5252', flexShrink: 0 }} />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="stu-page stu-page--read">
      {header(
        isLoading ? 'Loading...' : unreadCount > 0 ? `${unreadCount} unread` : 'All caught up',
        unreadCount > 0 ? (
          <button
            onClick={handleMarkAllRead}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '8px 16px',
              cursor: 'pointer',
              color: 'var(--subtext)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Mark all read
          </button>
        ) : undefined,
      )}
      {renderBody()}
    </div>
  );
}
