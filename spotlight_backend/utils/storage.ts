import crypto from 'crypto';

export async function uploadBase64Image(base64Str: string, folder: string): Promise<string> {
  if (!base64Str || !base64Str.startsWith('data:')) {
    return base64Str; 
  }

  // 1. Try GoDaddy Web Folder Upload first (saves to public_html/spotlight.msritise.in/uploads/)
  const godaddyUploadUrl = process.env.GODADDY_UPLOAD_URL || 'https://spotlight.msritise.in/upload.php';
  const uploadSecret = process.env.UPLOAD_SECRET || process.env.ADMIN_SECRET || 'spotlightDev@sam2005';

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
        // Fallback to HTTP if HTTPS certificate is still issuing on GoDaddy
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
      console.warn(`[Storage] GoDaddy upload endpoint unreachable (${gdErr.message}). Checking Supabase fallback...`);
    }
  }

  // 2. Fallback to Supabase Storage if configured
  const rawSupabaseUrl = process.env.SUPABASE_URL || 'https://flmxldwdbqbyrokmglus.supabase.co';
  const supabaseUrl = rawSupabaseUrl.replace(/[\r\n\s]+/g, '').trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.replace(/[\r\n\s]+/g, '').trim() : undefined;

  if (supabaseKey) {
    try {
      const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        let extension = 'jpg';
        if (mimeType.includes('png')) extension = 'png';
        else if (mimeType.includes('gif')) extension = 'gif';
        else if (mimeType.includes('webp')) extension = 'webp';
        else if (mimeType.includes('svg')) extension = 'svg';

        const filename = `${folder}/${crypto.randomUUID()}.${extension}`;
        const bucket = 'spotlight-images';
        const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filename}`;

        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': mimeType,
            'x-upsert': 'true',
          },
          body: buffer,
        });

        if (response.ok) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;
          console.log(`[Storage] Successfully uploaded to Supabase: ${publicUrl}`);
          return publicUrl;
        }
      }
    } catch (sbErr) {
      console.error('[Storage] Error uploading image to Supabase:', sbErr);
    }
  }

  // 3. Fallback to original base64 string
  return base64Str;
}

export async function deleteImage(publicUrl: string): Promise<boolean> {
  if (!publicUrl) return false;

  // 1. Try GoDaddy deletion
  const godaddyUploadUrl = process.env.GODADDY_UPLOAD_URL || 'https://spotlight.msritise.in/upload.php';
  const uploadSecret = process.env.UPLOAD_SECRET || process.env.ADMIN_SECRET || 'spotlightDev@sam2005';

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

  // 2. Supabase deletion
  const rawSupabaseUrl = process.env.SUPABASE_URL || 'https://flmxldwdbqbyrokmglus.supabase.co';
  const supabaseUrl = rawSupabaseUrl.replace(/[\r\n\s]+/g, '').trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.replace(/[\r\n\s]+/g, '').trim() : undefined;

  if (supabaseKey && publicUrl.includes('supabase.co')) {
    try {
      const bucketPrefix = '/storage/v1/object/public/spotlight-images/';
      const index = publicUrl.indexOf(bucketPrefix);
      if (index !== -1) {
        const filename = publicUrl.substring(index + bucketPrefix.length);
        const bucket = 'spotlight-images';
        const deleteUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filename}`;

        const response = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
          },
        });
        return response.ok;
      }
    } catch (_) {
      return false;
    }
  }

  return false;
}
