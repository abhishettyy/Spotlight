// Convert image file to base64 string for payment proof upload
// Equivalent to Flutter's image_picker + base64 encoding

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function getImageFallback(url?: string | null): string {
  if (!url) return '';
  // If URL starts with http/https, use as is
  if (url.startsWith('http')) return url;
  // Otherwise return empty (will show fallback)
  return '';
}

export function buildAvatarInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
