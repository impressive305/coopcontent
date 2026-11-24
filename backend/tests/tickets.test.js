import { MAX_OPEN_TICKETS } from '../src/routes/tickets.js';
import { api, auth, createStaff, prisma, rawApi, resetDb, sessionOf } from './setup.js';

const student = {
  name: 'Noura',
  email: 'noura@example.com',
  password: 'Coop-Train-2026',
  universityId: '441000123',
  university: 'KSU',
  major: 'Computer Science',
};

const ticket = { subject: 'Cannot upload my report', category: 'TECHNICAL', body: 'The upload button does nothing when I click it.' };

const register = async (overrides = {}) => sessionOf(await api().post('/api/auth/register/student').send({ ...student, ...overrides }));

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('support tickets', () => {
  test('a user opens a ticket, the admin answers, the user replies and closes it', async () => {
    const admin = await createStaff('ADMIN', 'admin@example.com');
    const s = await register();

    const created = await api().post('/api/tickets').set(auth(s)).send(ticket);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ subject: ticket.subject, status: 'OPEN', messages: [{ body: ticket.body, fromStaff: false }] });
    const id = created.body.id;

    // It reaches the admins' queue and the open count.
    expect((await api().get('/api/admin/stats').set(auth(admin))).body.openTickets).toBe(1);
    const queue = await api().get('/api/admin/tickets?status=OPEN').set(auth(admin));
    expect(queue.body).toHaveLength(1);
    expect(queue.body[0].author).toMatchObject({ name: 'Noura', email: student.email, role: 'STUDENT' });

    const answered = await api().post(`/api/admin/tickets/${id}/messages`).set(auth(admin)).send({ body: 'Please try again after refreshing the page.' });
    expect(answered.status).toBe(201);
    expect(answered.body.status).toBe('ANSWERED');
    expect(answered.body.messages.at(-1)).toMatchObject({ fromStaff: true, author: { name: 'ADMIN' } });

    // The user sees the answer as the support team's, without the admin's identity.
    const mine = await api().get(`/api/tickets/${id}`).set(auth(s));
    expect(mine.body.messages.at(-1)).toEqual({ id: expect.any(Number), body: 'Please try again after refreshing the page.', fromStaff: true, createdAt: expect.any(String) });
    expect(mine.body.author).toBeUndefined();

    // A reply goes back to the queue; closing ends the thread for the user.
    expect((await api().post(`/api/tickets/${id}/messages`).set(auth(s)).send({ body: 'Still failing.' })).body.status).toBe('OPEN');
    expect((await api().patch(`/api/tickets/${id}/close`).set(auth(s))).body.status).toBe('CLOSED');
    expect((await api().post(`/api/tickets/${id}/messages`).set(auth(s)).send({ body: 'One more thing' })).status).toBe(409);
    expect((await api().post(`/api/admin/tickets/${id}/messages`).set(auth(admin)).send({ body: 'Reply' })).status).toBe(409);

    // Only the admin reopens it.
    const reopened = await api().patch(`/api/admin/tickets/${id}/status`).set(auth(admin)).send({ status: 'OPEN' });
    expect(reopened.body).toMatchObject({ status: 'OPEN', closedAt: null });
  });

  test('tickets are private to their author and the admins', async () => {
    const admin = await createStaff('ADMIN', 'admin@example.com');
    const owner = await register();
    const other = await register({ email: 'other@example.com', universityId: '441000999' });
    const id = (await api().post('/api/tickets').set(auth(owner)).send(ticket)).body.id;

    // Another user cannot read, reply to or close it, and cannot tell it exists.
    expect((await api().get(`/api/tickets/${id}`).set(auth(other))).status).toBe(404);
    expect((await api().post(`/api/tickets/${id}/messages`).set(auth(other)).send({ body: 'Hijack' })).status).toBe(404);
    expect((await api().patch(`/api/tickets/${id}/close`).set(auth(other))).status).toBe(404);
    expect((await api().get('/api/tickets').set(auth(other))).body).toEqual([]);
    expect((await api().get('/api/tickets/999999').set(auth(other))).status).toBe(404);
    expect((await api().get('/api/tickets/abc').set(auth(other))).status).toBe(404);

    // Users cannot reach the admin queue; admins do not open tickets.
    expect((await api().get('/api/admin/tickets').set(auth(owner))).status).toBe(403);
    expect((await api().get(`/api/admin/tickets/${id}`).set(auth(owner))).status).toBe(403);
    expect((await api().patch(`/api/admin/tickets/${id}/status`).set(auth(owner)).send({ status: 'CLOSED' })).status).toBe(403);
    expect((await api().post(`/api/admin/tickets/${id}/messages`).set(auth(owner)).send({ body: 'I am staff' })).status).toBe(403);
    expect((await api().post('/api/tickets').set(auth(admin)).send(ticket)).status).toBe(403);
    expect((await api().get('/api/tickets')).status).toBe(401);

    // Cross-site writes are refused even with a valid session.
    expect((await rawApi().post('/api/tickets').set(auth(owner)).set('Origin', 'https://evil.example').send(ticket)).status).toBe(403);
    expect(await prisma.ticketMessage.count()).toBe(1);
  });

  test('input is validated and the client cannot set server-owned fields', async () => {
    const s = await register();
    expect((await api().post('/api/tickets').set(auth(s)).send({ ...ticket, status: 'CLOSED' })).status).toBe(400);
    expect((await api().post('/api/tickets').set(auth(s)).send({ ...ticket, authorId: 1 })).status).toBe(400);
    expect((await api().post('/api/tickets').set(auth(s)).send({ ...ticket, category: 'URGENT' })).status).toBe(400);
    expect((await api().post('/api/tickets').set(auth(s)).send({ ...ticket, subject: 'x' })).status).toBe(400);
    expect((await api().post('/api/tickets').set(auth(s)).send({ ...ticket, body: 'short' })).status).toBe(400);
    expect((await api().post('/api/tickets').set(auth(s)).send({ ...ticket, body: 'x'.repeat(5001) })).status).toBe(400);

    const id = (await api().post('/api/tickets').set(auth(s)).send(ticket)).body.id;
    expect((await api().post(`/api/tickets/${id}/messages`).set(auth(s)).send({ body: 'ok', fromStaff: true })).status).toBe(400);
    expect((await api().post(`/api/tickets/${id}/messages`).set(auth(s)).send({ body: '   ' })).status).toBe(400);

    // Markup is stored as plain text; the UI renders it as text, never as HTML.
    const xss = '<img src=x onerror=alert(1)>';
    const reply = await api().post(`/api/tickets/${id}/messages`).set(auth(s)).send({ body: xss });
    expect(reply.body.messages.at(-1).body).toBe(xss);
  });

  test('a user cannot keep more than the allowed number of tickets open', async () => {
    const s = await register();
    for (let i = 0; i < MAX_OPEN_TICKETS; i += 1) {
      expect((await api().post('/api/tickets').set(auth(s)).send({ ...ticket, subject: `Problem ${i}` })).status).toBe(201);
    }
    expect((await api().post('/api/tickets').set(auth(s)).send(ticket)).status).toBe(429);

    // Closing one frees a slot.
    const [first] = (await api().get('/api/tickets').set(auth(s))).body;
    await api().patch(`/api/tickets/${first.id}/close`).set(auth(s));
    expect((await api().post('/api/tickets').set(auth(s)).send(ticket)).status).toBe(201);
  });

  test('deleting an account removes its tickets and their messages', async () => {
    const admin = await createStaff('ADMIN', 'admin@example.com');
    const s = await register();
    const id = (await api().post('/api/tickets').set(auth(s)).send(ticket)).body.id;
    await api().post(`/api/admin/tickets/${id}/messages`).set(auth(admin)).send({ body: 'Answer' });
    const studentId = (await prisma.user.findUnique({ where: { email: student.email } })).id;
    expect((await api().delete(`/api/admin/users/${studentId}`).set(auth(admin))).status).toBe(204);
    expect(await prisma.ticket.count()).toBe(0);
    expect(await prisma.ticketMessage.count()).toBe(0);
  });
});
