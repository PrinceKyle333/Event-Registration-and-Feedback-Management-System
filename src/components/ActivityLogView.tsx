import React, { useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { ActivityLog } from '../types';
import { api } from '../services/api';
import { timeAgo } from '../utils/time';
import { SummaryCards } from './SummaryCards';

// Groups raw action codes into filterable categories
const CATEGORIES: { id: string; label: string; match: (action: string) => boolean }[] = [
  { id: 'all', label: 'All Activity', match: () => true },
  { id: 'events', label: 'Events', match: (a) => a.startsWith('event_') && a !== 'event_registered' },
  { id: 'registrations', label: 'Registrations & Attendance', match: (a) => ['event_registered', 'registration_cancelled', 'attendance_marked'].includes(a) },
  { id: 'evaluations', label: 'Evaluations & Surveys', match: (a) => a.startsWith('evaluation_') || a.startsWith('survey_') },
  { id: 'users', label: 'User Accounts', match: (a) => a.startsWith('user_') || a.startsWith('account_') || a === 'profile_updated' },
];

const ACTION_TONE: Record<string, string> = {
  event_approved: 'text-emerald-700 bg-emerald-50',
  event_published: 'text-emerald-700 bg-emerald-50',
  event_rejected: 'text-rose-700 bg-rose-50',
  event_deleted: 'text-rose-700 bg-rose-50',
  user_deactivated: 'text-rose-700 bg-rose-50',
  event_created: 'text-amber-700 bg-amber-50',
};

const actionLabel = (action: string) =>
  action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const ActivityLogView: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getActivity(500);
      setLogs(data.logs);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const activeCategory = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];
  const q = query.trim().toLowerCase();
  const filtered = logs.filter(
    (log) =>
      activeCategory.match(log.action) &&
      (!q || log.description.toLowerCase().includes(q) || log.actor_name.toLowerCase().includes(q))
  );

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-xl font-bold font-serif-cmu text-stone-900">Activity Logs</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Every action recorded in the system. Evaluations are logged anonymously.
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="px-3 py-1.5 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg border border-stone-300 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      <SummaryCards
        cards={[
          { label: 'Total Entries', value: logs.length },
          { label: 'Today', value: logs.filter((l) => l.created_at.startsWith(today)).length, tone: 'gold' },
          { label: 'Last 7 Days', value: logs.filter((l) => l.created_at >= weekAgo).length, tone: 'green' },
        ]}
      />

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-bold">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  category === c.id ? 'bg-[#00491E] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search user or description..."
              className="pl-8 pr-3 py-2 text-xs border border-stone-300 rounded-lg w-full md:w-64 focus:outline-none focus:ring-1 focus:ring-[#00491E]"
            />
          </div>
        </div>

        {loading ? (
          <p className="p-10 text-center text-xs text-stone-400">Loading activity...</p>
        ) : filtered.length === 0 ? (
          <p className="p-10 text-center text-xs text-stone-400">No matching activity.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-100 text-[11px] font-extrabold text-stone-500 uppercase tracking-wider bg-stone-50/50">
                  <th className="py-3 px-5">When</th>
                  <th className="py-3 px-5">User</th>
                  <th className="py-3 px-5">Action</th>
                  <th className="py-3 px-5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((log) => (
                  <tr key={log.log_id} className="hover:bg-stone-50/60 align-top">
                    <td className="py-3 px-5 whitespace-nowrap">
                      <div className="font-semibold text-stone-800">{timeAgo(log.created_at)}</div>
                      <div className="text-[10px] text-stone-400">{new Date(log.created_at).toLocaleString()}</div>
                    </td>
                    <td className="py-3 px-5 font-bold text-stone-900 whitespace-nowrap">{log.actor_name}</td>
                    <td className="py-3 px-5">
                      <span
                        className={`whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold ${
                          ACTION_TONE[log.action] ?? 'text-stone-700 bg-stone-100'
                        }`}
                      >
                        {actionLabel(log.action)}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-stone-600">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
