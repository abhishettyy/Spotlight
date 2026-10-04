import { useEffect } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useNotificationsStore } from '@/store/notificationsStore';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/States';
import { timeAgo } from '@/utils/dateUtils';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const { notifications, unreadCount, isLoading, load, markAllRead, markOneRead, remove } = useNotificationsStore();

  useEffect(() => {
    load();
  }, []);

  const handleMarkAllRead = async () => {
    await markAllRead();
    toast.success('All notifications marked as read.');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await remove(id);
  };

  const handleMarkOne = async (id: string, isRead: boolean) => {
    if (!isRead) {
      await markOneRead(id);
    }
  };

  if (isLoading && notifications.length === 0) return <PageLoader />;

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p style={{ color: 'var(--subtext)', fontSize: 14, marginTop: 2 }}>
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '8px 14px',
              cursor: 'pointer',
              color: 'var(--subtext)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <CheckCheck size={15} /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          svgSrc="/svg/empty_notifications.svg"
          title="No Notifications Yet"
          description="You're all caught up! We'll alert you here when new events, approvals, or updates arrive."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleMarkOne(n.id, n.isRead)}
              style={{
                display: 'flex',
                gap: 14,
                padding: '14px 16px',
                borderRadius: 14,
                background: n.isRead ? 'var(--surface)' : 'var(--color-crimson-dim)',
                border: `1px solid ${n.isRead ? 'var(--border)' : 'rgba(230,57,70,0.2)'}`,
                cursor: 'pointer',
                transition: 'opacity 0.2s ease',
                position: 'relative',
              }}
            >
              {/* Unread dot */}
              {!n.isRead && (
                <div
                  style={{
                    position: 'absolute',
                    top: 14,
                    left: 14,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--color-crimson)',
                    flexShrink: 0,
                  }}
                />
              )}

              {/* Icon */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: n.isRead ? 'var(--border)' : 'rgba(230,57,70,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginLeft: !n.isRead ? 12 : 0,
                }}
              >
                <Bell size={18} color={n.isRead ? 'var(--subtext)' : 'var(--color-crimson)'} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: n.isRead ? 500 : 700,
                    color: 'var(--text)',
                    marginBottom: 3,
                    lineHeight: 1.4,
                  }}
                >
                  {n.title}
                </p>
                {n.body && (
                  <p style={{ fontSize: 13, color: 'var(--subtext)', lineHeight: 1.5 }}>{n.body}</p>
                )}
                <p style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 6 }}>
                  {timeAgo(n.createdAt ?? null)}
                </p>
              </div>

              {/* Delete */}
              <button
                onClick={(e) => handleDelete(n.id, e)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--subtext)',
                  padding: 4,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'flex-start',
                }}
                title="Delete notification"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
