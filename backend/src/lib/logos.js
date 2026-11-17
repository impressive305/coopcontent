import { z } from 'zod';
import { HttpError } from './errors.js';
import { prisma } from './prisma.js';

export const MAX_LOGO_BYTES = 300 * 1024;

// The type comes from the file's own bytes, never from the client. Only raster
// formats: SVG can carry scripts, so it is not accepted.
const detectType = (buf) => {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
};

// Accepts a data URL or bare base64 (the browser reads the file with FileReader).
export const logoUploadSchema = z.strictObject({
  image: z.string().max(Math.ceil((MAX_LOGO_BYTES * 4) / 3) + 100),
});

export const parseLogo = (image) => {
  const base64 = image.replace(/^data:image\/[a-z+.-]+;base64,/i, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new HttpError(400, 'Image must be base64 encoded');
  const data = Buffer.from(base64, 'base64');
  if (data.length > MAX_LOGO_BYTES) throw new HttpError(413, 'Logo must be 300 KB or smaller');
  const mimeType = detectType(data);
  if (!mimeType) throw new HttpError(400, 'Logo must be a PNG, JPEG or WebP image');
  return { data, mimeType };
};

export const saveLogo = (companyId, image) => {
  const logo = parseLogo(image);
  return prisma.companyLogo.upsert({
    where: { companyId },
    create: { companyId, ...logo },
    update: logo,
    select: { updatedAt: true },
  });
};

export const deleteLogo = (companyId) => prisma.companyLogo.deleteMany({ where: { companyId } });

// Lets responses say whether a company has a logo, and its version for cache busting.
export const logoVersionSelect = { logo: { select: { updatedAt: true } } };
export const logoVersion = (logo) => logo?.updatedAt.getTime() ?? null;
