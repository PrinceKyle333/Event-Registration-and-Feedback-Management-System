import React, { useState } from 'react';
import {
  User as UserIcon,
  Shield,
  Building,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { User, AdminDashboardStats, EventItem } from '../types';

interface DashboardOverviewProps {
  currentUser: User | null;
  stats: AdminDashboardStats | null;
  events: EventItem[];
  onNavigate: (module: 'events' | 'registrations' | 'evaluations' | 'reports' | 'api-docs') => void;
  onApproveEvent?: (eventId: number) => void;
  onOpenAttendance?: (eventId: number) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  currentUser,
  stats,
  events,
  onNavigate,
  onApproveEvent,
  onOpenAttendance,
}) => {
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [alertResolved, setAlertResolved] = useState(false);

  // Active user sessions matching screenshot
  const activeSessions = [
    {
      initials: 'MD',
      username: 'm.delacruz.admin',
      roleSubtitle: 'System Administrator',
      ip: '192.168.1.104',
      office: 'Registrar Office',
      status: 'Active',
      statusType: 'active',
    },
    {
      initials: 'JP',
      username: 'j.perez.it',
      roleSubtitle: 'Supply Staff / IT',
      ip: '18.8.42.15',
      office: 'CISC Department',
      status: 'Active',
      statusType: 'active',
    },
    {
      initials: 'PK',
      username: 's.reston.bsit',
      roleSubtitle: 'BSIT 4B Student Attendee',
      ip: '192.168.1.142',
      office: 'CISC / BSIT 4B',
      status: 'Active',
      statusType: 'active',
    },
    {
      initials: 'LS',
      username: 'l.santos.gis',
      roleSubtitle: 'College Coordinator',
      ip: '172.16.0.88',
      office: 'Land Management',
      status: 'Idle (15m)',
      statusType: 'idle',
    },
  ];

  const pendingEvent = events.find((e) => e.approval_status === 'pending');

  return (
    <div className="space-y-6">
      {/* 1. TOP ACTIVE SESSION BANNER CARD (Exact reproduction from screenshot) */}
      <div className="bg-[#00491E] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border border-[#02681E]">
        <div className="flex items-center gap-4">
          {/* Avatar Icon in circle */}
          <div className="w-14 h-14 rounded-2xl bg-[#003816] border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <UserIcon size={26} className="text-stone-200" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-sans-cmu">
                {currentUser?.full_name || 'Maria Dela Cruz'}
              </h2>
              <span className="whitespace-nowrap flex items-center gap-1.5 bg-[#02681E] text-emerald-200 border border-emerald-400/40 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE SESSION
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-stone-200 pt-1">
              <div className="flex items-center gap-1.5">
                <Shield size={14} className="text-amber-400" />
                <span>
                  Role: <strong className="text-white capitalize">{currentUser?.role || 'Admin'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building size={14} className="text-amber-400" />
                <span>
                  Office: <strong className="text-white">{currentUser?.college_department || 'Registrar Office / CISC'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail size={14} className="text-amber-400" />
                <span>
                  Email: <strong className="text-white">{currentUser?.email || 'admin@cmu.edu.ph'}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions inside banner */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => onNavigate('events')}
            className="px-4 py-2 bg-[#FFC600] hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition-all shadow-xs"
          >
            Manage Events
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all border border-white/20"
          >
            View Evaluation Matrix
          </button>
        </div>
      </div>

      {/* 4 GREEN RECTANGLE STAT CARDS (Exact match to user's image_8c89f589.png) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TOTAL SECURITY LOGS */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#00491E] via-[#013f19] to-[#002f12] text-white p-5 rounded-2xl border border-[#02681E] shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <span className="text-[11px] font-black text-emerald-200 tracking-wider uppercase font-sans-cmu">
            TOTAL SECURITY LOGS
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight font-sans-cmu">
              {stats?.total_events ? stats.total_events + 3 : '7'}
            </span>
            <span className="whitespace-nowrap text-[10px] font-black tracking-wider uppercase bg-[#00240d] text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-md">
              LIVE FEED
            </span>
          </div>
        </div>

        {/* Card 2: SECURITY ALERTS */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#00491E] via-[#013f19] to-[#002f12] text-white p-5 rounded-2xl border border-[#02681E] shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          <span className="text-[11px] font-black text-emerald-200 tracking-wider uppercase font-sans-cmu">
            SECURITY ALERTS
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight font-sans-cmu">
              {stats?.pending_approvals ?? '2'}
            </span>
            <span className="whitespace-nowrap text-[10px] font-black tracking-wider uppercase bg-rose-950/80 text-rose-300 border border-rose-500/50 px-2.5 py-1 rounded-md">
              UNRESOLVED
            </span>
          </div>
        </div>

        {/* Card 3: ACTIVE MONITORING */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#00491E] via-[#013f19] to-[#002f12] text-white p-5 rounded-2xl border border-[#02681E] shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <span className="text-[11px] font-black text-emerald-200 tracking-wider uppercase font-sans-cmu">
            ACTIVE MONITORING
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight font-sans-cmu">
              84
            </span>
            <span className="whitespace-nowrap text-[10px] font-black tracking-wider uppercase bg-[#00240d] text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-md">
              ACTIVE ACTORS
            </span>
          </div>
        </div>

        {/* Card 4: COMPLIANCE AUDITS */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#00491E] via-[#013f19] to-[#002f12] text-white p-5 rounded-2xl border border-[#02681E] shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <span className="text-[11px] font-black text-emerald-200 tracking-wider uppercase font-sans-cmu">
            COMPLIANCE AUDITS
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight font-sans-cmu">
              98%
            </span>
            <span className="whitespace-nowrap text-[10px] font-black tracking-wider uppercase bg-[#00240d] text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-md">
              NEDA STANDARDS
            </span>
          </div>
        </div>
      </div>

      {/* 2. SPLIT DASHBOARD LAYOUT (Left 68% - Right 32%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===================== LEFT COLUMN (8 of 12 cols) ===================== */}
        <div className="lg:col-span-8 space-y-6">
          {/* CARD 1: ACTIVE USER SESSIONS (Table matching screenshot) */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            {/* Card Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-xs sm:text-sm font-extrabold text-stone-900 tracking-wider uppercase font-sans-cmu">
                  ACTIVE USER SESSIONS
                </h3>
              </div>
              <span className="whitespace-nowrap text-[10px] font-extrabold tracking-widest uppercase bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200">
                LIVE TELEMETRY
              </span>
            </div>

            {/* Sessions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-100 text-[11px] font-extrabold text-stone-500 uppercase tracking-wider bg-stone-50/50">
                    <th className="py-3 px-5">USER PROFILE</th>
                    <th className="py-3 px-5">NETWORK IP ADDRESS</th>
                    <th className="py-3 px-5">AFFILIATED OFFICE</th>
                    <th className="py-3 px-5 text-right">STATUS STATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {activeSessions.map((s, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-300 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {s.initials}
                          </div>
                          <div>
                            <div className="font-bold text-stone-900 leading-tight">
                              {s.username}
                            </div>
                            <div className="text-[11px] text-stone-500">
                              {s.roleSubtitle}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-stone-600">
                        {s.ip}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-stone-800">
                        {s.office}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {s.statusType === 'active' ? (
                          <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="whitespace-nowrap inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
                            {s.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CARD 2: RECENT SYSTEM EVENTS (Alert card matching screenshot) */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-stone-900">
                <Shield size={18} className="text-[#00491E]" />
                <h3 className="text-xs sm:text-sm font-extrabold tracking-wider uppercase font-sans-cmu">
                  RECENT SYSTEM EVENTS
                </h3>
              </div>
              <button
                onClick={() => onNavigate('reports')}
                className="text-xs font-bold text-[#00491E] hover:underline"
              >
                View All Logs
              </button>
            </div>

            {!alertDismissed && !alertResolved && (
              <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-stone-900">
                      {pendingEvent
                        ? `Event Approval Proposal Pending: ${pendingEvent.event_name}`
                        : 'Unauthorized Access Attempt'}
                    </h4>
                    <span className="text-[11px] font-mono text-rose-600 font-bold uppercase">
                      2 MINS AGO
                    </span>
                  </div>

                  <p className="text-xs text-stone-700 leading-relaxed">
                    {pendingEvent
                      ? `Organizer Prof. Maria Santos submitted '${pendingEvent.event_name}' for approval. Venue: ${pendingEvent.venue}, Expected Capacity: ${pendingEvent.capacity}. Administrative authorization required before student registration unlocks.`
                      : 'Multiple failed login attempts detected from unrecognized IP 45.12.89.x targeting root administrator database portals.'}
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    {pendingEvent && onApproveEvent ? (
                      <button
                        onClick={() => {
                          onApproveEvent(pendingEvent.event_id);
                          setAlertResolved(true);
                        }}
                        className="px-4 py-2 bg-[#00491E] hover:bg-[#02681E] text-white rounded-lg text-xs font-extrabold uppercase tracking-wider transition-colors shadow-xs"
                      >
                        APPROVE & PUBLISH EVENT
                      </button>
                    ) : (
                      <button
                        onClick={() => setAlertResolved(true)}
                        className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-extrabold uppercase tracking-wider transition-colors shadow-xs"
                      >
                        BLOCK IP BOUNDARY
                      </button>
                    )}

                    <button
                      onClick={() => setAlertDismissed(true)}
                      className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      DISMISS
                    </button>
                  </div>
                </div>
              </div>
            )}

            {alertResolved && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
                <CheckCircle2 size={16} />
                System event verified and handled successfully.
              </div>
            )}
          </div>
        </div>

        {/* ===================== RIGHT COLUMN (4 of 12 cols) ===================== */}
        <div className="lg:col-span-4 space-y-6">
          {/* RIGHT CARD 1: COMPLETE EVALUATION RATE (GREEN RECTANGLE) */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#00491E] via-[#013f19] to-[#002f12] text-white rounded-2xl border border-[#02681E] shadow-sm p-6 space-y-4">
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <h4 className="text-[11px] font-black text-emerald-200 tracking-wider uppercase font-sans-cmu">
              COMPLETE EVALUATION RATE
            </h4>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black font-sans-cmu text-white tracking-tight">
                  {stats ? `${Math.round(stats.attendance_rate_percent || 98)}%` : '98%'}
                </span>
                <span className="text-xs font-bold text-emerald-200 font-mono">
                  {stats ? `${stats.total_attended} / ${stats.total_registrations || 100} evaluated` : '98 / 100 evaluated'}
                </span>
              </div>

              {/* Progress Bar with gold highlight */}
              <div className="w-full bg-[#002b11] rounded-full h-3 mt-3 overflow-hidden border border-[#025a1b]">
                <div
                  className="bg-[#FFC600] h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats ? stats.attendance_rate_percent : 98}%` }}
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-stone-200 pt-3">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span>2 evaluations pending attendee submission</span>
              </div>
            </div>
          </div>

          {/* RIGHT CARD 2: TOTAL REGISTERED PARTICIPANTS (GREEN RECTANGLE) */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#00491E] via-[#013f19] to-[#002f12] text-white rounded-2xl border border-[#02681E] shadow-sm p-6 space-y-3">
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <h4 className="text-[11px] font-black text-emerald-200 tracking-wider uppercase font-sans-cmu">
              TOTAL REGISTERED PARTICIPANTS
            </h4>

            <div className="flex items-center justify-between">
              <span className="text-4xl sm:text-5xl font-black font-sans-cmu text-white tracking-tight">
                4,351
              </span>
              <span className="whitespace-nowrap px-3 py-1 bg-[#00280f] text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-black uppercase tracking-wide">
                ACTIVE REGISTRY
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-200 pt-2 border-t border-[#025a1b]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span>Fully indexed in MySQL event database</span>
            </div>
          </div>

          {/* RIGHT CARD 3: EVALUATION SATISFACTION PER COLLEGE (GREEN RECTANGLE) */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#00491E] via-[#013f19] to-[#002f12] text-white rounded-2xl border border-[#02681E] shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#025a1b] pb-2">
              <h4 className="text-[11px] font-black text-emerald-200 tracking-wider uppercase font-sans-cmu">
                EVALUATION SATISFACTION PER COLLEGE
              </h4>
              <span className="whitespace-nowrap text-[10px] font-black text-amber-300 uppercase tracking-widest bg-[#00280f] px-2 py-0.5 rounded border border-amber-400/30">
                ACTIVE TELEMETRY
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-white mb-1">
                  <span>College of Engineering</span>
                  <span className="font-mono text-emerald-200">54%</span>
                </div>
                <div className="w-full bg-[#002b11] rounded-full h-2 overflow-hidden border border-[#025a1b]">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: '54%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-white mb-1">
                  <span>College of Information Sciences</span>
                  <span className="font-mono text-[#FFC600]">92%</span>
                </div>
                <div className="w-full bg-[#002b11] rounded-full h-2 overflow-hidden border border-[#025a1b]">
                  <div className="bg-[#FFC600] h-full rounded-full" style={{ width: '92%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-white mb-1">
                  <span>College of Agriculture</span>
                  <span className="font-mono text-emerald-200">76%</span>
                </div>
                <div className="w-full bg-[#002b11] rounded-full h-2 overflow-hidden border border-[#025a1b]">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: '76%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
