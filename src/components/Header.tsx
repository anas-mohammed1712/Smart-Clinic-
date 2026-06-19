/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { HeartPulse, Bell, LogIn, UserPlus, LogOut, Menu, X, ChevronDown, Sparkles, LayoutDashboard } from 'lucide-react';
import { User } from '../types';
import { getCurrentSessionUser, setCurrentSessionUser, getNotifications, getUsers } from '../db/localDb';
import { signOut } from 'firebase/auth';
import { auth } from '../db/firebase';

interface HeaderProps {
  onNavigate: (view: string, tab?: string) => void;
  currentView: string;
  onRefreshSession: () => void;
  sessionUser: User | null;
  dashboardTab?: string;
}

export default function Header({ onNavigate, currentView, onRefreshSession, sessionUser, dashboardTab }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const notifications = getNotifications().filter(n => sessionUser && n.userId === sessionUser.uid);

  useEffect(() => {
    if (sessionUser) {
      const unread = notifications.filter(n => !n.read).length;
      setUnreadNotifications(unread);
    } else {
      setUnreadNotifications(0);
    }
  }, [sessionUser, notifications]);

  const handleLogout = () => {
    signOut(auth).catch((err) => console.error("Firebase SignOut error:", err));
    setCurrentSessionUser(null);
    onRefreshSession();
    onNavigate('home');
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const handleServicesClick = () => {
    if (currentView !== 'home') {
      onNavigate('home');
      setTimeout(() => {
        const el = document.getElementById('services-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      const el = document.getElementById('services-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  // Navbars grouping definitions based on requirements
  const renderDesktopNav = () => {
    if (!sessionUser) {
      // Guest Navbar: Home, About, Services, FAQ, Login, Register
      return (
        <nav className="hidden md:flex items-center space-x-1">
          <button 
            onClick={() => onNavigate('home')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${currentView === 'home' ? 'text-teal-600 bg-teal-50/50' : 'text-gray-600 hover:text-teal-600 hover:bg-gray-50'}`}
          >
            Home
          </button>
          <button 
            onClick={() => onNavigate('about')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${currentView === 'about' ? 'text-teal-600 bg-teal-50/50' : 'text-gray-600 hover:text-teal-600 hover:bg-gray-50'}`}
          >
            About
          </button>
          <button 
            onClick={handleServicesClick}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-teal-600 hover:bg-gray-50 transition-colors"
          >
            Services
          </button>
          <button 
            onClick={() => onNavigate('faq')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${currentView === 'faq' ? 'text-teal-600 bg-teal-50/50' : 'text-gray-600 hover:text-teal-600 hover:bg-gray-50'}`}
          >
            FAQ
          </button>
          <button 
            onClick={() => onNavigate('login')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${currentView === 'login' ? 'text-teal-600 bg-teal-50/50' : 'text-gray-600 hover:text-teal-600 hover:bg-gray-50'}`}
          >
            Login
          </button>
          <button 
            onClick={() => onNavigate('register')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${currentView === 'register' ? 'text-teal-600 bg-teal-50/50' : 'text-gray-600 hover:text-teal-600 hover:bg-gray-50'}`}
          >
            Register
          </button>
        </nav>
      );
    }

    if (sessionUser.role === 'Admin') {
      // Admin Navbar: Dashboard, Users, Doctors, Appointments, Reports, Logout
      const isTabActive = (tabName: string) => currentView === 'dashboard' && dashboardTab === tabName;
      return (
        <nav className="hidden md:flex items-center space-x-1">
          <button 
            onClick={() => onNavigate('dashboard', 'dashboard')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${isTabActive('dashboard') ? 'text-teal-600 bg-teal-50/50' : 'text-gray-600 hover:text-teal-600'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => onNavigate('dashboard', 'users')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${isTabActive('users') ? 'text-teal-600 bg-teal-50/50' : 'text-gray-600 hover:text-teal-600'}`}
          >
            Users
          </button>
          <button 
            onClick={() => onNavigate('dashboard', 'doctors')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${isTabActive('doctors') ? 'text-teal-600 bg-teal-50/50' : 'text-gray-600 hover:text-teal-600'}`}
          >
            Doctors
          </button>
          <button 
            onClick={() => onNavigate('dashboard', 'appointments')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${isTabActive('appointments') ? 'text-teal-600 bg-teal-50/50' : 'text-gray-600 hover:text-teal-600'}`}
          >
            Appointments
          </button>
          <button 
            onClick={() => onNavigate('dashboard', 'reports')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${isTabActive('reports') ? 'text-teal-600 bg-teal-50/50' : 'text-gray-600 hover:text-teal-600'}`}
          >
            Reports
          </button>
          <button 
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50/40 transition-colors"
          >
            Logout
          </button>
        </nav>
      );
    }

    if (sessionUser.role === 'Patient') {
      // Patient Navbar: Dashboard, My Appointments, Medical Records, Profile, Logout
      const isTabActive = (tabName: string) => currentView === 'dashboard' && dashboardTab === tabName;
      return (
        <nav className="hidden md:flex items-center space-x-1">
          <button 
            onClick={() => onNavigate('dashboard', 'overview')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${isTabActive('overview') ? 'text-teal-600 bg-teal-50/50' : 'text-gray-600 hover:text-teal-600'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => onNavigate('dashboard', 'appointments-ledger')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${isTabActive('appointments-ledger') ? 'text-teal-600 bg-teal-50/50' : 'text-gray-600 hover:text-teal-600'}`}
          >
            My Appointments
          </button>
          <button 
            onClick={() => onNavigate('dashboard', 'patient-clinical-files')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${isTabActive('patient-clinical-files') ? 'text-teal-600 bg-teal-50/50' : 'text-gray-600 hover:text-teal-600'}`}
          >
            Medical Records
          </button>
          <button 
            onClick={() => onNavigate('dashboard', 'overview')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${isTabActive('overview') ? 'text-teal-600 bg-teal-50/50' : 'text-gray-600 hover:text-teal-600'}`}
          >
            Profile
          </button>
          <button 
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50/40 transition-colors"
          >
            Logout
          </button>
        </nav>
      );
    }

    // Default Fallback for other roles (Doctor, Receptionist)
    return (
      <nav className="hidden md:flex items-center space-x-1">
        <button 
          onClick={() => onNavigate('dashboard')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${currentView === 'dashboard' ? 'text-teal-600 bg-teal-50/55' : 'text-gray-600 hover:text-teal-600'}`}
        >
          Dashboard Workspace
        </button>
        <button 
          onClick={handleLogout}
          className="px-3 py-2 rounded-lg text-sm font-semibold text-rose-600 hover:text-rose-700"
        >
          Logout
        </button>
      </nav>
    );
  };

  const renderMobileNav = () => {
    if (!sessionUser) {
      // Guest Mobile Navbar: Home, About, Services, FAQ, Login, Register
      return (
        <div className="grid grid-cols-1 gap-2">
          <button 
            onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
            className={`text-left py-2.5 px-3 rounded-lg text-sm font-semibold ${currentView === 'home' ? 'text-teal-600 bg-teal-50/40' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Home
          </button>
          <button 
            onClick={() => { onNavigate('about'); setMobileMenuOpen(false); }}
            className={`text-left py-2.5 px-3 rounded-lg text-sm font-semibold ${currentView === 'about' ? 'text-teal-600 bg-teal-50/40' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            About
          </button>
          <button 
            onClick={handleServicesClick}
            className="text-left py-2.5 px-3 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Services
          </button>
          <button 
            onClick={() => { onNavigate('faq'); setMobileMenuOpen(false); }}
            className={`text-left py-2.5 px-3 rounded-lg text-sm font-semibold ${currentView === 'faq' ? 'text-teal-600 bg-teal-50/40' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            FAQ
          </button>
          <button 
            onClick={() => { onNavigate('login'); setMobileMenuOpen(false); }}
            className={`text-left py-2.5 px-3 rounded-lg text-sm font-semibold ${currentView === 'login' ? 'text-teal-600 bg-teal-50/40' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Login
          </button>
          <button 
            onClick={() => { onNavigate('register'); setMobileMenuOpen(false); }}
            className={`text-left py-2.5 px-3 rounded-lg text-sm font-semibold ${currentView === 'register' ? 'text-teal-600 bg-teal-50/40' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Register
          </button>
        </div>
      );
    }

    if (sessionUser.role === 'Admin') {
      // Admin Mobile Navbar: Dashboard, Users, Doctors, Appointments, Reports, Logout
      const isTabActive = (tabName: string) => currentView === 'dashboard' && dashboardTab === tabName;
      return (
        <div className="grid grid-cols-1 gap-2">
          <button 
            onClick={() => { onNavigate('dashboard', 'dashboard'); setMobileMenuOpen(false); }}
            className={`text-left py-2.5 px-3 rounded-lg text-sm font-semibold ${isTabActive('dashboard') ? 'text-teal-600 bg-teal-50/40' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => { onNavigate('dashboard', 'users'); setMobileMenuOpen(false); }}
            className={`text-left py-2.5 px-3 rounded-lg text-sm font-semibold ${isTabActive('users') ? 'text-teal-600 bg-teal-50/40' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Users
          </button>
          <button 
            onClick={() => { onNavigate('dashboard', 'doctors'); setMobileMenuOpen(false); }}
            className={`text-left py-2.5 px-3 rounded-lg text-sm font-semibold ${isTabActive('doctors') ? 'text-teal-600 bg-teal-50/40' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Doctors
          </button>
          <button 
            onClick={() => { onNavigate('dashboard', 'appointments'); setMobileMenuOpen(false); }}
            className={`text-left py-2.5 px-3 rounded-lg text-sm font-semibold ${isTabActive('appointments') ? 'text-teal-600 bg-teal-50/40' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Appointments
          </button>
          <button 
            onClick={() => { onNavigate('dashboard', 'reports'); setMobileMenuOpen(false); }}
            className={`text-left py-2.5 px-3 rounded-lg text-sm font-semibold ${isTabActive('reports') ? 'text-teal-600 bg-teal-50/40' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Reports
          </button>
          <button 
            onClick={handleLogout}
            className="text-left py-2.5 px-3 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50/30"
          >
            Logout
          </button>
        </div>
      );
    }

    if (sessionUser.role === 'Patient') {
      // Patient Mobile Navbar: Dashboard, My Appointments, Medical Records, Profile, Logout
      const isTabActive = (tabName: string) => currentView === 'dashboard' && dashboardTab === tabName;
      return (
        <div className="grid grid-cols-1 gap-2">
          <button 
            onClick={() => { onNavigate('dashboard', 'overview'); setMobileMenuOpen(false); }}
            className={`text-left py-2.5 px-3 rounded-lg text-sm font-semibold ${isTabActive('overview') ? 'text-teal-600 bg-teal-50/40' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => { onNavigate('dashboard', 'appointments-ledger'); setMobileMenuOpen(false); }}
            className={`text-left py-2.5 px-3 rounded-lg text-sm font-semibold ${isTabActive('appointments-ledger') ? 'text-teal-600 bg-teal-50/40' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            My Appointments
          </button>
          <button 
            onClick={() => { onNavigate('dashboard', 'patient-clinical-files'); setMobileMenuOpen(false); }}
            className={`text-left py-2.5 px-3 rounded-lg text-sm font-semibold ${isTabActive('patient-clinical-files') ? 'text-teal-600 bg-teal-50/40' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Medical Records
          </button>
          <button 
            onClick={() => { onNavigate('dashboard', 'overview'); setMobileMenuOpen(false); }}
            className={`text-left py-2.5 px-3 rounded-lg text-sm font-semibold ${isTabActive('overview') ? 'text-teal-600 bg-teal-50/40' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Profile
          </button>
          <button 
            onClick={handleLogout}
            className="text-left py-2.5 px-3 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50/30"
          >
            Logout
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-2">
        <button 
          onClick={() => { onNavigate('dashboard'); setMobileMenuOpen(false); }}
          className="text-left py-2.5 px-3 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Dashboard Workspace
        </button>
        <button 
          onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
          className="text-left py-2.5 px-3 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50"
        >
          Logout
        </button>
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/90 backdrop-blur-md transition-shadow duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo and Brand Title */}
        <div 
          onClick={() => onNavigate('home')} 
          className="flex cursor-pointer items-center space-x-2.5 transition-transform hover:scale-[1.01]"
          id="brand-logo"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-100">
            <HeartPulse className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <span className="block font-sans text-xl font-bold tracking-tight text-gray-900 leading-none">SmartClinic</span>
            <span className="text-[10px] font-mono tracking-wider text-teal-600 uppercase font-semibold">Management</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        {renderDesktopNav()}

        {/* Right CTA / Session Area */}
        <div className="hidden md:flex items-center space-x-4">
          {sessionUser ? (
            <div className="flex items-center space-x-3.5">
              {/* Notification Banner */}
              <div className="relative">
                <button 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-55 hover:text-gray-905 transition-colors"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-gray-100 bg-white p-3 shadow-xl ring-1 ring-black/5 z-50">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                      <span className="text-xs font-bold text-gray-900">Notifications</span>
                      <span className="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-full font-semibold">
                        {notifications.length} Total
                      </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <p className="text-center py-4 text-xs text-gray-400 font-medium">No recent notifications.</p>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="p-2 rounded-lg bg-gray-55/60 border border-gray-50 text-left hover:bg-gray-50 transition-colors">
                            <h5 className="text-xs font-semibold text-gray-900 leading-tight">{n.title}</h5>
                            <p className="text-xs text-gray-500 mt-1 leading-normal">{n.message}</p>
                            <span className="text-[9px] text-gray-400 font-mono mt-1.5 block">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Simple Authentication Status & Flow Trigger */}
              <div className="flex items-center space-x-3 font-mono">
                <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-slate-150 border border-slate-200 text-teal-800">
                  <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                  Active: {sessionUser.role}
                </span>
                <button 
                  onClick={() => onNavigate('dashboard')}
                  className="rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-100 text-xs font-bold px-4 py-2 border border-slate-800 hover:border-slate-700 shadow-sm transition-all cursor-pointer inline-flex items-center space-x-1"
                >
                  <LayoutDashboard className="h-3.5 w-3.5 text-teal-400" />
                  <span>DASHBOARD</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3 font-mono">
              <button 
                onClick={() => onNavigate('login')}
                className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <LogIn className="h-4 w-4 text-slate-500" />
                <span>Log In</span>
              </button>
              <button 
                onClick={() => onNavigate('register')}
                className="flex items-center space-x-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 px-4 py-2 text-xs font-bold shadow-md shadow-teal-500/10 transition-all hover:scale-[1.01] cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>Sign Up</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center space-x-2">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3 shadow-lg">
          {renderMobileNav()}
        </div>
      )}
    </header>
  );
}
