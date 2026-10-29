import 'package:flutter/material.dart';
import '../core/sk_colors.dart';
import 'home_screen.dart';
import 'clubs_screen.dart';
import 'ticket_screen.dart';
import 'profile_screen.dart';

import '../widgets/offline_banner.dart';

class MainLayout extends StatefulWidget {
  const MainLayout({Key? key}) : super(key: key);

  @override
  _MainLayoutState createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const HomeScreen(),
    const TicketScreen(),
    const ClubsScreen(),
    const ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    final sysBottom = mq.viewPadding.bottom > mq.padding.bottom
        ? mq.viewPadding.bottom
        : mq.padding.bottom;

    // Android 3-button navigation bar height is ~48-56dp.
    // When reported, float 16dp above it.
    // When unreported (or on 3-button devices with 0 insets), use 68.0
    // so the navbar is lifted 50% up and never collides with system buttons.
    final double navBottom = sysBottom >= 48 ? (sysBottom + 16) : 68.0;

    final sk = Sk.of(context);

    return Scaffold(
      body: Stack(
        children: [
          _screens[_currentIndex],
          const Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: OfflineBanner(),
          ),
          Positioned(
            bottom: navBottom,
            left: 24,
            right: 24,
            child: Container(
              height: 70,
              // Web bottom nav: surface, line border, large shadow (light only)
              decoration: BoxDecoration(
                color: sk.surface,
                borderRadius: BorderRadius.circular(35),
                border: Border.all(color: sk.line),
                boxShadow: sk.shadowLg,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildNavItem(0, Icons.home_rounded, 'Home'),
                  _buildNavItem(1, Icons.local_activity_outlined, 'My Events'),
                  _buildNavItem(2, Icons.groups_outlined, 'Clubs'),
                  _buildNavItem(3, Icons.person_outline_rounded, 'Profile'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label, {int? badge}) {
    final isSelected = _currentIndex == index;
    final sk = Sk.of(context);
    // Active tab is an inverse pill (text colour fill, page colour content), like the web
    final activeContent = sk.canvas;

    return GestureDetector(
      onTap: () => setState(() => _currentIndex = index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: isSelected 
            ? const EdgeInsets.symmetric(horizontal: 20, vertical: 12)
            : const EdgeInsets.all(12),
        decoration: isSelected
            ? BoxDecoration(
                color: sk.fg,
                borderRadius: BorderRadius.circular(24),
              )
            : const BoxDecoration(),
        child: Row(
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  icon,
                  color: isSelected ? activeContent : sk.muted,
                  size: 24,
                ),
                if (badge != null && !isSelected)
                  Positioned(
                    right: -4,
                    top: -4,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: sk.brand,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        badge.toString(),
                        style: TextStyle(
                          color: Sk.of(context).onBrand,
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            if (isSelected) ...[
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  color: activeContent,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
              if (badge != null) ...[
                const SizedBox(width: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: sk.brand,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    badge.toString(),
                    style: TextStyle(color: Sk.of(context).onBrand, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                )
              ]
            ]
          ],
        ),
      ),
    );
  }
}
