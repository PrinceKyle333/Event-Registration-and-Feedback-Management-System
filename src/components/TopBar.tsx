import React, { useState } from 'react';
import { Bell, Shield, ChevronDown } from 'lucide-react';
import { User } from '../types';

interface TopBarProps {
  currentUser: User | null;
  onSwitchUser: (username: string) => void;
  onOpenNotifications?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  onSwitchUser,
}) => {
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const getWorkspaceTitle = () => {
    if (currentUser?.role === 'admin') return 'Administrator Panel Workspace';
    if (currentUser?.role === 'organizer') return 'Organizer Panel Workspace';
    return 'Student Portal Workspace';
  };

  const getRoleLabel = () => {
    if (currentUser?.role === 'admin') return 'Administrator';
    if (currentUser?.role === 'organizer') return 'Event Organizer';
    return 'Student / Participant';
  };

  return (
    <div className="no-print relative z-20">
      {/* Header bar with pattern */}
      <header className="bg-cmu-header-pattern bg-[#00220d] text-white px-6 py-4 flex items-center justify-between border-b border-[#013f19]">
        {/* Left: Workspace Title & System Subtitle */}
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
            {getWorkspaceTitle()}
          </h1>
          <div className="text-xs font-black text-[#FFC600] tracking-wider uppercase font-sans-cmu mt-0.5">
            CMU EVENT REGISTRATION & EVALUATION SYSTEM (BUKIDNON)
          </div>
        </div>

        {/* Right: Notification Bell & Bypass Scope dropdown */}
        <div className="flex items-center gap-4">
          {/* Notification bell with badge "3" */}
          <div className="relative">
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="w-10 h-10 rounded-full bg-[#003816] hover:bg-[#00491E] border border-[#02681E] flex items-center justify-center text-stone-200 hover:text-white transition-colors relative"
              title="Recent Notifications"
            >
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs">
                3
              </span>
            </button>

            {notificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-stone-200 text-stone-800 p-3 z-50 text-xs space-y-2">
                <div className="font-bold text-stone-900 border-b border-stone-100 pb-1.5 flex justify-between items-center">
                  <span>System Notifications</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                    3 New
                  </span>
                </div>
                <div className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-900">
                  <div className="font-bold">Pending Event Review</div>
                  <div className="text-[11px] text-amber-800">
                    Agri-Tech Hackathon submitted by Prof. Santos requires approval.
                  </div>
                </div>
                <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-900">
                  <div className="font-bold">Attendance Updated</div>
                  <div className="text-[11px] text-emerald-800">
                    Prince Kyle Reston marked present for IT Week. Survey unlocked!
                  </div>
                </div>
                <div className="p-2 bg-stone-50 rounded border border-stone-200 text-stone-700">
                  <div className="font-bold">New Evaluation Recorded</div>
                  <div className="text-[11px] text-stone-600">
                    Anonymous feedback submitted for Capstone Colloquium.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BYPASS SCOPE Label & Pill Dropdown */}
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-block text-xs font-bold text-stone-200 tracking-wider uppercase font-mono">
              BYPASS SCOPE:
            </span>

            <div className="relative">
              <button
                onClick={() => setScopeDropdownOpen(!scopeDropdownOpen)}
                className="flex items-center gap-2 bg-[#001f0c] hover:bg-[#002a11] border border-[#02681E] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <Shield size={15} className="text-emerald-400" />
                <span>{getRoleLabel()}</span>
                <ChevronDown size={14} className="text-stone-400" />
              </button>

              {scopeDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#00220d] border border-[#02681E] rounded-xl shadow-2xl py-1 text-xs text-white z-50 overflow-hidden">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider border-b border-[#013f19]">
                    Select Operating Role
                  </div>
                  <button
                    onClick={() => {
                      onSwitchUser('admin');
                      setScopeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 hover:bg-white/10 transition-colors flex items-center justify-between ${
                      currentUser?.role === 'admin' ? 'text-[#FFC600] font-bold bg-white/5' : ''
                    }`}
                  >
                    <span>Administrator</span>
                    {currentUser?.role === 'admin' && <span>✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      onSwitchUser('organizer1');
                      setScopeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 hover:bg-white/10 transition-colors flex items-center justify-between ${
                      currentUser?.role === 'organizer' ? 'text-[#FFC600] font-bold bg-white/5' : ''
                    }`}
                  >
                    <span>Event Organizer</span>
                    {currentUser?.role === 'organizer' && <span>✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      onSwitchUser('student1');
                      setScopeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 hover:bg-white/10 transition-colors flex items-center justify-between ${
                      currentUser?.role === 'student' ? 'text-[#FFC600] font-bold bg-white/5' : ''
                    }`}
                  >
                    <span>Student / Participant</span>
                    {currentUser?.role === 'student' && <span>✓</span>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Solid Yellow/Gold Accent Separator Line (matching screenshot) */}
      <div className="h-1 bg-[#FFC600] w-full shadow-xs" />
    </div>
  );
};
