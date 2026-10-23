import React, { useEffect, useState } from 'react';
import { User as UserIcon, Shield, Building, Mail, Activity, LogIn, ShieldCheck } from 'lucide-react';
import { User, AdminDashboardStats, EventItem, ActivityLog, EventReportRow } from '../types';
import { api } from '../services/api';
import { timeAgo } from '../utils/time';
import { SummaryCards } from './SummaryCards';

interface DashboardOverviewProps {
  currentUser: User | null;
  stats: AdminDashboardStats | null;
  events: EventItem[];
  onNavigate: (module: 'events' | 'registrations' | 'evaluations' | 'reports' | 'admin-approval' | 'admin-logs') => void;
  onApproveEvent?: (eventId: number) => void;
  onOpenAttendance?: (eventId: number) => void;
}

const ROLE_LABEL: Record<string, string> = { admin: 'Administrator', organizer: 'Organizer', student: 'Student' };

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  currentUser,
  stats,
  events,
  onNavigate,
  onApproveEvent,
}) => {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [eventReport, setEventReport] = useState<EventReportRow[]>([]);

  // `stats` is reloaded by App after every mutation, so it doubles as a refresh signal
  useEffect(() => {
    Promise.all([api.getActivity(8), api.getUsers(), api.getEventsReport()])
      .then(([activityData, usersData, reportData]) => {
        setActivity(activityData.logs);
        setUsers(usersData);
        setEventReport(reportData);
      })
      .catch(() => {
        /* panels fall back to their empty states */
      });
  }, [stats]);

  const pendingEvents = events.filter((e) => e.approval_status === 'pending');
  const recentLogins = users
    .filter((u) => u.last_login)
    .sort((a, b) => (b.last_login ?? '').localeCompare(a.last_login ?? ''))
    .slice(0, 6);

  const totalAttended = stats?.total_attended ?? 0;
  const totalEvaluations = stats?.total_evaluations ?? 0;
  const evaluationRate = totalAttended > 0 ? Math.round((totalEvaluations / totalAttended) * 100) : 0;

  // Evaluation-weighted average rating per department
  const departmentRatings = Object.entries(
    eventReport.reduce<Record<string, { sum: number; count: number }>>((acc, row) => {
      if (row.average_rating === null || row.evaluation_count === 0) return acc;
      const entry = (acc[row.department] ??= { sum: 0, count: 0 });
      entry.sum += row.average_rating * row.evaluation_count;
      entry.count += row.evaluation_count;
      return acc;
    }, {})
  )
    .map(([department, { sum, count }]) => ({ department, rating: sum / count, count }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Signed-in user banner */}
      <div className="bg-[#00491E] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border border-[#02681E]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#003816] border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <UserIcon size={26} className="text-stone-200" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-sans-cmu">{currentUser?.full_name}</h2>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-stone-200 pt-1">
              <div className="flex items-center gap-1.5">
                <Shield size={14} className="text-amber-400" />
                <span>
                  Role: <strong className="text-white capitalize">{currentUser?.role}</strong>
                </span>
              </div>
              {currentUser?.college_department && (
                <div className="flex items-center gap-1.5">
                  <Building size={14} className="text-amber-400" />
                  <span>
                    Office: <strong className="text-white">{currentUser.college_department}</strong>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Mail size={14} className="text-amber-400" />
                <span>
                  Email: <strong className="text-white">{currentUser?.email}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

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
            View Evaluation Reports
          </button>
        </div>
      </div>

      <SummaryCards
        cards={[
          { label: 'Total Events', value: stats?.total_events ?? 0, hint: `${stats?.approved_events ?? 0} approved` },
          { label: 'Pending Approvals', value: stats?.pending_approvals ?? 0, tone: 'gold', hint: 'Awaiting review' },
          { label: 'Students', value: stats?.total_students ?? 0, tone: 'green', hint: `${stats?.total_organizers ?? 0} organizers` },
          {
            label: 'Evaluations Submitted',
            value: totalEvaluations,
            hint: stats?.overall_satisfaction_score ? `Average ${stats.overall_satisfaction_score.toFixed(2)} / 5` : undefined,
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Pending approvals */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-900">
                <ShieldCheck size={18} className="text-[#00491E]" />
                <h3 className="text-xs sm:text-sm font-extrabold tracking-wider uppercase">Awaiting Approval</h3>
              </div>
              <button onClick={() => onNavigate('admin-approval')} className="text-xs font-bold text-[#00491E] hover:underline">
                Open Event Approval
              </button>
            </div>
            {pendingEvents.length === 0 ? (
              <p className="p-5 text-xs text-stone-400">No event proposals are waiting for review.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {pendingEvents.slice(0, 4).map((evt) => (
                  <div key={evt.event_id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-stone-900 truncate">{evt.event_name}</div>
                      <div className="text-[11px] text-stone-500">
                        {evt.organizer_name} · {evt.event_date} · {evt.venue}
                      </div>
                    </div>
                    {onApproveEvent && (
                      <button
                        onClick={() => onApproveEvent(evt.event_id)}
                        className="whitespace-nowrap px-3 py-1.5 bg-[#00491E] hover:bg-[#02681E] text-white rounded-lg text-xs font-bold"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-900">
                <Activity size={18} className="text-[#00491E]" />
                <h3 className="text-xs sm:text-sm font-extrabold tracking-wider uppercase">Recent Activity</h3>
              </div>
              <button onClick={() => onNavigate('admin-logs')} className="text-xs font-bold text-[#00491E] hover:underline">
                View All Logs
              </button>
            </div>
            {activity.length === 0 ? (
              <p className="p-5 text-xs text-stone-400">No activity recorded yet.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {activity.map((log) => (
                  <div key={log.log_id} className="px-5 py-3 flex items-start justify-between gap-4 text-xs">
                    <div className="min-w-0">
                      <span className="font-bold text-stone-900">{log.actor_name}</span>{' '}
                      <span className="text-stone-600">{log.description}</span>
                    </div>
                    <span className="text-[11px] text-stone-400 shrink-0">{timeAgo(log.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent sign-ins */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex items-center gap-2 text-stone-900">
              <LogIn size={18} className="text-[#00491E]" />
              <h3 className="text-xs sm:text-sm font-extrabold tracking-wider uppercase">Recent Sign-ins</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-100 text-[11px] font-extrabold text-stone-500 uppercase tracking-wider bg-stone-50/50">
                    <th className="py-3 px-5">User</th>
                    <th className="py-3 px-5">Department</th>
                    <th className="py-3 px-5 text-right">Last Sign-in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {recentLogins.map((u) => (
                    <tr key={u.user_id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-300 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {u.full_name
                              .split(' ')
                              .filter((part) => /^[A-Z]/.test(part))
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join('')}
                          </div>
                          <div>
                            <div className="font-bold text-stone-900 leading-tight">{u.full_name}</div>
                            <div className="text-[11px] text-stone-500">
                              {ROLE_LABEL[u.role]} · @{u.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-stone-700">{u.college_department || '—'}</td>
                      <td className="py-3 px-5 text-right text-stone-600 whitespace-nowrap">{timeAgo(u.last_login)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-[#00491E] via-[#013f19] to-[#002f12] text-white rounded-2xl border border-[#02681E] shadow-sm p-6 space-y-3">
            <h4 className="text-[11px] font-black text-emerald-200 tracking-wider uppercase">Evaluation Completion</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tight">{evaluationRate}%</span>
              <span className="text-xs font-bold text-emerald-200">
                {totalEvaluations} / {totalAttended} attendees
              </span>
            </div>
            <div className="w-full bg-[#002b11] rounded-full h-2.5 overflow-hidden border border-[#025a1b]">
              <div className="bg-[#FFC600] h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(evaluationRate, 100)}%` }} />
            </div>
            <p className="text-xs text-stone-200">
              {Math.max(totalAttended - totalEvaluations, 0)} attendees have not submitted an evaluation yet
            </p>
          </div>

          <div className="bg-gradient-to-br from-[#00491E] via-[#013f19] to-[#002f12] text-white rounded-2xl border border-[#02681E] shadow-sm p-6 space-y-3">
            <h4 className="text-[11px] font-black text-emerald-200 tracking-wider uppercase">Registered Participants</h4>
            <span className="text-4xl font-black tracking-tight block">{stats?.total_registrations ?? 0}</span>
            <p className="text-xs text-stone-200 pt-2 border-t border-[#025a1b]">
              {totalAttended} attended · {stats?.attendance_rate_percent ?? 0}% attendance rate
            </p>
          </div>

          <div className="bg-gradient-to-br from-[#00491E] via-[#013f19] to-[#002f12] text-white rounded-2xl border border-[#02681E] shadow-sm p-6 space-y-4">
            <h4 className="text-[11px] font-black text-emerald-200 tracking-wider uppercase border-b border-[#025a1b] pb-2">
              Satisfaction by Department
            </h4>
            {departmentRatings.length === 0 ? (
              <p className="text-xs text-stone-300">No evaluations submitted yet.</p>
            ) : (
              <div className="space-y-4">
                {departmentRatings.map((d) => (
                  <div key={d.department}>
                    <div className="flex justify-between gap-3 text-xs font-bold text-white mb-1">
                      <span className="truncate">{d.department}</span>
                      <span className="font-mono text-[#FFC600] shrink-0">{d.rating.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-[#002b11] rounded-full h-2 overflow-hidden border border-[#025a1b]">
                      <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${(d.rating / 5) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
