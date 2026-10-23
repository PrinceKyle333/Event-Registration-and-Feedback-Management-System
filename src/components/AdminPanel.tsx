import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { EventItem, SurveySection, User } from '../types';
import {
  Users,
  ShieldCheck,
  Calendar,
  ClipboardCheck,
  BarChart3,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  LayoutDashboard,
} from 'lucide-react';
import { EvaluationReportView } from './EvaluationReportView';
import { SummaryCards, SummaryCard, SubTabBar, SubTab } from './SummaryCards';

interface AdminPanelProps {
  currentUser: User;
  initialSubTab?: 'dashboard' | 'users' | 'approval' | 'events' | 'surveys' | 'eval-reports' | 'reg-reports';
  onOpenCreateEvent: () => void;
  onOpenAttendance: (eventId: number) => void;
  onViewReport: (eventId: number) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  initialSubTab = 'events',
  onOpenCreateEvent,
  onOpenAttendance,
  onViewReport,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'dashboard' | 'users' | 'approval' | 'events' | 'surveys' | 'eval-reports' | 'reg-reports'
  >(initialSubTab);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New question form state
  const [selectedSectionId, setSelectedSectionId] = useState<number>(1);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [addingQuestion, setAddingQuestion] = useState(false);

  // User Management State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'organizer' | 'student'>('student');
  const [newStudentId, setNewStudentId] = useState('');
  const [newDept, setNewDept] = useState('BSIT 4B');
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsData, sectionsData, usersData] = await Promise.all([
        api.getEvents({ all: true }),
        api.getSurveySections(),
        api.getUsers(),
      ]);
      setEvents(eventsData);
      setSections(sectionsData);
      setUsers(usersData);
    } catch (err: any) {
      setError(err.message || 'Failed to load administration data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (eventId: number) => {
    try {
      await api.setEventApproval(eventId, 'approved');
      setActionSuccess('Event approved and activated for students');
      setTimeout(() => setActionSuccess(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve event');
    }
  };

  const handleReject = async (eventId: number) => {
    const reason = window.prompt(
      'Enter reason for rejecting event proposal:',
      'Schedule conflicts with university examination period.'
    );
    if (reason === null) return;

    try {
      await api.setEventApproval(eventId, 'rejected', reason);
      setActionSuccess('Event marked as rejected');
      setTimeout(() => setActionSuccess(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to reject event');
    }
  };

  const handleToggleActive = async (eventId: number, currentActive: number) => {
    try {
      const newActive = currentActive === 1 ? 0 : 1;
      await api.setEventStatus(eventId, newActive);
      setEvents((prev) =>
        prev.map((e) => (e.event_id === eventId ? { ...e, is_active: newActive } : e))
      );
      setActionSuccess(`Evaluation ${newActive ? 'activated' : 'deactivated'} for event`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update evaluation status');
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!window.confirm('Delete event and all associated registrations/evaluations?')) return;
    try {
      await api.deleteEvent(eventId);
      setActionSuccess('Event deleted successfully');
      setTimeout(() => setActionSuccess(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete event');
    }
  };

  const handleToggleUserStatus = async (userId: number) => {
    try {
      const res = await api.toggleUserStatus(userId);
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, status: res.user.status } : u))
      );
      setActionSuccess(res.message);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update user status');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      await api.createUser({
        username: newUsername,
        passwordPlain: newPassword,
        full_name: newFullName,
        email: newEmail,
        role: newRole,
        student_id: newStudentId,
        college_department: newDept,
      });
      setShowAddUserModal(false);
      setActionSuccess('New user account created successfully');
      setTimeout(() => setActionSuccess(null), 3000);
      loadData();
      // Reset form
      setNewUsername('');
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewStudentId('');
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    setAddingQuestion(true);
    try {
      await api.createSurveyQuestion({
        section_id: selectedSectionId,
        question_text: newQuestionText.trim(),
        is_required: true,
      });
      setNewQuestionText('');
      setActionSuccess('Survey question added to MySQL database');
      setTimeout(() => setActionSuccess(null), 3000);
      const updatedSections = await api.getSurveySections();
      setSections(updatedSections);
    } catch (err: any) {
      setError(err.message || 'Failed to add survey question');
    } finally {
      setAddingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!window.confirm('Remove this question from the dynamic evaluation survey?')) return;
    try {
      await api.deleteSurveyQuestion(questionId);
      setActionSuccess('Question removed from survey');
      setTimeout(() => setActionSuccess(null), 3000);
      const updatedSections = await api.getSurveySections();
      setSections(updatedSections);
    } catch (err: any) {
      setError(err.message || 'Failed to delete question');
    }
  };

  const pendingEvents = events.filter((e) => e.approval_status === 'pending');

  return (
    <div className="space-y-6">

  type AdminSubTab = typeof activeSubTab;
  const today = new Date().toISOString().slice(0, 10);
  const totalRegistrations = events.reduce((acc, e) => acc + e.registered_count, 0);
  const totalAttended = events.reduce((acc, e) => acc + e.attended_count, 0);
  const totalEvaluations = events.reduce((acc, e) => acc + e.evaluation_count, 0);
  const allQuestions = sections.flatMap((sec) => sec.questions);

  // Sibling pages of each sidebar dropdown; only the current group's tabs are shown
  const tabGroups: SubTab<AdminSubTab>[][] = [
    [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
    [{ id: 'users', label: 'User Management', icon: Users }],
    [
      { id: 'approval', label: `Event Approval (${pendingEvents.length})`, icon: ShieldCheck },
      { id: 'events', label: `Event Management (${events.length})`, icon: Calendar },
      { id: 'surveys', label: 'Survey Management', icon: ClipboardCheck },
    ],
    [
      { id: 'eval-reports', label: 'Evaluation Reports', icon: BarChart3 },
      { id: 'reg-reports', label: 'Registration Reports', icon: FileText },
    ],
  ];
  const currentTabs = tabGroups.find((group) => group.some((tab) => tab.id === activeSubTab)) ?? [];

  const summaryByTab: Record<AdminSubTab, SummaryCard[]> = {
    dashboard: [
      { label: 'Total Events', value: events.length },
      { label: 'Pending Review', value: pendingEvents.length, tone: 'gold' },
      { label: 'Active Evaluation', value: events.filter((e) => e.is_active === 1).length, tone: 'green' },
    ],
    users: [
      { label: 'Total Users', value: users.length },
      { label: 'Students', value: users.filter((u) => u.role === 'student').length, tone: 'green' },
      { label: 'Organizers', value: users.filter((u) => u.role === 'organizer').length },
      { label: 'Inactive Accounts', value: users.filter((u) => u.status === 'inactive').length, tone: 'gold' },
    ],
    approval: [
      { label: 'Pending Review', value: pendingEvents.length, tone: 'gold', hint: 'Awaiting your decision' },
      { label: 'Approved', value: events.filter((e) => e.approval_status === 'approved').length, tone: 'green' },
      { label: 'Rejected', value: events.filter((e) => e.approval_status === 'rejected').length },
    ],
    events: [
      { label: 'Total Events', value: events.length },
      { label: 'Upcoming', value: events.filter((e) => e.event_date >= today).length, tone: 'gold' },
      { label: 'Evaluation Open', value: events.filter((e) => e.is_active === 1).length, tone: 'green' },
    ],
    surveys: [
      { label: 'Survey Sections', value: sections.length },
      { label: 'Total Questions', value: allQuestions.length, tone: 'gold' },
      { label: 'Required Questions', value: allQuestions.filter((q) => q.is_required).length, tone: 'green' },
    ],
    'eval-reports': [
      { label: 'Evaluations Submitted', value: totalEvaluations },
      { label: 'Events With Feedback', value: events.filter((e) => e.evaluation_count > 0).length, tone: 'green' },
      {
        label: 'Response Rate',
        value: `${totalAttended > 0 ? Math.round((totalEvaluations / totalAttended) * 100) : 0}%`,
        tone: 'gold',
        hint: 'Evaluations per attendee',
      },
    ],
    'reg-reports': [
      { label: 'Total Registrations', value: totalRegistrations },
      { label: 'Confirmed Present', value: totalAttended, tone: 'green' },
      { label: 'Not Checked In', value: totalRegistrations - totalAttended, tone: 'gold' },
    ],
  };
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-xl font-bold font-serif-cmu text-stone-900">
            Administrator Control Center
          </h2>
          <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
            Admin: <strong className="text-stone-800">{currentUser.full_name}</strong> · Dean, CISC / System Architect
          </p>
        </div>

        <button
          onClick={onOpenCreateEvent}
          className="px-4 py-2 text-xs font-bold text-stone-950 bg-[#FFC600] hover:bg-amber-400 rounded-xl transition-all shadow-xs self-start sm:self-auto"
        >
          + Propose / Publish Official Event
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
          <CheckCircle2 size={16} />
          {actionSuccess}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-bold flex items-center gap-2">
          <XCircle size={16} />
          {error}
        </div>
      )}

      <SummaryCards cards={summaryByTab[activeSubTab]} />

      <SubTabBar tabs={currentTabs} active={activeSubTab} onChange={setActiveSubTab} />

      {/* 0. MODULE: DASHBOARD */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold font-serif-cmu text-stone-900">
                Central Mindanao University Administrative Overview
              </h3>
              <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
                Executive monitoring of university-wide events, student participation, and institutional survey rubrics.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                className="px-3 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-300"
              >
                Refresh Data
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {pendingEvents.length > 0 && (
                <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                      <ShieldCheck size={16} className="text-amber-700" />
                      Pending Dean Approval Queue ({pendingEvents.length})
                    </span>
                    <button
                      onClick={() => setActiveSubTab('approval')}
                      className="text-xs font-bold text-amber-800 hover:underline"
                    >
                      Review All →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {pendingEvents.slice(0, 3).map((evt) => (
                      <div
                        key={evt.event_id}
                        className="bg-white p-3.5 rounded-xl border border-amber-200/70 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-stone-900">{evt.event_name}</div>
                          <div className="text-[11px] text-stone-500">
                            {evt.department} · {evt.event_date} · {evt.venue}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(evt.event_id)}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-[#00491E] hover:bg-[#02681E] rounded-md"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(evt.event_id)}
                            className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                  <h4 className="font-bold text-sm font-serif-cmu text-stone-900">
                    Live University Events
                  </h4>
                  <button
                    onClick={() => setActiveSubTab('events')}
                    className="text-xs font-bold text-[#00491E] hover:underline"
                  >
                    View All ({events.length}) →
                  </button>
                </div>
                <div className="divide-y divide-stone-100">
                  {events.slice(0, 5).map((evt) => (
                    <div key={evt.event_id} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-stone-50/70">
                      <div>
                        <div className="font-bold text-stone-900">{evt.event_name}</div>
                        <div className="text-[11px] text-stone-500">
                          {evt.event_date} · {evt.venue} · {evt.registered_count} registrants
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold ${
                          evt.approval_status === 'approved'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}>
                          {evt.approval_status.toUpperCase()}
                        </span>
                        <button
                          onClick={() => {
                            onViewReport(evt.event_id);
                          }}
                          className="text-xs font-bold text-[#00491E] hover:underline"
                        >
                          Feedback
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <h4 className="font-bold text-sm font-serif-cmu text-stone-900 border-b border-stone-100 pb-2">
                  System Architecture Quick Links
                </h4>
                <div className="space-y-2 text-xs">
                  <button
                    onClick={() => setShowAddUserModal(true)}
                    className="w-full text-left p-3 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 flex items-center justify-between"
                  >
                    <span className="font-bold text-stone-800">+ Provision User Account</span>
                    <span className="text-[10px] text-stone-500">Admin/Org/Student</span>
                  </button>
                  <button
                    onClick={() => setActiveSubTab('surveys')}
                    className="w-full text-left p-3 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 flex items-center justify-between"
                  >
                    <span className="font-bold text-stone-800">📝 Configure Survey Rubrics</span>
                    <span className="text-[10px] text-stone-500">4 Sections</span>
                  </button>
                  <button
                    onClick={() => setActiveSubTab('eval-reports')}
                    className="w-full text-left p-3 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 flex items-center justify-between"
                  >
                    <span className="font-bold text-stone-800">📊 Generate Statistical Reports</span>
                    <span className="text-[10px] text-stone-500">Rubric Summary</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. MODULE: USER MANAGEMENT */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-serif-cmu text-stone-900">
                User Management Directory
              </h3>
              <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
                Create, view, edit, deactivate, and manage university accounts across roles.
              </p>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2 bg-[#00491E] text-white text-xs font-bold rounded-xl hover:bg-[#02681E] shadow-xs flex items-center gap-1.5"
            >
              <Plus size={15} />
              + Add User Account
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-black uppercase bg-stone-50/70">
                    <th className="py-3 px-5">User Profile</th>
                    <th className="py-3 px-5">Username</th>
                    <th className="py-3 px-5">Email</th>
                    <th className="py-3 px-5">Role</th>
                    <th className="py-3 px-5">Academic Office / ID</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {users.map((u) => (
                    <tr key={u.user_id} className="hover:bg-stone-50/60">
                      <td className="py-3.5 px-5 font-bold text-stone-900">
                        {u.full_name}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-stone-600">
                        {u.username}
                      </td>
                      <td className="py-3.5 px-5 text-stone-600">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`whitespace-nowrap px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          u.role === 'admin'
                            ? 'bg-amber-100 text-amber-900'
                            : u.role === 'organizer'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-stone-100 text-stone-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-stone-600">
                        {u.student_id ? `${u.student_id} (${u.college_department})` : u.college_department || '—'}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.status === 'inactive'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {u.status === 'inactive' ? 'Deactivated' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => handleToggleUserStatus(u.user_id)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded ${
                            u.status === 'inactive'
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          {u.status === 'inactive' ? 'Activate' : 'Deactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODULE: EVENT APPROVAL */}
      {activeSubTab === 'approval' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <h3 className="text-base font-bold font-serif-cmu text-stone-900">
              Event Approval & Verification Queue
            </h3>
            <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
              Review event proposals submitted by organizers. Authorize or reject before student registration begins.
            </p>
          </div>

          {pendingEvents.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 text-xs text-stone-500">
              No pending event proposals requiring review. All submitted events have been evaluated.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingEvents.map((pe) => (
                <div
                  key={pe.event_id}
                  className="p-5 bg-white rounded-2xl border border-amber-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      Pending Review
                    </span>
                    <h4 className="text-base font-bold font-serif-cmu text-stone-900 mt-1">
                      {pe.event_name}
                    </h4>
                    <div className="text-xs text-stone-500 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Department: <strong>{pe.department}</strong></span>
                      <span>·</span>
                      <span>Venue: <strong>{pe.venue}</strong></span>
                      <span>·</span>
                      <span>Date: <strong>{pe.event_date}</strong></span>
                      <span>·</span>
                      <span>Capacity: <strong>{pe.capacity} attendees</strong></span>
                    </div>
                    <p className="text-xs text-stone-600 mt-2 line-clamp-2">
                      {pe.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleReject(pe.event_id)}
                      className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200"
                    >
                      Reject Proposal
                    </button>
                    <button
                      onClick={() => handleApprove(pe.event_id)}
                      className="px-5 py-2 text-xs font-bold text-white bg-[#00491E] hover:bg-[#02681E] rounded-xl shadow-xs"
                    >
                      Approve & Publish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. MODULE: EVENT MANAGEMENT */}
      {activeSubTab === 'events' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-serif-cmu text-stone-900">
                Event Management & Evaluation Controls
              </h3>
              <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
                Toggle evaluation open/closed (is_active), view participant rosters, or delete completed events.
              </p>
            </div>
            <button
              onClick={onOpenCreateEvent}
              className="px-4 py-2 text-xs font-bold text-stone-950 bg-[#FFC600] hover:bg-amber-400 rounded-xl shadow-xs"
            >
              + Create Event
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-black uppercase bg-stone-50/70">
                    <th className="py-3 px-5">Event Details</th>
                    <th className="py-3 px-5">Approval</th>
                    <th className="py-3 px-5">Evaluation Active</th>
                    <th className="py-3 px-5">Registrations</th>
                    <th className="py-3 px-5">Attended</th>
                    <th className="py-3 px-5">Evaluations</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {events.map((evt) => (
                    <tr key={evt.event_id} className="hover:bg-stone-50/60">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-stone-900 text-sm">{evt.event_name}</div>
                        <div className="text-[11px] text-stone-500">
                          {evt.department} · {evt.event_date} · {evt.venue}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          evt.approval_status === 'approved'
                            ? 'bg-emerald-50 text-emerald-800'
                            : evt.approval_status === 'rejected'
                            ? 'bg-rose-50 text-rose-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}>
                          {evt.approval_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <button
                          onClick={() => handleToggleActive(evt.event_id, evt.is_active)}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                            evt.is_active === 1
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          {evt.is_active === 1 ? '● Active (Open)' : 'Inactive (Closed)'}
                        </button>
                      </td>
                      <td className="py-3.5 px-5 font-mono font-bold text-stone-800">
                        {evt.registered_count} / {evt.capacity}
                      </td>
                      <td className="py-3.5 px-5 font-mono font-bold text-emerald-700">
                        {evt.attended_count}
                      </td>
                      <td className="py-3.5 px-5 font-mono font-bold text-stone-800">
                        {evt.evaluation_count}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenAttendance(evt.event_id)}
                            className="px-2.5 py-1 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded"
                          >
                            Roster
                          </button>
                          <button
                            onClick={() => onViewReport(evt.event_id)}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-[#00491E] hover:bg-[#02681E] rounded"
                          >
                            Report
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(evt.event_id)}
                            className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODULE: SURVEY MANAGEMENT */}
      {activeSubTab === 'surveys' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <h3 className="text-base font-bold font-serif-cmu text-stone-900 mb-1">
              Survey Section & Question Builder
            </h3>
            <p className="text-xs text-stone-500 font-sans-cmu mb-4">
              Add, modify, and manage questions for Accommodation, Speaker, Food, and Coordination sections.
            </p>

            <form onSubmit={handleAddQuestion} className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-stone-100">
              <div className="w-full sm:w-64">
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00491E]"
                >
                  {sections.map((s) => (
                    <option key={s.section_id} value={s.section_id}>
                      Section {s.display_order}: {s.section_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <input
                  type="text"
                  required
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Enter survey question text..."
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00491E]"
                />
              </div>

              <button
                type="submit"
                disabled={addingQuestion}
                className="px-4 py-2 text-xs font-bold text-white bg-[#00491E] hover:bg-[#02681E] rounded-lg transition-colors whitespace-nowrap shadow-xs disabled:opacity-50"
              >
                {addingQuestion ? 'Saving...' : '+ Add Question'}
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {sections.map((section, idx) => (
              <div key={section.section_id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold font-serif-cmu text-[#00491E] uppercase">
                      Section {idx + 1}: {section.section_name}
                    </h4>
                    <span className="text-[11px] text-stone-500">
                      {section.section_description}
                    </span>
                  </div>
                  <span className="whitespace-nowrap text-xs font-mono font-bold text-stone-700 bg-white px-2.5 py-0.5 rounded border border-stone-200">
                    {section.questions.length} questions
                  </span>
                </div>

                <div className="divide-y divide-stone-100">
                  {section.questions.map((q, qIdx) => (
                    <div key={q.question_id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-stone-50/50">
                      <div className="text-xs text-stone-800">
                        <span className="font-mono text-stone-400 mr-2">
                          {idx + 1}.{qIdx + 1}
                        </span>
                        {q.question_text}
                      </div>

                      <button
                        onClick={() => handleDeleteQuestion(q.question_id)}
                        className="text-stone-400 hover:text-rose-600 text-xs px-2 py-1 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. MODULE: EVALUATION REPORTS */}
      {activeSubTab === 'eval-reports' && (
        <div className="space-y-4">
          <EvaluationReportView events={events} />
        </div>
      )}

      {/* 6. MODULE: REGISTRATION REPORTS */}
      {activeSubTab === 'reg-reports' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-serif-cmu text-stone-900">
                University Registration & Attendance Statistics
              </h3>
              <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
                Attendance rate metrics, turnout counts, and participation data for all departments.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-black uppercase bg-stone-50/70">
                    <th className="py-3 px-5">Department / College</th>
                    <th className="py-3 px-5">Total Registered</th>
                    <th className="py-3 px-5">Confirmed Present</th>
                    <th className="py-3 px-5">Turnout Rate</th>
                    <th className="py-3 px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <tr className="hover:bg-stone-50/60">
                    <td className="py-3.5 px-5 font-bold text-stone-900">
                      College of Information Sciences and Computing
                    </td>
                    <td className="py-3.5 px-5 font-mono">180 students</td>
                    <td className="py-3.5 px-5 font-mono text-emerald-700 font-bold">165 attended</td>
                    <td className="py-3.5 px-5 font-mono font-bold text-[#00491E]">91.6%</td>
                    <td className="py-3.5 px-5 text-right">
                      <span className="whitespace-nowrap text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">
                        Excellent
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-stone-50/60">
                    <td className="py-3.5 px-5 font-bold text-stone-900">
                      College of Engineering
                    </td>
                    <td className="py-3.5 px-5 font-mono">120 students</td>
                    <td className="py-3.5 px-5 font-mono text-emerald-700 font-bold">98 attended</td>
                    <td className="py-3.5 px-5 font-mono font-bold text-[#00491E]">81.7%</td>
                    <td className="py-3.5 px-5 text-right">
                      <span className="whitespace-nowrap text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">
                        Very Satisfactory
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-stone-50/60">
                    <td className="py-3.5 px-5 font-bold text-stone-900">
                      College of Agriculture
                    </td>
                    <td className="py-3.5 px-5 font-mono">95 students</td>
                    <td className="py-3.5 px-5 font-mono text-emerald-700 font-bold">78 attended</td>
                    <td className="py-3.5 px-5 font-mono font-bold text-[#00491E]">82.1%</td>
                    <td className="py-3.5 px-5 text-right">
                      <span className="whitespace-nowrap text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">
                        Very Satisfactory
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200">
            <div className="bg-[#00491E] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-serif-cmu text-amber-300">
                  Add User Account
                </h3>
                <p className="text-xs text-stone-200">Create student, organizer, or admin</p>
              </div>
              <button onClick={() => setShowAddUserModal(false)} className="text-stone-300 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. maria.santos"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@cmu.edu.ph"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Temporary Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Role *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  >
                    <option value="student">Student</option>
                    <option value="organizer">Organizer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Student ID</label>
                  <input
                    type="text"
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    placeholder="2023-BSIT-XXXX"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">College / Department</label>
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder="Department of IT"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-2 bg-[#00491E] text-white font-bold rounded-xl hover:bg-[#02681E]"
                >
                  {creatingUser ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
