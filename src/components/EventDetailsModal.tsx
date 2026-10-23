import React from 'react';
import { EventItem, User } from '../types';
import fallbackCampusImg from '../assets/images/cmu_campus_landmark_1792726540611.jpg';

interface EventDetailsModalProps {
  event: EventItem | null;
  currentUser: User | null;
  onClose: () => void;
  onRegister: (eventId: number) => void;
  onOpenEvaluation: (eventId: number) => void;
  onOpenAttendance: (eventId: number) => void;
  isRegistered?: boolean;
  hasAttended?: boolean;
  hasEvaluated?: boolean;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  currentUser,
  onClose,
  onRegister,
  onOpenEvaluation,
  onOpenAttendance,
  isRegistered,
  hasAttended,
  hasEvaluated,
}) => {
  if (!event) return null;

  const isFull = event.registered_count >= event.capacity;
  const isDeadlinePassed = event.registration_deadline
    ? new Date(event.registration_deadline).getTime() < Date.now()
    : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-stone-200 my-8">
        {/* Hero image header */}
        <div className="relative h-56 w-full bg-stone-900">
          <img
            src={event.image_url || fallbackCampusImg}
            alt={event.event_name}
            className="w-full h-full object-cover opacity-85"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackCampusImg;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors text-sm"
          >
            ✕
          </button>

          <div className="absolute bottom-4 left-6 right-6 text-white">
            <div className="flex items-center gap-2 text-xs text-amber-300 font-medium mb-1">
              <span>{event.department}</span>
              <span aria-hidden="true">·</span>
              <span>{event.event_date}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-cmu leading-tight">
              {event.event_name}
            </h2>
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-6">
          {/* Key Logistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-stone-50 rounded-lg border border-stone-200 text-xs">
            <div>
              <span className="text-stone-500 block mb-0.5">Date</span>
              <span className="font-semibold text-stone-800">{event.event_date}</span>
            </div>
            <div>
              <span className="text-stone-500 block mb-0.5">Time</span>
              <span className="font-semibold text-stone-800 font-mono tabular-nums">
                {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block mb-0.5">Capacity</span>
              <span className="font-semibold text-stone-800 font-mono tabular-nums">
                {event.registered_count} / {event.capacity}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block mb-0.5">Evaluation Status</span>
              <span className={`font-semibold ${event.is_active ? 'text-emerald-700' : 'text-stone-600'}`}>
                {event.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-stone-900 tracking-wider uppercase mb-2">
              Event Overview & Objectives
            </h4>
            <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Venue & Organizer Details */}
          <div className="space-y-2 border-t border-stone-100 pt-4 text-xs text-stone-600">
            <div className="flex items-start justify-between">
              <span className="text-stone-500">Venue Location:</span>
              <span className="font-medium text-stone-800 text-right">{event.venue}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-stone-500">Organized By:</span>
              <span className="font-medium text-stone-800 text-right">
                {event.organizer_name || 'Central Mindanao University'}
              </span>
            </div>
            {event.registration_deadline && (
              <div className="flex items-start justify-between">
                <span className="text-stone-500">Registration Deadline:</span>
                <span className="font-mono tabular-nums text-stone-800">
                  {new Date(event.registration_deadline).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Role actions bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
            >
              Close
            </button>

            <div className="flex items-center gap-2">
              {/* Organizer / Admin Quick Attendance tool */}
              {(currentUser?.role === 'admin' || currentUser?.role === 'organizer') && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAttendance(event.event_id);
                  }}
                  className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors"
                >
                  Participant Roster & Attendance
                </button>
              )}

              {/* Student Registration / Feedback Actions */}
              {currentUser?.role === 'student' && (
                <>
                  {!isRegistered ? (
                    isFull ? (
                      <span className="whitespace-nowrap text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-2 rounded-md">
                        Event is at Full Capacity
                      </span>
                    ) : isDeadlinePassed ? (
                      <span className="whitespace-nowrap text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-2 rounded-md">
                        Registration Closed
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          onRegister(event.event_id);
                          onClose();
                        }}
                        className="px-5 py-2 text-xs font-semibold text-stone-900 bg-[#FFC600] hover:bg-amber-400 rounded-md transition-colors shadow-xs"
                      >
                        Confirm Registration
                      </button>
                    )
                  ) : hasEvaluated ? (
                    <span className="whitespace-nowrap text-xs font-medium text-emerald-800 bg-emerald-50 px-3 py-2 rounded-md">
                      Feedback Submitted ✓
                    </span>
                  ) : hasAttended ? (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenEvaluation(event.event_id);
                      }}
                      className="px-5 py-2 text-xs font-semibold text-white bg-[#00491E] hover:bg-[#02681E] rounded-md transition-colors shadow-xs"
                    >
                      Submit Feedback Survey
                    </button>
                  ) : (
                    <span className="whitespace-nowrap text-xs font-medium text-amber-800 bg-amber-50 px-3 py-2 rounded-md">
                      Registered (Attendance Confirmation Required for Evaluation)
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
