import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { EventItem, User, Registration, EvaluationReport } from '../types';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  ListFilter,
  ClipboardCheck,
  BarChart3,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ExternalLink,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { SummaryCards, SummaryCard, SubTabBar, SubTab } from './SummaryCards';

interface OrganizerPanelProps {
  currentUser: User;
  initialSubTab?: 'dashboard' | 'events' | 'registrations' | 'attendance' | 'status' | 'evaluations' | 'reports';
  onOpenCreateEvent: () => void;
  onOpenAttendance: (eventId: number) => void;
  onViewReport: (eventId: number) => void;
}

export const OrganizerPanel: React.FC<OrganizerPanelProps> = ({
  currentUser,
  initialSubTab = 'dashboard',
  onOpenCreateEvent,
  onOpenAttendance,
  onViewReport,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'dashboard' | 'events' | 'registrations' | 'attendance' | 'status' | 'evaluations' | 'reports'
  >(initialSubTab);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // For Registrations & Attendance Sub-modules
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [regSearchQuery, setRegSearchQuery] = useState('');

  // For Feedback & Evaluation Sub-module
  const [selectedEvalEventId, setSelectedEvalEventId] = useState<number | null>(null);
  const [evaluationReport, setEvaluationReport] = useState<EvaluationReport | null>(null);
  const [loadingEvalReport, setLoadingEvalReport] = useState(false);

  // Status module filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'active'>('all');

  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    loadOrganizerEvents();
  }, [currentUser]);

  const loadOrganizerEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getEvents({
        all: true,
        organizer_id: currentUser.user_id,
      });
      setEvents(data);
      if (data.length > 0) {
        if (!selectedEventId) setSelectedEventId(data[0].event_id);
        if (!selectedEvalEventId) setSelectedEvalEventId(data[0].event_id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load organizer events');
    } finally {
      setLoading(false);
    }
  };

  // Load registrations when selectedEventId changes
  useEffect(() => {
    if (selectedEventId && (activeSubTab === 'registrations' || activeSubTab === 'attendance' || activeSubTab === 'reports')) {
      loadEventRegistrations(selectedEventId);
    }
  }, [selectedEventId, activeSubTab]);

  // Load evaluation report when selectedEvalEventId changes
  useEffect(() => {
    if (selectedEvalEventId && (activeSubTab === 'evaluations' || activeSubTab === 'reports')) {
      loadEvaluationReportData(selectedEvalEventId);
    }
  }, [selectedEvalEventId, activeSubTab]);

  const loadEventRegistrations = async (eventId: number) => {
    setLoadingRegistrations(true);
    try {
      const regs = await api.getEventRegistrations(eventId);
      setRegistrations(regs);
    } catch (err: any) {
      setError(err.message || 'Failed to load event registrations');
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const loadEvaluationReportData = async (eventId: number) => {
    setLoadingEvalReport(true);
    try {
      const rep = await api.getEvaluationReport(eventId);
      setEvaluationReport(rep);
    } catch {
      setEvaluationReport(null);
    } finally {
      setLoadingEvalReport(false);
    }
  };

  const handleToggleAttendance = async (regId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'attended' ? 'absent' : 'attended';
    try {
      await api.updateAttendance(regId, newStatus as any);
      setRegistrations((prev) =>
        prev.map((r) => (r.registration_id === regId ? { ...r, attendance_status: newStatus as any } : r))
      );
      setSuccessMsg(`Participant marked as ${newStatus}`);
      setTimeout(() => setSuccessMsg(null), 2500);
      loadOrganizerEvents();
    } catch (err: any) {
      setError(err.message || 'Failed to update attendance');
    }
  };

  const handleToggleEvaluationActive = async (eventId: number, currentActive: number) => {
    const newActive = currentActive === 1 ? 0 : 1;
    try {
      await api.setEventStatus(eventId, newActive);
      setEvents((prev) =>
        prev.map((e) => (e.event_id === eventId ? { ...e, is_active: newActive } : e))
      );
      setSuccessMsg(`Survey evaluation ${newActive ? 'opened' : 'closed'} for participants`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle event evaluation');
    }
  };

  const handleBatchMarkAllPresent = async () => {
    if (!selectedEventId || registrations.length === 0) return;
    if (!window.confirm(`Mark all ${registrations.length} registered students as Confirmed Present?`)) return;
    try {
      for (const reg of registrations) {
        if (reg.attendance_status !== 'attended') {
          await api.updateAttendance(reg.registration_id, 'attended');
        }
      }
      setSuccessMsg('All registered participants marked as present!');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadEventRegistrations(selectedEventId);
      loadOrganizerEvents();
    } catch (err: any) {
      setError(err.message || 'Batch attendance update failed');
    }
  };

  const exportRegistrationsCsv = () => {
    const activeEvt = events.find((e) => e.event_id === selectedEventId);
    if (!activeEvt || registrations.length === 0) return;

    const headers = ['Registration ID', 'Student Name', 'Email', 'Student ID', 'Department', 'Registered At', 'Attendance Status', 'Evaluated'];
    const rows = registrations.map((r) => [
      r.registration_id,
      `"${r.student?.full_name || ''}"`,
      r.student?.email || '',
      r.student?.student_id || '',
      `"${r.student?.college_department || ''}"`,
      r.registered_at,
      r.attendance_status,
      r.has_evaluated ? 'Yes' : 'No',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CMU_${activeEvt.event_name.replace(/\s+/g, '_')}_Registrations.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRegistrations = events.reduce((acc, e) => acc + e.registered_count, 0);
  const totalAttended = events.reduce((acc, e) => acc + e.attended_count, 0);
  const totalEvaluations = events.reduce((acc, e) => acc + e.evaluation_count, 0);
  const overallAttendanceRate = totalRegistrations > 0 ? Math.round((totalAttended / totalRegistrations) * 100) : 0;

  const currentEvent = events.find((e) => e.event_id === selectedEventId) || events[0];

  type OrganizerSubTab = typeof activeSubTab;
  const today = new Date().toISOString().slice(0, 10);
  const approvedEvents = events.filter((e) => e.approval_status === 'approved');
  const totalCapacity = approvedEvents.reduce((acc, e) => acc + e.capacity, 0);
  const approvedRegistrations = approvedEvents.reduce((acc, e) => acc + e.registered_count, 0);
  const evaluationResponseRate = totalAttended > 0 ? Math.round((totalEvaluations / totalAttended) * 100) : 0;

  // Sibling pages of each sidebar dropdown; only the current group's tabs are shown
  const tabGroups: SubTab<OrganizerSubTab>[][] = [
    [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
    [
      { id: 'events', label: `Event Management (${events.length})`, icon: Calendar },
      { id: 'status', label: 'Event Status', icon: ListFilter },
    ],
    [
      { id: 'registrations', label: 'Registration Management', icon: Users },
      { id: 'attendance', label: 'Attendance Management', icon: UserCheck },
    ],
    [
      { id: 'evaluations', label: 'Feedback and Evaluation', icon: ClipboardCheck },
      { id: 'reports', label: 'Reports & Export', icon: BarChart3 },
    ],
  ];
  const currentTabs = tabGroups.find((group) => group.some((tab) => tab.id === activeSubTab)) ?? [];

  const summaryByTab: Record<OrganizerSubTab, SummaryCard[]> = {
    dashboard: [
      { label: 'My Created Events', value: events.length, hint: `${approvedEvents.length} Approved by Dean` },
      { label: 'Total Registrations', value: totalRegistrations, tone: 'gold' },
      { label: 'Confirmed Present', value: totalAttended, tone: 'green', hint: `${overallAttendanceRate}% Overall Turnout` },
      { label: 'Evaluations Submitted', value: totalEvaluations, tone: 'gold' },
    ],
    events: [
      { label: 'My Events', value: events.length },
      { label: 'Upcoming', value: events.filter((e) => e.event_date >= today).length, tone: 'gold' },
      { label: 'Total Capacity', value: totalCapacity, tone: 'green', hint: 'Seats across approved events' },
    ],
    status: [
      { label: 'Approved', value: approvedEvents.length, tone: 'green' },
      { label: 'Pending Review', value: events.filter((e) => e.approval_status === 'pending').length, tone: 'gold' },
      { label: 'Rejected', value: events.filter((e) => e.approval_status === 'rejected').length },
      { label: 'Evaluation Open', value: events.filter((e) => e.is_active === 1).length, tone: 'green' },
    ],
    registrations: [
      { label: 'Total Registrations', value: totalRegistrations },
      { label: 'Seats Remaining', value: Math.max(totalCapacity - approvedRegistrations, 0), tone: 'green' },
      {
        label: 'Fill Rate',
        value: `${totalCapacity > 0 ? Math.round((approvedRegistrations / totalCapacity) * 100) : 0}%`,
        tone: 'gold',
        hint: 'Registrations vs capacity',
      },
    ],
    attendance: [
      { label: 'Confirmed Present', value: totalAttended, tone: 'green' },
      { label: 'Not Checked In', value: totalRegistrations - totalAttended, tone: 'gold' },
      { label: 'Turnout Rate', value: `${overallAttendanceRate}%` },
    ],
    evaluations: [
      { label: 'Evaluations Submitted', value: totalEvaluations },
      { label: 'Events With Feedback', value: events.filter((e) => e.evaluation_count > 0).length, tone: 'green' },
      { label: 'Evaluation Open', value: events.filter((e) => e.is_active === 1).length, tone: 'gold' },
    ],
    reports: [
      { label: 'Reportable Events', value: approvedEvents.length, hint: 'Approved events' },
      { label: 'Participants Served', value: totalAttended, tone: 'green' },
      { label: 'Response Rate', value: `${evaluationResponseRate}%`, tone: 'gold', hint: 'Evaluations per attendee' },
    ],
  };

  const filteredRegistrations = registrations.filter((r) => {
    if (!regSearchQuery.trim()) return true;
    const q = regSearchQuery.toLowerCase();
    const name = r.student?.full_name?.toLowerCase() || '';
    const email = r.student?.email?.toLowerCase() || '';
    const sid = r.student?.student_id?.toLowerCase() || '';
    const dept = r.student?.college_department?.toLowerCase() || '';
    return name.includes(q) || email.includes(q) || sid.includes(q) || dept.includes(q);
  });

  const filteredEventsByStatus = events.filter((e) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return e.approval_status === 'pending';
    if (statusFilter === 'approved') return e.approval_status === 'approved';
    if (statusFilter === 'rejected') return e.approval_status === 'rejected';
    if (statusFilter === 'active') return e.is_active === 1;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-xl font-bold font-serif-cmu text-stone-900">
            Event Organizer Management Studio
          </h2>
          <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
            Organizer: <strong className="text-stone-800">{currentUser.full_name}</strong> · {currentUser.college_department || 'Department of Information Technology'}
          </p>
        </div>

        <button
          onClick={onOpenCreateEvent}
          className="px-4 py-2 text-xs font-bold text-stone-950 bg-[#FFC600] hover:bg-amber-400 rounded-xl transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={15} />
          Propose New Event
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-bold flex items-center gap-2">
          <XCircle size={16} />
          {error}
        </div>
      )}

      <SummaryCards cards={summaryByTab[activeSubTab]} />

      <SubTabBar tabs={currentTabs} active={activeSubTab} onChange={setActiveSubTab} />

      {/* 1. MODULE: DASHBOARD */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold font-serif-cmu text-stone-900">
                Organizer Executive Overview
              </h3>
              <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
                Quick access to recent event submissions, registration counts, and evaluation readiness.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadOrganizerEvents}
                className="px-3 py-1.5 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg border border-stone-300 flex items-center gap-1"
              >
                <RefreshCw size={13} />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                <h4 className="text-sm font-bold font-serif-cmu text-stone-900">
                  Recent Events Activity
                </h4>
                <button
                  onClick={() => setActiveSubTab('events')}
                  className="text-xs font-bold text-[#00491E] hover:underline"
                >
                  Manage All →
                </button>
              </div>
              <div className="divide-y divide-stone-100">
                {events.slice(0, 4).map((evt) => (
                  <div key={evt.event_id} className="p-4 flex items-center justify-between gap-4 hover:bg-stone-50/70 transition-colors">
                    <div>
                      <h5 className="font-bold text-xs text-stone-900">{evt.event_name}</h5>
                      <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                        <span>{evt.event_date}</span>
                        <span>·</span>
                        <span>{evt.venue}</span>
                        <span>·</span>
                        <span className="font-mono text-stone-700 font-semibold">{evt.registered_count} registered</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        evt.approval_status === 'approved'
                          ? 'bg-emerald-50 text-emerald-800'
                          : evt.approval_status === 'rejected'
                          ? 'bg-rose-50 text-rose-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}>
                        {evt.approval_status.toUpperCase()}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedEventId(evt.event_id);
                          setActiveSubTab('attendance');
                        }}
                        className="px-2.5 py-1 text-xs font-bold bg-[#00491E] text-white rounded hover:bg-[#02681E]"
                      >
                        Attendance
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <h4 className="text-sm font-bold font-serif-cmu text-stone-900 border-b border-stone-100 pb-2">
                Organizer Quick Actions
              </h4>
              <div className="space-y-2">
                <button
                  onClick={onOpenCreateEvent}
                  className="w-full text-left p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                >
                  <div className="font-bold text-xs text-[#00491E]">+ Submit New Event Proposal</div>
                  <div className="text-[11px] text-stone-600">Send event schedule and venue details to Dean for approval.</div>
                </button>

                <button
                  onClick={() => setActiveSubTab('registrations')}
                  className="w-full text-left p-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                >
                  <div className="font-bold text-xs text-amber-950">📋 View Participant Rosters</div>
                  <div className="text-[11px] text-stone-600">Search student registrants and download CSV rosters.</div>
                </button>

                <button
                  onClick={() => setActiveSubTab('reports')}
                  className="w-full text-left p-3 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-colors"
                >
                  <div className="font-bold text-xs text-stone-800">📊 Generate Evaluation Reports</div>
                  <div className="text-[11px] text-stone-600">Review survey feedback scores and download reports.</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODULE: EVENT MANAGEMENT */}
      {activeSubTab === 'events' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold font-serif-cmu text-stone-900">
                Created Events Management
              </h3>
              <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
                Edit details, toggle evaluation survey availability, and monitor student registration counts.
              </p>
            </div>
            <button
              onClick={onOpenCreateEvent}
              className="px-4 py-2 text-xs font-bold text-stone-950 bg-[#FFC600] hover:bg-amber-400 rounded-xl transition-all shadow-xs"
            >
              + Propose Event
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-extrabold uppercase bg-stone-50/70">
                    <th className="py-3 px-4">Event Details</th>
                    <th className="py-3 px-4">Venue & Time</th>
                    <th className="py-3 px-4">Approval Status</th>
                    <th className="py-3 px-4">Capacity / Signups</th>
                    <th className="py-3 px-4">Evaluation Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {events.map((evt) => (
                    <tr key={evt.event_id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900 text-sm">{evt.event_name}</div>
                        <div className="text-[11px] text-stone-500 line-clamp-1">{evt.description}</div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-700">
                        <div>{evt.venue}</div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {evt.event_date} ({evt.start_time.slice(0, 5)} - {evt.end_time.slice(0, 5)})
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {evt.approval_status === 'approved' ? (
                          <span className="text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full font-bold text-[10px]">
                            Approved
                          </span>
                        ) : evt.approval_status === 'rejected' ? (
                          <span className="text-rose-800 bg-rose-50 px-2.5 py-1 rounded-full font-bold text-[10px]">
                            Rejected
                          </span>
                        ) : (
                          <span className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full font-bold text-[10px]">
                            Pending Admin Review
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-stone-900">{evt.registered_count}</span>
                        <span className="text-stone-400"> / {evt.capacity}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleEvaluationActive(evt.event_id, evt.is_active)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                            evt.is_active === 1
                              ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          {evt.is_active === 1 ? 'Survey Open ✓' : 'Survey Closed'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedEventId(evt.event_id);
                              setActiveSubTab('attendance');
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-[#00491E] hover:bg-[#02681E] rounded-lg transition-colors"
                          >
                            Attendance
                          </button>
                          <button
                            onClick={() => onViewReport(evt.event_id)}
                            className="px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-200"
                          >
                            Report
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

      {/* 3. MODULE: REGISTRATION MANAGEMENT */}
      {activeSubTab === 'registrations' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold font-serif-cmu text-stone-900">
                Registered Participants Roster
              </h3>
              <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
                View student lists, verify student identity numbers, and export rosters to CSV for accreditation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportRegistrationsCsv}
                disabled={registrations.length === 0}
                className="px-4 py-2 text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-xl border border-stone-300 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download size={14} />
                Export CSV Roster
              </button>
            </div>
          </div>

          {/* Event selector & Search */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-700 whitespace-nowrap">Select Event:</span>
              <select
                value={selectedEventId || ''}
                onChange={(e) => setSelectedEventId(Number(e.target.value))}
                className="px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00491E]"
              >
                {events.map((evt) => (
                  <option key={evt.event_id} value={evt.event_id}>
                    {evt.event_name} ({evt.registered_count} registrants)
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={regSearchQuery}
                onChange={(e) => setRegSearchQuery(e.target.value)}
                placeholder="Search by student name, ID, or email..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00491E]"
              />
            </div>
          </div>

          {/* Registrations Table */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            {loadingRegistrations ? (
              <div className="p-8 text-center text-xs text-stone-500">Loading registrants list...</div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                No students registered for this event yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 font-extrabold uppercase bg-stone-50/70">
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Student ID</th>
                      <th className="py-3 px-4">College / Department</th>
                      <th className="py-3 px-4">Registered Date</th>
                      <th className="py-3 px-4">Attendance</th>
                      <th className="py-3 px-4 text-right">Evaluation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.registration_id} className="hover:bg-stone-50/60">
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900">{reg.student?.full_name}</div>
                          <div className="text-[11px] text-stone-500">{reg.student?.email}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-stone-700">
                          {reg.student?.student_id || '—'}
                        </td>
                        <td className="py-3 px-4 text-stone-700">
                          {reg.student?.college_department || '—'}
                        </td>
                        <td className="py-3 px-4 text-stone-500 font-mono text-[11px]">
                          {new Date(reg.registered_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            reg.attendance_status === 'attended'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : reg.attendance_status === 'absent'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {reg.attendance_status === 'attended' ? 'Present ✓' : reg.attendance_status === 'absent' ? 'Absent' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {reg.has_evaluated ? (
                            <span className="text-emerald-700 font-bold text-[11px]">Submitted ✓</span>
                          ) : (
                            <span className="text-stone-400 text-[11px]">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MODULE: ATTENDANCE MANAGEMENT */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold font-serif-cmu text-stone-900">
                Venue Attendance Check-In & Recording
              </h3>
              <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
                Mark participants present or absent. Attended status unlocks the post-event evaluation survey.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchMarkAllPresent}
                className="px-3.5 py-2 text-xs font-bold text-stone-950 bg-[#FFC600] hover:bg-amber-400 rounded-xl transition-all shadow-xs"
              >
                Mark All Present
              </button>
              {selectedEventId && (
                <button
                  onClick={() => onOpenAttendance(selectedEventId)}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-[#00491E] hover:bg-[#02681E] rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <ExternalLink size={14} />
                  Full Screen Roster Scanner
                </button>
              )}
            </div>
          </div>

          {/* Event Picker & Turnout Progress */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-700 whitespace-nowrap">Active Event:</span>
              <select
                value={selectedEventId || ''}
                onChange={(e) => setSelectedEventId(Number(e.target.value))}
                className="px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00491E]"
              >
                {events.map((evt) => (
                  <option key={evt.event_id} value={evt.event_id}>
                    {evt.event_name}
                  </option>
                ))}
              </select>
            </div>

            {currentEvent && (
              <div className="flex items-center gap-4 text-xs">
                <span className="text-stone-600">
                  Confirmed: <strong className="text-emerald-700">{registrations.filter((r) => r.attendance_status === 'attended').length}</strong> / {registrations.length}
                </span>
                <div className="w-32 bg-stone-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-[#00491E] h-2.5 rounded-full"
                    style={{
                      width: `${
                        registrations.length > 0
                          ? Math.round((registrations.filter((r) => r.attendance_status === 'attended').length / registrations.length) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Attendees check-in table */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-extrabold uppercase bg-stone-50/70">
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Check-in Timestamp</th>
                    <th className="py-3 px-4 text-right">Quick Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {registrations.map((reg) => (
                    <tr key={reg.registration_id} className="hover:bg-stone-50/60">
                      <td className="py-3 px-4 font-bold text-stone-900">
                        {reg.student?.full_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-700">
                        {reg.student?.student_id || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          reg.attendance_status === 'attended'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}>
                          {reg.attendance_status === 'attended' ? 'Present ✓' : 'Absent'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-500 text-[11px]">
                        {reg.attended_at ? new Date(reg.attended_at).toLocaleTimeString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleAttendance(reg.registration_id, reg.attendance_status)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            reg.attendance_status === 'attended'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-[#00491E] text-white hover:bg-[#02681E]'
                          }`}
                        >
                          {reg.attendance_status === 'attended' ? 'Mark Absent' : 'Mark Present ✓'}
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

      {/* 5. MODULE: EVENT STATUS */}
      {activeSubTab === 'status' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold font-serif-cmu text-stone-900">
                Event Status & Administrative Pipeline
              </h3>
              <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
                Monitor status phases: Pending, Approved, Rejected, Upcoming, Ongoing, and Completed.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs font-bold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded ${statusFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded ${statusFilter === 'pending' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'}`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-2.5 py-1 rounded ${statusFilter === 'approved' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'}`}
              >
                Approved
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 rounded ${statusFilter === 'active' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'}`}
              >
                Evaluation Open
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEventsByStatus.map((evt) => (
              <div
                key={evt.event_id}
                className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    evt.approval_status === 'approved'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : evt.approval_status === 'rejected'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {evt.approval_status}
                  </span>
                  <span className="text-xs font-mono text-stone-500">{evt.event_date}</span>
                </div>

                <h4 className="font-bold text-sm text-stone-900 font-serif-cmu">{evt.event_name}</h4>
                <p className="text-xs text-stone-600 line-clamp-2">{evt.description}</p>

                {evt.rejection_reason && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                    <strong>Admin Notice:</strong> {evt.rejection_reason}
                  </div>
                )}

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                  <div className="text-stone-500">
                    Venue: <strong className="text-stone-800">{evt.venue}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedEventId(evt.event_id);
                        setActiveSubTab('attendance');
                      }}
                      className="text-[#00491E] font-bold hover:underline"
                    >
                      Attendance →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. MODULE: FEEDBACK AND EVALUATION */}
      {activeSubTab === 'evaluations' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold font-serif-cmu text-stone-900">
                Evaluation Rubrics & Feedback Results
              </h3>
              <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
                Review survey ratings across Venue, Speaker, Food, and Coordination sections.
              </p>
            </div>
            {selectedEvalEventId && (
              <button
                onClick={() => onViewReport(selectedEvalEventId)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#00491E] hover:bg-[#02681E] rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <ExternalLink size={14} />
                Detailed Audit Memo View
              </button>
            )}
          </div>

          {/* Event Picker */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 flex items-center gap-2">
            <span className="text-xs font-bold text-stone-700 whitespace-nowrap">Event Feedback:</span>
            <select
              value={selectedEvalEventId || ''}
              onChange={(e) => setSelectedEvalEventId(Number(e.target.value))}
              className="px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00491E] max-w-md"
            >
              {events.map((evt) => (
                <option key={evt.event_id} value={evt.event_id}>
                  {evt.event_name} ({evt.evaluation_count} survey responses)
                </option>
              ))}
            </select>
          </div>

          {/* Evaluation Results Card */}
          {loadingEvalReport ? (
            <div className="p-8 text-center bg-white rounded-xl border border-stone-200 text-xs text-stone-500">
              Loading evaluation rubrics...
            </div>
          ) : !evaluationReport || evaluationReport.total_evaluations === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 text-xs text-stone-500">
              No evaluation responses recorded yet for this event. Ensure the event evaluation is set to Active and attendees have submitted their feedback.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Score strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#00491E] text-white p-4 rounded-xl border border-emerald-700">
                  <span className="text-[10px] uppercase font-bold text-emerald-200 block">Total Evaluations</span>
                  <span className="text-2xl font-black">{evaluationReport.total_evaluations}</span>
                </div>
                <div className="bg-[#00491E] text-white p-4 rounded-xl border border-emerald-700">
                  <span className="text-[10px] uppercase font-bold text-emerald-200 block">Overall Mean Rating</span>
                  <span className="text-2xl font-black text-[#FFC600]">
                    {evaluationReport.overall_rating.toFixed(2)} / 5.0
                  </span>
                </div>
                <div className="bg-[#00491E] text-white p-4 rounded-xl border border-emerald-700">
                  <span className="text-[10px] uppercase font-bold text-emerald-200 block">Net Satisfaction</span>
                  <span className="text-2xl font-black text-emerald-300">
                    {Math.round((evaluationReport.overall_rating / 5) * 100)}%
                  </span>
                </div>
                <div className="bg-[#00491E] text-white p-4 rounded-xl border border-emerald-700">
                  <span className="text-[10px] uppercase font-bold text-emerald-200 block">Qualitative Comments</span>
                  <span className="text-2xl font-black text-white">
                    {evaluationReport.feedback_comments.length}
                  </span>
                </div>
              </div>

              {/* Sections Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evaluationReport.section_averages.map((sec, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-stone-900">{sec.section_name}</h5>
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                        {sec.average_rating.toFixed(2)} / 5.0
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2">
                      <div
                        className="bg-[#00491E] h-2 rounded-full"
                        style={{ width: `${(sec.average_rating / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Comments */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <h4 className="font-bold text-sm font-serif-cmu text-stone-900">
                  Student Comments & Suggestions
                </h4>
                <div className="space-y-2">
                  {evaluationReport.feedback_comments.map((comment, i) => (
                    <div key={i} className="p-3 bg-stone-50 rounded-xl text-xs text-stone-700 italic border border-stone-200">
                      "{comment}"
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. MODULE: REPORTS */}
      {activeSubTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold font-serif-cmu text-stone-900">
                Official Event Reports & Data Exports
              </h3>
              <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
                Generate CSV exports for student sign-ups, attendance logs, and evaluation reports.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm font-serif-cmu text-stone-900">
                  Participant Registrations CSV
                </h4>
                <p className="text-xs text-stone-500 mt-1">
                  Export complete list of registered students with ID numbers and timestamps for accreditation.
                </p>
              </div>
              <button
                onClick={exportRegistrationsCsv}
                className="w-full py-2 bg-[#00491E] hover:bg-[#02681E] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Download size={14} />
                Download Registrations CSV
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm font-serif-cmu text-stone-900">
                  Venue Attendance Logs
                </h4>
                <p className="text-xs text-stone-500 mt-1">
                  Export verified attendance timestamps showing attendees confirmed at the university venue.
                </p>
              </div>
              <button
                onClick={exportRegistrationsCsv}
                className="w-full py-2 bg-[#00491E] hover:bg-[#02681E] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Download size={14} />
                Download Attendance CSV
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm font-serif-cmu text-stone-900">
                  Evaluation Rubric Summary Memo
                </h4>
                <p className="text-xs text-stone-500 mt-1">
                  Formatted university report with statistical averages, standard deviation, and feedback.
                </p>
              </div>
              {selectedEventId && (
                <button
                  onClick={() => onViewReport(selectedEventId)}
                  className="w-full py-2 bg-[#FFC600] hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={14} />
                  Print / View Evaluation Memo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
