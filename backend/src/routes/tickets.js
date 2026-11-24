import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, notFound } from '../lib/errors.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

// Support tickets: users ask the system administrators for help (technical
// problems or how-to questions) and the admins answer in the same thread.

export const TICKET_CATEGORIES = ['TECHNICAL', 'GUIDANCE', 'OTHER'];
export const TICKET_STATUSES = ['OPEN', 'ANSWERED', 'CLOSED'];
// One account cannot flood the queue: unresolved tickets per user, and messages per ticket.
export const MAX_OPEN_TICKETS = 5;
export const MAX_MESSAGES = 200;

const messageBody = z.string().trim().min(2).max(5000);
const createSchema = z.strictObject({
  subject: z.string().trim().min(3).max(150),
  category: z.enum(TICKET_CATEGORIES),
  body: z.string().trim().min(10).max(5000),
});
const messageSchema = z.strictObject({ body: messageBody });

const ticketId = (req) => {
  const id = Number(req.params.id);
  // Anything that is not a plain positive id is treated as a ticket that does not exist.
  if (!Number.isSafeInteger(id) || id <= 0) throw notFound('Ticket');
  return id;
};

// Writes are throttled per account (not per IP), after authentication.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user.id}`,
  // Same JSON shape as every other API error.
  message: { error: 'Too many requests' },
  skip: () => process.env.NODE_ENV === 'test',
});

const summary = { id: true, subject: true, category: true, status: true, createdAt: true, updatedAt: true, closedAt: true, _count: { select: { messages: true } } };

const assertRoom = async (id) => {
  if ((await prisma.ticketMessage.count({ where: { ticketId: id } })) >= MAX_MESSAGES) {
    throw new HttpError(409, 'Ticket has reached its message limit');
  }
};

// ---------- The user's own tickets ----------

export const ticketRoutes = Router();
// Admins answer tickets; they do not open them.
ticketRoutes.use(authenticate, requireRole('STUDENT', 'COMPANY', 'SUPERVISOR'));

// The user sees who wrote each message (them or the support team), not which admin.
const ownThread = {
  ...summary,
  messages: { orderBy: { id: 'asc' }, select: { id: true, body: true, fromStaff: true, createdAt: true } },
};

const loadOwn = async (req, select = ownThread) => {
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId(req), authorId: req.user.id }, select });
  // Someone else's ticket answers exactly like a missing one.
  if (!ticket) throw notFound('Ticket');
  return ticket;
};

ticketRoutes.get('/', async (req, res) => {
  res.json(await prisma.ticket.findMany({ where: { authorId: req.user.id }, select: summary, orderBy: { updatedAt: 'desc' } }));
});

ticketRoutes.post('/', writeLimiter, validate(createSchema), async (req, res) => {
  const open = await prisma.ticket.count({ where: { authorId: req.user.id, status: { not: 'CLOSED' } } });
  if (open >= MAX_OPEN_TICKETS) throw new HttpError(429, 'Too many open tickets');
  const { subject, category, body } = req.body;
  const ticket = await prisma.ticket.create({
    data: { authorId: req.user.id, subject, category, messages: { create: { authorId: req.user.id, fromStaff: false, body } } },
    select: ownThread,
  });
  res.status(201).json(ticket);
});

ticketRoutes.get('/:id', async (req, res) => {
  res.json(await loadOwn(req));
});

// A reply puts the ticket back in the admins' queue.
ticketRoutes.post('/:id/messages', writeLimiter, validate(messageSchema), async (req, res) => {
  const ticket = await loadOwn(req, { id: true, status: true });
  if (ticket.status === 'CLOSED') throw new HttpError(409, 'Ticket is closed');
  await assertRoom(ticket.id);
  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: 'OPEN', messages: { create: { authorId: req.user.id, fromStaff: false, body: req.body.body } } },
    select: ownThread,
  });
  res.status(201).json(updated);
});

ticketRoutes.patch('/:id/close', async (req, res) => {
  const ticket = await loadOwn(req, { id: true, status: true });
  if (ticket.status === 'CLOSED') throw new HttpError(409, 'Ticket is closed');
  res.json(await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'CLOSED', closedAt: new Date() }, select: ownThread }));
});

// ---------- The administrators' queue ----------

export const adminTicketRoutes = Router();
adminTicketRoutes.use(authenticate, requireRole('ADMIN'));

const author = { select: { id: true, name: true, email: true, role: true } };
const staffThread = {
  ...summary,
  author,
  messages: { orderBy: { id: 'asc' }, select: { id: true, body: true, fromStaff: true, createdAt: true, author: { select: { id: true, name: true } } } },
};

const loadAny = async (req, select = staffThread) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId(req) }, select });
  if (!ticket) throw notFound('Ticket');
  return ticket;
};

adminTicketRoutes.get('/', validate(z.object({ status: z.enum(TICKET_STATUSES).optional() }), 'query'), async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { status: req.validQuery.status },
    select: { ...summary, author },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(tickets);
});

adminTicketRoutes.get('/:id', async (req, res) => {
  res.json(await loadAny(req));
});

// An answer hands the ticket back to the user. A closed ticket is reopened first.
adminTicketRoutes.post('/:id/messages', writeLimiter, validate(messageSchema), async (req, res) => {
  const ticket = await loadAny(req, { id: true, status: true });
  if (ticket.status === 'CLOSED') throw new HttpError(409, 'Ticket is closed');
  await assertRoom(ticket.id);
  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: 'ANSWERED', messages: { create: { authorId: req.user.id, fromStaff: true, body: req.body.body } } },
    select: staffThread,
  });
  res.status(201).json(updated);
});

adminTicketRoutes.patch('/:id/status', validate(z.strictObject({ status: z.enum(TICKET_STATUSES) })), async (req, res) => {
  const ticket = await loadAny(req, { id: true });
  const { status } = req.body;
  res.json(await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status, closedAt: status === 'CLOSED' ? new Date() : null },
    select: staffThread,
  }));
});
