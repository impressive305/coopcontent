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
import planRoutes from './routes/plans.js';
import studentRoutes from './routes/students.js';
import companyRoutes from './routes/companies.js';
import logoRoutes from './routes/logos.js';
import { adminTicketRoutes, ticketRoutes } from './routes/tickets.js';
import { errorHandler } from './middleware/error.js';
import { allowedOrigins, requireTrustedOrigin } from './middleware/origin.js';

// throttleAuth is off in tests so suites can log in freely; a test turns it on to check the limiter.
export const createApp = ({ throttleAuth = process.env.NODE_ENV !== 'test' } = {}) => {
  const app = express();
  app.use(helmet());
  // credentials: the session cookie travels with requests from the frontend.
  app.use(cors({ origin: allowedOrigins(), credentials: true }));
  app.use(requireTrustedOrigin);
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: true,
    legacyHeaders: false,
    // Same JSON shape as every other API error, so the frontend can translate it.
    message: { error: 'Too many requests' },
  });
  app.use('/api/auth', throttleAuth ? authLimiter : [], authRoutes);
  // Before /api/admin: it has its own admin-only guard.
  app.use('/api/admin/tickets', adminTicketRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/opportunities', opportunityRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/placements', placementRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/logos', logoRoutes);
  app.use('/api', reportRoutes);

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
};
