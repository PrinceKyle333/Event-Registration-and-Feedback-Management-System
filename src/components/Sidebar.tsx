import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Users,
  ClipboardCheck,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  CheckCircle2,
  FileText,
  UserCheck,
  UserCog,
  ShieldCheck,
  ListFilter,
  History,
  MessageSquareText,
  Ticket,
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

type NavLeaf = { id: string; label: string; icon: React.ElementType };
type NavGroup = { key: string; label: string; icon: React.ElementType; children: NavLeaf[] };
type NavEntry = NavLeaf | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => 'children' in entry;

const NAV_BY_ROLE: Record<string, NavEntry[]> = {
  admin: [
    { id: 'admin-dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
    { id: 'admin-users', label: 'USER MANAGEMENT', icon: Users },
    {
      key: 'admin-events-group',
      label: 'EVENTS',
      icon: CalendarDays,
      children: [
        { id: 'admin-approval', label: 'EVENT APPROVAL', icon: ShieldCheck },
        { id: 'admin-events', label: 'EVENT MANAGEMENT', icon: Calendar },
        { id: 'admin-surveys', label: 'SURVEY MANAGEMENT', icon: ClipboardCheck },
      ],
    },
    {
      key: 'admin-reports-group',
      label: 'REPORTS',
      icon: BarChart3,
      children: [
        { id: 'admin-eval-reports', label: 'EVALUATION REPORTS', icon: BarChart3 },
        { id: 'admin-reg-reports', label: 'REGISTRATION REPORTS', icon: FileText },
      ],
    },
  ],
  organizer: [
    { id: 'org-dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
    {
      key: 'org-events-group',
      label: 'EVENTS',
      icon: CalendarDays,
      children: [
        { id: 'org-events', label: 'EVENT MANAGEMENT', icon: Calendar },
        { id: 'org-status', label: 'EVENT STATUS', icon: ListFilter },
      ],
    },
    {
      key: 'org-participants-group',
      label: 'PARTICIPANTS',
      icon: Users,
      children: [
        { id: 'org-registrations', label: 'REGISTRATIONS', icon: Users },
        { id: 'org-attendance', label: 'ATTENDANCE', icon: UserCheck },
      ],
    },
    {
      key: 'org-reports-group',
      label: 'REPORTS',
      icon: BarChart3,
      children: [
        { id: 'org-evaluations', label: 'FEEDBACK & EVALUATION', icon: ClipboardCheck },
        { id: 'org-reports', label: 'EVENT REPORTS', icon: BarChart3 },
      ],
    },
  ],
  student: [
    { id: 'stu-listing', label: 'EVENT LISTING', icon: Calendar },
    {
      key: 'stu-my-events-group',
      label: 'MY EVENTS',
      icon: Ticket,
      children: [
        { id: 'stu-registrations', label: 'MY REGISTRATIONS', icon: Users },
        { id: 'stu-attendance', label: 'ATTENDANCE STATUS', icon: CheckCircle2 },
      ],
    },
    {
      key: 'stu-feedback-group',
      label: 'FEEDBACK',
      icon: MessageSquareText,
      children: [
        { id: 'stu-evaluations', label: 'EVENT EVALUATION', icon: ClipboardCheck },
        { id: 'stu-history', label: 'FEEDBACK HISTORY', icon: History },
      ],
    },
    { id: 'stu-profile', label: 'PROFILE MANAGEMENT', icon: UserCog },
  ],
};

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
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  const role = currentUser?.role || 'admin';
  const navEntries = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.admin;

  // Keep the dropdown that holds the active module expanded
  React.useEffect(() => {
    const activeGroup = navEntries.find(
      (entry) => isGroup(entry) && entry.children.some((child) => child.id === activeModule)
    );
    if (activeGroup && isGroup(activeGroup)) {
      setOpenGroups((prev) => ({ ...prev, [activeGroup.key]: true }));
    }
  }, [activeModule, role]);

  const getModuleSectionTitle = () => {
    if (role === 'admin') return 'ADMIN MODULES';
    if (role === 'organizer') return 'ORGANIZER MODULES';
    return 'STUDENT MODULES';
  };

  const ActiveBar = () => (
    <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-[#FFC600]" />
  );

  const renderLeaf = (item: NavLeaf, nested = false) => {
    const Icon = item.icon;
    const isActive = activeModule === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setActiveModule(item.id)}
        title={collapsed ? item.label : undefined}
        className={`relative w-full flex items-center gap-3.5 text-left font-bold tracking-wide uppercase transition-colors ${
          collapsed ? 'justify-center py-3' : nested ? 'pl-14 pr-6 py-2 text-[11px]' : 'px-6 py-3 text-[13px]'
        } ${isActive ? 'text-[#FFC600]' : 'text-[#d3ecd9] hover:text-white hover:bg-white/5'}`}
      >
        {isActive && <ActiveBar />}
        {(!nested || collapsed) && <Icon size={18} className="shrink-0" />}
        {!collapsed && <span className="truncate">{item.label}</span>}
      </button>
    );
  };

  const renderGroup = (group: NavGroup) => {
    const Icon = group.icon;
    const isOpen = !!openGroups[group.key];
    const hasActiveChild = group.children.some((child) => child.id === activeModule);
    return (
      <div key={group.key}>
        <button
          onClick={() => setOpenGroups((prev) => ({ ...prev, [group.key]: !isOpen }))}
          className={`relative w-full flex items-center gap-3.5 px-6 py-3 text-left text-[13px] font-bold tracking-wide uppercase transition-colors ${
            hasActiveChild ? 'text-[#FFC600]' : 'text-[#d3ecd9] hover:text-white hover:bg-white/5'
          }`}
        >
          {hasActiveChild && !isOpen && <ActiveBar />}
          <Icon size={18} className="shrink-0" />
          <span className="truncate flex-1">{group.label}</span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-[#FFC600] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {isOpen && <div className="pb-1">{group.children.map((child) => renderLeaf(child, true))}</div>}
      </div>
    );
  };

  return (
    <aside
      className={`no-print sticky top-0 h-screen bg-cmu-pattern text-white flex flex-col shrink-0 transition-all duration-300 z-30 ${
        collapsed ? 'w-20' : 'w-64 lg:w-72'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`bg-[#003a17] h-20 flex items-center shrink-0 ${
          collapsed ? 'flex-col justify-center gap-1 px-2' : 'justify-between gap-2 px-5'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <img
            src="/cmu-logo.png"
            alt="CMU logo"
            className={`${collapsed ? 'w-8 h-8' : 'w-11 h-11'} object-contain shrink-0`}
          />
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-serif-cmu font-bold text-white text-xl leading-none">CMU Event</span>
              <span className="text-[9px] font-black text-[#FFC600] tracking-[0.2em] uppercase leading-tight mt-1">
                Registration &amp;
                <br />
                Evaluation
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-[#FFC600] hover:text-amber-300 p-1 rounded-md hover:bg-white/5 transition-colors shrink-0"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation Modules */}
      <div className="flex-1 py-6 overflow-y-auto">
        {!collapsed && (
          <div className="px-6 mb-3 text-[13px] font-black text-[#FFC600] tracking-wider uppercase">
            {getModuleSectionTitle()}
          </div>
        )}

        <nav className="space-y-0.5">
          {collapsed
            ? navEntries.flatMap((entry) => (isGroup(entry) ? entry.children : [entry])).map((item) => renderLeaf(item))
            : navEntries.map((entry) => (isGroup(entry) ? renderGroup(entry) : renderLeaf(entry)))}
        </nav>
      </div>

      {/* User Profile Card at bottom */}
      <div className="bg-[#003a17] p-4 relative shrink-0">
        {profileDropdownOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#003a17] rounded-xl border border-white/10 p-2 shadow-2xl space-y-1 text-xs z-50">
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
          className={`bg-black/20 hover:bg-black/30 rounded-xl flex items-center cursor-pointer transition-colors ${
            collapsed ? 'justify-center p-2' : 'justify-between p-3'
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#00491E] border border-[#FFC600] text-white flex items-center justify-center font-bold text-sm">
                {currentUser?.full_name ? currentUser.full_name[0].toUpperCase() : 'M'}
              </div>
              <span className="text-[8px] font-black text-emerald-400 uppercase tracking-wide leading-none mt-1">
                ONLINE
              </span>
            </div>

            {!collapsed && (
              <div className="truncate">
                <div className="text-sm font-bold text-white truncate">
                  {currentUser?.full_name || 'Maria Dela Cruz'}
                </div>
                <div className="text-[11px] text-white/70 truncate">
                  {currentUser?.email || 'admin@cmu.edu.ph'}
                </div>
                <div className="text-[10px] font-black text-[#FFC600] tracking-wider uppercase mt-0.5">
                  {currentUser?.role || 'ADMIN'}
                </div>
              </div>
            )}
          </div>

          {!collapsed && <ChevronDown size={16} className="text-[#FFC600] shrink-0 ml-1" />}
        </div>
      </div>
    </aside>
  );
};
