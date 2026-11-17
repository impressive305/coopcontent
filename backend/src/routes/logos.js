import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';

// Public, because <img> tags cannot send a token. Only verified companies'
// logos are served, so an unreviewed account cannot use us to host images.
const router = Router();

router.get('/:companyId', async (req, res) => {
  const companyId = Number(req.params.companyId);
  if (!Number.isInteger(companyId) || companyId <= 0) throw notFound('Logo');
  const logo = await prisma.companyLogo.findFirst({ where: { companyId, company: { verified: true } } });
  if (!logo) throw notFound('Logo');
  res.set({
    'Content-Type': logo.mimeType,
    'Content-Length': logo.data.length,
    'Content-Security-Policy': "default-src 'none'",
    'Cross-Origin-Resource-Policy': 'cross-origin',
    // URLs carry ?v=<updatedAt>, so a new upload gets a new URL.
    'Cache-Control': 'public, max-age=86400',
  });
  res.end(logo.data);
});

export default router;
