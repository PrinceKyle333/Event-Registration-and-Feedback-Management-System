import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  ClipboardCheck,
  BarChart3,
  Database,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  CheckCircle2,
  Settings,
  FileText,
  UserCheck,
  UserCog,
  ShieldCheck,
  ListFilter,
  History,
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentUser: User | null;
  activeModule: string;
  setActiveModule: (module: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onSwitchUser: (username: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeModule,
  setActiveModule,
  collapsed,
  setCollapsed,
  onOpenLogin,
  onLogout,
  onSwitchUser,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = React.useState(false);

  const role = currentUser?.role || 'admin';

  const getModuleSectionTitle = () => {
    if (role === 'admin') return 'ADMIN MODULES';
    if (role === 'organizer') return 'EVENT ORGANIZER MODULES';
    return 'STUDENT / PARTICIPANT MODULES';
  };

  const getNavItems = () => {
    if (role === 'admin') {
      return [
        { id: 'admin-dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
        { id: 'admin-users', label: 'USER MANAGEMENT', icon: Users },
        { id: 'admin-approval', label: 'EVENT APPROVAL', icon: ShieldCheck },
        { id: 'admin-events', label: 'EVENT MANAGEMENT', icon: Calendar },
        { id: 'admin-surveys', label: 'SURVEY MANAGEMENT', icon: ClipboardCheck },
        { id: 'admin-eval-reports', label: 'EVALUATION REPORTS', icon: BarChart3 },
        { id: 'admin-reg-reports', label: 'REGISTRATION REPORTS', icon: FileText },
        { id: 'admin-settings', label: 'SYSTEM SETTINGS', icon: Settings },
      ];
    } else if (role === 'organizer') {
      return [
        { id: 'org-dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
        { id: 'org-events', label: 'EVENT MANAGEMENT', icon: Calendar },
        { id: 'org-registrations', label: 'REGISTRATION MANAGEMENT', icon: Users },
        { id: 'org-attendance', label: 'ATTENDANCE MANAGEMENT', icon: UserCheck },
        { id: 'org-status', label: 'EVENT STATUS', icon: ListFilter },
        { id: 'org-evaluations', label: 'FEEDBACK & EVALUATION', icon: ClipboardCheck },
        { id: 'org-reports', label: 'REPORTS', icon: BarChart3 },
      ];
    } else {
      // Student
      return [
        { id: 'stu-listing', label: 'EVENT LISTING', icon: Calendar },
        { id: 'stu-registrations', label: 'MY REGISTRATIONS', icon: Users },
        { id: 'stu-attendance', label: 'ATTENDANCE STATUS', icon: CheckCircle2 },
        { id: 'stu-evaluations', label: 'EVENT EVALUATION', icon: ClipboardCheck },
        { id: 'stu-history', label: 'FEEDBACK HISTORY', icon: History },
        { id: 'stu-profile', label: 'PROFILE MANAGEMENT', icon: UserCog },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside
      className={`no-print relative bg-cmu-pattern text-white flex flex-col justify-between shrink-0 transition-all duration-300 z-30 border-r border-[#003d18] ${
        collapsed ? 'w-20' : 'w-64 lg:w-72'
      }`}
      style={{ minHeight: '100vh' }}
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-[#013f19]/60 flex items-center justify-between shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Circular Gold Ring CMU Logo matching image_6d6b15ca.png */}
            <div className="w-10 h-10 rounded-full border-2 border-[#FFC600] bg-[#002f13] shadow-md shrink-0 flex items-center justify-center p-0.5">
              <span className="font-black text-[#FFC600] font-serif-cmu text-xs tracking-tight">
                CMU
              </span>
            </div>
            <div className="flex flex-col truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white tracking-tight text-base leading-none">
                  CMU Event
                </span>
                <span className="text-[10px] text-[#FFC600] font-black uppercase tracking-wider">
                  SIA
                </span>
              </div>
              <span className="text-[9px] font-extrabold text-[#FFC600] tracking-wider uppercase mt-1">
                EVENT REGISTRATION & EVALUATION
              </span>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="mx-auto w-10 h-10 rounded-full border-2 border-[#FFC600] bg-[#002f13] flex items-center justify-center">
            <span className="font-black text-[#FFC600] font-serif-cmu text-xs">
              CMU
            </span>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-stone-300 hover:text-amber-300 p-1.5 rounded-md hover:bg-white/5 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation Modules (Exact to User Specification) */}
      <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
        <div>
          {!collapsed && (
            <div className="px-3 mb-2.5 text-[10px] font-black text-[#FFC600] tracking-widest uppercase">
              {getModuleSectionTitle()}
            </div>
          )}

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${
                    isActive
                      ? 'bg-[#FFC600] text-slate-950 font-black shadow-sm'
                      : 'text-stone-300 hover:bg-white/10 hover:text-white'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    size={17}
                    className={`shrink-0 ${
                      isActive ? 'text-slate-950' : 'text-stone-300'
                    }`}
                  />
                  {!collapsed && (
                    <span className="truncate tracking-wide text-[11px] uppercase">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* REST API & MySQL Hub link */}
        <div className="pt-2 border-t border-[#013f19]/80">
          <button
            onClick={() => setActiveModule('api-docs')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${
              activeModule === 'api-docs'
                ? 'bg-[#FFC600] text-slate-950 font-black shadow-sm'
                : 'text-stone-400 hover:bg-white/10 hover:text-amber-300'
            }`}
          >
            <Database size={16} />
            {!collapsed && <span className="truncate text-[11px]">REST API & SQL DUMP</span>}
          </button>
        </div>

        {/* Quick Role Switcher Buttons */}
        {!collapsed && (
          <div className="px-2 pt-2 border-t border-[#013f19]/80">
            <span className="text-[9px] font-black text-amber-400/90 tracking-wider uppercase block mb-1.5">
              TEST DIFFERENT ROLES
            </span>
            <div className="grid grid-cols-3 gap-1 bg-[#001f0c] p-1 rounded-lg border border-[#02521c]">
              <button
                onClick={() => onSwitchUser('admin')}
                className={`py-1 text-[10px] font-extrabold rounded transition-colors ${
                  currentUser?.role === 'admin'
                    ? 'bg-[#00491E] text-amber-300 shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => onSwitchUser('organizer1')}
                className={`py-1 text-[10px] font-extrabold rounded transition-colors ${
                  currentUser?.role === 'organizer'
                    ? 'bg-[#00491E] text-amber-300 shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Organizer
              </button>
              <button
                onClick={() => onSwitchUser('student1')}
                className={`py-1 text-[10px] font-extrabold rounded transition-colors ${
                  currentUser?.role === 'student'
                    ? 'bg-[#00491E] text-amber-300 shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Student
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Card at bottom */}
      <div className="p-3 border-t border-[#013f19]/80 relative shrink-0">
        {profileDropdownOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#001f0c] rounded-xl border border-[#02521c] p-2 shadow-2xl space-y-1 text-xs z-50">
            <div className="px-2.5 py-1.5 text-stone-400 text-[11px] border-b border-[#02521c]">
              Signed in as <strong className="text-white">{currentUser?.username}</strong>
            </div>
            <button
              onClick={() => {
                onSwitchUser('admin');
                setProfileDropdownOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/10 text-stone-200"
            >
              Administrator Scope
            </button>
            <button
              onClick={() => {
                onSwitchUser('organizer1');
                setProfileDropdownOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/10 text-stone-200"
            >
              Event Organizer Scope
            </button>
            <button
              onClick={() => {
                onSwitchUser('student1');
                setProfileDropdownOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/10 text-stone-200"
            >
              Student / Participant Scope
            </button>
            <button
              onClick={() => {
                onLogout();
                setProfileDropdownOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-rose-950/60 text-rose-300 border-t border-[#02521c] mt-1 flex items-center gap-1.5"
            >
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        )}

        <div
          onClick={() => (currentUser ? setProfileDropdownOpen(!profileDropdownOpen) : onOpenLogin())}
          className="bg-[#001a0a]/90 hover:bg-[#001a0a] p-2.5 rounded-xl border border-[#02491a] flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-8 h-8 rounded-full bg-[#02681E] border border-emerald-400/40 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {currentUser?.full_name ? currentUser.full_name[0].toUpperCase() : 'M'}
              </div>
              <span className="text-[7px] font-black text-emerald-400 uppercase tracking-tighter leading-none mt-0.5">
                ONLINE
              </span>
            </div>

            {!collapsed && (
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser?.full_name || 'Maria Dela Cruz'}
                </div>
                <div className="text-[10px] text-stone-400 truncate">
                  {currentUser?.email || 'admin@cmu.edu.ph'}
                </div>
                <div className="text-[9px] font-black text-amber-400 tracking-wider uppercase mt-0.5">
                  {currentUser?.role || 'ADMIN'}
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <ChevronDown size={14} className="text-stone-400 shrink-0 ml-1" />
          )}
        </div>
      </div>
    </aside>
  );
};
