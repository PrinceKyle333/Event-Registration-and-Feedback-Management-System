import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { api } from '../services/api';
import { EventRanking } from '../types';

/** Admin table ranking evaluated events by overall mean rating (GET /api/reports/rankings). */
export const EventRankingsTable: React.FC = () => {
  const [rankings, setRankings] = useState<EventRanking[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getEventRankings()
      .then(setRankings)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-[#00491E]" />
        <h4 className="font-bold text-sm font-serif-cmu text-stone-900">Event Rankings</h4>
        <span className="text-[11px] text-stone-500">Evaluated events ranked by overall mean rating</span>
      </div>
      {error && <div className="text-xs text-rose-700">{error}</div>}
      {!error && rankings.length === 0 && <div className="text-xs text-stone-500">No evaluated events yet.</div>}
      {rankings.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-stone-500 border-b border-stone-200">
                <th className="py-2 px-3">Rank</th>
                <th className="py-2 px-3">Event</th>
                <th className="py-2 px-3">Department</th>
                <th className="py-2 px-3 text-right">Mean (1–5)</th>
                <th className="py-2 px-3">Interpretation</th>
                <th className="py-2 px-3 text-right">Evaluations</th>
                <th className="py-2 px-3 text-right">Attendance rate</th>
                <th className="py-2 px-3 text-right">Response rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rankings.map((r) => (
                <tr key={r.event_id} className="hover:bg-stone-50/60">
                  <td className="py-2 px-3 font-black text-[#00491E]">#{r.rank}</td>
                  <td className="py-2 px-3 font-bold text-stone-900">{r.event_name}</td>
                  <td className="py-2 px-3 text-stone-600">{r.department}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold">{r.average_rating.toFixed(2)}</td>
                  <td className="py-2 px-3 text-stone-700">{r.interpretation}</td>
                  <td className="py-2 px-3 text-right font-mono">{r.evaluation_count}</td>
                  <td className="py-2 px-3 text-right font-mono">{r.attendance_rate_percent}%</td>
                  <td className="py-2 px-3 text-right font-mono">{r.response_rate_percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
