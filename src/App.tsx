/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardOverview } from './components/DashboardOverview';
import { EventCard } from './components/EventCard';
import { EventDetailsModal } from './components/EventDetailsModal';
import { CreateEventModal } from './components/CreateEventModal';
import { SurveyFormModal } from './components/SurveyFormModal';
import { AttendanceRosterModal } from './components/AttendanceRosterModal';
import { EvaluationReportView } from './components/EvaluationReportView';
import { AdminPanel } from './components/AdminPanel';
import { ActivityLogView } from './components/ActivityLogView';
import { OrganizerPanel } from './components/OrganizerPanel';
import { StudentRegistrationsView } from './components/StudentRegistrationsView';
import { StudentPortal } from './components/StudentPortal';
import { LoginModal } from './components/LoginModal';
import { LandingPage } from './components/LandingPage';
import { api, setAuthUserId, setAuthToken, getAuthToken } from './services/api';
import { EventItem, User, Registration, AdminDashboardStats } from './types';

const SESSION_KEY = 'cmu-event-token'; // stores the JWT so a refresh keeps you signed in

const homeModuleFor = (role: User['role']) =>
  role === 'admin' ? 'admin-dashboard' : role === 'organizer' ? 'org-dashboard' : 'stu-listing';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeModule, setActiveModule] = useState<string>('admin-dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [myRegistrations, setMyRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Filter & Search for events
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active'>('all');

  // Modals state
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeSurveyEvent, setActiveSurveyEvent] = useState<EventItem | null>(null);
  const [activeRosterEventId, setActiveRosterEventId] = useState<number | null>(null);
  const [reportEventId, setReportEventId] = useState<number | undefined>(undefined);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setLoading(true);
    try {
      // Restore the previous session so a page refresh keeps you signed in; otherwise show the landing page
      let savedToken: string | null = null;
      try {
        savedToken = localStorage.getItem(SESSION_KEY);
      } catch {
        savedToken = null;
      }
      if (savedToken) {
        setAuthToken(savedToken);
        const user = await api.getCurrentUser(); // server verifies the token; expired tokens return null
        if (user && user.status !== 'inactive') {
          startSession(user);
          return;
        }
        setAuthToken(null);
        try {
          localStorage.removeItem(SESSION_KEY);
        } catch {
          /* nothing stored */
        }
      }
      loadEvents();
    } finally {
      setLoading(false);
    }
  };

  const startSession = (user: User, notice?: string) => {
    setCurrentUser(user);
    setAuthUserId(user.user_id);
    try {
      const token = getAuthToken();
      if (token) localStorage.setItem(SESSION_KEY, token);
    } catch {
      /* session just won't survive a refresh */
    }
    setActiveModule(homeModuleFor(user.role));
    loadUserRegistrations(user.user_id);
    loadStats();
    loadEvents();
    if (notice) {
      setBannerNotice(notice);
      setTimeout(() => setBannerNotice(null), 3500);
    }
  };

  const loadEvents = async () => {
    try {
      const data = await api.getEvents({ all: true });
      setEvents(data);
    } catch (err: any) {
      console.error('Failed to load events:', err);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load dashboard stats:', err);
    }
  };

  const loadUserRegistrations = async (userId: number) => {
    try {
      const regs = await api.getMyRegistrations(userId);
      setMyRegistrations(regs);
    } catch {
      setMyRegistrations([]);
    }
  };

  const handleSwitchUser = async (username: string) => {
    try {
      const pwd = username === 'admin' ? 'admin123' : username === 'organizer1' ? 'organizer123' : 'student123';
      const res = await api.login(username, pwd);
      startSession(res.user, `Signed in as ${res.user.full_name} (${res.user.role.toUpperCase()})`);
    } catch (err: any) {
      alert('Failed to switch role: ' + err.message);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthUserId(null);
    setAuthToken(null);
    setMyRegistrations([]);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* nothing stored */
    }
  };

  const handleRegister = async (eventId: number) => {
    if (!currentUser) {
      setIsLoginOpen(true);
      return;
    }

    try {
      const res = await api.registerForEvent(eventId);
      setBannerNotice(res.message);
      setTimeout(() => setBannerNotice(null), 4000);
      loadEvents();
      loadStats();
      loadUserRegistrations(currentUser.user_id);
    } catch (err: any) {
      alert(err.message || 'Registration failed');
    }
  };

  const handleApproveEvent = async (eventId: number) => {
    try {
      await api.setEventApproval(eventId, 'approved');
      setBannerNotice('Event proposal approved and published to university registry!');
      setTimeout(() => setBannerNotice(null), 3500);
      loadEvents();
      loadStats();
    } catch (err: any) {
      alert('Approval failed: ' + err.message);
    }
  };

  const handleOpenEvaluation = (eventId: number) => {
    const target = events.find((e) => e.event_id === eventId);
    if (target) {
      setActiveSurveyEvent(target);
    }
  };

  const handleViewReport = (eventId: number) => {
    setReportEventId(eventId);
    setActiveModule('reports');
  };

  const registeredEventIds = myRegistrations.map((r) => r.event_id);

  const filteredEvents = events.filter((e) => {
    if (departmentFilter !== 'All' && !e.department.includes(departmentFilter)) {
      return false;
    }
    if (statusFilter === 'active' && e.is_active !== 1) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.event_name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Signed-out visitors see the public landing page
  if (!currentUser) {
    if (loading) return <div className="min-h-screen bg-[#EEF2F6]" />;
    return (
      <LandingPage
        onLoginSuccess={(u) => startSession(u, `Welcome, ${u.full_name}`)}
        onQuickLogin={handleSwitchUser}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-[#EEF2F6] font-sans-cmu text-stone-800 antialiased selection:bg-[#FFC600] selection:text-stone-950">
      {/* 1. LEFT SIDEBAR (Matching screenshot layout, logo, modules, user card) */}
      <Sidebar
        currentUser={currentUser}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
      />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header Bar (Matching screenshot) */}
        <TopBar
          currentUser={currentUser}
          onSwitchUser={handleSwitchUser}
        />

        {/* Global Banner Notification */}
        {bannerNotice && (
          <div className="no-print bg-[#00491E] text-white py-2 px-6 text-center text-xs font-bold border-b border-amber-400/40">
            {bannerNotice}
          </div>
        )}

        {/* Main Viewport Content */}
        <main className="flex-1 p-5 sm:p-7 max-w-[1550px] w-full mx-auto space-y-6">
          {/* 2. ADMIN DASHBOARD & OVERVIEW (Exact match to screenshot image_8c89f589.png) */}
          {(activeModule === 'admin-dashboard' || (activeModule === 'dashboard' && currentUser?.role === 'admin')) && (
            <DashboardOverview
              currentUser={currentUser}
              stats={stats}
              events={events}
              onNavigate={(mod) => {
                if (mod === 'events') setActiveModule('admin-events');
                else if (mod === 'registrations') setActiveModule('admin-users');
                else if (mod === 'evaluations') setActiveModule('admin-surveys');
                else if (mod === 'reports') setActiveModule('admin-eval-reports');
                else setActiveModule(mod);
              }}
              onApproveEvent={handleApproveEvent}
              onOpenAttendance={(id) => setActiveRosterEventId(id)}
            />
          )}

          {/* 3. ADMIN MODULES */}
          {activeModule === 'admin-logs' && <ActivityLogView />}

          {activeModule.startsWith('admin-') && activeModule !== 'admin-dashboard' && activeModule !== 'admin-logs' && (
            <AdminPanel
              currentUser={currentUser!}
              initialSubTab={activeModule.replace('admin-', '') as any}
              onOpenCreateEvent={() => setIsCreateOpen(true)}
              onOpenAttendance={(id) => setActiveRosterEventId(id)}
              onViewReport={handleViewReport}
            />
          )}

          {/* 4. ORGANIZER MODULES */}
          {(activeModule.startsWith('org-') || (activeModule === 'dashboard' && currentUser?.role === 'organizer')) && (
            <OrganizerPanel
              currentUser={currentUser!}
              initialSubTab={
                activeModule === 'dashboard'
                  ? 'dashboard'
                  : (activeModule.replace('org-', '') as any)
              }
              onOpenCreateEvent={() => setIsCreateOpen(true)}
              onOpenAttendance={(id) => setActiveRosterEventId(id)}
              onViewReport={handleViewReport}
            />
          )}

          {/* 5. STUDENT / PARTICIPANT MODULES */}
          {(activeModule.startsWith('stu-') || (activeModule === 'dashboard' && currentUser?.role === 'student')) && (
            <StudentPortal
              currentUser={currentUser!}
              activeSubModule={
                activeModule === 'dashboard'
                  ? 'listing'
                  : (activeModule.replace('stu-', '') as any)
              }
              events={events}
              myRegistrations={myRegistrations}
              onOpenEvaluation={handleOpenEvaluation}
              onSelectEvent={(e) => setSelectedEvent(e)}
              onRegister={handleRegister}
              onViewReport={handleViewReport}
              onProfileUpdated={(updatedUser) => {
                setCurrentUser(updatedUser);
                setBannerNotice('Account profile updated successfully');
                setTimeout(() => setBannerNotice(null), 3000);
              }}
            />
          )}

          {/* 6. FALLBACK / LEGACY MODULE ROUTES */}
          {activeModule === 'events' && (
            currentUser?.role === 'student' ? (
              <StudentPortal
                currentUser={currentUser!}
                activeSubModule="listing"
                events={events}
                myRegistrations={myRegistrations}
                onOpenEvaluation={handleOpenEvaluation}
                onSelectEvent={(e) => setSelectedEvent(e)}
                onRegister={handleRegister}
                onViewReport={handleViewReport}
                onProfileUpdated={(u) => setCurrentUser(u)}
              />
            ) : currentUser?.role === 'organizer' ? (
              <OrganizerPanel
                currentUser={currentUser!}
                initialSubTab="events"
                onOpenCreateEvent={() => setIsCreateOpen(true)}
                onOpenAttendance={(id) => setActiveRosterEventId(id)}
                onViewReport={handleViewReport}
              />
            ) : (
              <AdminPanel
                currentUser={currentUser!}
                initialSubTab="events"
                onOpenCreateEvent={() => setIsCreateOpen(true)}
                onOpenAttendance={(id) => setActiveRosterEventId(id)}
                onViewReport={handleViewReport}
              />
            )
          )}

          {activeModule === 'registrations' && (
            currentUser?.role === 'student' ? (
              <StudentPortal
                currentUser={currentUser!}
                activeSubModule="my-registrations"
                events={events}
                myRegistrations={myRegistrations}
                onOpenEvaluation={handleOpenEvaluation}
                onSelectEvent={(e) => setSelectedEvent(e)}
                onRegister={handleRegister}
                onViewReport={handleViewReport}
                onProfileUpdated={(u) => setCurrentUser(u)}
              />
            ) : currentUser?.role === 'organizer' ? (
              <OrganizerPanel
                currentUser={currentUser!}
                initialSubTab="registrations"
                onOpenCreateEvent={() => setIsCreateOpen(true)}
                onOpenAttendance={(id) => setActiveRosterEventId(id)}
                onViewReport={handleViewReport}
              />
            ) : (
              <AdminPanel
                currentUser={currentUser!}
                initialSubTab="users"
                onOpenCreateEvent={() => setIsCreateOpen(true)}
                onOpenAttendance={(id) => setActiveRosterEventId(id)}
                onViewReport={handleViewReport}
              />
            )
          )}

          {activeModule === 'evaluations' && (
            currentUser?.role === 'student' ? (
              <StudentPortal
                currentUser={currentUser!}
                activeSubModule="evaluations"
                events={events}
                myRegistrations={myRegistrations}
                onOpenEvaluation={handleOpenEvaluation}
                onSelectEvent={(e) => setSelectedEvent(e)}
                onRegister={handleRegister}
                onViewReport={handleViewReport}
                onProfileUpdated={(u) => setCurrentUser(u)}
              />
            ) : currentUser?.role === 'organizer' ? (
              <OrganizerPanel
                currentUser={currentUser!}
                initialSubTab="evaluations"
                onOpenCreateEvent={() => setIsCreateOpen(true)}
                onOpenAttendance={(id) => setActiveRosterEventId(id)}
                onViewReport={handleViewReport}
              />
            ) : (
              <AdminPanel
                currentUser={currentUser!}
                initialSubTab="surveys"
                onOpenCreateEvent={() => setIsCreateOpen(true)}
                onOpenAttendance={(id) => setActiveRosterEventId(id)}
                onViewReport={handleViewReport}
              />
            )
          )}

          {activeModule === 'reports' && (
            <EvaluationReportView
              initialEventId={reportEventId}
              events={events}
            />
          )}
        </main>
      </div>

      {/* MODALS */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(u) => startSession(u, `Welcome back, ${u.full_name}`)}
      />

      <EventDetailsModal
        event={selectedEvent}
        currentUser={currentUser}
        onClose={() => setSelectedEvent(null)}
        onRegister={handleRegister}
        onOpenEvaluation={handleOpenEvaluation}
        onOpenAttendance={(id) => setActiveRosterEventId(id)}
        isRegistered={selectedEvent ? registeredEventIds.includes(selectedEvent.event_id) : false}
        hasAttended={
          selectedEvent
            ? myRegistrations.some(
                (r) => r.event_id === selectedEvent.event_id && r.attendance_status === 'attended'
              )
            : false
        }
        hasEvaluated={
          selectedEvent
            ? myRegistrations.some(
                (r) => r.event_id === selectedEvent.event_id && r.has_evaluated
              )
            : false
        }
      />

      <CreateEventModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        currentUser={currentUser}
        onEventCreated={(newEvt) => {
          loadEvents();
          loadStats();
          setBannerNotice(`Event "${newEvt.event_name}" submitted successfully!`);
          setTimeout(() => setBannerNotice(null), 3500);
        }}
      />

      <SurveyFormModal
        event={activeSurveyEvent}
        isOpen={!!activeSurveyEvent}
        onClose={() => setActiveSurveyEvent(null)}
        onSubmitted={() => {
          if (currentUser) loadUserRegistrations(currentUser.user_id);
          loadEvents();
          loadStats();
          setBannerNotice('Evaluation submitted! Your feedback has been recorded.');
          setTimeout(() => setBannerNotice(null), 3500);
        }}
      />

      <AttendanceRosterModal
        eventId={activeRosterEventId}
        isOpen={!!activeRosterEventId}
        onClose={() => setActiveRosterEventId(null)}
        onAttendanceChanged={() => {
          loadEvents();
          loadStats();
          if (currentUser) loadUserRegistrations(currentUser.user_id);
        }}
      />
    </div>
  );
}
