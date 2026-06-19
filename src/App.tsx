/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import HomeView from './views/HomeView';
import AboutView from './views/AboutView';
import FaqView from './views/FaqView';
import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';
import ForgotPasswordView from './views/ForgotPasswordView';
import DashboardView from './views/DashboardView';
import AdminDashboardView from './views/AdminDashboardView';
import { ShieldAlert } from 'lucide-react';
import { User } from './types';
import { getCurrentSessionUser, initializeDatabase } from './db/localDb';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [dashboardTab, setDashboardTab] = useState<string>('');

  // Auto initialize local memory collections on start
  useEffect(() => {
    initializeDatabase();
    setSessionUser(getCurrentSessionUser());

    const handleSync = () => {
      setSessionUser(getCurrentSessionUser());
    };
    window.addEventListener('smartclinic_db_sync', handleSync);
    return () => {
      window.removeEventListener('smartclinic_db_sync', handleSync);
    };
  }, []);

  // Pathname deep-linking routing listener
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/doctor/schedule') {
        setCurrentView('dashboard');
        setDashboardTab('doctor-schedule-management');
      } else if (path === '/admin/managedoctorschedule') {
        setCurrentView('dashboard');
        setDashboardTab('admin-schedule-management');
      } else if (path === '/admin/doctorrequests') {
        setCurrentView('dashboard');
        setDashboardTab('doctor-requests');
      } else if (path.startsWith('/receptionist/patientdetails/')) {
        setCurrentView('dashboard');
        setDashboardTab('receptionist-patient-details');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [sessionUser]);

  // Sync state session to prevent caching issues
  const refreshSession = () => {
    setSessionUser(getCurrentSessionUser());
  };

  const handleNavigate = (view: string, tab?: string, extraId?: string) => {
    setCurrentView(view);
    if (tab !== undefined) {
      setDashboardTab(tab);
      if (tab === 'doctor-schedule-management') {
        window.history.pushState(null, '', '/Doctor/Schedule');
      } else if (tab === 'admin-schedule-management') {
        window.history.pushState(null, '', '/Admin/ManageDoctorSchedule');
      } else if (tab === 'doctor-requests') {
        window.history.pushState(null, '', '/Admin/DoctorRequests');
      } else if (tab === 'receptionist-patient-details' && extraId) {
        window.history.pushState(null, '', `/Receptionist/PatientDetails/${extraId}`);
      } else {
        if (window.location.pathname !== '/') {
          window.history.pushState(null, '', '/');
        }
      }
    } else {
      if (window.location.pathname !== '/' && view !== 'dashboard') {
        window.history.pushState(null, '', '/');
      }
    }
    // Auto-scroll to top on view changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isDashboard = currentView === 'dashboard';

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col justify-between selection:bg-teal-100 selection:text-teal-900">
      
      {/* Universal Sticky Header */}
      {!isDashboard && (
        <Header 
          onNavigate={handleNavigate}
          currentView={currentView}
          sessionUser={sessionUser}
          onRefreshSession={refreshSession}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-grow">
        {currentView === 'home' && (
          <HomeView onNavigate={handleNavigate} />
        )}
        {currentView === 'about' && (
          <AboutView />
        )}
        {currentView === 'faq' && (
          <FaqView />
        )}
        {currentView === 'login' && (
          <LoginView 
            onNavigate={handleNavigate}
            onRefreshSession={refreshSession}
          />
        )}
        {currentView === 'register' && (
          <RegisterView 
            onNavigate={handleNavigate} 
            onRefreshSession={refreshSession}
          />
        )}
        {currentView === 'forgot-password' && (
          <ForgotPasswordView onNavigate={handleNavigate} />
        )}
        {currentView === 'dashboard' && (
          sessionUser ? (
            sessionUser.role === 'Admin' ? (
              <AdminDashboardView 
                sessionUser={sessionUser}
                onNavigate={handleNavigate}
                initialTab={dashboardTab}
              />
            ) : (
              <DashboardView 
                sessionUser={sessionUser}
                onNavigate={handleNavigate}
                initialTab={dashboardTab}
              />
            )
          ) : (
            <div className="min-h-[85vh] w-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden font-sans">
              <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-900/10 blur-[100px] pointer-events-none"></div>
              <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-slate-900/30 blur-[100px] pointer-events-none"></div>
              <div className="relative w-full max-w-md z-10">
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_-12px_rgba(239,68,68,0.15)] text-center transition-all">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-950/40 border border-rose-500/20 text-rose-400 mb-4 animate-pulse">
                    <ShieldAlert className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-black text-slate-100 tracking-tight font-mono">ACCESS RESTRAINED</h3>
                  <p className="text-xs text-slate-400 mt-2 font-mono leading-relaxed">
                    You have entered a restricted area. This session requires valid digital clinic credentials clearance keys.
                  </p>
                  <div className="mt-6 border-t border-slate-850 pt-5">
                    <button 
                      onClick={() => handleNavigate('login')}
                      className="w-full rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 p-3 text-xs font-mono font-bold tracking-wider hover:scale-[1.01] transition-all cursor-pointer shadow-lg shadow-teal-500/10"
                    >
                      RESOLVE SECURITY KEY
                    </button>
                    <button 
                      onClick={() => handleNavigate('home')}
                      className="w-full mt-2.5 rounded-xl border border-slate-800 text-slate-400 p-2 text-xs font-mono hover:text-slate-200 transition-all cursor-pointer"
                    >
                      Abort Workspace Access
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </main>

      {/* Universal Footer */}
      {!isDashboard && (
        <Footer onNavigate={handleNavigate} />
      )}

    </div>
  );
}
