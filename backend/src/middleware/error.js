import { HttpError } from '../lib/errors.js';

export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err?.code === 'P2002') {
    return res.status(409).json({ error: 'Duplicate value', details: err.meta?.target });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ error: 'Resource not found' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
