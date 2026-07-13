import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const PUBLIC_UPLOAD_PREFIX = '/uploads';

async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/** Generates a short-ish unique id for filenames. */
function newId(): string {
  // Prefer a randomUUID (universally available in Node 18+ / Next 16 runtime).
  // Strip dashes and take 24 chars for a tidy, collision-resistant filename.
  try {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
}

/** Maps a data: URL's mime type to a file extension. */
function mimeToExt(mime: string): string {
  const m = (mime || '').toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  if (m.includes('avif')) return 'avif';
  return 'png';
}

/**
 * Decodes a `data:image/...;base64,...` URL, writes it to
 * `public/uploads/<id>.<ext>`, returns the public URL path.
 */
export async function saveDataUrl(
  dataUrl: string,
  ext?: string,
): Promise<string> {
  await ensureUploadDir();

  // Format: data:<mime>;base64,<payload>
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) {
    throw new Error('Invalid data URL: expected data:<mime>;base64,<payload>');
  }
  const mime = match[1];
  const payload = match[2];
  const fileExt = (ext || mimeToExt(mime)).toLowerCase();
  const id = newId();
  const filename = `${id}.${fileExt}`;
  const absPath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(absPath, Buffer.from(payload, 'base64'));
  return `${PUBLIC_UPLOAD_PREFIX}/${filename}`;
}

/**
 * Saves raw base64 (no data: prefix) as an image file, returns public URL.
 */
export async function saveBase64Image(
  base64: string,
  ext = 'png',
): Promise<string> {
  await ensureUploadDir();
  const id = newId();
  const filename = `${id}.${ext}`;
  const absPath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(absPath, Buffer.from(base64, 'base64'));
  return `${PUBLIC_UPLOAD_PREFIX}/${filename}`;
}

/**
 * Resolves a garment image input which may be EITHER a data URL OR a public
 * path string like `/discover/dress-1.png`. Returns the public URL path
 * (always under /uploads/ for stable references) and the raw image buffer.
 */
export async function resolveGarmentImage(
  input: string,
): Promise<{ urlPath: string; buffer: Buffer }> {
  await ensureUploadDir();

  // Data URL → save & return buffer
  if (input.startsWith('data:')) {
    const urlPath = await saveDataUrl(input);
    const absPath = path.join(process.cwd(), 'public', urlPath);
    const buffer = await fs.readFile(absPath);
    return { urlPath, buffer };
  }

  // Public path like "/discover/dress-1.png" or "/uploads/xxx.png"
  const cleanPath = input.startsWith('/') ? input : `/${input}`;
  const srcAbs = path.join(process.cwd(), 'public', cleanPath);

  // Read the source file and copy it into /uploads so wardrobe/history
  // references remain stable even if the discover assets change.
  let srcBuffer: Buffer;
  try {
    srcBuffer = await fs.readFile(srcAbs);
  } catch {
    throw new Error(`Garment image not found at path: ${cleanPath}`);
  }

  const parsed = path.extname(cleanPath).toLowerCase() || '.png';
  const ext = parsed.replace(/^\./, '') || 'png';
  const id = newId();
  const filename = `${id}.${ext}`;
  const destAbs = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(destAbs, srcBuffer);
  const urlPath = `${PUBLIC_UPLOAD_PREFIX}/${filename}`;
  return { urlPath, buffer: srcBuffer };
}
