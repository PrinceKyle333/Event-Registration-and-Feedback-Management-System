import React, { useState, useEffect } from 'react';
import { Bell, Shield, ChevronDown } from 'lucide-react';
import { User, ActivityLog } from '../types';
import { api } from '../services/api';
import { timeAgo } from '../utils/time';

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
  const [notifications, setNotifications] = useState<ActivityLog[]>([]);
  const [seenAt, setSeenAt] = useState<string | null>(null);

  const loadNotifications = async () => {
    if (!currentUser) return;
    try {
      const data = await api.getActivity(10);
      setNotifications(data.logs);
      setSeenAt(data.notifications_seen_at);
    } catch {
      setNotifications([]);
    }
  };

  // Refresh on user switch and every 30s so new activity shows up without a reload
  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 30000);
    return () => clearInterval(timer);
  }, [currentUser?.user_id]);

  const unreadCount = notifications.filter(
    (n) => n.user_id !== currentUser?.user_id && (!seenAt || n.created_at > seenAt)
  ).length;

  const toggleNotifications = async () => {
    const opening = !notificationOpen;
    setNotificationOpen(opening);
    if (opening) {
      await loadNotifications();
    } else if (unreadCount > 0) {
      // Mark as read when the panel closes so unread items stay highlighted while open
      try {
        const res = await api.markNotificationsSeen();
        setSeenAt(res.notifications_seen_at);
      } catch {
        /* keep current unread state */
      }
    }
  };

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
      <header className="bg-[#003a17] text-white px-6 h-20 flex items-center justify-between">
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
          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={toggleNotifications}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-200 hover:text-white transition-colors relative"
              title="Recent Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-stone-200 text-stone-800 z-50 text-xs overflow-hidden">
                <div className="font-bold text-stone-900 border-b border-stone-100 px-3 py-2.5 flex justify-between items-center">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="whitespace-nowrap text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-stone-400">No activity yet.</div>
                ) : (
                  <div className="max-h-96 overflow-y-auto divide-y divide-stone-100">
                    {notifications.map((n) => {
                      const isUnread = n.user_id !== currentUser?.user_id && (!seenAt || n.created_at > seenAt);
                      return (
                        <div key={n.log_id} className={`px-3 py-2.5 ${isUnread ? 'bg-emerald-50/60' : ''}`}>
                          <div className="flex justify-between gap-2">
                            <span className="font-bold text-stone-900 truncate">
                              {n.user_id === currentUser?.user_id ? 'You' : n.actor_name}
                            </span>
                            <span className="text-[10px] text-stone-400 shrink-0">{timeAgo(n.created_at)}</span>
                          </div>
                          <div className="text-[11px] text-stone-600 mt-0.5">{n.description}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
              >
                <Shield size={15} className="text-[#FFC600]" />
                <span>{getRoleLabel()}</span>
                <ChevronDown size={14} className="text-white/60" />
              </button>

              {scopeDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#003a17] border border-white/10 rounded-xl shadow-2xl py-1 text-xs text-white z-50 overflow-hidden">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-white/60 uppercase tracking-wider border-b border-white/10">
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

      <div className="h-1 bg-[#FFC600] w-full" />
    </div>
  );
};
