/**
 * MySQL data-access layer (repository) for the CMU Event Registration and
 * Feedback Management System.
 *
 * Every REST controller in server.ts calls these async functions. All queries
 * use mysql2 placeholders (?) so user input is never concatenated into SQL.
 * Multi-step writes (registration, evaluation submission, seeding) run inside
 * transactions so they either fully succeed or fully roll back.
 */
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import {
  buildSeedState,
  User,
  EventItem,
  Registration,
  SurveySection,
  SurveyQuestion,
  ActivityLog,
} from './seed-data.ts';

export type SafeUser = Omit<User, 'password'>;
type Row = RowDataPacket & Record<string, any>;

// Read lazily so values from .env (loaded in server.ts) are used
const dbName = () => process.env.MYSQL_DATABASE || 'event_evaluation_system';
const SCHEMA_FILE = path.resolve(process.cwd(), 'database', 'event_evaluation_system.sql');

const connectionOptions = () => ({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
});

let pool: Pool;

// ---------------------------------------------------------------------------
// Value helpers
// ---------------------------------------------------------------------------
/** UTC timestamp columns are returned to the client as ISO strings ending in Z. */
const UTC_FIELDS = ['created_at', 'updated_at', 'registered_at', 'attended_at', 'submit_date', 'last_login', 'notifications_seen_at'];

/** Converts any date input to a UTC 'YYYY-MM-DD HH:MM:SS' string for TIMESTAMP columns. */
const toUtcSql = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date value: ${value}`);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

/** Registration deadlines are wall-clock times (as typed by the organizer), stored without time-zone conversion. */
const toLocalSql = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const m = String(value).match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(:\d{2})?/);
  if (m) return `${m[1]} ${m[2]}${m[3] || ':00'}`;
  return toUtcSql(value);
};

const nowUtcSql = () => toUtcSql(new Date())!;

const mapRow = <T = any>(row: Row | undefined | null): T => {
  if (!row) return row as T;
  const out: Record<string, any> = { ...row };
  for (const f of UTC_FIELDS) {
    if (typeof out[f] === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(out[f])) {
      out[f] = out[f].slice(0, 19).replace(' ', 'T') + 'Z';
    }
  }
  if (typeof out.registration_deadline === 'string') {
    out.registration_deadline = out.registration_deadline.slice(0, 19).replace(' ', 'T');
  }
  if ('is_required' in out) out.is_required = Boolean(out.is_required);
  if ('has_evaluated' in out) out.has_evaluated = Boolean(out.has_evaluated);
  return out as T;
};

const stripPassword = (u: User): SafeUser => {
  const { password: _pw, ...safe } = u;
  return safe;
};

async function query<T = Row>(sql: string, params: any[] = [], conn?: PoolConnection): Promise<T[]> {
  const [rows] = await (conn || pool).query<Row[]>(sql, params);
  return (rows as Row[]).map((r) => mapRow<T>(r));
}

async function queryOne<T = Row>(sql: string, params: any[] = [], conn?: PoolConnection): Promise<T | undefined> {
  const rows = await query<T>(sql, params, conn);
  return rows[0];
}

async function execute(sql: string, params: any[] = [], conn?: PoolConnection): Promise<ResultSetHeader> {
  const [result] = await (conn || pool).query<ResultSetHeader>(sql, params);
  return result;
}

async function inTransaction<T>(work: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

const isDuplicateKey = (err: any) => err && err.code === 'ER_DUP_ENTRY';

// Shared SELECT that adds live registration/attendance/evaluation counts to each event
const EVENT_WITH_COUNTS = `
  SELECT e.*,
         u.full_name AS organizer_full_name,
         (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.event_id) AS registered_count,
         (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.event_id AND r.attendance_status = 'attended') AS attended_count,
         (SELECT COUNT(*) FROM evaluations v WHERE v.event_id = e.event_id) AS evaluation_count
  FROM events e
  LEFT JOIN users u ON u.user_id = e.organizer_id`;

const withOrganizerName = (row: any, fallback: string) => {
  const { organizer_full_name, ...rest } = row;
  return { ...rest, organizer_name: organizer_full_name || fallback };
};

const getInterpretation = (score: number) => {
  if (score >= 4.5) return 'Excellent';
  if (score >= 4.0) return 'Very Satisfactory';
  if (score >= 3.0) return 'Satisfactory';
  if (score >= 1.5) return 'Unsatisfactory';
  return 'Very Unsatisfactory';
};

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const round2 = (n: number) => Number(n.toFixed(2));

const TABLES_IN_INSERT_ORDER = [
  'users',
  'admins',
  'events',
  'registrations',
  'survey_sections',
  'survey_questions',
  'evaluations',
  'evaluation_responses',
  'activity_logs',
];

async function insertMany(conn: PoolConnection, table: string, columns: string[], rows: any[][]) {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    if (chunk.length === 0) continue;
    await conn.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ?`, [chunk]);
  }
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------
export const db = {
  /** Connects to MySQL, creates the database and tables if missing, and seeds demo data on first run. */
  async init(): Promise<void> {
    const schema = fs.readFileSync(SCHEMA_FILE, 'utf-8').replace(/event_evaluation_system/g, dbName());
    const bootstrap = await mysql.createConnection({ ...connectionOptions(), multipleStatements: true });
    try {
      await bootstrap.query(schema);
    } finally {
      await bootstrap.end();
    }

    pool = mysql.createPool({
      ...connectionOptions(),
      database: dbName(),
      connectionLimit: 10,
      dateStrings: true,
      decimalNumbers: true,
      timezone: 'Z',
    });
    pool.on('connection', (conn) => {
      conn.query("SET time_zone = '+00:00'");
    });

    const countRow = await queryOne<{ n: number }>('SELECT COUNT(*) AS n FROM users');
    if (!countRow || countRow.n === 0) {
      console.log('[MySQL] Empty database detected, inserting CMU demo data...');
      await db.seedInitialData();
    }
    console.log(`[MySQL] Connected to ${connectionOptions().host}:${connectionOptions().port}/${dbName()}`);
  },

  async close(): Promise<void> {
    if (pool) await pool.end();
  },

  /** Clears every table and inserts the deterministic CMU demo dataset. */
  async seedInitialData(): Promise<void> {
    const s = buildSeedState();
    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const t of [...TABLES_IN_INSERT_ORDER].reverse()) {
        await conn.query(`TRUNCATE TABLE ${t}`);
      }
      await conn.beginTransaction();
      await insertMany(conn, 'users',
        ['user_id', 'username', 'password', 'full_name', 'email', 'role', 'student_id', 'college_department', 'status', 'last_login', 'notifications_seen_at', 'created_at'],
        s.users.map((u) => [u.user_id, u.username, u.password, u.full_name, u.email, u.role, u.student_id ?? null, u.college_department ?? null,
          u.status || 'active', toUtcSql(u.last_login), toUtcSql(u.notifications_seen_at), toUtcSql(u.created_at)]));
      await insertMany(conn, 'admins',
        ['admin_id', 'username', 'password', 'full_name', 'email', 'last_login', 'created_at'],
        s.admins.map((a) => [a.admin_id, a.username, a.password, a.full_name, a.email, toUtcSql(a.last_login), toUtcSql(a.created_at)]));
      await insertMany(conn, 'events',
        ['event_id', 'event_name', 'event_date', 'department', 'description', 'venue', 'start_time', 'end_time', 'registration_deadline',
          'capacity', 'organizer_id', 'approval_status', 'rejection_reason', 'is_active', 'admin_id', 'image_url', 'created_at', 'updated_at'],
        s.events.map((e) => [e.event_id, e.event_name, e.event_date, e.department, e.description, e.venue, e.start_time, e.end_time,
          toLocalSql(e.registration_deadline), e.capacity, e.organizer_id, e.approval_status, e.rejection_reason ?? null, e.is_active ? 1 : 0,
          e.admin_id, e.image_url ?? null, toUtcSql(e.created_at), toUtcSql(e.updated_at)]));
      await insertMany(conn, 'registrations',
        ['registration_id', 'event_id', 'user_id', 'registered_at', 'attendance_status', 'attended_at'],
        s.registrations.map((r) => [r.registration_id, r.event_id, r.user_id, toUtcSql(r.registered_at), r.attendance_status, toUtcSql(r.attended_at)]));
      await insertMany(conn, 'survey_sections',
        ['section_id', 'section_name', 'section_description', 'display_order', 'created_at', 'updated_at'],
        s.survey_sections.map((x) => [x.section_id, x.section_name, x.section_description, x.display_order, toUtcSql(x.created_at), toUtcSql(x.updated_at)]));
      await insertMany(conn, 'survey_questions',
        ['question_id', 'section_id', 'question_text', 'is_required', 'created_at', 'updated_at'],
        s.survey_questions.map((q) => [q.question_id, q.section_id, q.question_text, q.is_required ? 1 : 0, toUtcSql(q.created_at), toUtcSql(q.updated_at)]));
      await insertMany(conn, 'evaluations',
        ['evaluation_id', 'event_id', 'participant_id', 'registration_id', 'submit_date', 'comments'],
        s.evaluations.map((v) => [v.evaluation_id, v.event_id, v.participant_id, v.registration_id, toUtcSql(v.submit_date), v.comments]));
      await insertMany(conn, 'evaluation_responses',
        ['response_id', 'evaluation_id', 'question_id', 'rating'],
        s.evaluation_responses.map((r) => [r.response_id, r.evaluation_id, r.question_id, r.rating]));
      await insertMany(conn, 'activity_logs',
        ['log_id', 'user_id', 'actor_name', 'action', 'description', 'event_id', 'target_user_id', 'created_at'],
        s.activity_logs.map((l) => [l.log_id, l.user_id, l.actor_name, l.action, l.description, l.event_id, l.target_user_id, toUtcSql(l.created_at)]));
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      conn.release();
    }
  },

  // --- Activity Log & Notifications ---------------------------------------
  async logActivity(entry: { user_id: number | null; action: string; description: string; event_id?: number | null; target_user_id?: number | null }): Promise<void> {
    const actor = entry.user_id ? await db.findUserById(entry.user_id) : undefined;
    await execute(
      'INSERT INTO activity_logs (user_id, actor_name, action, description, event_id, target_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [entry.user_id, entry.user_id ? actor?.full_name ?? 'Unknown user' : 'Anonymous participant', entry.action, entry.description,
        entry.event_id ?? null, entry.target_user_id ?? null, nowUtcSql()],
    );
  },

  // Admins see everything; organizers see activity on their events; students see their own records
  async getActivityLogs(userId: number, limit = 20): Promise<ActivityLog[]> {
    const user = await db.findUserById(userId);
    if (!user) return [];
    if (user.role === 'admin') {
      return query<ActivityLog>('SELECT * FROM activity_logs ORDER BY created_at DESC, log_id DESC LIMIT ?', [limit]);
    }
    return query<ActivityLog>(
      `SELECT * FROM activity_logs
       WHERE user_id = ? OR target_user_id = ?
          OR (? = 'organizer' AND event_id IN (SELECT event_id FROM events WHERE organizer_id = ?))
       ORDER BY created_at DESC, log_id DESC LIMIT ?`,
      [userId, userId, user.role, userId, limit],
    );
  },

  async recordLogin(userId: number): Promise<void> {
    await execute('UPDATE users SET last_login = ? WHERE user_id = ?', [nowUtcSql(), userId]);
  },

  async markNotificationsSeen(userId: number): Promise<string> {
    const now = new Date();
    const res = await execute('UPDATE users SET notifications_seen_at = ? WHERE user_id = ?', [toUtcSql(now), userId]);
    if (res.affectedRows === 0) throw new Error('User not found');
    return now.toISOString();
  },

  // --- Users & Auth ---------------------------------------------------------
  async findUserByUsername(username: string): Promise<User | undefined> {
    return queryOne<User>('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username]);
  },

  async findUserById(id: number): Promise<User | undefined> {
    return queryOne<User>('SELECT * FROM users WHERE user_id = ?', [id]);
  },

  async getAllUsers(): Promise<SafeUser[]> {
    const users = await query<User>('SELECT * FROM users ORDER BY user_id');
    return users.map(stripPassword);
  },

  async createUser(data: {
    username: string;
    passwordPlain: string;
    full_name: string;
    email: string;
    role: 'admin' | 'organizer' | 'student';
    student_id?: string | null;
    college_department?: string | null;
  }): Promise<SafeUser> {
    if (await db.findUserByUsername(data.username)) throw new Error('Username already exists');
    if (await queryOne('SELECT user_id FROM users WHERE LOWER(email) = LOWER(?)', [data.email])) {
      throw new Error('Email address already registered');
    }
    const hash = bcrypt.hashSync(data.passwordPlain, 10);
    const now = nowUtcSql();
    try {
      const res = await execute(
        `INSERT INTO users (username, password, full_name, email, role, student_id, college_department, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
        [data.username.trim(), hash, data.full_name.trim(), data.email.trim(), data.role, data.student_id || null, data.college_department || null, now],
      );
      if (data.role === 'admin') {
        await execute('INSERT INTO admins (username, password, full_name, email, created_at) VALUES (?, ?, ?, ?, ?)',
          [data.username.trim(), hash, data.full_name.trim(), data.email.trim(), now]);
      }
      return stripPassword((await db.findUserById(res.insertId))!);
    } catch (err: any) {
      if (isDuplicateKey(err)) throw new Error('Username or email already exists');
      throw err;
    }
  },

  async updateUser(userId: number, data: {
    full_name?: string;
    email?: string;
    role?: 'admin' | 'organizer' | 'student';
    student_id?: string | null;
    college_department?: string | null;
    passwordPlain?: string;
  }): Promise<SafeUser> {
    const user = await db.findUserById(userId);
    if (!user) throw new Error('User not found');
    const sets: string[] = [];
    const params: any[] = [];
    if (data.full_name) { sets.push('full_name = ?'); params.push(data.full_name.trim()); }
    if (data.email) { sets.push('email = ?'); params.push(data.email.trim()); }
    if (data.role) { sets.push('role = ?'); params.push(data.role); }
    if (data.student_id !== undefined) { sets.push('student_id = ?'); params.push(data.student_id); }
    if (data.college_department !== undefined) { sets.push('college_department = ?'); params.push(data.college_department); }
    if (data.passwordPlain) { sets.push('password = ?'); params.push(bcrypt.hashSync(data.passwordPlain, 10)); }
    if (sets.length) {
      try {
        await execute(`UPDATE users SET ${sets.join(', ')} WHERE user_id = ?`, [...params, userId]);
      } catch (err: any) {
        if (isDuplicateKey(err)) throw new Error('Email address already registered');
        throw err;
      }
    }
    return stripPassword((await db.findUserById(userId))!);
  },

  async toggleUserStatus(userId: number): Promise<SafeUser> {
    const user = await db.findUserById(userId);
    if (!user) throw new Error('User not found');
    await execute('UPDATE users SET status = ? WHERE user_id = ?', [user.status === 'inactive' ? 'active' : 'inactive', userId]);
    return stripPassword((await db.findUserById(userId))!);
  },

  async getUserEvaluations(userId: number) {
    const rows = await query(
      `SELECT v.*, e.event_name, e.event_date, e.department, e.venue,
              AVG(r.rating) AS average_given_rating, COUNT(r.response_id) AS responses_count
       FROM evaluations v
       LEFT JOIN events e ON e.event_id = v.event_id
       LEFT JOIN evaluation_responses r ON r.evaluation_id = v.evaluation_id
       WHERE v.participant_id = ?
       GROUP BY v.evaluation_id
       ORDER BY v.submit_date DESC`,
      [userId],
    );
    return rows.map((r: any) => ({
      ...r,
      event_name: r.event_name || 'CMU Event',
      event_date: r.event_date || '',
      department: r.department || '',
      venue: r.venue || '',
      average_given_rating: round2(Number(r.average_given_rating) || 0),
      responses_count: Number(r.responses_count) || 0,
    }));
  },

  // --- Events -----------------------------------------------------------------
  async getEvents(options: { all?: boolean; organizer_id?: number; department?: string; search?: string }) {
    const where: string[] = [];
    const params: any[] = [];
    if (!options.all) where.push("e.approval_status = 'approved'");
    if (options.organizer_id) { where.push('e.organizer_id = ?'); params.push(options.organizer_id); }
    if (options.department && options.department !== 'All') {
      where.push('LOWER(e.department) LIKE ?');
      params.push(`%${options.department.toLowerCase()}%`);
    }
    if (options.search) {
      const q = `%${options.search.toLowerCase()}%`;
      where.push('(LOWER(e.event_name) LIKE ? OR LOWER(e.description) LIKE ? OR LOWER(e.venue) LIKE ? OR LOWER(e.department) LIKE ?)');
      params.push(q, q, q, q);
    }
    const rows = await query(
      `${EVENT_WITH_COUNTS} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY e.event_date DESC, e.event_id DESC`,
      params,
    );
    return rows.map((r) => withOrganizerName(r, 'Central Mindanao University')) as (EventItem & {
      registered_count: number;
      attended_count: number;
      evaluation_count: number;
    })[];
  },

  async getEventById(id: number) {
    const row = await queryOne(`${EVENT_WITH_COUNTS} WHERE e.event_id = ?`, [id]);
    if (!row) return null;
    return withOrganizerName(row, 'CMU Organizing Committee') as EventItem & {
      registered_count: number;
      attended_count: number;
      evaluation_count: number;
      organizer_name: string;
    };
  },

  async createEvent(data: {
    event_name: string;
    event_date: string;
    department: string;
    description: string;
    venue: string;
    start_time: string;
    end_time: string;
    registration_deadline?: string | null;
    capacity: number;
    organizer_id: number;
    is_admin?: boolean;
    image_url?: string;
  }) {
    const now = nowUtcSql();
    const res = await execute(
      `INSERT INTO events (event_name, event_date, department, description, venue, start_time, end_time, registration_deadline,
                           capacity, organizer_id, approval_status, is_active, admin_id, image_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.event_name.trim(), data.event_date, data.department.trim(), data.description.trim(), data.venue.trim() || 'CMU Convention Center',
        data.start_time || '08:00:00', data.end_time || '17:00:00', toLocalSql(data.registration_deadline), Number(data.capacity) || 100,
        data.organizer_id,
        // Admin-created events are published immediately; organizer proposals wait for approval
        data.is_admin ? 'approved' : 'pending', data.is_admin ? 1 : 0, data.is_admin ? data.organizer_id : null,
        data.image_url || '/src/assets/images/university_tech_summit_1792726541628.jpg', now, now],
    );
    return (await db.getEventById(res.insertId))!;
  },

  /** Only descriptive fields can be edited; approval and evaluation status have their own endpoints. */
  async updateEvent(id: number, data: Partial<EventItem>) {
    if (!(await db.getEventById(id))) throw new Error('Event not found');
    const editable: (keyof EventItem)[] = ['event_name', 'event_date', 'department', 'description', 'venue', 'start_time', 'end_time', 'registration_deadline', 'capacity', 'image_url'];
    const sets: string[] = [];
    const params: any[] = [];
    for (const key of editable) {
      if (data[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(key === 'registration_deadline' ? toLocalSql(data[key] as string) : data[key]);
      }
    }
    sets.push('updated_at = ?');
    params.push(nowUtcSql());
    await execute(`UPDATE events SET ${sets.join(', ')} WHERE event_id = ?`, [...params, id]);
    return (await db.getEventById(id))!;
  },

  async setEventApproval(id: number, status: 'approved' | 'rejected', adminId: number, rejection_reason?: string) {
    if (!(await db.getEventById(id))) throw new Error('Event not found');
    await execute(
      'UPDATE events SET approval_status = ?, admin_id = ?, rejection_reason = ?, is_active = ?, updated_at = ? WHERE event_id = ?',
      [status, adminId, status === 'rejected' ? rejection_reason || 'Does not meet university event guidelines' : null,
        status === 'approved' ? 1 : 0, nowUtcSql(), id],
    );
    return (await db.getEventById(id))!;
  },

  async setEventStatus(id: number, is_active: number) {
    if (!(await db.getEventById(id))) throw new Error('Event not found');
    await execute('UPDATE events SET is_active = ?, updated_at = ? WHERE event_id = ?', [is_active ? 1 : 0, nowUtcSql(), id]);
    return (await db.getEventById(id))!;
  },

  /** Registrations, evaluations and responses are removed by ON DELETE CASCADE foreign keys. */
  async deleteEvent(id: number): Promise<boolean> {
    const res = await execute('DELETE FROM events WHERE event_id = ?', [id]);
    return res.affectedRows > 0;
  },

  // --- Registrations ----------------------------------------------------------
  async registerParticipant(eventId: number, userId: number): Promise<Registration> {
    return inTransaction(async (conn) => {
      // Lock the event row so two students cannot take the last slot at the same time
      const evt = await queryOne<EventItem>('SELECT * FROM events WHERE event_id = ? FOR UPDATE', [eventId], conn);
      if (!evt) throw new Error('Event not found');
      if (evt.approval_status !== 'approved') throw new Error('Registration is only available for approved events');
      if (evt.registration_deadline && Date.now() > new Date(evt.registration_deadline).getTime()) {
        throw new Error('Registration deadline has passed for this event');
      }
      const countRow = await queryOne<{ n: number }>('SELECT COUNT(*) AS n FROM registrations WHERE event_id = ?', [eventId], conn);
      if ((countRow?.n ?? 0) >= evt.capacity) {
        throw new Error(`Event has reached maximum capacity of ${evt.capacity} participants`);
      }
      if (await queryOne('SELECT registration_id FROM registrations WHERE event_id = ? AND user_id = ?', [eventId, userId], conn)) {
        throw new Error('You are already registered for this event');
      }
      try {
        const res = await execute(
          "INSERT INTO registrations (event_id, user_id, registered_at, attendance_status) VALUES (?, ?, ?, 'registered')",
          [eventId, userId, nowUtcSql()], conn,
        );
        return (await queryOne<Registration>('SELECT * FROM registrations WHERE registration_id = ?', [res.insertId], conn))!;
      } catch (err: any) {
        // UNIQUE KEY uq_event_student (event_id, user_id) is the final guard against duplicates
        if (isDuplicateKey(err)) throw new Error('You are already registered for this event');
        throw err;
      }
    });
  },

  async findRegistrationById(registrationId: number): Promise<Registration | undefined> {
    return queryOne<Registration>('SELECT * FROM registrations WHERE registration_id = ?', [registrationId]);
  },

  async getEventRegistrations(eventId: number): Promise<Registration[]> {
    const rows = await query(
      `SELECT r.*,
              COALESCE(u.full_name, 'Participant') AS student_name,
              COALESCE(u.student_id, 'N/A') AS student_id_number,
              COALESCE(u.email, '') AS student_email,
              COALESCE(u.college_department, '') AS college_department,
              EXISTS(SELECT 1 FROM evaluations v WHERE v.event_id = r.event_id AND v.participant_id = r.user_id) AS has_evaluated
       FROM registrations r
       LEFT JOIN users u ON u.user_id = r.user_id
       WHERE r.event_id = ?
       ORDER BY r.registration_id`,
      [eventId],
    );
    return rows as Registration[];
  },

  async getUserRegistrations(userId: number): Promise<(Registration & { event: EventItem })[]> {
    const regs = await query<Registration>(
      `SELECT r.*, EXISTS(SELECT 1 FROM evaluations v WHERE v.event_id = r.event_id AND v.participant_id = r.user_id) AS has_evaluated
       FROM registrations r WHERE r.user_id = ? ORDER BY r.registered_at DESC`,
      [userId],
    );
    if (regs.length === 0) return [];
    const events = await query<EventItem>('SELECT * FROM events WHERE event_id IN (?)', [regs.map((r) => r.event_id)]);
    return regs
      .map((r) => ({ ...r, event: events.find((e) => e.event_id === r.event_id)! }))
      .filter((r) => r.event);
  },

  async updateAttendance(registrationId: number, status: 'registered' | 'attended' | 'absent'): Promise<Registration> {
    const res = await execute('UPDATE registrations SET attendance_status = ?, attended_at = ? WHERE registration_id = ?',
      [status, status === 'attended' ? nowUtcSql() : null, registrationId]);
    if (res.affectedRows === 0) throw new Error('Registration record not found');
    return (await db.findRegistrationById(registrationId))!;
  },

  async cancelRegistration(registrationId: number, userId: number, isAdminOrOrg = false): Promise<boolean> {
    return inTransaction(async (conn) => {
      const reg = await queryOne<Registration>('SELECT * FROM registrations WHERE registration_id = ?', [registrationId], conn);
      if (!reg) return false;
      if (!isAdminOrOrg && reg.user_id !== userId) throw new Error('Unauthorized to cancel this registration');
      await execute('DELETE FROM evaluations WHERE event_id = ? AND participant_id = ?', [reg.event_id, reg.user_id], conn);
      await execute('DELETE FROM registrations WHERE registration_id = ?', [registrationId], conn);
      return true;
    });
  },

  // --- Survey Sections & Questions -------------------------------------------
  async getSurveySectionsWithQuestions(): Promise<(SurveySection & { questions: SurveyQuestion[] })[]> {
    const sections = await query<SurveySection>('SELECT * FROM survey_sections ORDER BY display_order, section_id');
    const questions = await query<SurveyQuestion>('SELECT * FROM survey_questions ORDER BY question_id');
    return sections.map((sec) => ({ ...sec, questions: questions.filter((q) => q.section_id === sec.section_id) }));
  },

  async createSurveySection(data: { section_name: string; section_description: string; display_order?: number }): Promise<SurveySection> {
    let order = data.display_order;
    if (order === undefined) {
      const row = await queryOne<{ n: number }>('SELECT COUNT(*) AS n FROM survey_sections');
      order = (row?.n ?? 0) + 1;
    }
    const now = nowUtcSql();
    const res = await execute(
      'INSERT INTO survey_sections (section_name, section_description, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [data.section_name.trim(), (data.section_description || '').trim(), order, now, now],
    );
    return (await queryOne<SurveySection>('SELECT * FROM survey_sections WHERE section_id = ?', [res.insertId]))!;
  },

  async updateSurveySection(id: number, data: Partial<SurveySection>): Promise<SurveySection> {
    const sec = await queryOne<SurveySection>('SELECT * FROM survey_sections WHERE section_id = ?', [id]);
    if (!sec) throw new Error('Section not found');
    await execute('UPDATE survey_sections SET section_name = ?, section_description = ?, display_order = ?, updated_at = ? WHERE section_id = ?', [
      data.section_name ? data.section_name.trim() : sec.section_name,
      data.section_description !== undefined ? data.section_description.trim() : sec.section_description,
      data.display_order !== undefined ? data.display_order : sec.display_order,
      nowUtcSql(),
      id,
    ]);
    return (await queryOne<SurveySection>('SELECT * FROM survey_sections WHERE section_id = ?', [id]))!;
  },

  async createSurveyQuestion(data: { section_id: number; question_text: string; is_required?: boolean }): Promise<SurveyQuestion> {
    if (!(await queryOne('SELECT section_id FROM survey_sections WHERE section_id = ?', [data.section_id]))) {
      throw new Error('Parent survey section not found');
    }
    const now = nowUtcSql();
    const res = await execute(
      'INSERT INTO survey_questions (section_id, question_text, is_required, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [data.section_id, data.question_text.trim(), data.is_required !== false ? 1 : 0, now, now],
    );
    return (await queryOne<SurveyQuestion>('SELECT * FROM survey_questions WHERE question_id = ?', [res.insertId]))!;
  },

  async updateSurveyQuestion(id: number, data: Partial<SurveyQuestion>): Promise<SurveyQuestion> {
    const q = await queryOne<SurveyQuestion>('SELECT * FROM survey_questions WHERE question_id = ?', [id]);
    if (!q) throw new Error('Question not found');
    await execute('UPDATE survey_questions SET question_text = ?, is_required = ?, updated_at = ? WHERE question_id = ?', [
      data.question_text ? data.question_text.trim() : q.question_text,
      data.is_required !== undefined ? (data.is_required ? 1 : 0) : q.is_required ? 1 : 0,
      nowUtcSql(),
      id,
    ]);
    return (await queryOne<SurveyQuestion>('SELECT * FROM survey_questions WHERE question_id = ?', [id]))!;
  },

  async deleteSurveyQuestion(id: number): Promise<boolean> {
    const res = await execute('DELETE FROM survey_questions WHERE question_id = ?', [id]);
    return res.affectedRows > 0;
  },

  // --- Evaluations (transactional save) ----------------------------------------
  async submitEvaluation(data: {
    event_id: number;
    participant_id: number;
    comments?: string | null;
    responses: { question_id: number; rating: number }[];
  }): Promise<{ evaluation_id: number; message: string }> {
    return inTransaction(async (conn) => {
      const evt = await queryOne<EventItem>('SELECT * FROM events WHERE event_id = ?', [data.event_id], conn);
      if (!evt) throw new Error('Event not found');
      if (!evt.is_active) throw new Error('Event is not currently activated for evaluation');

      // 1. Only confirmed attendees may evaluate
      const reg = await queryOne<Registration>('SELECT * FROM registrations WHERE event_id = ? AND user_id = ?', [data.event_id, data.participant_id], conn);
      if (!reg) throw new Error('You are not registered for this event');
      if (reg.attendance_status !== 'attended') {
        throw new Error('Only participants whose attendance has been confirmed can submit feedback');
      }

      // 2. One evaluation per attendee
      if (await queryOne('SELECT evaluation_id FROM evaluations WHERE event_id = ? AND participant_id = ?', [data.event_id, data.participant_id], conn)) {
        throw new Error('You have already submitted an evaluation for this event. Duplicate submissions are prevented.');
      }

      // 3. Validate the 1-5 ratings and question ids
      if (!Array.isArray(data.responses) || data.responses.length === 0) throw new Error('At least one rating response is required');
      for (const r of data.responses) {
        if (typeof r.rating !== 'number' || r.rating < 1 || r.rating > 5) {
          throw new Error(`Rating value must be an integer between 1 and 5 (received ${r.rating})`);
        }
      }
      const ids = [...new Set(data.responses.map((r) => Number(r.question_id)))];
      const found = await query<{ question_id: number }>('SELECT question_id FROM survey_questions WHERE question_id IN (?)', [ids], conn);
      const missing = ids.find((id) => !found.some((f) => f.question_id === id));
      if (missing !== undefined) throw new Error(`Survey question ID ${missing} does not exist`);

      try {
        const res = await execute(
          'INSERT INTO evaluations (event_id, participant_id, registration_id, submit_date, comments) VALUES (?, ?, ?, ?, ?)',
          [data.event_id, data.participant_id, reg.registration_id, nowUtcSql(), data.comments?.trim() || null], conn,
        );
        await conn.query('INSERT INTO evaluation_responses (evaluation_id, question_id, rating) VALUES ?', [
          data.responses.map((r) => [res.insertId, Number(r.question_id), Math.round(r.rating)]),
        ]);
        return { evaluation_id: res.insertId, message: 'Evaluation submitted successfully! Thank you for your feedback.' };
      } catch (err: any) {
        if (isDuplicateKey(err)) throw new Error('You have already submitted an evaluation for this event. Duplicate submissions are prevented.');
        throw err;
      }
    });
  },

  // --- Evaluation report (section means + interpretation) -----------------------
  async getEventEvaluationReport(eventId: number) {
    const evt = await db.getEventById(eventId);
    if (!evt) throw new Error('Event not found');

    const evals = await query<{ evaluation_id: number; submit_date: string; comments: string | null }>(
      'SELECT evaluation_id, submit_date, comments FROM evaluations WHERE event_id = ? ORDER BY submit_date', [eventId]);
    const responses = await query<{ question_id: number; rating: number }>(
      `SELECT r.question_id, r.rating FROM evaluation_responses r
       JOIN evaluations v ON v.evaluation_id = r.evaluation_id WHERE v.event_id = ?`, [eventId]);

    const overallMean = round2(mean(responses.map((r) => r.rating)));
    const sections = await db.getSurveySectionsWithQuestions();
    const sectionReports = sections.map((sec) => {
      const secResponses = responses.filter((r) => sec.questions.some((q) => q.question_id === r.question_id));
      const secRatings = secResponses.map((r) => r.rating);
      return {
        section_id: sec.section_id,
        section_name: sec.section_name,
        section_description: sec.section_description,
        total_responses: secResponses.length,
        mean_score: round2(mean(secRatings)),
        interpretation: secRatings.length > 0 ? getInterpretation(mean(secRatings)) : 'No Responses',
        questions: sec.questions.map((q) => {
          const qRatings = responses.filter((r) => r.question_id === q.question_id).map((r) => r.rating);
          const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          for (const rating of qRatings) if (counts[rating] !== undefined) counts[rating]++;
          return {
            question_id: q.question_id,
            question_text: q.question_text,
            responses_count: qRatings.length,
            mean_score: round2(mean(qRatings)),
            interpretation: qRatings.length > 0 ? getInterpretation(mean(qRatings)) : 'No Responses',
            rating_counts: counts,
          };
        }),
      };
    });

    return {
      event_id: evt.event_id,
      event_name: evt.event_name,
      event_date: evt.event_date,
      department: evt.department,
      venue: evt.venue,
      total_registered: evt.registered_count,
      total_attended: evt.attended_count,
      total_evaluations: evals.length,
      response_rate_percent: evt.attended_count > 0 ? Number(((evals.length / evt.attended_count) * 100).toFixed(1)) : 0,
      overall_mean_score: overallMean,
      overall_interpretation: evals.length > 0 ? getInterpretation(overallMean) : 'Pending Evaluation',
      sections: sectionReports,
      // Comments are returned without any participant identity
      anonymous_comments: evals.filter((e) => e.comments && e.comments.trim()).map((e) => ({ submit_date: e.submit_date, comment: e.comments! })),
      generated_at: new Date().toISOString(),
    };
  },

  // --- Admin dashboard & reports (SQL aggregates) ------------------------------------
  async getAdminDashboardStats() {
    const row = (await queryOne<any>(`
      SELECT
        (SELECT COUNT(*) FROM events) AS total_events,
        (SELECT COUNT(*) FROM events WHERE approval_status = 'pending') AS pending_approvals,
        (SELECT COUNT(*) FROM events WHERE approval_status = 'approved') AS approved_events,
        (SELECT COUNT(*) FROM events WHERE is_active = 1) AS active_evaluation_events,
        (SELECT COUNT(*) FROM registrations) AS total_registrations,
        (SELECT COUNT(*) FROM registrations WHERE attendance_status = 'attended') AS total_attended,
        (SELECT COUNT(*) FROM evaluations) AS total_evaluations,
        (SELECT AVG(rating) FROM evaluation_responses) AS overall_satisfaction_score,
        (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'organizer') AS total_organizers`))!;
    return {
      total_events: row.total_events,
      pending_approvals: row.pending_approvals,
      approved_events: row.approved_events,
      active_evaluation_events: row.active_evaluation_events,
      total_registrations: row.total_registrations,
      total_attended: row.total_attended,
      attendance_rate_percent: row.total_registrations > 0 ? Number(((row.total_attended / row.total_registrations) * 100).toFixed(1)) : 0,
      total_evaluations: row.total_evaluations,
      overall_satisfaction_score: row.overall_satisfaction_score === null ? 0 : round2(Number(row.overall_satisfaction_score)),
      total_students: row.total_students,
      total_organizers: row.total_organizers,
    };
  },

  async getEventsReport(organizerId?: number) {
    const rows = await query<any>(
      `SELECT e.event_id, e.event_name, e.event_date, e.department, e.venue, e.capacity, e.approval_status, e.is_active,
              (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.event_id) AS registered_count,
              (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.event_id AND r.attendance_status = 'attended') AS attended_count,
              (SELECT COUNT(*) FROM evaluations v WHERE v.event_id = e.event_id) AS evaluation_count,
              (SELECT AVG(er.rating) FROM evaluation_responses er
                 JOIN evaluations v ON v.evaluation_id = er.evaluation_id WHERE v.event_id = e.event_id) AS average_rating
       FROM events e
       ${organizerId ? 'WHERE e.organizer_id = ?' : ''}
       ORDER BY e.event_id`,
      organizerId ? [organizerId] : [],
    );
    return rows.map((r) => ({ ...r, average_rating: r.average_rating === null ? null : round2(Number(r.average_rating)) }));
  },

  /** Events with at least one evaluation, ranked from highest to lowest overall mean. */
  async getEventRankings() {
    const rows = await db.getEventsReport();
    return rows
      .filter((r) => r.evaluation_count > 0 && r.average_rating !== null)
      .sort((a, b) => b.average_rating - a.average_rating || b.evaluation_count - a.evaluation_count)
      .map((r, idx) => ({
        rank: idx + 1,
        event_id: r.event_id,
        event_name: r.event_name,
        department: r.department,
        average_rating: r.average_rating,
        interpretation: getInterpretation(r.average_rating),
        evaluation_count: r.evaluation_count,
        attendance_rate_percent: r.registered_count > 0 ? Number(((r.attended_count / r.registered_count) * 100).toFixed(1)) : 0,
        response_rate_percent: r.attended_count > 0 ? Number(((r.evaluation_count / r.attended_count) * 100).toFixed(1)) : 0,
      }));
  },

  async getDepartmentRegistrationStats() {
    const rows = await query<any>(
      `SELECT COALESCE(NULLIF(e.department, ''), 'Other') AS department,
              COUNT(r.registration_id) AS total_registered,
              COALESCE(SUM(r.attendance_status = 'attended'), 0) AS total_attended
       FROM events e
       LEFT JOIN registrations r ON r.event_id = e.event_id
       GROUP BY department`,
    );
    const stats: Record<string, { total_registered: number; total_attended: number }> = {};
    for (const r of rows) stats[r.department] = { total_registered: Number(r.total_registered), total_attended: Number(r.total_attended) };
    return stats;
  },

  // --- SQL export (schema + live data) -------------------------------------------------
  async generateFullSqlDump(): Promise<string> {
    const parts: string[] = [
      '-- Central Mindanao University (CMU) - Event Evaluation System',
      '-- Generated MySQL Export',
      `-- Export Timestamp: ${new Date().toISOString()}`,
      '',
      fs.readFileSync(SCHEMA_FILE, 'utf-8'),
      '',
      'SET FOREIGN_KEY_CHECKS = 0;',
    ];
    for (const table of TABLES_IN_INSERT_ORDER) {
      const [rows] = await pool.query<Row[]>(`SELECT * FROM ${table}`);
      if (rows.length === 0) continue;
      const cols = Object.keys(rows[0]);
      parts.push(`\n-- ${table}: ${rows.length} rows`);
      for (let i = 0; i < rows.length; i += 200) {
        const values = rows.slice(i, i + 200).map((r) => mysql.format(`(${cols.map(() => '?').join(', ')})`, cols.map((c) => r[c]))).join(',\n');
        parts.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES\n${values};`);
      }
    }
    parts.push('SET FOREIGN_KEY_CHECKS = 1;');
    return parts.join('\n');
  },
};
