import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

let learnedApiBase: string | null = null;

export function rememberApiBase(origin: string) {
  if (!learnedApiBase) learnedApiBase = `${origin.replace(/\/+$/, '')}/api`;
}

function apiBase(): string {
  const configured = (process.env.PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  if (learnedApiBase) return learnedApiBase;
  throw new Error('Image storage is not configured (PUBLIC_API_URL is missing)');
}

type S3Config = { client: S3Client; bucket: string; publicUrl: string };
let s3Cache: S3Config | null | undefined;

function s3Config(): S3Config | null {
  if (s3Cache !== undefined) return s3Cache;
  const bucket = (process.env.S3_BUCKET || '').trim();
  if (!bucket) return (s3Cache = null);
  const publicUrl = (process.env.S3_PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (!publicUrl) throw new Error('Image storage is not configured (S3_PUBLIC_URL is missing)');
  const endpoint = (process.env.S3_ENDPOINT || '').trim() || undefined;
  const client = new S3Client({
    region: (process.env.S3_REGION || 'auto').trim(),
    endpoint,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
      : undefined,
  });
  return (s3Cache = { client, bucket, publicUrl });
}

function cleanFolder(folder: string): string {
  const clean = folder.toLowerCase().replace(/[^a-z0-9/_-]/g, '').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
  if (!clean || clean.split('/').some((part) => part === '..' || part === '.')) return 'misc';
  return clean;
}

async function uploadToGoDaddy(url: string, secret: string, base64Str: string, folder: string): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Upload-Secret': secret },
    body: JSON.stringify({ action: 'upload', image: base64Str, folder }),
  });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) throw new Error(data.error || `Upload failed (${response.status})`);
  return data.url;
}

export async function uploadBase64Image(base64Str: string, folder: string): Promise<string> {
  if (!base64Str || !base64Str.startsWith('data:')) {
    return base64Str;
  }

  const remoteUrl = process.env.GODADDY_UPLOAD_URL;
  const remoteSecret = process.env.UPLOAD_SECRET;
  if (remoteUrl && remoteSecret) {
    try {
      return await uploadToGoDaddy(remoteUrl, remoteSecret, base64Str, folder);
    } catch (err: any) {
      console.error('[Storage] Remote upload failed:', err.message);
      throw new Error('Image upload failed. Please try again.');
    }
  }

  const match = /^data:([a-z]+\/[a-z0-9.+-]+);base64,(.+)$/i.exec(base64Str);
  const ext = match ? IMAGE_TYPES[match[1].toLowerCase()] : undefined;
  if (!match || !ext) throw new Error('Please upload a PNG, JPG, WEBP or GIF image.');

  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0) throw new Error('The image is empty. Please choose another file.');
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error('The image is too large. Please use one under 8 MB.');

  const dir = cleanFolder(folder);
  const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`;

  const s3 = s3Config();
  if (s3) {
    const key = `${dir}/${name}`;
    try {
      await s3.client.send(new PutObjectCommand({
        Bucket: s3.bucket,
        Key: key,
        Body: bytes,
        ContentType: match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase(),
        CacheControl: 'public, max-age=2592000, immutable',
      }));
    } catch (err: any) {
      console.error('[Storage] Object storage upload failed:', err.message);
      throw new Error('Image upload failed. Please try again.');
    }
    return `${s3.publicUrl}/${key}`;
  }

  try {
    await fs.promises.mkdir(path.join(UPLOAD_DIR, dir), { recursive: true });
    await fs.promises.writeFile(path.join(UPLOAD_DIR, dir, name), bytes);
  } catch (err: any) {
    console.error('[Storage] Could not save image:', err.message);
    throw new Error('Image upload failed. Please try again.');
  }
  return `${apiBase()}/uploads/${dir}/${name}`;
}

export async function deleteImage(publicUrl: string): Promise<boolean> {
  if (!publicUrl) return false;

  const s3 = s3Config();
  if (s3 && publicUrl.startsWith(`${s3.publicUrl}/`)) {
    const key = decodeURIComponent(publicUrl.slice(s3.publicUrl.length + 1).split(/[?#]/)[0]);
    if (!key || key.includes('..')) return false;
    try {
      await s3.client.send(new DeleteObjectCommand({ Bucket: s3.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  const marker = '/uploads/';
  const at = publicUrl.indexOf(marker);
  if (at === -1) return false;

  const remoteUrl = process.env.GODADDY_UPLOAD_URL;
  const remoteSecret = process.env.UPLOAD_SECRET;
  let isLocal = false;
  try { isLocal = publicUrl.startsWith(`${apiBase()}${marker}`); } catch { isLocal = false; }

  if (isLocal) {
    const relative = decodeURIComponent(publicUrl.slice(at + marker.length).split(/[?#]/)[0]);
    const file = path.resolve(UPLOAD_DIR, relative);
    if (!file.startsWith(UPLOAD_DIR + path.sep)) return false;
    try {
      await fs.promises.unlink(file);
      return true;
    } catch {
      return false;
    }
  }

  if (remoteUrl && remoteSecret) {
    try {
      const response = await fetch(remoteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Upload-Secret': remoteSecret },
        body: JSON.stringify({ action: 'delete', url: publicUrl }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  return false;
}
