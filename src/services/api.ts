import {
  User,
  EventItem,
  Registration,
  SurveySection,
  EvaluationReport,
  AdminDashboardStats,
  ActivityLog,
  EventReportRow,
  EventRanking,
} from '../types';

let currentUserId: number | null = null; // set after login
let authToken: string | null = null; // JWT issued by POST /api/auth/login

export const setAuthUserId = (id: number | null) => {
  currentUserId = id;
};

export const getAuthUserId = () => currentUserId;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  // Auth
  async login(username: string, passwordPlain: string): Promise<{ message: string; user: User }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: passwordPlain }),
    });
    const result = await handleResponse<{ message: string; token: string; user: User }>(res);
    setAuthToken(result.token);
    setAuthUserId(result.user.user_id);
    return result;
  },

  async register(data: {
    username: string;
    passwordPlain: string;
    full_name: string;
    email: string;
    role: 'student' | 'organizer';
    student_id?: string;
    college_department?: string;
  }): Promise<{ message: string; user: User }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        password: data.passwordPlain,
      }),
    });
    const result = await handleResponse<{ message: string; token: string; user: User }>(res);
    setAuthToken(result.token);
    setAuthUserId(result.user.user_id);
    return result;
  },

  async getCurrentUser(): Promise<User | null> {
    if (!authToken) return null;
    try {
      const res = await fetch('/api/auth/me', { headers: getHeaders() });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user;
    } catch {
      return null;
    }
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/users', { headers: getHeaders() });
    const data = await handleResponse<{ users: User[] }>(res);
    return data.users;
  },

  async createUser(data: {
    username: string;
    passwordPlain: string;
    full_name: string;
    email: string;
    role: 'admin' | 'organizer' | 'student';
    student_id?: string;
    college_department?: string;
  }): Promise<{ message: string; user: User }> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ...data, password: data.passwordPlain }),
    });
    return handleResponse<{ message: string; user: User }>(res);
  },

  async updateUser(id: number, data: Partial<User> & { passwordPlain?: string }): Promise<{ message: string; user: User }> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; user: User }>(res);
  },

  async toggleUserStatus(id: number): Promise<{ message: string; user: User }> {
    const res = await fetch(`/api/users/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    return handleResponse<{ message: string; user: User }>(res);
  },

  async updateProfile(data: { full_name?: string; email?: string; student_id?: string; college_department?: string; passwordPlain?: string }): Promise<{ message: string; user: User }> {
    const res = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; user: User }>(res);
  },

  async getMyEvaluations(userId?: number): Promise<any[]> {
    const uid = userId || getAuthUserId();
    const res = await fetch(`/api/my-evaluations?user_id=${uid}`, { headers: getHeaders() });
    const data = await handleResponse<{ evaluations: any[] }>(res);
    return data.evaluations;
  },

  // Events
  async getEvents(options: { all?: boolean; department?: string; search?: string; organizer_id?: number } = {}): Promise<EventItem[]> {
    const params = new URLSearchParams();
    if (options.all) params.append('all', 'true');
    if (options.department && options.department !== 'All') params.append('department', options.department);
    if (options.search) params.append('search', options.search);
    if (options.organizer_id) params.append('organizer_id', options.organizer_id.toString());

    const res = await fetch(`/api/events?${params.toString()}`, { headers: getHeaders() });
    const data = await handleResponse<{ events: EventItem[] }>(res);
    return data.events;
  },

  async getEvent(id: number): Promise<EventItem> {
    const res = await fetch(`/api/events/${id}`, { headers: getHeaders() });
    const data = await handleResponse<{ event: EventItem }>(res);
    return data.event;
  },

  async createEvent(eventData: Partial<EventItem>): Promise<{ message: string; event: EventItem }> {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(eventData),
    });
    return handleResponse<{ message: string; event: EventItem }>(res);
  },

  async updateEvent(id: number, eventData: Partial<EventItem>): Promise<{ message: string; event: EventItem }> {
    const res = await fetch(`/api/events/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(eventData),
    });
    return handleResponse<{ message: string; event: EventItem }>(res);
  },

  async setEventApproval(id: number, status: 'approved' | 'rejected', rejection_reason?: string): Promise<{ message: string; event: EventItem }> {
    const res = await fetch(`/api/events/${id}/approval`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, rejection_reason }),
    });
    return handleResponse<{ message: string; event: EventItem }>(res);
  },

  async setEventStatus(id: number, is_active: number): Promise<{ message: string; event: EventItem }> {
    const res = await fetch(`/api/events/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ is_active }),
    });
    return handleResponse<{ message: string; event: EventItem }>(res);
  },

  async deleteEvent(id: number): Promise<{ message: string }> {
    const res = await fetch(`/api/events/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },

  // Registrations & Attendance
  async registerForEvent(eventId: number): Promise<{ message: string; registration: Registration }> {
    const res = await fetch(`/api/events/${eventId}/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse<{ message: string; registration: Registration }>(res);
  },

  async getEventRegistrations(eventId: number): Promise<Registration[]> {
    const res = await fetch(`/api/events/${eventId}/registrations`, { headers: getHeaders() });
    const data = await handleResponse<{ registrations: Registration[] }>(res);
    return data.registrations;
  },

  async getMyRegistrations(userId?: number): Promise<(Registration & { event: EventItem })[]> {
    const uid = userId || currentUserId;
    const res = await fetch(`/api/my-registrations?user_id=${uid}`, { headers: getHeaders() });
    const data = await handleResponse<{ registrations: (Registration & { event: EventItem })[] }>(res);
    return data.registrations;
  },

  async updateAttendance(registrationId: number, status: 'registered' | 'attended' | 'absent'): Promise<{ message: string; registration: Registration }> {
    const res = await fetch(`/api/registrations/${registrationId}/attendance`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ attendance_status: status }),
    });
    return handleResponse<{ message: string; registration: Registration }>(res);
  },

  async cancelRegistration(registrationId: number): Promise<{ message: string }> {
    const res = await fetch(`/api/registrations/${registrationId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },

  // Survey & Evaluations
  async getSurveySections(): Promise<SurveySection[]> {
    const res = await fetch('/api/survey/sections', { headers: getHeaders() });
    const data = await handleResponse<{ sections: SurveySection[] }>(res);
    return data.sections;
  },

  async createSurveySection(data: { section_name: string; section_description: string; display_order?: number }): Promise<SurveySection> {
    const res = await fetch('/api/survey/sections', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<{ section: SurveySection }>(res);
    return result.section;
  },

  async createSurveyQuestion(data: { section_id: number; question_text: string; is_required?: boolean }) {
    const res = await fetch('/api/survey/questions', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteSurveyQuestion(questionId: number) {
    const res = await fetch(`/api/survey/questions/${questionId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async submitEvaluation(eventId: number, data: { comments?: string; responses: { question_id: number; rating: number }[] }): Promise<{ evaluation_id: number; message: string }> {
    const res = await fetch(`/api/events/${eventId}/evaluations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ evaluation_id: number; message: string }>(res);
  },

  async getEvaluationReport(eventId: number): Promise<EvaluationReport> {
    const res = await fetch(`/api/events/${eventId}/evaluation-report`, { headers: getHeaders() });
    const data = await handleResponse<{ report: EvaluationReport }>(res);
    return data.report;
  },

  // Admin Dashboard & Reports
  async getAdminStats(): Promise<AdminDashboardStats> {
    const res = await fetch('/api/admin/dashboard', { headers: getHeaders() });
    const data = await handleResponse<{ stats: AdminDashboardStats }>(res);
    return data.stats;
  },

  async getEventsReport(): Promise<EventReportRow[]> {
    const res = await fetch('/api/reports/events', { headers: getHeaders() });
    const data = await handleResponse<{ events: EventReportRow[] }>(res);
    return data.events;
  },

  async getEventRankings(): Promise<EventRanking[]> {
    const res = await fetch('/api/reports/rankings', { headers: getHeaders() });
    const data = await handleResponse<{ rankings: EventRanking[] }>(res);
    return data.rankings;
  },

  async getActivity(limit = 20): Promise<{ logs: ActivityLog[]; notifications_seen_at: string | null }> {
    const res = await fetch(`/api/activity?limit=${limit}`, { headers: getHeaders() });
    return handleResponse<{ logs: ActivityLog[]; notifications_seen_at: string | null }>(res);
  },

  async markNotificationsSeen(): Promise<{ notifications_seen_at: string }> {
    const res = await fetch('/api/activity/seen', { method: 'PATCH', headers: getHeaders() });
    return handleResponse<{ notifications_seen_at: string }>(res);
  },

  async resetDemoDatabase(): Promise<{ message: string }> {
    const res = await fetch('/api/system/reset-demo', {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },
};
