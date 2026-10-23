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

  const navItemClass = (isActive: boolean) =>
    `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-bold transition-colors text-left ${
      isActive ? 'bg-white text-[#00491E]' : 'text-white/75 hover:bg-white/10 hover:text-white'
    }`;

  const roleButtonClass = (r: string) =>
    `py-1 text-[10px] font-bold rounded-md transition-colors ${
      currentUser?.role === r ? 'bg-white text-[#00491E]' : 'text-white/70 hover:text-white'
    }`;

  return (
    <aside
      className={`no-print relative bg-[#00491E] text-white flex flex-col justify-between shrink-0 transition-all duration-300 z-30 border-r border-white/10 ${
        collapsed ? 'w-20' : 'w-64 lg:w-72'
      }`}
      style={{ minHeight: '100vh' }}
    >
      {/* Brand Header */}
      <div
        className={`border-b border-white/10 flex items-center shrink-0 ${
          collapsed ? 'flex-col gap-2 py-4 px-2' : 'justify-between gap-2 p-5'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-full bg-white shrink-0 flex items-center justify-center p-1">
            <img src="/cmu-logo.png" alt="CMU logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-extrabold text-white tracking-tight text-base leading-none">
                CMU Event
              </span>
              <span className="text-[10px] font-semibold text-white/60 tracking-wide mt-1 truncate">
                Registration & Evaluation
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-white/60 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors shrink-0"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation Modules */}
      <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
        <div>
          {!collapsed && (
            <div className="px-3 mb-2.5 text-[10px] font-bold text-white/50 tracking-widest uppercase">
              {getModuleSectionTitle()}
            </div>
          )}

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={navItemClass(activeModule === item.id)}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={17} className="shrink-0" />
                  {!collapsed && (
                    <span className="truncate tracking-wide text-[11px] uppercase">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* REST API & MySQL Hub link */}
        <div className="pt-2 border-t border-white/10">
          <button
            onClick={() => setActiveModule('api-docs')}
            className={navItemClass(activeModule === 'api-docs')}
            title={collapsed ? 'REST API & SQL DUMP' : undefined}
          >
            <Database size={17} className="shrink-0" />
            {!collapsed && <span className="truncate tracking-wide text-[11px]">REST API & SQL DUMP</span>}
          </button>
        </div>

        {/* Quick Role Switcher Buttons */}
        {!collapsed && (
          <div className="px-2 pt-2 border-t border-white/10">
            <span className="text-[9px] font-bold text-white/50 tracking-wider uppercase block mb-1.5">
              TEST DIFFERENT ROLES
            </span>
            <div className="grid grid-cols-3 gap-1 bg-black/15 p-1 rounded-lg">
              <button onClick={() => onSwitchUser('admin')} className={roleButtonClass('admin')}>
                Admin
              </button>
              <button onClick={() => onSwitchUser('organizer1')} className={roleButtonClass('organizer')}>
                Organizer
              </button>
              <button onClick={() => onSwitchUser('student1')} className={roleButtonClass('student')}>
                Student
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Card at bottom */}
      <div className="p-3 border-t border-white/10 relative shrink-0">
        {profileDropdownOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#003e19] rounded-xl border border-white/10 p-2 shadow-2xl space-y-1 text-xs z-50">
            <div className="px-2.5 py-1.5 text-white/60 text-[11px] border-b border-white/10">
              Signed in as <strong className="text-white">{currentUser?.username}</strong>
            </div>
            <button
              onClick={() => {
                onSwitchUser('admin');
                setProfileDropdownOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/10 text-white/90"
            >
              Administrator Scope
            </button>
            <button
              onClick={() => {
                onSwitchUser('organizer1');
                setProfileDropdownOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/10 text-white/90"
            >
              Event Organizer Scope
            </button>
            <button
              onClick={() => {
                onSwitchUser('student1');
                setProfileDropdownOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/10 text-white/90"
            >
              Student / Participant Scope
            </button>
            <button
              onClick={() => {
                onLogout();
                setProfileDropdownOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-rose-950/60 text-rose-300 border-t border-white/10 mt-1 flex items-center gap-1.5"
            >
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        )}

        <div
          onClick={() => (currentUser ? setProfileDropdownOpen(!profileDropdownOpen) : onOpenLogin())}
          className="bg-white/10 hover:bg-white/15 p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-white text-[#00491E] flex items-center justify-center font-bold text-xs">
                {currentUser?.full_name ? currentUser.full_name[0].toUpperCase() : 'M'}
              </div>
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#00491E]"
                title="Online"
              />
            </div>

            {!collapsed && (
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser?.full_name || 'Maria Dela Cruz'}
                </div>
                <div className="text-[10px] text-white/60 truncate">
                  {currentUser?.email || 'admin@cmu.edu.ph'}
                </div>
                <div className="text-[9px] font-bold text-[#FFC600] tracking-wider uppercase mt-0.5">
                  {currentUser?.role || 'ADMIN'}
                </div>
              </div>
            )}
          </div>

          {!collapsed && <ChevronDown size={14} className="text-white/60 shrink-0 ml-1" />}
        </div>
      </div>
    </aside>
  );
};
