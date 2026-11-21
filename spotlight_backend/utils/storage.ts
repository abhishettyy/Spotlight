function getUploadSecret(): string {
  const secret = process.env.UPLOAD_SECRET;
  if (!secret) {
    throw new Error('Image storage is not configured (UPLOAD_SECRET is missing)');
  }
  return secret;
}

export async function uploadBase64Image(base64Str: string, folder: string): Promise<string> {
  if (!base64Str || !base64Str.startsWith('data:')) {
    return base64Str; 
  }

  const godaddyUploadUrl = process.env.GODADDY_UPLOAD_URL || 'https://spotlight.msritise.in/upload.php';
  const uploadSecret = getUploadSecret();

  if (godaddyUploadUrl) {
    try {
      console.log(`[Storage] Uploading image to GoDaddy: folder="${folder}"...`);
      let response: Response;
      try {
        response = await fetch(godaddyUploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Upload-Secret': uploadSecret,
          },
          body: JSON.stringify({
            action: 'upload',
            image: base64Str,
            folder: folder,
          }),
        });
      } catch (sslErr: any) {
        const httpUrl = godaddyUploadUrl.replace('https://', 'http://');
        console.warn(`[Storage] HTTPS attempt failed (${sslErr.message}). Retrying over HTTP: ${httpUrl}`);
        response = await fetch(httpUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Upload-Secret': uploadSecret,
          },
          body: JSON.stringify({
            action: 'upload',
            image: base64Str,
            folder: folder,
          }),
        });
      }

      const data: any = await response.json().catch(() => ({}));
      if (response.ok && data.url) {
        let finalUrl = data.url;
        if (finalUrl.includes('spotlight.msritise.in/uploads/')) {
          finalUrl = finalUrl.replace(/^https?:\/\/spotlight\.msritise\.in\/uploads\//, 'https://msritise.in/spotlight.msritise.in/uploads/');
        }
        console.log(`[Storage] Successfully uploaded to GoDaddy: ${finalUrl}`);
        return finalUrl;
      } else {
        console.warn(`[Storage] GoDaddy upload returned non-200 (${response.status}):`, data.error || 'Unknown error');
      }
    } catch (gdErr: any) {
      console.warn(`[Storage] GoDaddy upload endpoint unreachable (${gdErr.message})`);
    }
  }

  throw new Error('Image upload failed. Please try again.');
}

export async function deleteImage(publicUrl: string): Promise<boolean> {
  if (!publicUrl) return false;

  const godaddyUploadUrl = process.env.GODADDY_UPLOAD_URL || 'https://spotlight.msritise.in/upload.php';
  const uploadSecret = getUploadSecret();

  if (publicUrl.includes('/uploads/')) {
    try {
      const response = await fetch(godaddyUploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Upload-Secret': uploadSecret,
        },
        body: JSON.stringify({
          action: 'delete',
          url: publicUrl,
        }),
      });
      return response.ok;
    } catch (_) {
      return false;
    }
  }

  return false;
}
