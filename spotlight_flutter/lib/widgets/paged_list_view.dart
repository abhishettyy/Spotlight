import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/sk_colors.dart';

class PagedListView<T> extends StatefulWidget {
  final List<T> items;
  final Widget Function(BuildContext context, T item) itemBuilder;
  final int pageSize;
  final double spacing;
  final EdgeInsetsGeometry padding;
  final Object? resetKey;

  const PagedListView({
    super.key,
    required this.items,
    required this.itemBuilder,
    this.pageSize = 12,
    this.spacing = 12,
    this.padding = EdgeInsets.zero,
    this.resetKey,
  });

  @override
  State<PagedListView<T>> createState() => _PagedListViewState<T>();
}

class _PagedListViewState<T> extends State<PagedListView<T>> {
  final ScrollController _scroll = ScrollController();
  int _page = 0;

  @override
  void didUpdateWidget(covariant PagedListView<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.resetKey != widget.resetKey) _page = 0;
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  int get _totalPages => widget.items.isEmpty ? 1 : (widget.items.length / widget.pageSize).ceil();

  void _goTo(int page) {
    setState(() => _page = page);
    if (_scroll.hasClients) {
      _scroll.animateTo(0, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
    }
  }

  @override
  Widget build(BuildContext context) {
    final current = _page.clamp(0, _totalPages - 1);
    final start = current * widget.pageSize;
    final end = (start + widget.pageSize).clamp(0, widget.items.length);
    final pageItems = widget.items.sublist(start, end);
    final showPager = _totalPages > 1;

    return ListView.separated(
      controller: _scroll,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: widget.padding,
      itemCount: pageItems.length + (showPager ? 1 : 0),
      separatorBuilder: (context, index) => SizedBox(height: widget.spacing),
      itemBuilder: (context, i) {
        if (i == pageItems.length) {
          return Padding(
            padding: const EdgeInsets.only(top: 8),
            child: PagerBar(
              page: current,
              totalPages: _totalPages,
              from: start + 1,
              to: end,
              total: widget.items.length,
              onPage: _goTo,
            ),
          );
        }
        return widget.itemBuilder(context, pageItems[i]);
      },
    );
  }
}

class PagerBar extends StatelessWidget {
  final int page;
  final int totalPages;
  final int from;
  final int to;
  final int total;
  final ValueChanged<int> onPage;

  const PagerBar({
    super.key,
    required this.page,
    required this.totalPages,
    required this.from,
    required this.to,
    required this.total,
    required this.onPage,
  });

  @override
  Widget build(BuildContext context) {
    final sk = Sk.of(context);

    final numbers = <int?>[];
    for (var n = 0; n < totalPages; n++) {
      if (n == 0 || n == totalPages - 1 || (n - page).abs() <= 1) {
        numbers.add(n);
      } else if (numbers.isNotEmpty && numbers.last != null) {
        numbers.add(null);
      }
    }

    Widget button({required Widget child, required VoidCallback? onTap, bool active = false, String? label}) {
      final enabled = onTap != null;
      return Semantics(
        button: true,
        label: label,
        selected: active,
        child: Opacity(
          opacity: enabled || active ? 1 : 0.4,
          child: Material(
            color: active ? sk.brand : sk.surface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
              side: BorderSide(color: active ? sk.brand : sk.line),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(8),
              onTap: onTap,
              child: SizedBox(
                height: 36,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: 36),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    child: Center(child: child),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    final numberStyle = GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600);

    return Column(
      children: [
        Text('$from–$to of $total', style: GoogleFonts.inter(fontSize: 13, color: sk.muted)),
        const SizedBox(height: 10),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 6,
          runSpacing: 6,
          children: [
            button(
              label: 'Previous page',
              onTap: page > 0 ? () => onPage(page - 1) : null,
              child: Icon(Icons.chevron_left_rounded, size: 20, color: sk.fg),
            ),
            for (final n in numbers)
              n == null
                  ? SizedBox(
                      height: 36,
                      child: Center(child: Text('…', style: numberStyle.copyWith(color: sk.muted))),
                    )
                  : button(
                      label: 'Page ${n + 1}',
                      active: n == page,
                      onTap: n == page ? null : () => onPage(n),
                      child: Text('${n + 1}', style: numberStyle.copyWith(color: n == page ? sk.onBrand : sk.fg)),
                    ),
            button(
              label: 'Next page',
              onTap: page < totalPages - 1 ? () => onPage(page + 1) : null,
              child: Icon(Icons.chevron_right_rounded, size: 20, color: sk.fg),
            ),
          ],
        ),
      ],
    );
  }
}
