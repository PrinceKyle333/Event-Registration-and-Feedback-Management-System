import React from 'react';
import { User } from '../types';
import crestImage from '../assets/images/cmu_academic_crest_1792726539957.jpg';

interface HeaderProps {
  currentUser: User | null;
  activeTab: 'events' | 'my-records' | 'reports' | 'api-docs' | 'admin' | 'organizer';
  setActiveTab: (tab: 'events' | 'my-records' | 'reports' | 'api-docs' | 'admin' | 'organizer') => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onSwitchUser: (username: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenLogin,
  onLogout,
  onSwitchUser,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Brand Wordmark (single line, no extraneous badges) */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src={crestImage}
              alt="Central Mindanao University Crest"
              className="w-10 h-10 object-contain rounded-full shadow-xs border border-amber-400"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col">
              <span className="text-base font-bold text-[#00491E] tracking-tight font-serif-cmu whitespace-nowrap">
                Central Mindanao University
              </span>
              <span className="text-xs text-stone-500 font-sans-cmu whitespace-nowrap hidden sm:block">
                Event Registration & Evaluation System · BSIT 4B SIA
              </span>
            </div>
          </div>

          {/* Zone 2: 4-5 Nav Links (single-line, clean text with underline hover) */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            <button
              onClick={() => setActiveTab('events')}
              className={`transition-colors whitespace-nowrap py-1 border-b-2 text-left ${
                activeTab === 'events'
                  ? 'border-[#00491E] text-[#00491E] font-semibold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              Events
            </button>

            {currentUser?.role === 'student' && (
              <button
                onClick={() => setActiveTab('my-records')}
                className={`transition-colors whitespace-nowrap py-1 border-b-2 text-left ${
                  activeTab === 'my-records'
                    ? 'border-[#00491E] text-[#00491E] font-semibold'
                    : 'border-transparent text-stone-600 hover:text-stone-900'
                }`}
              >
                My Registrations
              </button>
            )}

            {currentUser?.role === 'organizer' && (
              <button
                onClick={() => setActiveTab('organizer')}
                className={`transition-colors whitespace-nowrap py-1 border-b-2 text-left ${
                  activeTab === 'organizer'
                    ? 'border-[#00491E] text-[#00491E] font-semibold'
                    : 'border-transparent text-stone-600 hover:text-stone-900'
                }`}
              >
                Organizer Studio
              </button>
            )}

            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`transition-colors whitespace-nowrap py-1 border-b-2 text-left ${
                  activeTab === 'admin'
                    ? 'border-[#00491E] text-[#00491E] font-semibold'
                    : 'border-transparent text-stone-600 hover:text-stone-900'
                }`}
              >
                Administration
              </button>
            )}

            <button
              onClick={() => setActiveTab('reports')}
              className={`transition-colors whitespace-nowrap py-1 border-b-2 text-left ${
                activeTab === 'reports'
                  ? 'border-[#00491E] text-[#00491E] font-semibold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              Evaluation Reports
            </button>

            <button
              onClick={() => setActiveTab('api-docs')}
              className={`transition-colors whitespace-nowrap py-1 border-b-2 text-left ${
                activeTab === 'api-docs'
                  ? 'border-[#00491E] text-[#00491E] font-semibold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              REST API & SQL
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action Area & Quick Switcher */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Quick Demo Role Switcher for instant evaluator testing */}
            <div className="hidden lg:flex items-center gap-1.5 p-1 bg-stone-100 rounded-lg border border-stone-200">
              <span className="text-[11px] font-medium text-stone-500 px-1.5">Role:</span>
              <button
                onClick={() => onSwitchUser('student1')}
                title="Switch to Student account (Prince Kyle Reston)"
                className={`px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  currentUser?.role === 'student' ? 'bg-[#00491E] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Student
              </button>
              <button
                onClick={() => onSwitchUser('organizer1')}
                title="Switch to Organizer account (Prof. Maria Santos)"
                className={`px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  currentUser?.role === 'organizer' ? 'bg-[#00491E] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Organizer
              </button>
              <button
                onClick={() => onSwitchUser('admin')}
                title="Switch to Admin account (Engr. Juan Dela Cruz)"
                className={`px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  currentUser?.role === 'admin' ? 'bg-[#00491E] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Admin
              </button>
            </div>

            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-stone-800 leading-tight">
                    {currentUser.full_name}
                  </div>
                  <div className="text-[11px] text-stone-500 capitalize">
                    {currentUser.role} · {currentUser.student_id || currentUser.college_department || 'CMU'}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 border border-stone-200 rounded-md hover:bg-stone-200 transition-colors whitespace-nowrap shrink-0"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-4 py-2 text-xs font-semibold text-slate-900 bg-[#FFC600] hover:bg-amber-400 rounded-md transition-colors whitespace-nowrap shrink-0 shadow-xs"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile secondary tab strip */}
        <div className="md:hidden flex items-center gap-3 overflow-x-auto py-2 border-t border-stone-100 text-xs">
          <button
            onClick={() => setActiveTab('events')}
            className={`whitespace-nowrap px-2.5 py-1 rounded ${activeTab === 'events' ? 'bg-[#00491E] text-white' : 'text-stone-600'}`}
          >
            Events
          </button>
          {currentUser?.role === 'student' && (
            <button
              onClick={() => setActiveTab('my-records')}
              className={`whitespace-nowrap px-2.5 py-1 rounded ${activeTab === 'my-records' ? 'bg-[#00491E] text-white' : 'text-stone-600'}`}
            >
              My Registrations
            </button>
          )}
          {currentUser?.role === 'organizer' && (
            <button
              onClick={() => setActiveTab('organizer')}
              className={`whitespace-nowrap px-2.5 py-1 rounded ${activeTab === 'organizer' ? 'bg-[#00491E] text-white' : 'text-stone-600'}`}
            >
              Organizer
            </button>
          )}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`whitespace-nowrap px-2.5 py-1 rounded ${activeTab === 'admin' ? 'bg-[#00491E] text-white' : 'text-stone-600'}`}
            >
              Admin
            </button>
          )}
          <button
            onClick={() => setActiveTab('reports')}
            className={`whitespace-nowrap px-2.5 py-1 rounded ${activeTab === 'reports' ? 'bg-[#00491E] text-white' : 'text-stone-600'}`}
          >
            Reports
          </button>
          <button
            onClick={() => setActiveTab('api-docs')}
            className={`whitespace-nowrap px-2.5 py-1 rounded ${activeTab === 'api-docs' ? 'bg-[#00491E] text-white' : 'text-stone-600'}`}
          >
            REST API & SQL
          </button>
        </div>
      </div>
    </header>
  );
};
