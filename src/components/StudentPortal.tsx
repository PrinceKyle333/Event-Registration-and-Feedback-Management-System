import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, EventItem, Registration } from '../types';
import { EventCard } from './EventCard';

interface StudentPortalProps {
  currentUser: User;
  activeSubModule: 'listing' | 'my-registrations' | 'attendance' | 'evaluations' | 'history' | 'profile';
  events: EventItem[];
  myRegistrations: Registration[];
  onOpenEvaluation: (eventId: number) => void;
  onSelectEvent: (event: EventItem) => void;
  onRegister: (eventId: number) => void;
  onViewReport: (eventId: number) => void;
  onProfileUpdated: (user: User) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  currentUser,
  activeSubModule,
  events,
  myRegistrations,
  onOpenEvaluation,
  onSelectEvent,
  onRegister,
  onViewReport,
  onProfileUpdated,
}) => {
  // Feedback history state
  const [evalHistory, setEvalHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Profile form state
  const [fullName, setFullName] = useState(currentUser.full_name);
  const [email, setEmail] = useState(currentUser.email);
  const [studentId, setStudentId] = useState(currentUser.student_id || '');
  const [department, setDepartment] = useState(currentUser.college_department || '');
  const [newPassword, setNewPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    if (activeSubModule === 'history') {
      loadHistory();
    }
  }, [activeSubModule, currentUser]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.getMyEvaluations(currentUser.user_id);
      setEvalHistory(data);
    } catch {
      setEvalHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await api.updateProfile({
        full_name: fullName,
        email,
        student_id: studentId,
        college_department: department,
        passwordPlain: newPassword ? newPassword : undefined,
      });
      setProfileMsg({ text: 'Profile updated successfully!' });
      onProfileUpdated(res.user);
      setNewPassword('');
    } catch (err: any) {
      setProfileMsg({ text: err.message || 'Failed to update profile', isError: true });
    } finally {
      setProfileSaving(false);
    }
  };

  const registeredEventIds = myRegistrations.map((r) => r.event_id);
  // Students only see events an admin has approved
  const approvedEvents = events.filter((e) => e.approval_status === 'approved');

  return (
    <div className="space-y-6">
      {/* 1. EVENT LISTING */}
      {activeSubModule === 'listing' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-serif-cmu text-stone-900">
                Browse Approved Events & Colloquiums
              </h2>
              <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
                Explore upcoming Central Mindanao University seminars, check capacity, and register online.
              </p>
            </div>
            <span className="whitespace-nowrap text-xs font-mono font-bold text-[#00491E] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {approvedEvents.length} Approved Events
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {approvedEvents.map((evt) => (
              <EventCard
                key={evt.event_id}
                event={evt}
                currentUser={currentUser}
                onSelectEvent={onSelectEvent}
                onRegister={onRegister}
                isRegistered={registeredEventIds.includes(evt.event_id)}
              />
            ))}
          </div>

          {approvedEvents.length === 0 && (
            <div className="bg-white p-10 rounded-2xl border border-stone-200 text-center text-sm text-stone-500">
              No approved events are open for registration right now.
            </div>
          )}
        </div>
      )}

      {/* 2. MY REGISTRATIONS */}
      {activeSubModule === 'my-registrations' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <h2 className="text-xl font-bold font-serif-cmu text-stone-900">
              My Registered Events
            </h2>
            <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
              Review your confirmed event sign-ups and attendance verification requirements.
            </p>
          </div>

          {myRegistrations.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-stone-200 text-xs text-stone-500">
              You have not registered for any events yet.
            </div>
          ) : (
            <div className="space-y-4">
              {myRegistrations.map((reg) => {
                const evt = reg.event;
                if (!evt) return null;
                return (
                  <div
                    key={reg.registration_id}
                    className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
                        <span>{evt.department}</span>
                        <span>·</span>
                        <span>{evt.event_date}</span>
                        <span>·</span>
                        <span className="font-mono">{evt.start_time.slice(0, 5)} - {evt.end_time.slice(0, 5)}</span>
                      </div>
                      <h3 className="text-base font-bold font-serif-cmu text-stone-900">
                        {evt.event_name}
                      </h3>
                      <div className="text-xs text-stone-600">
                        Venue: <strong className="text-stone-800">{evt.venue}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold ${
                        reg.attendance_status === 'attended'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : reg.attendance_status === 'absent'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {reg.attendance_status === 'attended'
                          ? 'Confirmed Present ✓'
                          : reg.attendance_status === 'absent'
                          ? 'Marked Absent'
                          : 'Registered (Pending Venue Check-in)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. ATTENDANCE STATUS */}
      {activeSubModule === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <h2 className="text-xl font-bold font-serif-cmu text-stone-900">
              Attendance Verification Tracker
            </h2>
            <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
              Check official attendance logs recorded by event organizers at the venue. Confirmed attendance is required to evaluate.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-extrabold uppercase bg-stone-50/70">
                    <th className="py-3 px-5">Event Title</th>
                    <th className="py-3 px-5">Date & Venue</th>
                    <th className="py-3 px-5">Attendance Status</th>
                    <th className="py-3 px-5">Check-in Timestamp</th>
                    <th className="py-3 px-5 text-right">Survey Eligibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {myRegistrations.map((reg) => (
                    <tr key={reg.registration_id} className="hover:bg-stone-50/60">
                      <td className="py-3.5 px-5 font-bold text-stone-900">
                        {reg.event?.event_name}
                      </td>
                      <td className="py-3.5 px-5 text-stone-600">
                        {reg.event?.event_date} · {reg.event?.venue}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          reg.attendance_status === 'attended'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : reg.attendance_status === 'absent'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {reg.attendance_status === 'attended'
                            ? 'Present ✓'
                            : reg.attendance_status === 'absent'
                            ? 'Absent'
                            : 'Awaiting Check-in'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-stone-500">
                        {reg.attended_at
                          ? new Date(reg.attended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {reg.has_evaluated ? (
                          <span className="text-emerald-700 font-bold text-[11px]">
                            Evaluation Completed ✓
                          </span>
                        ) : reg.attendance_status === 'attended' ? (
                          <button
                            onClick={() => onOpenEvaluation(reg.event_id)}
                            className="px-3 py-1 bg-[#00491E] text-white rounded text-[11px] font-bold hover:bg-[#02681E]"
                          >
                            Submit Feedback →
                          </button>
                        ) : (
                          <span className="text-stone-400 text-[11px] italic">
                            Locked (Requires Check-in)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. EVENT EVALUATION */}
      {activeSubModule === 'evaluations' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-serif-cmu text-stone-900">
                Submit Event Feedback & Survey
              </h2>
              <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
                Complete the dynamic 4-section survey for events where your attendance has been confirmed.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myRegistrations
              .filter((r) => r.attendance_status === 'attended')
              .map((reg) => {
                const evt = reg.event;
                if (!evt) return null;
                return (
                  <div
                    key={reg.registration_id}
                    className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="whitespace-nowrap text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                        Attendance Verified
                      </span>
                      {reg.has_evaluated && (
                        <span className="text-[11px] font-bold text-stone-500">
                          Already Evaluated
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold font-serif-cmu text-stone-900">
                      {evt.event_name}
                    </h3>
                    <p className="text-xs text-stone-600 line-clamp-2">
                      {evt.description}
                    </p>

                    <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                      <span className="text-xs text-stone-500 font-mono">
                        {evt.event_date}
                      </span>
                      {reg.has_evaluated ? (
                        <button
                          onClick={() => onViewReport(evt.event_id)}
                          className="px-3.5 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
                        >
                          View Report
                        </button>
                      ) : (
                        <button
                          onClick={() => onOpenEvaluation(evt.event_id)}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-[#00491E] hover:bg-[#02681E] rounded-lg shadow-xs"
                        >
                          Start Survey →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 5. FEEDBACK HISTORY */}
      {activeSubModule === 'history' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <h2 className="text-xl font-bold font-serif-cmu text-stone-900">
              My Feedback Submission History
            </h2>
            <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
              Archive of previously completed event evaluations. Individual responses are stored securely and anonymized in university reports.
            </p>
          </div>

          {loadingHistory ? (
            <div className="p-8 text-center bg-white rounded-xl border border-stone-200 text-xs text-stone-500">
              Loading your feedback submissions...
            </div>
          ) : evalHistory.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-stone-200 text-xs text-stone-500">
              No feedback submissions recorded yet. Attend an event and complete the survey to see your history here.
            </div>
          ) : (
            <div className="space-y-4">
              {evalHistory.map((ev, idx) => (
                <div
                  key={idx}
                  className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold font-serif-cmu text-stone-900">
                      {ev.event_name}
                    </h3>
                    <span className="whitespace-nowrap font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
                      Average Rating: {ev.average_given_rating} / 5.0
                    </span>
                  </div>

                  <div className="text-xs text-stone-500 flex items-center gap-2">
                    <span>Submitted on: {new Date(ev.submit_date).toLocaleString()}</span>
                    <span>·</span>
                    <span>{ev.responses_count} questions answered</span>
                  </div>

                  {ev.comments && (
                    <div className="p-3 bg-stone-50 rounded-lg text-xs text-stone-700 italic border border-stone-200 mt-2">
                      "{ev.comments}"
                    </div>
                  )}

                  <div className="pt-2 text-right">
                    <button
                      onClick={() => onViewReport(ev.event_id)}
                      className="text-xs font-bold text-[#00491E] hover:underline"
                    >
                      View Consolidated Anonymized Report →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. PROFILE MANAGEMENT */}
      {activeSubModule === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <h2 className="text-xl font-bold font-serif-cmu text-stone-900">
              Account Profile & Academic Information
            </h2>
            <p className="text-xs text-stone-500 font-sans-cmu mt-0.5">
              Update your student identification, department, and security settings.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs max-w-xl space-y-4">
            {profileMsg && (
              <div className={`p-3 rounded-lg text-xs font-bold ${
                profileMsg.isError
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}>
                {profileMsg.text}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00491E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                CMU Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00491E]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Student ID Number
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="2023-BSIT-XXXX"
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00491E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Department / Section
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="BSIT 4B"
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00491E]"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100">
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Change Password (Leave blank to keep existing)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password..."
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00491E]"
              />
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-[#00491E] hover:bg-[#02681E] rounded-xl transition-all shadow-xs disabled:opacity-50"
            >
              {profileSaving ? 'Saving Changes...' : 'Save Profile Information'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
