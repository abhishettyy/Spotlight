import crypto from 'crypto';

export async function uploadBase64Image(base64Str: string, folder: string): Promise<string> {
  if (!base64Str || !base64Str.startsWith('data:')) {
    return base64Str; 
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://flmxldwdbqbyrokmglus.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.warn('[Storage] Warning: SUPABASE_SERVICE_ROLE_KEY is not defined in .env. Image upload will fallback to original value.');
    return base64Str;
  }

  try {

    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 data URI format');
    }

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

    console.log(`[Storage] Uploading image to Supabase: ${filename} (${buffer.length} bytes)`);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': mimeType,
        'x-upsert': 'true',
      },
      body: buffer,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase Storage upload failed (${response.status}): ${errText}`);
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;
    console.log(`[Storage] Successfully uploaded. Public URL: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('[Storage] Error uploading image to Supabase:', error);

    return base64Str;
  }
}

export async function deleteImage(publicUrl: string): Promise<boolean> {
  if (!publicUrl) return false;

  const supabaseUrl = process.env.SUPABASE_URL || 'https://flmxldwdbqbyrokmglus.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.warn('[Storage] Warning: SUPABASE_SERVICE_ROLE_KEY is not defined. Cannot delete image.');
    return false;
  }

  try {
    const bucketPrefix = '/storage/v1/object/public/spotlight-images/';
    const index = publicUrl.indexOf(bucketPrefix);
    if (index === -1) {
      console.warn('[Storage] URL does not match Supabase Storage format. Skipping deletion:', publicUrl);
      return false;
    }

    const filename = publicUrl.substring(index + bucketPrefix.length);
    const bucket = 'spotlight-images';
    const deleteUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filename}`;

    console.log(`[Storage] Deleting image from Supabase: ${filename}`);

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase Storage delete failed (${response.status}): ${errText}`);
    }

    console.log('[Storage] Successfully deleted image from Supabase');
    return true;
  } catch (error) {
    console.error('[Storage] Error deleting image from Supabase:', error);
    return false;
  }
}
