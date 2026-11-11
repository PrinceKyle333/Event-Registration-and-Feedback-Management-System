import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

import { db } from './server/repository.ts';
import { authenticate, requireAuth, requireRole, signToken } from './server/auth.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());
// Every /api request passes through JWT verification; protected routes add requireAuth / requireRole
app.use('/api', authenticate);

const fail = (res: Response, error: any, status = 400) => res.status(status).json({ error: error?.message || String(error) });
const eventName = async (id: number) => (await db.getEventById(id))?.event_name ?? `event #${id}`;
const userName = async (id: number) => (await db.findUserById(id))?.full_name ?? `user #${id}`;

/**
 * Loads an event the current user is allowed to manage: admins manage every event,
 * organizers only the events they created. Sends 404/403 and returns null otherwise.
 */
async function loadManagedEvent(req: Request, res: Response, eventId: number) {
  const event = await db.getEventById(eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return null;
  }
  if (req.user!.role === 'organizer' && event.organizer_id !== req.user!.user_id) {
    res.status(403).json({ error: 'You can only manage events that you organize' });
    return null;
  }
  return event;
}

// ============================================================================
// 1. AUTHENTICATION & USER MANAGEMENT API
// ============================================================================
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await db.findUserByUsername(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact the administrator.' });
    }

    await db.recordLogin(user.user_id);
    const { password: _, ...safeUser } = user;
    return res.json({ message: 'Login successful', token: signToken(safeUser), user: safeUser });
  } catch (error: any) {
    return fail(res, error, 500);
  }
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, password, full_name, email, role, student_id, college_department } = req.body;
    if (!username || !password || !full_name || !email) {
      return res.status(400).json({ error: 'Username, password, full name, and email are required' });
    }

    // Self-registration can never create an admin account
    const createdUser = await db.createUser({
      username,
      passwordPlain: password,
      full_name,
      email,
      role: role === 'organizer' ? 'organizer' : 'student',
      student_id,
      college_department,
    });
    await db.logActivity({ user_id: createdUser.user_id, action: 'account_registered', description: `Created a ${createdUser.role} account` });

    return res.status(201).json({ message: 'Account created successfully', token: signToken(createdUser), user: createdUser });
  } catch (error: any) {
    return fail(res, error);
  }
});

app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  return res.json({ user: req.user });
});

app.get('/api/users', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    return res.json({ users: await db.getAllUsers() });
  } catch (error: any) {
    return fail(res, error, 500);
  }
});

app.post('/api/users', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { username, password, full_name, email, role, student_id, college_department } = req.body;
    if (!username || !password || !full_name || !email) {
      return res.status(400).json({ error: 'All primary fields required' });
    }
    const created = await db.createUser({
      username,
      passwordPlain: password,
      full_name,
      email,
      role: ['admin', 'organizer', 'student'].includes(role) ? role : 'student',
      student_id,
      college_department,
    });
    await db.logActivity({
      user_id: req.user!.user_id,
      action: 'user_created',
      description: `Created ${created.role} account for ${created.full_name}`,
      target_user_id: created.user_id,
    });
    return res.status(201).json({ message: 'User account created', user: created });
  } catch (error: any) {
    return fail(res, error);
  }
});

// Must be registered before /api/users/:id, otherwise "profile" is treated as an id
app.put('/api/users/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const { role: _ignoredRole, ...changes } = req.body; // users cannot change their own role
    const updated = await db.updateUser(req.user!.user_id, changes);
    await db.logActivity({ user_id: req.user!.user_id, action: 'profile_updated', description: 'Updated their profile' });
    return res.json({ message: 'Profile updated successfully', user: updated });
  } catch (error: any) {
    return fail(res, error);
  }
});

app.put('/api/users/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updated = await db.updateUser(id, req.body);
    await db.logActivity({ user_id: req.user!.user_id, action: 'user_updated', description: `Updated account of ${updated.full_name}`, target_user_id: id });
    return res.json({ message: 'User account updated', user: updated });
  } catch (error: any) {
    return fail(res, error);
  }
});

app.patch('/api/users/:id/status', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user!.user_id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }
    const updated = await db.toggleUserStatus(id);
    await db.logActivity({
      user_id: req.user!.user_id,
      action: updated.status === 'inactive' ? 'user_deactivated' : 'user_activated',
      description: `${updated.status === 'inactive' ? 'Deactivated' : 'Activated'} account of ${updated.full_name}`,
      target_user_id: id,
    });
    return res.json({ message: `User account is now ${updated.status || 'active'}`, user: updated });
  } catch (error: any) {
    return fail(res, error);
  }
});

app.get('/api/my-evaluations', requireAuth, async (req: Request, res: Response) => {
  try {
    return res.json({ evaluations: await db.getUserEvaluations(req.user!.user_id) });
  } catch (error: any) {
    return fail(res, error, 500);
  }
});

// ============================================================================
// 2. EVENTS API
// ============================================================================
// Public: guests and students only ever see approved events
app.get('/api/events', async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const wantsAll = req.query.all === 'true' && (role === 'admin' || role === 'organizer');
    let events = await db.getEvents({
      all: wantsAll,
      department: req.query.department as string,
      search: req.query.search as string,
      organizer_id: req.query.organizer_id ? Number(req.query.organizer_id) : undefined,
    });
    // Organizers see approved events plus their own proposals (pending or rejected)
    if (wantsAll && role === 'organizer') {
      events = events.filter((e) => e.approval_status === 'approved' || e.organizer_id === req.user!.user_id);
    }
    return res.json({ events });
  } catch (error: any) {
    return fail(res, error, 500);
  }
});

app.get('/api/events/:id', async (req: Request, res: Response) => {
  try {
    const event = await db.getEventById(Number(req.params.id));
    const canSeeUnapproved = req.user && (req.user.role === 'admin' || event?.organizer_id === req.user.user_id);
    if (!event || (event.approval_status !== 'approved' && !canSeeUnapproved)) {
      return res.status(404).json({ error: 'Event not found' });
    }
    return res.json({ event });
  } catch (error: any) {
    return fail(res, error, 500);
  }
});

app.post('/api/events', requireRole('organizer', 'admin'), async (req: Request, res: Response) => {
  try {
    const { event_name, event_date, department, description, venue, start_time, end_time, registration_deadline, capacity, image_url } = req.body;
    if (!event_name || !event_date || !department || !description) {
      return res.status(400).json({ error: 'Event name, date, department, and description are required' });
    }

    const isAdmin = req.user!.role === 'admin';
    const event = await db.createEvent({
      event_name,
      event_date,
      department,
      description,
      venue: venue || 'CMU Convention Center',
      start_time: start_time || '08:00:00',
      end_time: end_time || '17:00:00',
      registration_deadline: registration_deadline || null,
      capacity: Number(capacity) || 150,
      organizer_id: req.user!.user_id,
      is_admin: isAdmin,
      image_url,
    });
    await db.logActivity({
      user_id: req.user!.user_id,
      action: isAdmin ? 'event_published' : 'event_created',
      description: `${isAdmin ? 'Published' : 'Submitted event proposal'} "${event.event_name}"`,
      event_id: event.event_id,
    });

    return res.status(201).json({
      message: isAdmin ? 'Event created and approved' : 'Event submitted for administrative approval',
      event,
    });
  } catch (error: any) {
    return fail(res, error);
  }
});

app.put('/api/events/:id', requireRole('organizer', 'admin'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!(await loadManagedEvent(req, res, id))) return;
    const updated = await db.updateEvent(id, req.body);
    await db.logActivity({ user_id: req.user!.user_id, action: 'event_updated', description: `Updated details of "${updated.event_name}"`, event_id: id });
    return res.json({ message: 'Event updated successfully', event: updated });
  } catch (error: any) {
    return fail(res, error);
  }
});

app.patch('/api/events/:id/approval', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, rejection_reason } = req.body;
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const event = await db.setEventApproval(id, status, req.user!.user_id, rejection_reason);
    await db.logActivity({
      user_id: req.user!.user_id,
      action: status === 'approved' ? 'event_approved' : 'event_rejected',
      description: status === 'approved' ? `Approved event "${event.event_name}"` : `Rejected event "${event.event_name}": ${event.rejection_reason}`,
      event_id: id,
      target_user_id: event.organizer_id,
    });
    return res.json({ message: `Event proposal ${status} successfully`, event });
  } catch (error: any) {
    return fail(res, error);
  }
});

app.patch('/api/events/:id/status', requireRole('organizer', 'admin'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { is_active } = req.body;
    if (is_active === undefined) {
      return res.status(400).json({ error: 'is_active parameter required (1 or 0)' });
    }
    if (!(await loadManagedEvent(req, res, id))) return;

    const event = await db.setEventStatus(id, Number(is_active));
    await db.logActivity({
      user_id: req.user!.user_id,
      action: event.is_active ? 'evaluation_opened' : 'evaluation_closed',
      description: `${event.is_active ? 'Opened' : 'Closed'} evaluation for "${event.event_name}"`,
      event_id: id,
    });
    return res.json({ message: `Event evaluation ${event.is_active ? 'activated' : 'deactivated'}`, event });
  } catch (error: any) {
    return fail(res, error);
  }
});

app.delete('/api/events/:id', requireRole('organizer', 'admin'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const event = await loadManagedEvent(req, res, id);
    if (!event) return;
    await db.deleteEvent(id);
    await db.logActivity({ user_id: req.user!.user_id, action: 'event_deleted', description: `Deleted event "${event.event_name}"` });
    return res.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    return fail(res, error);
  }
});

// ============================================================================
// 3. REGISTRATION & ATTENDANCE API
// ============================================================================
app.post('/api/events/:id/register', requireRole('student'), async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const userId = req.user!.user_id; // always the logged-in student, never a value from the request body
    const reg = await db.registerParticipant(eventId, userId);
    await db.logActivity({ user_id: userId, action: 'event_registered', description: `Registered for "${await eventName(eventId)}"`, event_id: eventId });
    return res.status(201).json({ message: 'Registration confirmed successfully!', registration: reg });
  } catch (error: any) {
    return fail(res, error);
  }
});

app.get('/api/events/:id/registrations', requireRole('organizer', 'admin'), async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    if (!(await loadManagedEvent(req, res, eventId))) return;
    return res.json({ registrations: await db.getEventRegistrations(eventId) });
  } catch (error: any) {
    return fail(res, error, 500);
  }
});

app.get('/api/my-registrations', requireAuth, async (req: Request, res: Response) => {
  try {
    return res.json({ registrations: await db.getUserRegistrations(req.user!.user_id) });
  } catch (error: any) {
    return fail(res, error, 500);
  }
});

app.patch('/api/registrations/:id/attendance', requireRole('organizer', 'admin'), async (req: Request, res: Response) => {
  try {
    const regId = Number(req.params.id);
    const { attendance_status } = req.body;
    if (!['registered', 'attended', 'absent'].includes(attendance_status)) {
      return res.status(400).json({ error: 'Invalid attendance status' });
    }
    const reg = await db.findRegistrationById(regId);
    if (!reg) return res.status(404).json({ error: 'Registration record not found' });
    if (!(await loadManagedEvent(req, res, reg.event_id))) return;

    const updated = await db.updateAttendance(regId, attendance_status);
    await db.logActivity({
      user_id: req.user!.user_id,
      action: 'attendance_marked',
      description: `Marked ${await userName(updated.user_id)} as ${attendance_status} at "${await eventName(updated.event_id)}"`,
      event_id: updated.event_id,
      target_user_id: updated.user_id,
    });
    return res.json({ message: `Attendance marked as ${attendance_status}`, registration: updated });
  } catch (error: any) {
    return fail(res, error);
  }
});

app.delete('/api/registrations/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const regId = Number(req.params.id);
    const reg = await db.findRegistrationById(regId);
    if (!reg) return res.status(404).json({ error: 'Registration record not found' });

    const user = req.user!;
    let canManage = user.role === 'admin';
    if (user.role === 'organizer') {
      const event = await db.getEventById(reg.event_id);
      canManage = event?.organizer_id === user.user_id;
    }
    await db.cancelRegistration(regId, user.user_id, canManage);
    await db.logActivity({
      user_id: user.user_id,
      action: 'registration_cancelled',
      description: `Cancelled registration of ${await userName(reg.user_id)} for "${await eventName(reg.event_id)}"`,
      event_id: reg.event_id,
      target_user_id: reg.user_id,
    });
    return res.json({ message: 'Registration cancelled successfully' });
  } catch (error: any) {
    return fail(res, error);
  }
});

// ============================================================================
// 4. SURVEY & EVALUATION API
// ============================================================================
app.get('/api/survey/sections', requireAuth, async (_req: Request, res: Response) => {
  try {
    return res.json({ sections: await db.getSurveySectionsWithQuestions() });
  } catch (error: any) {
    return fail(res, error, 500);
  }
});

app.post('/api/survey/sections', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { section_name, section_description, display_order } = req.body;
    if (!section_name) return res.status(400).json({ error: 'Section name is required' });
    const sec = await db.createSurveySection({ section_name, section_description, display_order });
    await db.logActivity({ user_id: req.user!.user_id, action: 'survey_section_created', description: `Added survey section "${sec.section_name}"` });
    return res.status(201).json({ section: sec });
  } catch (error: any) {
    return fail(res, error);
  }
});

app.put('/api/survey/sections/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const sec = await db.updateSurveySection(Number(req.params.id), req.body);
    await db.logActivity({ user_id: req.user!.user_id, action: 'survey_section_updated', description: `Updated survey section "${sec.section_name}"` });
    return res.json({ section: sec });
  } catch (error: any) {
    return fail(res, error);
  }
});

app.post('/api/survey/questions', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { section_id, question_text, is_required } = req.body;
    if (!section_id || !question_text) {
      return res.status(400).json({ error: 'section_id and question_text are required' });
    }
    const q = await db.createSurveyQuestion({ section_id: Number(section_id), question_text, is_required });
    await db.logActivity({ user_id: req.user!.user_id, action: 'survey_question_created', description: `Added survey question "${q.question_text}"` });
    return res.status(201).json({ question: q });
  } catch (error: any) {
    return fail(res, error);
  }
});

app.put('/api/survey/questions/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const q = await db.updateSurveyQuestion(Number(req.params.id), req.body);
    await db.logActivity({ user_id: req.user!.user_id, action: 'survey_question_updated', description: `Updated survey question "${q.question_text}"` });
    return res.json({ question: q });
  } catch (error: any) {
    return fail(res, error);
  }
});

app.delete('/api/survey/questions/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!(await db.deleteSurveyQuestion(id))) return res.status(404).json({ error: 'Question not found' });
    await db.logActivity({ user_id: req.user!.user_id, action: 'survey_question_deleted', description: `Removed survey question #${id}` });
    return res.json({ message: 'Survey question deleted successfully' });
  } catch (error: any) {
    return fail(res, error);
  }
});

app.post('/api/events/:id/evaluations', requireRole('student'), async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const { comments, responses } = req.body;
    const result = await db.submitEvaluation({ event_id: eventId, participant_id: req.user!.user_id, comments, responses });
    // Logged without the participant id to keep evaluations anonymous
    await db.logActivity({ user_id: null, action: 'evaluation_submitted', description: `Evaluation submitted for "${await eventName(eventId)}"`, event_id: eventId });
    return res.status(201).json(result);
  } catch (error: any) {
    return fail(res, error);
  }
});

app.get('/api/events/:id/evaluation-report', requireRole('organizer', 'admin'), async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    if (!(await loadManagedEvent(req, res, eventId))) return;
    return res.json({ report: await db.getEventEvaluationReport(eventId) });
  } catch (error: any) {
    return fail(res, error);
  }
});

// ============================================================================
// 5. ACTIVITY LOG, ADMIN & REPORTS API
// ============================================================================
app.get('/api/activity', requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 500);
    return res.json({
      logs: await db.getActivityLogs(req.user!.user_id, limit),
      notifications_seen_at: req.user!.notifications_seen_at ?? null,
    });
  } catch (error: any) {
    return fail(res, error, 500);
  }
});

app.patch('/api/activity/seen', requireAuth, async (req: Request, res: Response) => {
  try {
    return res.json({ notifications_seen_at: await db.markNotificationsSeen(req.user!.user_id) });
  } catch (error: any) {
    return fail(res, error);
  }
});

// Public campus-wide totals (no personal data) shown on the landing page and dashboards
app.get('/api/admin/dashboard', async (_req: Request, res: Response) => {
  try {
    return res.json({ stats: await db.getAdminDashboardStats() });
  } catch (error: any) {
    return fail(res, error, 500);
  }
});

app.get('/api/reports/events', requireRole('admin', 'organizer'), async (req: Request, res: Response) => {
  try {
    const organizerId = req.user!.role === 'organizer' ? req.user!.user_id : undefined;
    return res.json({ events: await db.getEventsReport(organizerId) });
  } catch (error: any) {
    return fail(res, error, 500);
  }
});

app.get('/api/reports/registrations', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    return res.json({ departmentStats: await db.getDepartmentRegistrationStats() });
  } catch (error: any) {
    return fail(res, error, 500);
  }
});

app.get('/api/reports/evaluations', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const events = await db.getEventsReport();
    return res.json({
      evaluation_summary: events.map((e) => ({
        event_id: e.event_id,
        event_name: e.event_name,
        evaluation_count: e.evaluation_count,
        average_rating: e.average_rating,
      })),
    });
  } catch (error: any) {
    return fail(res, error, 500);
  }
});

app.get('/api/reports/rankings', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    return res.json({ rankings: await db.getEventRankings() });
  } catch (error: any) {
    return fail(res, error, 500);
  }
});

// System utilities (admin only)
app.get('/api/system/export-sql', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const sql = await db.generateFullSqlDump();
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', 'attachment; filename="event_evaluation_system.sql"');
    return res.send(sql);
  } catch (error: any) {
    return fail(res, error, 500);
  }
});

app.post('/api/system/reset-demo', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    await db.seedInitialData();
    return res.json({ message: 'Database reset to initial CMU seed dataset' });
  } catch (error: any) {
    return fail(res, error, 500);
  }
});

// Unknown API routes return JSON instead of the React page
app.use('/api', (_req: Request, res: Response) => res.status(404).json({ error: 'API endpoint not found' }));

// ============================================================================
// 6. VITE MIDDLEWARE INTEGRATION (FULL-STACK DEV SERVER)
// ============================================================================
async function startServer() {
  await db.init();

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CMU SIA System] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[CMU SIA System] Failed to start. Is MySQL running and are the MYSQL_* values in .env correct?');
  console.error(err);
  process.exit(1);
});
