import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

// POST /api/messages/upload — multipart image upload for a DM photo. Mirrors
// events/cover-upload but image-only. Returns the public Blob URL the client
// then sends as the message's imageUrl.
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Blob storage is not configured.' }, { status: 500 });
    }
    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) return NextResponse.json({ error: 'Missing file' }, { status: 400 });

    const mime = file.type;
    if (!ALLOWED_MIME.has(mime)) return NextResponse.json({ error: `Unsupported file type (${mime || 'unknown'})` }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image too large — max 8 MB.' }, { status: 413 });

    const ext = (mime.split('/')[1] || 'bin');
    const key = `dm-images/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const blob = await put(key, file, {
      access: 'public',
      contentType: mime,
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return NextResponse.json({ ok: true, url: blob.url });
  } catch (error) {
    console.error('messages/upload error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
