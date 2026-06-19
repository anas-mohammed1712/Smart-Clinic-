/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { 
  Users, User, Stethoscope, Calendar, FileText, Pill, 
  CreditCard, Settings, PlusCircle, BookmarkCheck, ClipboardCheck,
  Activity, Clock, Sparkles, BarChart3, GitPullRequest, X, LogOut, LayoutDashboard
} from 'lucide-react';
import { Role } from '../types';

interface SidebarProps {
  role: Role;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sessionUser: any;
  onNavigate: (view: string, tab?: string, extraId?: string) => void;
  isOpen: boolean;
  onClose: () => void;
  // Custom states setters from older hardcode
  setMedicalRecordFormMode?: (mode: 'list' | 'create' | 'edit') => void;
  setIsEditingDoctorProfile?: (isEditing: boolean) => void;
}

export default function Sidebar({ 
  role, 
  activeTab, 
  setActiveTab, 
  sessionUser, 
  onNavigate, 
  isOpen, 
  onClose,
  setMedicalRecordFormMode,
  setIsEditingDoctorProfile
}: SidebarProps) {
  
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Keyboard accessibility: ESC closes sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle outside click to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        // Also ensure we aren't clicking the floating menu trigger
        const trigger = document.getElementById('mobile-menu-trigger');
        if (trigger && trigger.contains(e.target as Node)) return;
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Define menu items for each role
  const menuItems: Record<Role, { id: string; label: string; icon: any; action?: () => void }[]> = {
    Admin: [
      { id: 'dashboard', label: 'Dashboard', icon: Activity },
      { id: 'users', label: 'Manage Users', icon: Users },
      { id: 'patients', label: 'Patient Directory', icon: User },
      { id: 'doctors', label: 'Manage Doctors', icon: Stethoscope },
      { 
        id: 'doctor-requests', 
        label: 'Doctor Requests', 
        icon: GitPullRequest,
        action: () => {
          window.history.pushState(null, '', '/Admin/DoctorRequests');
        }
      },
      { id: 'appointments', label: 'Appointments', icon: Calendar },
      { id: 'billing', label: 'Billing', icon: CreditCard },
      { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
      { 
        id: 'admin-schedule-management', 
        label: 'Doctor Schedules', 
        icon: Clock,
        action: () => {
          window.history.pushState(null, '', '/Admin/ManageDoctorSchedule');
        }
      },
      { 
        id: 'departments-management', 
        label: 'Departments', 
        icon: Sparkles,
        action: () => {
          if (window.location.pathname !== '/') {
            window.history.pushState(null, '', '/');
          }
        }
      },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
    Doctor: [
      { id: 'overview', label: 'Dashboard', icon: Activity },
      { id: 'doctor-schedule', label: "Today's Appointments", icon: Calendar },
      { id: 'my-patients', label: 'My Patients', icon: Users },
      { 
        id: 'medical-records', 
        label: 'Medical Records', 
        icon: FileText,
        action: () => {
          if (setMedicalRecordFormMode) setMedicalRecordFormMode('list');
        }
      },
      { id: 'write-prescriptions', label: 'Write Prescription', icon: Pill },
      { id: 'my-schedule', label: 'My Schedule', icon: Clock },
      { 
        id: 'doctor-profile', 
        label: 'Profile', 
        icon: User,
        action: () => {
          if (setIsEditingDoctorProfile) setIsEditingDoctorProfile(false);
        }
      },
    ],
    Receptionist: [
      { id: 'overview', label: 'Dashboard', icon: Activity },
      { id: 'register-patient', label: 'Register Patient', icon: PlusCircle },
      { id: 'appointments', label: 'Appointments', icon: Calendar },
      { id: 'patients', label: 'Patient Directory', icon: Users },
      { id: 'billing-ledger', label: 'Billing & Payments', icon: CreditCard },
      { id: 'check-in-desk', label: 'Check-In Desk', icon: ClipboardCheck },
      { id: 'profile', label: 'Profile', icon: User },
    ],
    Patient: [
      { id: 'overview', label: 'Dashboard', icon: Activity },
      { id: 'book-appointment', label: 'Book Appointment', icon: PlusCircle },
      { id: 'appointments-ledger', label: 'My Appointments', icon: Calendar },
      { id: 'patient-clinical-files', label: 'Medical Records', icon: FileText },
      { id: 'patient-rxs', label: 'Prescriptions', icon: Pill },
      { id: 'profile', label: 'My Profile', icon: User },
    ]
  };

  const currentItems = menuItems[role] || [];
  const isAdmin = role === 'Admin';

  const handleItemClick = (item: { id: string; action?: () => void }) => {
    setActiveTab(item.id);
    if (item.action) {
      item.action();
    } else {
      onNavigate('dashboard', item.id);
    }
    onClose(); // Auto close sidebar on click on mobile
  };

  const handleLogout = () => {
    if (isAdmin) {
      localStorage.removeItem('smartclinic_current_user');
      window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));
      onNavigate('login');
    } else {
      localStorage.removeItem('smartclinic_current_user');
      window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));
      onNavigate('login');
    }
    onClose();
  };

  // Profile avatar logic
  const getAvatarInitials = () => {
    if (!sessionUser?.fullName) return isAdmin ? 'AD' : 'SC';
    return sessionUser.fullName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <>
      {/* BACKGROUND SCENE DARK OVERLAY (Mobile/Tablet < 992px only) */}
      <div 
        className={`fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 transition-opacity duration-300 min-[992px]:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* SIDEBAR MAIN WRAPPER */}
      <aside 
        ref={sidebarRef}
        className={`
          fixed top-0 bottom-0 left-0 z-50 flex flex-col justify-between p-5 w-[280px] max-w-[80vw] shrink-0 select-none
          transform transition-transform duration-300 ease-in-out border-r
          min-[992px]:relative min-[992px]:translate-x-0 min-[992px]:w-64 min-[992px]:max-w-none min-[992px]:z-20 min-[992px]:border-r-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isAdmin 
            ? 'bg-slate-900 text-slate-100 border-slate-800' 
            : 'bg-white text-gray-800 border-gray-200/80 shadow-lg min-[992px]:shadow-none min-[992px]:border'
          }
          ${isAdmin
            ? ''
            : 'min-[992px]:rounded-2xl min-[992px]:p-4'
          }
        `}
        style={{ height: '100dvh', maxHeight: '100dvh' }}
        aria-label={`${role} Navigation Sidebar`}
      >
        <div className="space-y-5 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className={`flex items-center justify-between pb-3.5 border-b shrink-0 ${isAdmin ? 'border-slate-850' : 'border-gray-100'}`}>
            <div className="text-left">
              <span className={`font-sans font-black tracking-wider text-xs block ${isAdmin ? 'text-teal-400' : 'text-teal-600'}`}>
                SMART CLINIC
              </span>
              <span className={`text-[9px] font-medium tracking-wide block ${isAdmin ? 'text-slate-400' : 'text-gray-400'}`}>
                {isAdmin ? 'Administration Hub' : `${role} Dashboard`}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`text-[8px] font-sans font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                isAdmin 
                  ? 'bg-teal-500/10 border-teal-500/25 text-teal-400' 
                  : 'bg-teal-50 text-teal-700 border-teal-200/50'
              }`}>
                {role.toUpperCase()}
              </span>
              
              {/* Close Button Inside Header (Mobile/Tablet < 992px only) */}
              <button 
                onClick={onClose}
                aria-label="Close menu"
                className={`p-1.5 rounded-lg transition-colors min-[992px]:hidden ${
                  isAdmin 
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Nav Items List */}
          <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
            {currentItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`
                    w-full text-left py-2 px-3 rounded-xl text-xs font-sans font-bold flex items-center space-x-2.5 transition-all
                    ${isActive 
                      ? isAdmin
                        ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-550/15 scale-[1.01]'
                        : 'bg-teal-600 text-white font-bold shadow-md shadow-teal-700/10'
                      : isAdmin
                        ? 'text-slate-400 hover:text-teal-400 hover:bg-slate-850'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-teal-600'
                    }
                  `}
                  id={`sidebar-tab-${item.id}`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : isAdmin ? 'text-slate-400' : 'text-gray-450'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Bio and Profile section */}
          <div className={`pt-4 border-t shrink-0 ${isAdmin ? 'border-slate-800' : 'border-gray-100'}`}>
            <div className="flex items-center space-x-2.5 mb-2.5">
              {sessionUser?.image ? (
                <img 
                  src={sessionUser.image} 
                  alt={sessionUser.fullName}
                  className={`h-9 w-9 rounded-xl object-cover shrink-0 ring-2 ${isAdmin ? 'ring-teal-500/30' : 'ring-teal-600/20'}`} 
                />
              ) : (
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-sans border ${
                  isAdmin 
                    ? 'border-teal-500/20 bg-slate-800 text-teal-400' 
                    : 'border-teal-200 bg-teal-50 text-teal-700'
                }`}>
                  {getAvatarInitials()}
                </div>
              )}
              <div className="min-w-0 flex-1 text-left">
                <span className={`block text-xs font-sans font-bold truncate ${isAdmin ? 'text-slate-50' : 'text-gray-800'}`}>
                  {sessionUser?.fullName || 'Smart Clinic User'}
                </span>
                <span className={`block text-[9px] font-medium truncate ${isAdmin ? 'text-teal-450' : 'text-slate-450'}`}>
                  {isAdmin ? 'Administrator' : role}
                </span>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className={`
                w-full py-2.5 px-3 rounded-xl transition-all font-sans text-xs flex items-center justify-center space-x-2 font-bold cursor-pointer
                ${isAdmin 
                  ? 'bg-slate-850 border border-slate-800 text-slate-400 hover:text-rose-455 hover:bg-rose-950/20 hover:border-rose-500/20' 
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                }
              `}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Desktop home anchor */}
        {!isAdmin && (
          <div className={`pt-3 mt-3 border-t text-left shrink-0 ${isAdmin ? 'border-slate-800' : 'border-gray-100'}`}>
            <button 
              onClick={() => onNavigate('home')}
              className={`w-full text-left py-1.5 px-3 rounded-lg text-[11px] font-semibold transition-colors ${
                isAdmin 
                  ? 'text-slate-500 hover:text-slate-300' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              Back to Home Main
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
