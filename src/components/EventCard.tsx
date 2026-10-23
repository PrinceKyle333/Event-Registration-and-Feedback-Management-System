import React from 'react';
import { EventItem, User } from '../types';
import fallbackCampusImg from '../assets/images/cmu_campus_landmark_1792726540611.jpg';

interface EventCardProps {
  event: EventItem;
  currentUser: User | null;
  onSelectEvent: (event: EventItem) => void;
  onRegister: (eventId: number) => void;
  isRegistered?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  currentUser,
  onSelectEvent,
  onRegister,
  isRegistered,
}) => {
  const isFull = event.registered_count >= event.capacity;
  const isDeadlinePassed = event.registration_deadline
    ? new Date(event.registration_deadline).getTime() < Date.now()
    : false;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden flex flex-col hover:border-stone-400 hover:shadow-sm transition-all duration-200">
      {/* Event Image */}
      <div className="relative h-44 w-full bg-stone-100 overflow-hidden">
        <img
          src={event.image_url || fallbackCampusImg}
          alt={event.event_name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackCampusImg;
          }}
        />
        {/* Subtle status overlay tag (functional) */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded text-[11px] font-medium text-stone-700 shadow-xs">
          {event.approval_status === 'pending'
            ? 'Pending Approval'
            : event.is_active === 1
            ? 'Active for Evaluation'
            : 'Scheduled'}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata with typographic separators (No pill badges) */}
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-2 font-medium">
            <span>{event.department}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(event.event_date)}</span>
          </div>

          <h3
            onClick={() => onSelectEvent(event)}
            className="text-base font-bold text-stone-900 leading-snug cursor-pointer hover:text-[#00491E] transition-colors mb-2"
          >
            {event.event_name}
          </h3>

          <p className="text-xs text-stone-600 line-clamp-2 mb-4 leading-relaxed">
            {event.description}
          </p>
        </div>

        <div>
          {/* Logistics strip */}
          <div className="text-xs text-stone-600 space-y-1 mb-4 pt-3 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Venue:</span>
              <span className="font-medium text-stone-800 text-right truncate max-w-[200px]">
                {event.venue}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Schedule:</span>
              <span className="font-mono tabular-nums text-stone-800">
                {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Capacity:</span>
              <span className="font-mono tabular-nums text-stone-800">
                {event.registered_count} / {event.capacity} registered
              </span>
            </div>
          </div>

          {/* Capacity Progress Bar */}
          <div className="w-full bg-stone-100 rounded-full h-1.5 mb-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isFull ? 'bg-rose-500' : 'bg-[#00491E]'
              }`}
              style={{
                width: `${Math.min(100, (event.registered_count / event.capacity) * 100)}%`,
              }}
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={() => onSelectEvent(event)}
              className="text-xs font-semibold text-[#00491E] hover:underline"
            >
              View Details →
            </button>

            {currentUser?.role === 'student' ? (
              isRegistered ? (
                <span className="whitespace-nowrap text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                  Registered ✓
                </span>
              ) : isFull ? (
                <span className="whitespace-nowrap text-xs font-medium text-rose-600 bg-rose-50 px-2.5 py-1 rounded">
                  Full Capacity
                </span>
              ) : isDeadlinePassed ? (
                <span className="whitespace-nowrap text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded">
                  Closed
                </span>
              ) : (
                <button
                  onClick={() => onRegister(event.event_id)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-stone-900 bg-[#FFC600] hover:bg-amber-400 rounded-md transition-colors shadow-xs"
                >
                  Register
                </button>
              )
            ) : (
              <button
                onClick={() => onSelectEvent(event)}
                className="px-3.5 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors"
              >
                Inspect
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
