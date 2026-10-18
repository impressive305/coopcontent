import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import opportunityRoutes from './routes/opportunities.js';
import applicationRoutes from './routes/applications.js';
import placementRoutes from './routes/placements.js';
import reportRoutes from './routes/reports.js';
import { errorHandler } from './middleware/error.js';

export const createApp = () => {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:3000' }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });
  app.use('/api/auth', process.env.NODE_ENV === 'test' ? [] : authLimiter, authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/opportunities', opportunityRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/placements', placementRoutes);
  app.use('/api', reportRoutes);

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
};
