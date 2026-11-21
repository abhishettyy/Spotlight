export function getImageFallback(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return '';
}

export function buildAvatarInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
