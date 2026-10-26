import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  MapPin,
  Users,
  ShieldCheck,
  ClipboardCheck,
  UserCheck,
  BarChart3,
  ArrowRight,
  FilePlus2,
  GraduationCap,
  Briefcase,
  LogIn,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { EventItem, AdminDashboardStats, User } from '../types';
import { AuthForm, AuthMode } from './LoginModal';

interface LandingPageProps {
  onLoginSuccess: (user: User) => void;
  onQuickLogin: (username: string) => void;
}

const STEPS = [
  { icon: FilePlus2, title: 'Propose', text: 'Organizers submit event proposals with venue, schedule, and capacity.' },
  { icon: ShieldCheck, title: 'Approve', text: 'Administrators review each proposal and approve or reject it with a reason.' },
  { icon: UserCheck, title: 'Register & Attend', text: 'Students register online, and organizers confirm attendance on the day.' },
  { icon: ClipboardCheck, title: 'Evaluate', text: 'Attendees rate the venue, speakers, food, and coordination anonymously.' },
];

const ROLES = [
  {
    icon: GraduationCap,
    title: 'Students',
    username: 'student1',
    points: ['Browse and register for approved events', 'Track attendance status', 'Submit anonymous evaluations'],
  },
  {
    icon: Briefcase,
    title: 'Organizers',
    username: 'organizer1',
    points: ['Propose and manage events', 'Record attendance in one click', 'View feedback for your events'],
  },
  {
    icon: ShieldCheck,
    title: 'Administrators',
    username: 'admin',
    points: ['Approve or reject proposals', 'Manage users and survey questions', 'Generate evaluation reports'],
  },
];

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess, onQuickLogin }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);

  useEffect(() => {
    // Public endpoint returns approved events only
    api.getEvents().then(setEvents).catch(() => setEvents([]));
    api.getAdminStats().then(setStats).catch(() => setStats(null));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events
    .filter((e) => e.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 6);

  const scrollToEvents = () => document.getElementById('upcoming-events')?.scrollIntoView({ behavior: 'smooth' });

  // Opens the sign-in form inside the hero instead of a modal
  const onSignIn = () => {
    setAuthMode((mode) => mode ?? 'login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#EEF2F6] font-sans-cmu text-stone-800 antialiased">
      {/* Top navigation */}
      <header className="bg-[#003a17] text-white sticky top-0 z-30 border-b-4 border-[#FFC600]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/cmu-logo.png" alt="CMU logo" className="logo-tilt w-9 h-9 object-contain shrink-0" />
            <div className="min-w-0">
              <div className="font-serif-cmu font-bold text-lg leading-none">CMU Event</div>
              <div className="text-[9px] font-black text-[#FFC600] tracking-[0.2em] uppercase mt-0.5 truncate">
                Registration &amp; Evaluation
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={scrollToEvents}
              className="hidden sm:block px-3 py-2 text-xs font-bold text-white/80 hover:text-white"
            >
              Upcoming Events
            </button>
            <button
              onClick={onSignIn}
              className="px-4 py-2 bg-[#FFC600] hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-lg flex items-center gap-1.5"
            >
              <LogIn size={14} />
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-cmu-pattern text-white">
        <div
          className={`max-w-6xl mx-auto px-4 sm:px-6 grid items-center ${
            authMode
              ? 'py-12 sm:py-16 gap-10 lg:grid-cols-[1fr_440px]'
              : 'py-16 sm:py-24 gap-12 lg:grid-cols-[1fr_auto]'
          }`}
        >
          <div className="max-w-2xl">
            {authMode && (
              <img
                src="/cmu-logo.png"
                alt="CMU logo"
                className="logo-tilt w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-2xl mb-6 animate-auth-in"
              />
            )}
            <span className="text-[11px] font-black tracking-[0.2em] uppercase text-[#FFC600]">
              Central Mindanao University
            </span>
            <h1 className="font-serif-cmu text-3xl sm:text-5xl font-bold leading-tight mt-3">
              Register, attend, and evaluate university events in one place
            </h1>
            <p className="text-sm sm:text-base text-white/75 mt-5 leading-relaxed">
              From proposal to post-event feedback, every step of a CMU event is handled online: approvals,
              registrations, attendance, and anonymous evaluations with instant reports.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              {!authMode && (
                <button
                  onClick={onSignIn}
                  className="px-6 py-3 bg-[#FFC600] hover:bg-amber-400 text-stone-950 text-sm font-bold rounded-xl flex items-center gap-2"
                >
                  Get Started
                  <ArrowRight size={16} />
                </button>
              )}
              <button
                onClick={scrollToEvents}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-bold rounded-xl"
              >
                Browse Upcoming Events
              </button>
            </div>
          </div>

          {authMode ? (
            <div className="bg-white text-stone-800 rounded-2xl shadow-2xl border-t-4 border-[#FFC600] p-6 sm:p-8 animate-auth-in">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-serif-cmu text-2xl font-bold text-[#00491E]">
                    {authMode === 'register' ? 'Create University Account' : 'CMU Portal Login'}
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    {authMode === 'register'
                      ? 'Register as a student or organizer to join campus events.'
                      : 'Sign in to register for events and submit evaluations.'}
                  </p>
                </div>
                <button
                  onClick={() => setAuthMode(null)}
                  aria-label="Close sign-in form"
                  className="text-stone-400 hover:text-stone-700 p-1 -m-1 shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
              <AuthForm mode={authMode} onModeChange={setAuthMode} onLoginSuccess={onLoginSuccess} />
            </div>
          ) : (
            <img
              src="/cmu-logo.png"
              alt=""
              className="logo-tilt hidden lg:block w-64 h-64 object-contain drop-shadow-2xl"
            />
          )}
        </div>

        {/* Live figures from the database */}
        {stats && (
          <div className="bg-black/20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              {[
                { label: 'Approved Events', value: stats.approved_events },
                { label: 'Registrations', value: stats.total_registrations },
                { label: 'Attendees', value: stats.total_attended },
                { label: 'Evaluations', value: stats.total_evaluations },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-2xl sm:text-3xl font-black text-[#FFC600] tabular-nums">{item.value}</div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-white/60 mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="font-serif-cmu text-2xl sm:text-3xl font-bold text-stone-900">How it works</h2>
          <p className="text-sm text-stone-500 mt-2">Four steps take an event from idea to evaluation report.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="bg-white rounded-2xl border border-stone-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-[#00491E] text-[#FFC600] flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                  <span className="text-3xl font-black text-stone-100">{idx + 1}</span>
                </div>
                <h3 className="font-bold text-stone-900 mt-4">{step.title}</h3>
                <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">{step.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Upcoming events */}
      <section id="upcoming-events" className="bg-white border-y border-stone-200 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="font-serif-cmu text-2xl sm:text-3xl font-bold text-stone-900">Upcoming events</h2>
              <p className="text-sm text-stone-500 mt-2">Approved events open for registration.</p>
            </div>
            <button onClick={onSignIn} className="text-sm font-bold text-[#00491E] hover:underline self-start sm:self-auto">
              Sign in to register →
            </button>
          </div>

          {upcoming.length === 0 ? (
            <p className="text-sm text-stone-400 mt-10">No upcoming events right now. Check back soon.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
              {upcoming.map((evt) => {
                const seatsLeft = Math.max(evt.capacity - evt.registered_count, 0);
                return (
                  <div key={evt.event_id} className="rounded-2xl border border-stone-200 overflow-hidden flex flex-col">
                    <div className="bg-[#00491E] text-white px-5 py-4">
                      <div className="text-[10px] font-black uppercase tracking-wider text-[#FFC600] truncate">
                        {evt.department}
                      </div>
                      <h3 className="font-bold leading-snug mt-1 line-clamp-2">{evt.event_name}</h3>
                    </div>
                    <div className="p-5 space-y-2 text-xs text-stone-600 flex-1">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={14} className="text-[#00491E] shrink-0" />
                        {formatDate(evt.event_date)}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-[#00491E] shrink-0" />
                        <span className="truncate">{evt.venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-[#00491E] shrink-0" />
                        {seatsLeft > 0 ? `${seatsLeft} of ${evt.capacity} seats left` : 'Fully booked'}
                      </div>
                    </div>
                    <button
                      onClick={onSignIn}
                      className="m-5 mt-0 py-2 text-xs font-bold rounded-lg border border-[#00491E] text-[#00491E] hover:bg-[#00491E] hover:text-white transition-colors"
                    >
                      Sign in to register
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Roles + demo access */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="font-serif-cmu text-2xl sm:text-3xl font-bold text-stone-900">Built for every role</h2>
          <p className="text-sm text-stone-500 mt-2">Try the system instantly with a demo account.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-10">
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <div key={role.title} className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col">
                <div className="w-11 h-11 rounded-xl bg-[#00491E]/10 text-[#00491E] flex items-center justify-center">
                  <Icon size={20} />
                </div>
                <h3 className="font-bold text-stone-900 mt-4">{role.title}</h3>
                <ul className="text-xs text-stone-600 mt-3 space-y-2 flex-1">
                  {role.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="text-[#00491E] font-bold">✓</span>
                      {point}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onQuickLogin(role.username)}
                  className="mt-6 py-2.5 bg-[#00491E] hover:bg-[#02681E] text-white text-xs font-bold rounded-lg"
                >
                  Try as {role.title.replace(/s$/, '')}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#003a17] text-white/60 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="/cmu-logo.png" alt="" className="logo-tilt w-6 h-6 object-contain" />
            <span>Central Mindanao University · Event Registration &amp; Evaluation System</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BarChart3 size={13} />
            BSIT 4B System Integration and Architecture
          </div>
        </div>
      </footer>
    </div>
  );
};
