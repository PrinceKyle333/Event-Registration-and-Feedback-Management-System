import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Registration, EventItem, User } from '../types';

interface StudentRegistrationsViewProps {
  currentUser: User;
  onOpenEvaluation: (eventId: number) => void;
  onViewReport: (eventId: number) => void;
  onBrowseEvents: () => void;
}

export const StudentRegistrationsView: React.FC<StudentRegistrationsViewProps> = ({
  currentUser,
  onOpenEvaluation,
  onViewReport,
  onBrowseEvents,
}) => {
  const [registrations, setRegistrations] = useState<(Registration & { event: EventItem })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    loadRegistrations();
  }, [currentUser]);

  const loadRegistrations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyRegistrations(currentUser.user_id);
      setRegistrations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load your registrations');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (regId: number) => {
    if (!window.confirm('Are you sure you wish to cancel this event registration?')) return;
    setCancellingId(regId);
    try {
      await api.cancelRegistration(regId);
      setRegistrations((prev) => prev.filter((r) => r.registration_id !== regId));
    } catch (err: any) {
      setError(err.message || 'Failed to cancel registration');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-xl font-bold font-serif-cmu text-stone-900">
            My Event Registrations & Evaluation Status
          </h2>
          <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
            Student: <strong className="text-stone-800">{currentUser.full_name}</strong> · ID: <span className="font-mono">{currentUser.student_id || '2023-BSIT-0428'}</span> ({currentUser.college_department || 'BSIT 4B'})
          </p>
        </div>

        <button
          onClick={onBrowseEvents}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#00491E] hover:bg-[#02681E] rounded-md transition-colors self-start sm:self-auto shadow-xs"
        >
          + Browse Available Events
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-stone-500 bg-white rounded-xl border border-stone-200">
          Loading your registration history...
        </div>
      ) : registrations.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-stone-200 space-y-3">
          <p className="text-sm font-serif-cmu text-stone-700">
            You haven't registered for any Central Mindanao University events yet.
          </p>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Browse upcoming academic conferences, technical seminars, and IT symposiums to participate and earn evaluation points.
          </p>
          <button
            onClick={onBrowseEvents}
            className="px-4 py-2 text-xs font-semibold text-stone-900 bg-[#FFC600] hover:bg-amber-400 rounded-md transition-colors shadow-xs"
          >
            Explore Events Catalog
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {registrations.map((reg) => {
            const evt = reg.event;
            const isAttended = reg.attendance_status === 'attended';
            const isEvaluated = reg.has_evaluated;

            return (
              <div
                key={reg.registration_id}
                className="bg-white p-5 rounded-xl border border-stone-200 hover:border-stone-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span>{evt.department}</span>
                    <span aria-hidden="true">·</span>
                    <span>{evt.event_date}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{evt.start_time.slice(0, 5)} - {evt.end_time.slice(0, 5)}</span>
                  </div>

                  <h3 className="text-base font-bold font-serif-cmu text-stone-900">
                    {evt.event_name}
                  </h3>

                  <div className="text-xs text-stone-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>Venue: <strong className="text-stone-800">{evt.venue}</strong></span>
                    <span>Registered: <span className="font-mono tabular-nums">{new Date(reg.registered_at).toLocaleDateString()}</span></span>
                  </div>
                </div>

                {/* Status & Evaluation Trigger Area */}
                <div className="flex flex-col sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  {/* Attendance badge */}
                  <div>
                    {isAttended ? (
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded inline-block">
                        Attendance Confirmed ✓
                      </span>
                    ) : reg.attendance_status === 'absent' ? (
                      <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded inline-block">
                        Marked Absent
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-amber-800 bg-amber-50 px-2.5 py-1 rounded inline-block">
                        Awaiting Venue Attendance
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isEvaluated ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#00491E]">
                          Feedback Completed
                        </span>
                        <button
                          onClick={() => onViewReport(evt.event_id)}
                          className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded transition-colors"
                        >
                          View Report
                        </button>
                      </div>
                    ) : isAttended ? (
                      <button
                        onClick={() => onOpenEvaluation(evt.event_id)}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-[#00491E] hover:bg-[#02681E] rounded-md transition-colors shadow-xs"
                      >
                        Submit Feedback Survey →
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-stone-400 italic">
                          Survey unlocks after event check-in
                        </span>
                        <button
                          onClick={() => handleCancel(reg.registration_id)}
                          disabled={cancellingId === reg.registration_id}
                          className="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-800 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
