import React, { useState } from 'react';
import { api } from '../services/api';
import { User, EventItem } from '../types';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onEventCreated: (event: EventItem) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onEventCreated,
}) => {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('2026-10-30');
  const [department, setDepartment] = useState('College of Information Sciences and Computing');
  const [venue, setVenue] = useState('CMU University Convention Center - Audio Visual Room');
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('17:00');
  const [registrationDeadline, setRegistrationDeadline] = useState('2026-10-29T23:59');
  const [capacity, setCapacity] = useState(150);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !eventDate || !department || !description) {
      setError('Please fill in all required event details');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.createEvent({
        event_name: eventName,
        event_date: eventDate,
        department,
        venue,
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`,
        registration_deadline: registrationDeadline ? `${registrationDeadline}:00` : null,
        capacity: Number(capacity),
        description,
        organizer_id: currentUser ? currentUser.user_id : 2,
      });

      onEventCreated(res.event);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-stone-200 my-6">
        <div className="bg-[#00491E] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold font-serif-cmu text-amber-300">
              Create New University Event
            </h2>
            <p className="text-xs text-stone-200 mt-0.5">
              {currentUser?.role === 'admin'
                ? 'Admin creation · Automatically approved and published'
                : 'Organizer submission · Will be reviewed by CISC Administration'}
            </p>
          </div>
          <button onClick={onClose} className="text-stone-300 hover:text-white text-lg p-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Event Name / Title *
            </label>
            <input
              type="text"
              required
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. BSIT Tech Colloquium 2026: REST Architectures"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00491E]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Event Date *
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00491E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                College / Department *
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00491E]"
              >
                <option value="College of Information Sciences and Computing">College of Information Sciences & Computing</option>
                <option value="Department of Information Technology">Department of Information Technology</option>
                <option value="Department of Computer Science">Department of Computer Science</option>
                <option value="College of Engineering">College of Engineering</option>
                <option value="College of Agriculture">College of Agriculture</option>
                <option value="University Student Council">University Student Council</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Venue Location *
            </label>
            <input
              type="text"
              required
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. CMU Convention Center or CISC Lab 3"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00491E]"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00491E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00491E]"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Max Capacity
              </label>
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00491E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Registration Cutoff Deadline
            </label>
            <input
              type="datetime-local"
              value={registrationDeadline}
              onChange={(e) => setRegistrationDeadline(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00491E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Description & Learning Objectives *
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline event agenda, expected guest speakers, topics covered, and participant requirements..."
              className="w-full p-2.5 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00491E]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-stone-900 bg-[#FFC600] hover:bg-amber-400 rounded-md transition-colors shadow-xs disabled:opacity-50"
            >
              {loading ? 'Submitting...' : currentUser?.role === 'admin' ? 'Publish Event' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
