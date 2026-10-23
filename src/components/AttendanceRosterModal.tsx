import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Registration, EventItem } from '../types';

interface AttendanceRosterModalProps {
  eventId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onAttendanceChanged?: () => void;
}

export const AttendanceRosterModal: React.FC<AttendanceRosterModalProps> = ({
  eventId,
  isOpen,
  onClose,
  onAttendanceChanged,
}) => {
  const [event, setEvent] = useState<EventItem | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && eventId) {
      loadData(eventId);
    }
  }, [isOpen, eventId]);

  const loadData = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const [evt, regs] = await Promise.all([
        api.getEvent(id),
        api.getEventRegistrations(id),
      ]);
      setEvent(evt);
      setRegistrations(regs);
    } catch (err: any) {
      setError(err.message || 'Failed to load event registrations');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !eventId) return null;

  const handleUpdateStatus = async (
    regId: number,
    newStatus: 'registered' | 'attended' | 'absent'
  ) => {
    setUpdatingId(regId);
    try {
      await api.updateAttendance(regId, newStatus);
      setRegistrations((prev) =>
        prev.map((r) =>
          r.registration_id === regId
            ? {
                ...r,
                attendance_status: newStatus,
                attended_at: newStatus === 'attended' ? new Date().toISOString() : null,
              }
            : r
        )
      );
      if (onAttendanceChanged) onAttendanceChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to update attendance');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRegistrations = registrations.filter((r) => {
    const q = search.toLowerCase();
    return (
      (r.student_name && r.student_name.toLowerCase().includes(q)) ||
      (r.student_id_number && r.student_id_number.toLowerCase().includes(q)) ||
      (r.student_email && r.student_email.toLowerCase().includes(q)) ||
      (r.college_department && r.college_department.toLowerCase().includes(q))
    );
  });

  const attendedCount = registrations.filter((r) => r.attendance_status === 'attended').length;
  const absentCount = registrations.filter((r) => r.attendance_status === 'absent').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden border border-stone-200 my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#00491E] text-white px-6 py-4 shrink-0 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-amber-300 tracking-wider uppercase font-sans-cmu">
              Event Attendance & Participant Roster
            </div>
            <h2 className="text-lg font-bold font-serif-cmu mt-0.5">
              {event?.event_name || 'Loading Event...'}
            </h2>
            <div className="text-xs text-stone-200 flex items-center gap-2 mt-0.5">
              <span>{event?.department}</span>
              <span>·</span>
              <span>{event?.venue}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-300 hover:text-white text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Stats Strip */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-stone-500">Total Registered: </span>
              <strong className="font-mono text-stone-900">{registrations.length}</strong>
            </div>
            <div>
              <span className="text-stone-500">Present / Attended: </span>
              <strong className="font-mono text-emerald-700">{attendedCount}</strong>
            </div>
            <div>
              <span className="text-stone-500">Absent: </span>
              <strong className="font-mono text-rose-600">{absentCount}</strong>
            </div>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name, ID number..."
              className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00491E]"
            />
          </div>
        </div>

        {/* Body Table */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-stone-500">
              Loading participant roster...
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="py-12 text-center text-stone-500 text-xs">
              No participant registrations found for this event.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-semibold bg-stone-50/50">
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Student ID</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Registration Time</th>
                    <th className="py-2.5 px-3">Attendance</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredRegistrations.map((reg) => (
                    <tr
                      key={reg.registration_id}
                      className="hover:bg-stone-50/70 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-semibold text-stone-900">
                        {reg.student_name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-stone-600">
                        {reg.student_id_number}
                      </td>
                      <td className="py-2.5 px-3 text-stone-600">
                        {reg.college_department || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-stone-500">
                        {new Date(reg.registered_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        {reg.attendance_status === 'attended' ? (
                          <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            Present ✓
                          </span>
                        ) : reg.attendance_status === 'absent' ? (
                          <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                            Absent
                          </span>
                        ) : (
                          <span className="font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                            Registered
                          </span>
                        )}
                        {reg.has_evaluated && (
                          <span className="ml-1.5 text-[10px] text-stone-500">
                            (Evaluated)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={updatingId === reg.registration_id}
                            onClick={() =>
                              handleUpdateStatus(
                                reg.registration_id,
                                reg.attendance_status === 'attended'
                                  ? 'registered'
                                  : 'attended'
                              )
                            }
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                              reg.attendance_status === 'attended'
                                ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                : 'bg-[#00491E] text-white hover:bg-[#02681E]'
                            }`}
                          >
                            {reg.attendance_status === 'attended'
                              ? 'Undo Present'
                              : 'Mark Present'}
                          </button>

                          <button
                            type="button"
                            disabled={updatingId === reg.registration_id}
                            onClick={() =>
                              handleUpdateStatus(
                                reg.registration_id,
                                reg.attendance_status === 'absent'
                                  ? 'registered'
                                  : 'absent'
                              )
                            }
                            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                              reg.attendance_status === 'absent'
                                ? 'bg-stone-100 text-stone-600'
                                : 'text-stone-500 hover:text-rose-700 hover:bg-rose-50'
                            }`}
                          >
                            {reg.attendance_status === 'absent' ? 'Unmark' : 'Absent'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-50 border-t border-stone-200 px-6 py-3 flex items-center justify-between shrink-0 text-xs text-stone-500">
          <span>
            Marking a student as <strong>Present</strong> instantly unlocks their feedback evaluation survey.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-stone-300 font-medium text-stone-700 rounded-md hover:bg-stone-100"
          >
            Close Roster
          </button>
        </div>
      </div>
    </div>
  );
};
