import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { db } from './server/db.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Simple Auth middleware helper: in header x-user-id or session query
const getAuthenticatedUser = (req: Request) => {
  const userIdHeader = req.headers['x-user-id'] || req.query.auth_user_id;
  if (!userIdHeader) return null;
  const uid = Number(userIdHeader);
  return db.findUserById(uid) || null;
};

// ============================================================================
// 1. AUTHENTICATION & USER MANAGEMENT API
// ============================================================================
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = db.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const { password: _, ...safeUser } = user;
    return res.json({
      message: 'Login successful',
      user: safeUser,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Login error' });
  }
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { username, password, full_name, email, role, student_id, college_department } = req.body;
    if (!username || !password || !full_name || !email) {
      return res.status(400).json({ error: 'Username, password, full name, and email are required' });
    }

    const createdUser = db.createUser({
      username,
      passwordPlain: password,
      full_name,
      email,
      role: role === 'organizer' ? 'organizer' : 'student',
      student_id,
      college_department,
    });

    return res.status(201).json({
      message: 'Account created successfully',
      user: createdUser,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Registration error' });
  }
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { password: _, ...safeUser } = user;
  return res.json({ user: safeUser });
});

app.get('/api/users', (req: Request, res: Response) => {
  const users = db.getAllUsers();
  return res.json({ users });
});

app.post('/api/users', (req: Request, res: Response) => {
  try {
    const { username, password, full_name, email, role, student_id, college_department } = req.body;
    if (!username || !password || !full_name || !email) {
      return res.status(400).json({ error: 'All primary fields required' });
    }
    const created = db.createUser({
      username,
      passwordPlain: password,
      full_name,
      email,
      role: role || 'student',
      student_id,
      college_department,
    });
    return res.status(201).json({ message: 'User account created', user: created });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updated = db.updateUser(id, req.body);
    return res.json({ message: 'User account updated', user: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.patch('/api/users/:id/status', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updated = db.toggleUserStatus(id);
    return res.json({ message: `User account is now ${updated.status || 'active'}`, user: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.put('/api/users/profile', (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    const updated = db.updateUser(user.user_id, req.body);
    return res.json({ message: 'Profile updated successfully', user: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/api/my-evaluations', (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const uid = user ? user.user_id : Number(req.query.user_id);
    if (!uid) return res.status(400).json({ error: 'User ID required' });
    const evaluations = db.getUserEvaluations(uid);
    return res.json({ evaluations });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 2. EVENTS API
// ============================================================================
app.get('/api/events', (req: Request, res: Response) => {
  try {
    const all = req.query.all === 'true';
    const department = req.query.department as string;
    const search = req.query.search as string;
    const organizer_id = req.query.organizer_id ? Number(req.query.organizer_id) : undefined;

    const events = db.getEvents({
      all,
      department,
      search,
      organizer_id,
    });

    return res.json({ events });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/events/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const event = db.getEventById(id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  return res.json({ event });
});

app.post('/api/events', (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const {
      event_name,
      event_date,
      department,
      description,
      venue,
      start_time,
      end_time,
      registration_deadline,
      capacity,
      image_url,
    } = req.body;

    if (!event_name || !event_date || !department || !description) {
      return res.status(400).json({ error: 'Event name, date, department, and description are required' });
    }

    const organizerId = user ? user.user_id : (Number(req.body.organizer_id) || 2);
    const isAdmin = user ? user.role === 'admin' : false;

    const event = db.createEvent({
      event_name,
      event_date,
      department,
      description,
      venue: venue || 'CMU Convention Center',
      start_time: start_time || '08:00:00',
      end_time: end_time || '17:00:00',
      registration_deadline: registration_deadline || null,
      capacity: Number(capacity) || 150,
      organizer_id: organizerId,
      is_admin: isAdmin,
      image_url,
    });

    return res.status(201).json({
      message: isAdmin ? 'Event created and approved' : 'Event submitted for administrative approval',
      event,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.put('/api/events/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updated = db.updateEvent(id, req.body);
    return res.json({ message: 'Event updated successfully', event: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.patch('/api/events/:id/approval', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, rejection_reason } = req.body;
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const user = getAuthenticatedUser(req);
    const adminId = user ? user.user_id : 1;

    const event = db.setEventApproval(id, status, adminId, rejection_reason);
    return res.json({
      message: `Event proposal ${status} successfully`,
      event,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.patch('/api/events/:id/status', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { is_active } = req.body;
    if (is_active === undefined) {
      return res.status(400).json({ error: 'is_active parameter required (1 or 0)' });
    }

    const event = db.setEventStatus(id, Number(is_active));
    return res.json({
      message: `Event evaluation ${event.is_active ? 'activated' : 'deactivated'}`,
      event,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete('/api/events/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const success = db.deleteEvent(id);
    if (!success) {
      return res.status(404).json({ error: 'Event not found' });
    }
    return res.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// 3. REGISTRATION & ATTENDANCE API
// ============================================================================
app.post('/api/events/:id/register', (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const user = getAuthenticatedUser(req);
    const userId = user ? user.user_id : Number(req.body.user_id);

    if (!userId) {
      return res.status(400).json({ error: 'Participant identification is required' });
    }

    const reg = db.registerParticipant(eventId, userId);
    return res.status(201).json({
      message: 'Registration confirmed successfully!',
      registration: reg,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/api/events/:id/registrations', (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const registrations = db.getEventRegistrations(eventId);
    return res.json({ registrations });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/my-registrations', (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const userId = user ? user.user_id : Number(req.query.user_id);
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const registrations = db.getUserRegistrations(userId);
    return res.json({ registrations });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.patch('/api/registrations/:id/attendance', (req: Request, res: Response) => {
  try {
    const regId = Number(req.params.id);
    const { attendance_status } = req.body;
    if (!['registered', 'attended', 'absent'].includes(attendance_status)) {
      return res.status(400).json({ error: 'Invalid attendance status' });
    }

    const updated = db.updateAttendance(regId, attendance_status);
    return res.json({
      message: `Attendance marked as ${attendance_status}`,
      registration: updated,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete('/api/registrations/:id', (req: Request, res: Response) => {
  try {
    const regId = Number(req.params.id);
    const user = getAuthenticatedUser(req);
    const userId = user ? user.user_id : Number(req.query.user_id);
    const isAdminOrOrg = user ? (user.role === 'admin' || user.role === 'organizer') : false;

    db.cancelRegistration(regId, userId, isAdminOrOrg);
    return res.json({ message: 'Registration cancelled successfully' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// 4. SURVEY & EVALUATION API
// ============================================================================
app.get('/api/survey/sections', (req: Request, res: Response) => {
  try {
    const sections = db.getSurveySectionsWithQuestions();
    return res.json({ sections });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/survey/sections', (req: Request, res: Response) => {
  try {
    const { section_name, section_description, display_order } = req.body;
    if (!section_name) return res.status(400).json({ error: 'Section name is required' });
    const sec = db.createSurveySection({ section_name, section_description, display_order });
    return res.status(201).json({ section: sec });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.put('/api/survey/sections/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const sec = db.updateSurveySection(id, req.body);
    return res.json({ section: sec });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.post('/api/survey/questions', (req: Request, res: Response) => {
  try {
    const { section_id, question_text, is_required } = req.body;
    if (!section_id || !question_text) {
      return res.status(400).json({ error: 'section_id and question_text are required' });
    }
    const q = db.createSurveyQuestion({ section_id: Number(section_id), question_text, is_required });
    return res.status(201).json({ question: q });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.put('/api/survey/questions/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const q = db.updateSurveyQuestion(id, req.body);
    return res.json({ question: q });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete('/api/survey/questions/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const success = db.deleteSurveyQuestion(id);
    if (!success) return res.status(404).json({ error: 'Question not found' });
    return res.json({ message: 'Survey question deleted successfully' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.post('/api/events/:id/evaluations', (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const user = getAuthenticatedUser(req);
    const participantId = user ? user.user_id : Number(req.body.participant_id);

    if (!participantId) {
      return res.status(400).json({ error: 'Participant identification is required' });
    }

    const { comments, responses } = req.body;
    const result = db.submitEvaluation({
      event_id: eventId,
      participant_id: participantId,
      comments,
      responses,
    });

    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/api/events/:id/evaluation-report', (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const report = db.getEventEvaluationReport(eventId);
    return res.json({ report });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// 5. ADMIN & REPORTS API
// ============================================================================
app.get('/api/admin/dashboard', (req: Request, res: Response) => {
  try {
    const stats = db.getAdminDashboardStats();
    return res.json({ stats });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/events', (req: Request, res: Response) => {
  try {
    const events = db.getEventsReport();
    return res.json({ events });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/registrations', (req: Request, res: Response) => {
  try {
    const events = db.getEvents({ all: true });
    const departmentStats: Record<string, { total_registered: number; total_attended: number }> = {};

    for (const e of events) {
      const dept = e.department || 'Other';
      if (!departmentStats[dept]) {
        departmentStats[dept] = { total_registered: 0, total_attended: 0 };
      }
      departmentStats[dept].total_registered += e.registered_count;
      departmentStats[dept].total_attended += e.attended_count;
    }

    return res.json({ departmentStats });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/evaluations', (req: Request, res: Response) => {
  try {
    const events = db.getEventsReport();
    return res.json({
      evaluation_summary: events.map(e => ({
        event_id: e.event_id,
        event_name: e.event_name,
        evaluation_count: e.evaluation_count,
        average_rating: e.average_rating,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// System utilities
app.get('/api/system/export-sql', (req: Request, res: Response) => {
  const sql = db.generateFullSqlDump();
  res.setHeader('Content-Type', 'application/sql');
  res.setHeader('Content-Disposition', 'attachment; filename="event_evaluation_system.sql"');
  return res.send(sql);
});

app.post('/api/system/reset-demo', (req: Request, res: Response) => {
  db.seedInitialData();
  return res.json({ message: 'Database reset to initial CMU seed dataset' });
});

// ============================================================================
// 6. VITE MIDDLEWARE INTEGRATION (FULL-STACK DEV SERVER)
// ============================================================================
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CMU SIA System] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
