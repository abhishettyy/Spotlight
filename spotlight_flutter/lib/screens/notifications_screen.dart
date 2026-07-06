import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../core/notifications_provider.dart';
import '../core/notification_prefs_provider.dart';
import '../models/models.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    // Load on open
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<NotificationsProvider>(context, listen: false).load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final subText = isDark ? const Color(0xFFA0A0A0) : Colors.grey[400]!;

    return Scaffold(
      body: SafeArea(
        child: Consumer2<NotificationsProvider, NotificationPrefsProvider>(
          builder: (context, provider, prefs, _) {
            // ── Notifications disabled ────────────────────────
            if (!prefs.enabled) {
              return Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Row(
                      children: [
                        Text('Notifications',
                            style: GoogleFonts.inter(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: cs.onBackground,
                                letterSpacing: -1)),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 40),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? const Color(0xFF1E1E1E)
                                    : Colors.grey[100],
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                Icons.notifications_off_outlined,
                                size: 48,
                                color: subText,
                              ),
                            ),
                            const SizedBox(height: 24),
                            Text('Notifications are off',
                                style: GoogleFonts.inter(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: cs.onBackground)),
                            const SizedBox(height: 8),
                            Text(
                              'Enable notifications in your profile settings to stay updated on events and registrations.',
                              style: GoogleFonts.inter(
                                  fontSize: 14,
                                  color: subText,
                                  height: 1.5),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 28),
                            ElevatedButton.icon(
                              onPressed: () => prefs.toggle(),
                              icon: const Icon(Icons.notifications_active_outlined,
                                  size: 18, color: Colors.white),
                              label: Text('Enable Notifications',
                                  style: GoogleFonts.inter(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: cs.primary,
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 24, vertical: 14),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              );
            }

            // ── Notifications enabled ─────────────────────────
            return Column(
              children: [
                // ── Header ──────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Notifications',
                              style: GoogleFonts.inter(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: cs.onBackground,
                                  letterSpacing: -1)),
                          const SizedBox(height: 4),
                          Text(
                            provider.isLoading
                                ? 'Loading...'
                                : provider.unreadCount > 0
                                    ? '${provider.unreadCount} unread'
                                    : 'All caught up',
                            style: GoogleFonts.inter(
                                fontSize: 14, color: subText),
                          ),
                        ],
                      ),
                      if (provider.unreadCount > 0)
                        GestureDetector(
                          onTap: () async {
                            await provider.markAllRead();
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: const Text(
                                      'All notifications marked as read'),
                                  backgroundColor: cs.primary,
                                  behavior: SnackBarBehavior.floating,
                                  shape: RoundedRectangleBorder(
                                      borderRadius:
                                          BorderRadius.circular(12)),
                                ),
                              );
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 8),
                            decoration: BoxDecoration(
                              border: Border.all(
                                  color: isDark
                                      ? Colors.white24
                                      : Colors.grey[300]!),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text('Mark all read',
                                style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: subText)),
                          ),
                        ),
                    ],
                  ),
                ),

                // ── Content ─────────────────────────────────────
                Expanded(
                  child: provider.isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : provider.error.isNotEmpty
                          ? _buildError(context, provider)
                          : provider.notifications.isEmpty
                              ? _buildEmpty(context)
                              : RefreshIndicator(
                                  onRefresh: provider.load,
                                  child: ListView.builder(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 24.0),
                                    itemCount:
                                        provider.notifications.length + 1,
                                    itemBuilder: (context, index) {
                                      if (index ==
                                          provider.notifications.length) {
                                        return const SizedBox(height: 100);
                                      }
                                      final n = provider.notifications[index];
                                      return Dismissible(
                                        key: Key(n.id),
                                        direction: DismissDirection.startToEnd,
                                        background: Container(
                                          margin: const EdgeInsets.only(bottom: 14),
                                          decoration: BoxDecoration(
                                            color: Colors.red.withOpacity(0.15),
                                            borderRadius: BorderRadius.circular(20),
                                          ),
                                          alignment: Alignment.centerLeft,
                                          padding: const EdgeInsets.only(left: 20),
                                          child: const Icon(
                                            Icons.delete_outline_rounded,
                                            color: Colors.redAccent,
                                            size: 24,
                                          ),
                                        ),
                                        onDismissed: (direction) {
                                          provider.deleteNotification(n.id);
                                        },
                                        child: GestureDetector(
                                          onTap: () {
                                            if (!n.isRead) {
                                              provider.markAsRead(n.id);
                                            }
                                          },
                                          child: _buildCard(context, n),
                                        ),
                                      );
                                    },
                                  ),
                                ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildEmpty(BuildContext context) {
    final subText = Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFFA0A0A0)
        : Colors.grey[400]!;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.notifications_none_rounded,
              size: 56, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text('No notifications yet',
              style: GoogleFonts.inter(
                  color: subText,
                  fontSize: 16,
                  fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildError(
      BuildContext context, NotificationsProvider provider) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.wifi_off_rounded, size: 48, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text('Could not load notifications',
              style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
          const SizedBox(height: 20),
          ElevatedButton(
              onPressed: provider.load, child: const Text('Retry')),
        ],
      ),
    );
  }

  Widget _buildCard(BuildContext context, NotificationModel n) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardColor = isDark ? const Color(0xFF1E1E1E) : Colors.white;
    final subText = isDark ? const Color(0xFFA0A0A0) : Colors.grey[500]!;
    final timeText = isDark ? const Color(0xFF808080) : Colors.grey[400]!;
    final borderColor = isDark ? Colors.white12 : Colors.grey[200]!;

    final timeAgo = _formatTime(n.createdAt);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    n.title,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: n.isRead ? FontWeight.w600 : FontWeight.bold,
                      color: cs.onBackground,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  timeAgo,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: timeText,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: Text(
                    n.body,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: subText,
                      height: 1.5,
                    ),
                  ),
                ),
                if (!n.isRead) ...[
                  const SizedBox(width: 12),
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Colors.redAccent,
                      shape: BoxShape.circle,
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime? dt) {
    if (dt == null) return '';
    final now = DateTime.now();
    final diff = now.difference(dt);

    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return DateFormat('MMM d').format(dt);
  }
}
