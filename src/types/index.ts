export type UserRole = 'admin' | 'organizer' | 'student';

export interface User {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  role: UserRole;
  student_id?: string | null;
  college_department?: string | null;
  status?: 'active' | 'inactive';
  created_at: string;
}

export interface EventItem {
  event_id: number;
  event_name: string;
  event_date: string;
  department: string;
  description: string;
  venue: string;
  start_time: string;
  end_time: string;
  registration_deadline: string | null;
  capacity: number;
  organizer_id: number | null;
  organizer_name?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  is_active: number;
  admin_id: number | null;
  image_url?: string;
  registered_count: number;
  attended_count: number;
  evaluation_count: number;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  registration_id: number;
  event_id: number;
  user_id: number;
  registered_at: string;
  attendance_status: 'registered' | 'attended' | 'absent';
  attended_at: string | null;
  student_name?: string;
  student_id_number?: string;
  student_email?: string;
  college_department?: string;
  has_evaluated?: boolean;
  event?: EventItem;
}

export interface SurveyQuestion {
  question_id: number;
  section_id: number;
  question_text: string;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface SurveySection {
  section_id: number;
  section_name: string;
  section_description: string;
  display_order: number;
  questions: SurveyQuestion[];
  created_at: string;
  updated_at: string;
}

export interface QuestionBreakdown {
  question_id: number;
  question_text: string;
  responses_count: number;
  mean_score: number;
  interpretation: string;
  rating_counts: Record<number, number>;
}

export interface SectionReport {
  section_id: number;
  section_name: string;
  section_description: string;
  total_responses: number;
  mean_score: number;
  interpretation: string;
  questions: QuestionBreakdown[];
}

export interface EvaluationReport {
  event_id: number;
  event_name: string;
  event_date: string;
  department: string;
  venue: string;
  total_registered: number;
  total_attended: number;
  total_evaluations: number;
  response_rate_percent: number;
  overall_mean_score: number;
  overall_interpretation: string;
  sections: SectionReport[];
  anonymous_comments: { submit_date: string; comment: string }[];
  generated_at: string;
}

export interface AdminDashboardStats {
  total_events: number;
  pending_approvals: number;
  approved_events: number;
  active_evaluation_events: number;
  total_registrations: number;
  total_attended: number;
  attendance_rate_percent: number;
  total_evaluations: number;
  overall_satisfaction_score: number;
  total_students: number;
  total_organizers: number;
}
