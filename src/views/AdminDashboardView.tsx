/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, User, Stethoscope, Calendar, FileText, Pill, 
  CreditCard, Settings, PlusCircle, Search, Trash2, Check, X, 
  Activity, FilePlus, Printer, Sparkles, Clock, HeartPulse, 
  AlertCircle, ChevronDown, CheckCircle2, DollarSign, RefreshCw,
  BarChart3, ShieldAlert, Edit, UserX, UserCheck, Eye, Save, Plus,
  Building2, ListFilter, Power, Ban, UserPlus, GitPullRequest, Menu
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { 
  User as UserType, PatientRecord, DoctorRecord, Appointment, 
  MedicalRecord, Prescription, BillingInvoice, Role, Department,
  DoctorDepartmentRequest
} from '../types';
import { 
  getUsers, saveUser, deleteUser, getPatients, savePatient, deletePatient,
  getDoctors, saveDoctor, deleteDoctor, getAppointments, saveAppointment, 
  deleteAppointment, getMedicalRecords, saveMedicalRecord, 
  getPrescriptions, getBillingInvoices, saveBillingInvoice,
  triggerNotification, getDepartments, saveDepartment, deleteDepartment,
  getDoctorDepartmentRequests, saveDoctorDepartmentRequest
} from '../db/localDb';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import { 
  parseTimeToMinutes, formatMinutesToTime, getGeneratedSlots, 
  DEFAULT_WEEKLY_SCHEDULE, getDayNameFromDate 
} from '../utils/scheduleUtils';

interface AdminDashboardViewProps {
  sessionUser: UserType;
  onNavigate: (view: string, tab?: string) => void;
  initialTab?: string;
}

export default function AdminDashboardView({ sessionUser, onNavigate, initialTab }: AdminDashboardViewProps) {
  const [activeTab, setActiveTab ] = useState<'dashboard' | 'users' | 'patients' | 'doctors' | 'appointments' | 'billing' | 'reports' | 'settings' | any>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Database states
  const [users, setUsers] = useState<UserType[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [billingInvoices, setBillingInvoices] = useState<BillingInvoice[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDeptImageUrl, setNewDeptImageUrl] = useState('');
  const [newDeptIsActive, setNewDeptIsActive] = useState(true);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [deptSearch, setDeptSearch] = useState('');
  const [deptStatusFilter, setDeptStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewingDept, setViewingDept] = useState<Department | null>(null);
  const [assigningDept, setAssigningDept] = useState<Department | null>(null);
  const [selectedDoctorIdToAssign, setSelectedDoctorIdToAssign] = useState('');

  // Doctor Department Change Requests states
  const [doctorRequests, setDoctorRequests] = useState<DoctorDepartmentRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<DoctorDepartmentRequest | null>(null);
  const [showRequestDetailsModal, setShowRequestDetailsModal] = useState(false);
  const [adminRejectionNotes, setAdminRejectionNotes] = useState('');

  // Admin Doctor schedule editor states
  const [adminSelectedDoctorId, setAdminSelectedDoctorId] = useState<string>('');
  const [adminDocWeeklySchedule, setAdminDocWeeklySchedule] = useState<any>(DEFAULT_WEEKLY_SCHEDULE);
  const [adminDocApptDuration, setAdminDocApptDuration] = useState<number>(30);
  const [adminDocVacationMode, setAdminDocVacationMode] = useState<boolean>(false);
  const [adminDocUnavailableDays, setAdminDocUnavailableDays] = useState<string[]>([]);
  const [adminNewUnavailableDay, setAdminNewUnavailableDay] = useState<string>('');

  // Search/Filter states
  const [userSearch, setUserSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [apptSearch, setApptSearch] = useState('');

  // Selected Detail View states
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<PatientRecord | null>(null);
  const [selectedDoctorSchedule, setSelectedDoctorSchedule] = useState<DoctorRecord | null>(null);

  // Edit/Add modals and states
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<DoctorRecord | null>(null);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [showAddAppt, setShowAddAppt] = useState(false);

  // Form states for adding items
  const [newDoctorForm, setNewDoctorForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    specialty: 'Internal Medicine',
    experience: '5 Years',
    availability: ['Monday', 'Wednesday', 'Friday'],
    bio: ''
  });

  const [newPatientForm, setNewPatientForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: 'Cairo, Egypt',
    dob: '1995-01-01',
    gender: 'Male',
    bloodType: 'A+',
    medicalHistory: 'None',
    emergencyContact: '0100000000'
  });

  const [newInvoiceForm, setNewInvoiceForm] = useState({
    patientId: '',
    patientName: '',
    service: 'Consultation',
    amount: 150,
    paymentMethod: 'Cash' as 'Cash' | 'Card' | 'Insurance' | 'Bank Transfer',
    status: 'Paid' as 'Unpaid' | 'Paid' | 'Refunded'
  });

  const [newApptForm, setNewApptForm] = useState({
    patientId: '',
    patientName: '',
    doctorId: '',
    doctorName: '',
    date: '2026-06-12',
    time: '10:00',
    notes: 'Routine checkup',
    symptoms: 'Mild headache'
  });

  // Settings states
  const [clinicConfig, setClinicConfig] = useState({
    clinicName: 'Smart Clinic Consolidated System',
    emergencyHotline: '01158698584',
    operationHours: '09:00 - 21:00',
    alertMessage: 'SYSTEM ALERT: Running under Zero-Trust RBAC security framework.'
  });

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync data from local storage/Firestore
  const loadData = () => {
    setUsers(getUsers());
    setPatients(getPatients());
    setDoctors(getDoctors());
    setAppointments(getAppointments());
    setMedicalRecords(getMedicalRecords());
    setBillingInvoices(getBillingInvoices());
    setDepartments(getDepartments());
    setDoctorRequests(getDoctorDepartmentRequests());
  };

  useEffect(() => {
    loadData();

    const handleSync = () => {
      loadData();
    };
    window.addEventListener('smartclinic_db_sync', handleSync);
    return () => {
      window.removeEventListener('smartclinic_db_sync', handleSync);
    };
  }, [refreshTrigger]);

  // Sync selected doctor schedule configurations for Admin editor
  useEffect(() => {
    if (adminSelectedDoctorId) {
      const doc = doctors.find(d => d.uid === adminSelectedDoctorId);
      if (doc) {
        setAdminDocWeeklySchedule(doc.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE);
        setAdminDocApptDuration(doc.appointmentDuration || 30);
        setAdminDocVacationMode(!!doc.vacationMode);
        setAdminDocUnavailableDays(doc.unavailableDays || []);
      }
    } else {
      if (doctors.length > 0) {
        setAdminSelectedDoctorId(doctors[0].uid);
      }
    }
  }, [adminSelectedDoctorId, doctors]);

  // Synchronize dynamic router tabs for Admin
  useEffect(() => {
    if (activeTab === 'admin-schedule-management') {
      if (window.location.pathname.toLowerCase() !== '/admin/managedoctorschedule') {
        window.history.pushState(null, '', '/Admin/ManageDoctorSchedule');
      }
    } else if (activeTab === 'doctor-requests') {
      if (window.location.pathname.toLowerCase() !== '/admin/doctorrequests') {
        window.history.pushState(null, '', '/Admin/DoctorRequests');
      }
    } else {
      if (window.location.pathname !== '/' && activeTab) {
        window.history.pushState(null, '', '/');
      }
    }
  }, [activeTab]);

  const handleAdminSaveDoctorSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSelectedDoctorId) {
      triggerToast('Please select a doctor to configure.', 'error');
      return;
    }

    const doc = doctors.find(d => d.uid === adminSelectedDoctorId);
    if (!doc) {
      triggerToast('Doctor profile not found in database.', 'error');
      return;
    }

    const activeDays = Object.keys(adminDocWeeklySchedule).filter(day => !adminDocWeeklySchedule[day].isOff);

    const updatedDoc: DoctorRecord = {
      ...doc,
      weeklySchedule: adminDocWeeklySchedule,
      appointmentDuration: adminDocApptDuration,
      vacationMode: adminDocVacationMode,
      unavailableDays: adminDocUnavailableDays,
      availability: activeDays,
    };

    saveDoctor(updatedDoc);

    const relatedUser = users.find(u => u.uid === adminSelectedDoctorId);
    if (relatedUser) {
      const updatedUser: UserType = {
        ...relatedUser,
        weeklySchedule: adminDocWeeklySchedule,
        appointmentDuration: adminDocApptDuration,
        vacationMode: adminDocVacationMode,
        unavailableDays: adminDocUnavailableDays,
        availability: activeDays,
      };
      saveUser(updatedUser);
    }

    triggerToast(`Operational schedule for Dr. ${doc.fullName} updated!`);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleApproveDoctorDeptRequest = (req: DoctorDepartmentRequest) => {
    const updatedRequest: DoctorDepartmentRequest = {
      ...req,
      status: 'Approved',
      updatedAt: new Date().toISOString()
    };
    saveDoctorDepartmentRequest(updatedRequest);

    const targetUserId = req.doctorId;
    
    const dbUsers = getUsers();
    const matchedUser = dbUsers.find(u => u.uid === targetUserId);
    if (matchedUser) {
      const updatedUser: UserType = {
        ...matchedUser,
        departmentId: req.requestedDepartmentId,
        department: req.requestedDepartmentName,
        specialty: req.requestedDepartmentName,
      };
      saveUser(updatedUser);
    }

    const dbDoctors = getDoctors();
    const matchedDoctor = dbDoctors.find(d => d.uid === targetUserId);
    if (matchedDoctor) {
      const updatedDoctor: DoctorRecord = {
        ...matchedDoctor,
        departmentId: req.requestedDepartmentId,
        department: req.requestedDepartmentName,
        specialty: req.requestedDepartmentName,
      };
      saveDoctor(updatedDoctor);
    }

    triggerNotification(
      req.doctorId,
      'Department Request Approved',
      `Your request to transfer to the ${req.requestedDepartmentName} department has been approved.`,
      'success'
    );

    triggerToast(`Approved transfer for Dr. ${req.doctorName} to ${req.requestedDepartmentName}!`);
    loadData();
    setShowRequestDetailsModal(false);
  };

  const handleRejectDoctorDeptRequest = (req: DoctorDepartmentRequest, reason: string) => {
    if (!reason.trim()) {
      triggerToast('Please enter a rejection reason.', 'error');
      return;
    }

    const updatedRequest: DoctorDepartmentRequest = {
      ...req,
      status: 'Rejected',
      adminNotes: reason,
      updatedAt: new Date().toISOString()
    };
    saveDoctorDepartmentRequest(updatedRequest);

    triggerNotification(
      req.doctorId,
      'Department Request Rejected',
      `Your request to transfer to the ${req.requestedDepartmentName} department was rejected: ${reason}`,
      'error'
    );

    triggerToast(`Transfer request for Dr. ${req.doctorName} rejected.`);
    setAdminRejectionNotes('');
    loadData();
    setShowRequestDetailsModal(false);
  };

  // Calculations
  const totalPatients = patients.length;
  const totalDoctors = doctors.length;
  const totalReceptionists = users.filter(u => u.role === 'Receptionist').length;
  const totalAppointmentsCount = appointments.length;
  
  const todayStr = '2026-06-11';
  const todayAppointments = appointments.filter(a => a.date === todayStr);
  const revenueOverview = billingInvoices
    .filter(i => i.status === 'Paid')
    .reduce((sum, current) => sum + current.amount, 0);

  // Filtered Lists
  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredPatients = patients.filter(p => 
    p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) || 
    p.email.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.patientId.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const filteredDoctors = doctors.filter(d => 
    d.fullName.toLowerCase().includes(doctorSearch.toLowerCase()) || 
    d.specialty.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  const filteredAppointments = appointments.filter(a => 
    a.patientName.toLowerCase().includes(apptSearch.toLowerCase()) || 
    a.doctorName.toLowerCase().includes(apptSearch.toLowerCase()) ||
    a.status.toLowerCase().includes(apptSearch.toLowerCase())
  );

  // Handlers for User Management
  const handleChangeRole = (user: UserType, newRole: Role) => {
    const updated = { ...user, role: newRole };
    // If promoting to doctor, make sure they have a doctor record
    if (newRole === 'Doctor') {
      const docRecord: DoctorRecord = {
        uid: user.uid,
        doctorId: 'DOC-' + Math.floor(1000 + Math.random() * 9000),
        fullName: user.fullName,
        specialty: user.specialty || 'Internal Medicine',
        experience: user.experience || '3 Years',
        phone: user.phone,
        email: user.email,
        availability: user.availability || ['Monday', 'Wednesday', 'Friday'],
        profileImage: user.profileImage,
        bio: user.bio || 'General Clinical Consultant'
      };
      saveDoctor(docRecord);
    }
    // If promoting to patient, make sure they have a patient record
    if (newRole === 'Patient') {
      const patRecord: PatientRecord = {
        uid: user.uid,
        patientId: 'PAT-' + Math.floor(1000 + Math.random() * 9000),
        fullName: user.fullName,
        age: 30, // Default
        gender: user.gender || 'Male',
        phone: user.phone,
        address: user.address || 'Cairo, Egypt',
        bloodType: 'O+',
        medicalHistory: 'None',
        emergencyContact: '0100000000',
        email: user.email,
        profileImage: user.profileImage
      };
      savePatient(patRecord);
    }

    saveUser(updated);
    triggerToast(`Role for ${user.fullName} updated to ${newRole} instantly!`);
    triggerNotification(user.uid, 'Security Division', `Your identity access clearance has been modified to ${newRole} by the Superintendent.`, 'warning');
  };

  const handleToggleActive = (user: UserType) => {
    const updated = { ...user, isActive: !user.isActive };
    saveUser(updated);
    triggerToast(`Account status for ${user.fullName} is now ${updated.isActive ? 'Active' : 'Suspended'}.`);
    triggerNotification(user.uid, 'Security Alert', `Your account clearance has been changed to ${updated.isActive ? 'Active' : 'Suspended'}.`, 'error');
  };

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const confirmAction = (msg: string) => isIframe || window.confirm(msg);

  const handleDeleteUser = (uid: string) => {
    if (uid === sessionUser.uid) {
      triggerToast('Forbidden: You cannot delete your own session root user.', 'error');
      return;
    }
    const victim = users.find(u => u.uid === uid);
    if (!victim) return;

    if (confirmAction(`CRITICAL DESTRUCTIVE OPERATION: Delete ${victim.fullName}? All profile access files will be permanently purged.`)) {
      // Clean relationships
      const relativeDoctor = doctors.find(d => d.uid === uid);
      if (relativeDoctor) {
        deleteDoctor(relativeDoctor.uid);
      }
      const relativePatient = patients.find(p => p.uid === uid);
      if (relativePatient) {
        deletePatient(relativePatient.uid);
      }

      // Safely delete using the localDb helper which syncs to Firestore
      deleteUser(uid);

      triggerToast(`Account files for ${victim.fullName} permanently erased from database registries.`);
    }
  };

  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    saveUser(editingUser);
    setEditingUser(null);
    triggerToast(`User credentials for ${editingUser.fullName} updated successfully.`);
  };

  // Handlers for Doctor Management
  const handleAddDoctorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tempUid = 'uid-' + Math.random().toString(36).substr(2, 9);
    
    // Create companion User record
    const companionUser: UserType = {
      uid: tempUid,
      fullName: newDoctorForm.fullName,
      email: newDoctorForm.email,
      phone: newDoctorForm.phone,
      role: 'Doctor',
      createdAt: new Date().toISOString(),
      profileImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
      isActive: true,
      gender: 'Male',
      dob: '1985-01-01',
      address: 'Cairo, Egypt',
      specialty: newDoctorForm.specialty,
      experience: newDoctorForm.experience,
      availability: newDoctorForm.availability,
      bio: newDoctorForm.bio
    };

    saveUser(companionUser);

    const companionDoc: DoctorRecord = {
      uid: tempUid,
      doctorId: 'DOC-' + Math.floor(1000 + Math.random() * 9000),
      fullName: newDoctorForm.fullName,
      specialty: newDoctorForm.specialty,
      experience: newDoctorForm.experience,
      phone: newDoctorForm.phone,
      email: newDoctorForm.email,
      availability: newDoctorForm.availability,
      profileImage: companionUser.profileImage,
      bio: newDoctorForm.bio
    };

    saveDoctor(companionDoc);
    setShowAddDoctor(false);
    triggerToast(`Dr. ${newDoctorForm.fullName} registered under division ${newDoctorForm.specialty}.`);
    // Reset
    setNewDoctorForm({
      fullName: '',
      email: '',
      phone: '',
      specialty: 'Internal Medicine',
      experience: '5 Years',
      availability: ['Monday', 'Wednesday', 'Friday'],
      bio: ''
    });
  };

  const handleEditDoctorSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;
    saveDoctor(editingDoctor);
    setEditingDoctor(null);
    triggerToast(`Doctor profile of ${editingDoctor.fullName} updated.`);
  };

  const handleDeleteDoctorRecord = (uid: string) => {
    if (confirmAction("Are you sure you want to dismiss this Dr. Consultant from active clinician registry?")) {
      deleteDoctor(uid);
      triggerToast('Doctor successfully removed from active records');
    }
  };

  // Handlers for Patient Management
  const handleAddPatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tempUid = 'uid-' + Math.random().toString(36).substr(2, 9);
    
    // Create User
    const companionUser: UserType = {
      uid: tempUid,
      fullName: newPatientForm.fullName,
      email: newPatientForm.email,
      phone: newPatientForm.phone,
      role: 'Patient',
      createdAt: new Date().toISOString(),
      profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300',
      isActive: true,
      gender: newPatientForm.gender,
      dob: newPatientForm.dob,
      address: newPatientForm.address
    };

    saveUser(companionUser);

    // Create Patient record
    const companionPatient: PatientRecord = {
      uid: tempUid,
      patientId: 'PAT-' + Math.floor(1000 + Math.random() * 9000),
      fullName: newPatientForm.fullName,
      age: 2026 - parseInt(newPatientForm.dob.split('-')[0] || '1995'),
      gender: newPatientForm.gender,
      phone: newPatientForm.phone,
      address: newPatientForm.address,
      bloodType: newPatientForm.bloodType,
      medicalHistory: newPatientForm.medicalHistory,
      emergencyContact: newPatientForm.emergencyContact,
      email: newPatientForm.email,
      profileImage: companionUser.profileImage
    };

    savePatient(companionPatient);
    setShowAddPatient(false);
    triggerToast(`Patient ${newPatientForm.fullName} admitted to clinical ledger directories.`);
  };

  const handleEditPatientSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    savePatient(editingPatient);
    setEditingPatient(null);
    triggerToast(`Patient medical file for ${editingPatient.fullName} saved.`);
  };

  const handleDeletePatient = (uid: string) => {
    if (confirmAction("Are you sure you want to dismiss this patient record from clinic registry?")) {
      deletePatient(uid);
      triggerToast('Patient record deleted successfully.');
    }
  };

  // Handlers for Appointments
  const handleAddApptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const docObj = doctors.find(d => d.uid === newApptForm.doctorId);
    const patObj = patients.find(p => p.uid === newApptForm.patientId);

    if (!docObj || !patObj) {
      triggerToast('Error: Invalid assigned clinic participants chosen.', 'error');
      return;
    }

    const appt: Appointment = {
      id: 'APT-' + Math.floor(10000 + Math.random() * 90000),
      patientId: patObj.uid,
      patientName: patObj.fullName,
      doctorId: docObj.uid,
      doctorName: docObj.fullName,
      date: newApptForm.date,
      time: newApptForm.time,
      status: 'Pending',
      notes: newApptForm.notes,
      symptoms: newApptForm.symptoms
    };

    saveAppointment(appt);
    setShowAddAppt(false);
    triggerToast(`Appointment booked successfully for ${patObj.fullName}.`);
  };

  const handleUpdateApptStatus = (id: string, newStatus: 'Pending' | 'Approved' | 'Completed' | 'Cancelled') => {
    const original = appointments.find(a => a.id === id);
    if (!original) return;
    const updated = { ...original, status: newStatus };
    saveAppointment(updated);
    triggerToast(`Appointment status updated to ${newStatus}.`);
    triggerNotification(original.patientId, 'Clinical Appointment Update', `Your medical session has been ${newStatus}.`, newStatus === 'Approved' ? 'success' : 'info');
  };

  const handleSaveApptEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppt) return;
    saveAppointment(editingAppt);
    setEditingAppt(null);
    triggerToast(`Schedule for appointment ${editingAppt.id} saved.`);
  };

  // Handlers for Billing Invoice
  const handleAddInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patObj = patients.find(p => p.uid === newInvoiceForm.patientId);
    if (!patObj) return;

    const invoice: BillingInvoice = {
      id: 'INV-' + Math.floor(10000 + Math.random() * 90000),
      invoiceNumber: 'INV-' + Math.floor(10000 + Math.random() * 90000),
      patientId: patObj.uid,
      patientName: patObj.fullName,
      service: newInvoiceForm.service,
      amount: Number(newInvoiceForm.amount),
      paymentMethod: newInvoiceForm.paymentMethod,
      status: newInvoiceForm.status,
      date: new Date().toISOString().split('T')[0]
    };

    saveBillingInvoice(invoice);
    setShowAddInvoice(false);
    triggerToast(`Invoice ${invoice.invoiceNumber} drafted successfully.`);
  };

  return (
    <div className="admin-light-theme-scope min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col min-[992px]:flex-row relative">
      
      {/* MOBILE TOP BAR HEADER (< 992px) */}
      <header className="min-[992px]:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md w-full shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Toggle admin navigation menu"
            id="mobile-menu-trigger"
            className="p-1.5 rounded-lg border border-slate-800 text-slate-200 hover:bg-slate-805 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-sans font-extrabold text-slate-100 text-xs tracking-wider uppercase">
            ☰ Admin Dashboard
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
            Admin
          </span>
        </div>
      </header>

      {/* SHARED CLINIC RESPONSIVE SIDEBAR */}
      <Sidebar 
        role="Admin"
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sessionUser={sessionUser}
        onNavigate={onNavigate}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* DYNAMIC SCREEN WORKSPACE MAIN VIEWPORT */}
      <section className="flex-grow p-6 sm:p-8 lg:p-10 z-10 overflow-y-auto max-w-7xl mx-auto w-full relative">
        
        {/* TOAST PANEL BAR ALERT */}
        {toast && (
          <div className={`fixed bottom-5 right-5 z-50 rounded-2xl px-5 py-3 border text-xs font-sans font-semibold shadow-lg flex items-center space-x-2 transition-all animate-bounce ${toast.type === 'success' ? 'bg-teal-950 border-teal-500/30 text-teal-300' : 'bg-rose-950 border-rose-500/30 text-rose-300'}`}>
            <span className="h-2 w-2 rounded-full bg-current animate-ping"></span>
            <span>{toast.message}</span>
          </div>
        )}

        {/* TOP MEDICAL PORTAL HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white border border-slate-250/50 p-6 rounded-3xl shadow-sm">
          <div>
            <div className="flex items-center space-x-2 text-teal-650 font-bold text-xs uppercase tracking-wider mb-1">
              <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
              <span>Clinic Portal &bull; Central Management</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
              Welcome, <span className="font-bold text-slate-800 text-sm">{sessionUser.fullName}</span> &nbsp;&bull;&nbsp; Manage clinic operations, users, appointments, billing, and reports.
            </p>
          </div>
          
          <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-2.5 text-xs text-slate-600 font-medium">
            <span className="h-2 w-2 bg-teal-500 rounded-full animate-pulse shadow-[0_0_8px_#14b8a6]"></span>
            <span>Clinic Hours &bull; Mon-Fri 09:00 - 18:00</span>
          </div>
        </div>

        {/* TAB 1: OVERVIEW CONTROL SCREEN */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* STATS MATRIX BENTO CONTAINER */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              
              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl text-left shadow-sm hover:shadow transition-all">
                <div className="flex items-center justify-between opacity-80 mb-3">
                  <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Total Patients</span>
                  <Users className="h-5 w-5 text-teal-600 bg-teal-50 p-1 rounded-lg" />
                </div>
                <span className="block text-3xl font-black text-slate-900">{totalPatients}</span>
                <span className="text-[10px] text-slate-500 font-medium block mt-1">Registered records</span>
              </div>

              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl text-left shadow-sm hover:shadow transition-all">
                <div className="flex items-center justify-between opacity-80 mb-3">
                  <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Total Doctors</span>
                  <Stethoscope className="h-5 w-5 text-indigo-600 bg-indigo-50 p-1 rounded-lg" />
                </div>
                <span className="block text-3xl font-black text-slate-900">{totalDoctors}</span>
                <span className="text-[10px] text-slate-500 font-medium block mt-1">Active clinicians</span>
              </div>

              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl text-left shadow-sm hover:shadow transition-all">
                <div className="flex items-center justify-between opacity-80 mb-3">
                  <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Receptionists</span>
                  <User className="h-5 w-5 text-cyan-600 bg-cyan-50 p-1 rounded-lg" />
                </div>
                <span className="block text-3xl font-black text-slate-900">{totalReceptionists}</span>
                <span className="text-[10px] text-slate-500 font-medium block mt-1">Registrars directory</span>
              </div>

              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl text-left shadow-sm hover:shadow transition-all">
                <div className="flex items-center justify-between opacity-80 mb-3">
                  <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Total Appointments</span>
                  <Calendar className="h-5 w-5 text-emerald-600 bg-emerald-50 p-1 rounded-lg" />
                </div>
                <span className="block text-3xl font-black text-slate-900">{totalAppointmentsCount}</span>
                <span className="text-[10px] text-slate-500 font-medium block mt-1">All-time bookings</span>
              </div>

              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl text-left shadow-sm hover:shadow transition-all">
                <div className="flex items-center justify-between opacity-80 mb-3">
                  <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Today's Appointments</span>
                  <Clock className="h-5 w-5 text-amber-600 bg-amber-50 p-1 rounded-lg" />
                </div>
                <span className="block text-3xl font-black text-amber-650">{todayAppointments.length}</span>
                <span className="text-[10px] text-slate-500 font-medium block mt-1">Scheduled today</span>
              </div>

              <div className="bg-teal-50 border border-teal-150 p-5 rounded-2xl text-left shadow-sm hover:shadow transition-all">
                <div className="flex items-center justify-between opacity-85 mb-3">
                  <span className="text-[11px] uppercase font-bold text-teal-850 tracking-wider">Revenue Overview</span>
                  <DollarSign className="h-5 w-5 text-teal-700 bg-white p-1 rounded-lg shadow-sm" />
                </div>
                <span className="block text-3xl font-black text-teal-900">${revenueOverview}</span>
                <span className="text-[10px] text-teal-750 font-medium block mt-1">Invoiced Paid sum</span>
              </div>

            </div>

            {/* APPOINTMENTS LIST PANEL */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-6 text-left shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 mb-4 gap-2">
                <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Activity className="h-4.5 w-4.5 text-teal-600" />
                  <span>ACTIVE APPOINTMENTS & CLINIC WAITLIST</span>
                </h2>
                <div className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                  Showing 5 Recent Bookings
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-500 uppercase border-b border-slate-100 text-[10px] tracking-wider bg-slate-50/50">
                      <th className="py-3 px-3">Appointment ID</th>
                      <th className="py-3 px-3">Patient Name</th>
                      <th className="py-3 px-3">Doctor Name</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Appointment Date</th>
                      <th className="py-3 px-3">Time</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {appointments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400 italic">
                          No active clinic appointments logged inside system registry.
                        </td>
                      </tr>
                    ) : (
                      appointments.slice(0, 5).map((appt) => {
                        const associatedDoctor = doctors.find(d => d.uid === appt.doctorId || d.fullName === appt.doctorName);
                        const displayDept = associatedDoctor?.department || associatedDoctor?.specialty || "General Clinic";
                        
                        return (
                          <tr key={appt.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-3 text-[11px] font-mono font-bold text-teal-600">{appt.id}</td>
                            <td className="py-3 px-3 font-semibold text-slate-900">{appt.patientName}</td>
                            <td className="py-3 px-3 text-slate-750 font-medium">{appt.doctorName}</td>
                            <td className="py-3 px-3 text-slate-600">
                              <span className="p-1 px-2 border border-slate-200 font-medium text-[10px] rounded bg-slate-50 text-slate-700 capitalize">
                                {displayDept}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-600">{appt.date}</td>
                            <td className="py-3 px-3 text-slate-600 font-semibold">{appt.time}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                appt.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                                appt.status === 'Completed' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                appt.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 
                                'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {appt.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end space-x-1.5 flex-wrap gap-y-1">
                                <button 
                                  onClick={() => setSelectedUser({ uid: appt.patientId, fullName: appt.patientName, role: 'Patient', email: '', phone: '', gender: 'Male', dob: '', address: '' })}
                                  className="px-2 py-1 border border-slate-200 rounded-lg text-slate-600 bg-white hover:bg-slate-50 text-[10px] font-semibold flex items-center gap-1 transition-all"
                                  title="View Details"
                                >
                                  <Eye className="h-3 w-3 text-slate-400" /> View
                                </button>
                                
                                {appt.status === 'Pending' && (
                                  <button 
                                    onClick={() => handleUpdateApptStatus(appt.id, 'Approved')}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all"
                                    title="Approve Appointment"
                                  >
                                    <Check className="h-3 w-3" /> Approve
                                  </button>
                                )}

                                {appt.status !== 'Cancelled' && appt.status !== 'Completed' && (
                                  <button 
                                    onClick={() => handleUpdateApptStatus(appt.id, 'Cancelled')}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all"
                                    title="Cancel"
                                  >
                                    <X className="h-3 w-3" /> Cancel
                                  </button>
                                )}

                                <button 
                                  onClick={() => setEditingAppt(appt)}
                                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all"
                                  title="Reschedule"
                                >
                                  <Edit className="h-3 w-3 text-slate-400" /> Reschedule
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: USER MANAGEMENT SPREADSHEET */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-fadeIn text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">User Management Directory</h2>
                <p className="text-xs text-slate-500 font-medium">Verify credentials, medical staff categories, system roles, and account status updates.</p>
              </div>
              <div className="w-full sm:w-auto relative">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                <input 
                  type="text" 
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter by name, email or role..."
                  className="w-full sm:w-64 bg-white border border-slate-200/80 pl-10 pr-4 py-2 text-xs rounded-xl focus:outline-none focus:border-teal-500 text-slate-800"
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/75 text-slate-500 uppercase text-[10px] border-b border-slate-100 font-bold tracking-wider">
                    <tr>
                      <th className="p-4">User Details</th>
                      <th className="p-4">Email Address</th>
                      <th className="p-4">Phone Number</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4">Clearance Role</th>
                      <th className="p-4 text-center">Account Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-slate-400 italic">No clinic user profiles found matching filters.</td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u.uid} className={`hover:bg-slate-50/50 transition-colors ${!u.isActive ? 'opacity-55 bg-slate-50/30' : ''}`}>
                          <td className="p-4 flex items-center space-x-2.5">
                            <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center font-bold text-xs shrink-0">
                              {u.fullName ? u.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'US'}
                            </div>
                            <div>
                              <span className="block font-bold text-slate-900">{u.fullName}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">ID: {u.uid.substring(0, 8)}</span>
                            </div>
                          </td>
                          <td className="p-4 text-slate-600 font-medium">{u.email}</td>
                          <td className="p-4 text-slate-600">{u.phone || 'N/A'}</td>
                          <td className="p-4 text-slate-500 font-medium">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="p-4">
                            <select 
                              value={u.role}
                              onChange={(e) => handleChangeRole(u, e.target.value as Role)}
                              className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:border-teal-500"
                            >
                              <option value="Admin">Admin</option>
                              <option value="Doctor">Doctor</option>
                              <option value="Receptionist">Receptionist</option>
                              <option value="Patient">Patient</option>
                            </select>
                          </td>
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => handleToggleActive(u)}
                              className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all ${
                                u.isActive 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {u.isActive ? 'Active' : 'Suspended'}
                            </button>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button 
                                onClick={() => setSelectedUser(u)}
                                className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:text-teal-600 hover:bg-slate-50 transition-all"
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => setEditingUser(u)}
                                className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all"
                                title="Edit user profile"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(u.uid)}
                                className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-slate-50 transition-all"
                                title="Delete user profile"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PATIENTS WORKSPACE */}
        {activeTab === 'patients' && (
          <div className="space-y-6 animate-fadeIn text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-mono font-bold text-slate-100">Patient Clinical File Ledgers</h2>
                <p className="text-[10px] text-slate-450 font-mono">Verify biological data, blood metrics, and historic histories</p>
              </div>
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                  <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                  <input 
                    type="text" 
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search medical reference ID..."
                    className="w-full sm:w-64 bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 text-xs font-mono rounded-xl focus:outline-none"
                  />
                </div>
                <button 
                  onClick={() => setShowAddPatient(true)}
                  className="rounded-xl bg-emerald-500 text-slate-950 font-mono font-bold text-xs px-4 py-2 hover:bg-emerald-600 flex items-center space-x-1.5 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Admit Patient</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                <table className="w-full text-xs font-mono text-left">
                  <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-4">Medical Record Name</th>
                      <th className="p-4">Clinics Code ID</th>
                      <th className="p-4">Contact Phone</th>
                      <th className="p-4">Biomark Blood</th>
                      <th className="p-4">Residential Address</th>
                      <th className="p-4 text-right">Registry Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {filteredPatients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 italic">No patient records admitted yet.</td>
                      </tr>
                    ) : (
                      filteredPatients.map(p => (
                        <tr key={p.uid}>
                          <td className="p-4 flex items-center space-x-2.5">
                            <div className="h-8.5 w-8.5 rounded-lg bg-slate-850 text-slate-400 border border-slate-800 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                              {p.fullName ? p.fullName.split(' ').map(nBy => nBy[0]).join('').slice(0, 2).toUpperCase() : 'PA'}
                            </div>
                            <div>
                              <span className="block font-bold text-slate-100">{p.fullName}</span>
                              <span className="block text-[8px] text-slate-500">Gender: {p.gender} &bull; Age: {p.age}</span>
                            </div>
                          </td>
                          <td className="p-4 text-emerald-400 font-bold">{p.patientId}</td>
                          <td className="p-4">{p.phone}</td>
                          <td className="p-4">
                            <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold px-2 py-0.5 rounded">
                              {p.bloodType || 'O+'}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400 truncate max-w-[180px]" title={p.address}>{p.address}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button 
                                onClick={() => setSelectedPatientHistory(p)}
                                className="px-2.5 py-1 text-[10px] border border-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-850 rounded-lg flex items-center space-x-1.5"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span>History Dossier</span>
                              </button>
                              <button 
                                onClick={() => setEditingPatient(p)}
                                className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDeletePatient(p.uid)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: CLINICIANS / DOCTORS MANAGEMENT */}
        {activeTab === 'doctors' && (
          <div className="space-y-6 animate-fadeIn text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Physicians & Specialists Directory</h2>
                <p className="text-xs text-slate-500 font-medium font-sans">Manage, assign, or edit professional specialty branches and doctor profiles.</p>
              </div>
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                  <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                  <input 
                    type="text" 
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    placeholder="Search by name, department, specialty..."
                    className="w-full sm:w-64 bg-white border border-slate-200/80 pl-10 pr-4 py-2 text-xs rounded-xl focus:outline-none focus:border-teal-500 text-slate-800"
                  />
                </div>
                <button 
                  onClick={() => setShowAddDoctor(true)}
                  className="rounded-xl bg-teal-600 text-white font-bold text-xs px-4 py-2.5 hover:bg-teal-700 flex items-center space-x-1.5 shrink-0 transition-all shadow-sm shadow-teal-600/10"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Doctor</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredDoctors.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400 italic bg-white border border-slate-200/50 rounded-3xl">
                  No medical doctors found matching query filters.
                </div>
              ) : (
                filteredDoctors.map(d => (
                  <div key={d.uid} className="bg-white border border-slate-200/60 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
                    <div>
                      <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-xs shrink-0 font-sans">
                            {d.fullName ? d.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'DR'}
                          </div>
                          <div>
                            <span className="block text-slate-900 font-bold text-sm">{d.fullName}</span>
                            <div className="flex items-center space-x-1.5 mt-1">
                              <span className="bg-teal-50 border border-teal-100 text-teal-750 font-bold uppercase text-[9px] px-2 py-0.5 rounded">
                                {d.specialty}
                              </span>
                              <span className="bg-indigo-50 border border-indigo-100 text-indigo-750 font-bold uppercase text-[9px] px-2 py-0.5 rounded capitalize">
                                {d.department || "Internal Medicine"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-slate-500 font-mono text-[10px] font-bold bg-slate-50 px-2.5 py-1 border border-slate-200 rounded-lg">
                          Reg: {d.doctorId}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-slate-650">
                        <p><span className="text-slate-400 font-medium">Experience Level:</span> <strong className="text-slate-800 font-semibold">{d.experience}</strong></p>
                        <p><span className="text-slate-400 font-medium">Contact Security:</span> <strong className="text-slate-700">{d.email} &bull; {d.phone}</strong></p>
                        <p><span className="text-slate-400 font-medium">Duty Availability:</span> <strong className="text-teal-600 font-semibold">{d.availability?.join(', ') || 'No Designated Days'}</strong></p>
                        {d.bio && <p className="text-slate-500 italic text-[11px] border-t border-slate-100 pt-3 mt-3 leading-relaxed">&ldquo; {d.bio} &rdquo;</p>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-5">
                      <button 
                        onClick={() => setSelectedDoctorSchedule(d)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-[10px] text-slate-600 font-semibold hover:text-teal-600 hover:bg-teal-50 hover:border-teal-100 rounded-lg flex items-center space-x-1 transition-all"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>Duty Scheduler</span>
                      </button>

                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => setEditingDoctor(d)}
                          className="p-1.5 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
                          title="Edit Profile"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteDoctorRecord(d.uid)}
                          className="p-1.5 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete Record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: APPOINTMENTS VIEW */}
        {activeTab === 'appointments' && (
          <div className="space-y-6 animate-fadeIn text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-mono font-bold text-slate-100">Clinic Consult Appointment Registry</h2>
                <p className="text-[10px] text-slate-450 font-mono">Reschedule, assign board doctors, or cancel admissions sessions</p>
              </div>
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                  <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                  <input 
                    type="text" 
                    value={apptSearch}
                    onChange={(e) => setApptSearch(e.target.value)}
                    placeholder="Search by state or patient..."
                    className="w-full sm:w-64 bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 text-xs font-mono rounded-xl focus:outline-none"
                  />
                </div>
                <button 
                  onClick={() => setShowAddAppt(true)}
                  className="rounded-xl bg-emerald-500 text-slate-950 font-mono font-bold text-xs px-4 py-2 hover:bg-emerald-600 flex items-center space-x-1.5 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Book Appointment</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
              <table className="w-full text-xs font-mono text-left">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[9px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-4">APT ID</th>
                    <th className="p-4">Outpatient Identity</th>
                    <th className="p-4">Assigned Doctor Specialist</th>
                    <th className="p-4">Registry Date Slot</th>
                    <th className="p-4">Symptoms complaints</th>
                    <th className="p-4">Security State</th>
                    <th className="p-4 text-right">Commands</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 italic">No appointments booked within clinic schedule blocks.</td>
                    </tr>
                  ) : (
                    filteredAppointments.map(a => (
                      <tr key={a.id}>
                        <td className="p-4 text-emerald-450 font-bold">{a.id}</td>
                        <td className="p-4 font-bold text-slate-100">{a.patientName}</td>
                        <td className="p-4 text-teal-400">{a.doctorName}</td>
                        <td className="p-4 font-mono text-[11px]">{a.date} &nbsp; {a.time}</td>
                        <td className="p-4 italic text-slate-400">{a.symptoms || 'Routine clinic consult file.'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${a.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : a.status === 'Completed' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : a.status === 'Cancelled' ? 'bg-rose-500/15 text-rose-450 border border-rose-500/20' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button 
                              onClick={() => setEditingAppt(a)}
                              className="p-1.5 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => {
                                if (confirmAction("Dismiss this appointment from queue ledger?")) {
                                  deleteAppointment(a.id);
                                  triggerToast('Appointment records cleared.');
                                }
                              }}
                              className="p-1.5 border border-slate-800 text-slate-400 hover:text-rose-500 hover:bg-slate-850 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: BILLING SECTION */}
        {activeTab === 'billing' && (
          <div className="space-y-6 animate-fadeIn text-left">
            <div className="flex justify-between items-center bg-emerald-950/20 border border-emerald-500/20 p-6 rounded-3xl">
              <div>
                <h3 className="text-slate-300 font-mono text-xs uppercase tracking-wider font-bold">Total Audited Paid Cash Flow</h3>
                <span className="block text-4xl font-extrabold font-mono text-emerald-400 mt-1">${revenueOverview}</span>
              </div>
              <button 
                onClick={() => setShowAddInvoice(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-mono font-bold text-xs rounded-xl px-5 py-3 cursor-pointer"
              >
                Draft New Invoice
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
              <table className="w-full text-xs font-mono text-left">
                <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-4">Invoice Ledger</th>
                    <th className="p-4">Invoiced Patient</th>
                    <th className="p-4">Clinic Service Div</th>
                    <th className="p-4">Net Total Charge</th>
                    <th className="p-4">Payment Method</th>
                    <th className="p-4">Invoiced Date</th>
                    <th className="p-4 text-right">Ledge State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {billingInvoices.map(invoice => (
                    <tr key={invoice.id}>
                      <td className="p-4 text-emerald-450 font-bold">{invoice.invoiceNumber}</td>
                      <td className="p-4 font-bold text-slate-100">{invoice.patientName}</td>
                      <td className="p-4 text-teal-300">{invoice.service}</td>
                      <td className="p-4 font-bold text-slate-50">${invoice.amount}</td>
                      <td className="p-4">{invoice.paymentMethod}</td>
                      <td className="p-4">{invoice.date}</td>
                      <td className="p-4 text-right">
                        <span className={`px-2.5 py-1 text-[9px] rounded font-bold ${invoice.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: REPORTS & ANALYTICS */}
        {activeTab === 'reports' && (() => {
          // Dynamic calculation helper data
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          
          const bookingCounts = months.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as Record<string, number>);
          const revenueCounts = months.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as Record<string, number>);
          
          appointments.forEach(a => {
            if (!a.date) return;
            let mIdx = -1;
            if (a.date.includes('-')) {
              const parts = a.date.split('-');
              if (parts.length >= 2) mIdx = parseInt(parts[1], 10) - 1;
            } else if (a.date.includes('/')) {
              const parts = a.date.split('/');
              if (parts.length >= 1) mIdx = parseInt(parts[0], 10) - 1;
            }
            if (mIdx >= 0 && mIdx < 12) {
              bookingCounts[months[mIdx]]++;
            } else {
              bookingCounts["Jun"]++;
            }
          });

          billingInvoices.forEach(inv => {
            if (!inv.date || inv.status !== 'Paid') return;
            let mIdx = -1;
            if (inv.date.includes('-')) {
              const parts = inv.date.split('-');
              if (parts.length >= 2) mIdx = parseInt(parts[1], 10) - 1;
            } else if (inv.date.includes('/')) {
              const parts = inv.date.split('/');
              if (parts.length >= 1) mIdx = parseInt(parts[0], 10) - 1;
            }
            const amt = typeof inv.amount === 'number' ? inv.amount : parseFloat(inv.amount) || 0;
            if (mIdx >= 0 && mIdx < 12) {
              revenueCounts[months[mIdx]] += amt;
            } else {
              revenueCounts["Jun"] += amt;
            }
          });

          const monthlyAppointmentsData = months.map(m => ({ month: m, Appointments: bookingCounts[m] }));
          const monthlyRevenueData = months.map(m => ({ month: m, Revenue: revenueCounts[m] }));

          // Top Doctors
          const doctorCountsMap: Record<string, number> = {};
          appointments.forEach(a => {
            const name = a.doctorName || "Unknown Doctor";
            doctorCountsMap[name] = (doctorCountsMap[name] || 0) + 1;
          });
          const topDoctorsData = Object.entries(doctorCountsMap)
            .map(([name, Appointments]) => ({ name: name.replace("Dr. ", ""), Appointments }))
            .sort((a, b) => b.Appointments - a.Appointments)
            .slice(0, 5);

          // Department performance data
          const deptCountsMap: Record<string, number> = {
            "Dental": 0, "Dermatology": 0, "Pediatrics": 0, "Cardiology": 0, "Internal Medicine": 0
          };
          appointments.forEach(a => {
            const associatedDoctor = doctors.find(d => d.uid === a.doctorId || d.fullName === a.doctorName);
            const dept = associatedDoctor?.department || associatedDoctor?.specialty || "Internal Medicine";
            deptCountsMap[dept] = (deptCountsMap[dept] || 0) + 1;
          });
          const deptPerformanceData = Object.entries(deptCountsMap).map(([department, Bookings]) => ({
            department,
            Bookings
          }));

          const PIE_COLORS = ['#0d9488', '#4f46e5', '#0ea5e9', '#f59e0b', '#ec4899'];

          return (
            <div className="space-y-8 animate-fadeIn text-left">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Reports & Analytics</h2>
                <p className="text-xs text-slate-500 font-medium">Performance, booking trajectories, clinician demand, and clinic revenue tracking analytics.</p>
              </div>

              {/* QUICK KEY FACT CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/60 p-4 rounded-2xl">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Approved Appointments</span>
                  <span className="text-2xl font-black text-emerald-605 mt-1 block">
                    {appointments.filter(a => a.status === 'Approved').length}
                  </span>
                </div>
                <div className="bg-white border border-slate-200/60 p-4 rounded-2xl">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide font-sans">Completed Sessions</span>
                  <span className="text-2xl font-black text-indigo-600 mt-1 block">
                    {appointments.filter(a => a.status === 'Completed').length}
                  </span>
                </div>
                <div className="bg-white border border-slate-200/60 p-4 rounded-2xl">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide font-sans">Cancelled Appointments</span>
                  <span className="text-2xl font-black text-rose-600 mt-1 block">
                    {appointments.filter(a => a.status === 'Cancelled').length}
                  </span>
                </div>
                <div className="bg-white border border-slate-200/60 p-4 rounded-2xl">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide font-sans">Total Appointments</span>
                  <span className="text-2xl font-black text-teal-600 mt-1 block">{appointments.length}</span>
                </div>
              </div>

              {/* TWO SATELLITE PLOTS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* PLOT 1: Monthly booking count graph */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                    <span>Monthly Appointments Volume</span>
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyAppointmentsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorAppts" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                        <Area type="monotone" dataKey="Appointments" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAppts)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* PLOT 2: Revenue trajectories */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                    <span>Monthly Paid Invoiced Revenue</span>
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                        <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                        <Bar dataKey="Revenue" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* LOWER ROW: DEMAND PLOTS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* PLOT 3: Top Booked Specialists */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
                    <span>Most Booked Doctors (Top 5)</span>
                  </h3>
                  {topDoctorsData.length === 0 ? (
                    <div className="h-72 flex items-center justify-center text-slate-400 italic text-xs">
                      No appointment book records active to list of doctor demands.
                    </div>
                  ) : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topDoctorsData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                          <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} width={80} />
                          <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                          <Bar dataKey="Appointments" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* PLOT 4: Department appointment distribution */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                    <span>Department Performance Overview</span>
                  </h3>
                  <div className="h-72 flex flex-col sm:flex-row items-center justify-around">
                    <div className="h-56 w-56 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={deptPerformanceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="Bookings"
                          >
                            {deptPerformanceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2.5 max-w-xs w-full">
                      {deptPerformanceData.map((d, index) => {
                        const totalAppts = appointments.length || 1;
                        const pct = Math.round((d.Bookings / totalAppts) * 100);
                        return (
                          <div key={d.department} className="flex items-center justify-between text-xs font-semibold text-slate-700">
                            <div className="flex items-center space-x-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></span>
                              <span className="truncate">{d.department}</span>
                            </div>
                            <span className="text-slate-500 font-mono font-bold">{d.Bookings} Bookings ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

        {/* TAB 8: SETTINGS CONSOLE */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fadeIn text-left max-w-xl">
            <div>
              <h2 className="text-lg font-mono font-bold text-slate-100">Superintendent Settings Console</h2>
              <p className="text-[10px] text-slate-450 font-mono">Alter general operating configurations for clinic directory keys</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">CONSOLIDATED CLINIC DIRECTORY TITLE</label>
                <input 
                  type="text" 
                  value={clinicConfig.clinicName}
                  onChange={(e) => setClinicConfig({ ...clinicConfig, clinicName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">OFFICIAL EMERGENCY HOTLINE REFERENCE</label>
                <input 
                  type="text" 
                  value={clinicConfig.emergencyHotline}
                  onChange={(e) => setClinicConfig({ ...clinicConfig, emergencyHotline: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">DUTY ACTIVE OPERATIONAL HOURS</label>
                <input 
                  type="text" 
                  value={clinicConfig.operationHours}
                  onChange={(e) => setClinicConfig({ ...clinicConfig, operationHours: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">CLINIC-WIDE ALERT BANNER MESSAGE</label>
                <textarea 
                  value={clinicConfig.alertMessage}
                  onChange={(e) => setClinicConfig({ ...clinicConfig, alertMessage: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-100 focus:outline-none leading-relaxed"
                />
              </div>

              <button 
                onClick={() => triggerToast('Clinic configurations committed to secure storage block!')}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-mono font-bold text-xs py-3 rounded-xl cursor-pointer"
              >
                COMMIT CLINIC-WIDE CONFIG DETAILS
              </button>
            </div>
          </div>
        )}

        {/* TAB 9: ADMIN CLINICIAN SCHEDULES MANAGER (Requirement 3 & 5 & 6) */}
        {activeTab === 'admin-schedule-management' && (
          <div className="space-y-6 animate-fadeIn text-left max-w-4xl">
            <div>
              <h2 className="text-lg font-mono font-bold text-slate-100">Clinical Availability Superintendent (/Admin/ManageDoctorSchedule)</h2>
              <p className="text-[10px] text-slate-450 font-mono">Select any doctor to directly manage their weekly schedules, vacations, custom rest days, and slot durations.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
              {/* Selector */}
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-wider">Configure Doctor Target</label>
                <select
                  value={adminSelectedDoctorId}
                  onChange={(e) => setAdminSelectedDoctorId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-slate-100 focus:outline-none"
                >
                  <option value="">-- Choose practitioner --</option>
                  {doctors.map(d => (
                    <option key={d.uid} value={d.uid}>
                      Dr. {d.fullName} ({d.specialty || 'General Practice'})
                    </option>
                  ))}
                </select>
              </div>

              {adminSelectedDoctorId ? (
                <form onSubmit={handleAdminSaveDoctorSchedule} className="space-y-6 pt-4 border-t border-slate-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Booking Parameters & Vacation Mode */}
                    <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 space-y-4">
                      <h4 className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">Clinic Slot Specs</h4>
                      
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase">Appointment Duration</label>
                        <select
                          value={adminDocApptDuration}
                          onChange={(e) => setAdminDocApptDuration(parseInt(e.target.value, 10))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                        >
                          <option value={15}>15 Minutes Slot Duration</option>
                          <option value={20}>20 Minutes Slot Duration</option>
                          <option value={30}>30 Minutes Slot Duration</option>
                          <option value={45}>45 Minutes Slot Duration</option>
                          <option value={60}>60 Minutes (1 hour) Slot Duration</option>
                        </select>
                      </div>

                      <div className="pt-3 border-t border-slate-800">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div>
                            <span className="block text-xs font-mono font-bold text-slate-200">Force Vacation Mode</span>
                            <span className="block text-[9px] text-slate-450 font-mono">Disables appointments booking for all days automatically.</span>
                          </div>
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={adminDocVacationMode}
                              onChange={(e) => setAdminDocVacationMode(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500 animate-slide"></div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Holidays rest days */}
                    <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 space-y-4">
                      <h4 className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">Custom Rest / Out of Office Days</h4>
                      
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input
                            type="date"
                            value={adminNewUnavailableDay}
                            onChange={(e) => setAdminNewUnavailableDay(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs font-mono text-slate-200 focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!adminNewUnavailableDay) return;
                            if (adminDocUnavailableDays.includes(adminNewUnavailableDay)) {
                              triggerToast('Day is already indexed as off-duty', 'error');
                              return;
                            }
                            setAdminDocUnavailableDays([...adminDocUnavailableDays, adminNewUnavailableDay].sort());
                            setAdminNewUnavailableDay('');
                            triggerToast('Holiday absence day registered.');
                          }}
                          className="px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-mono text-xs font-black rounded-xl transition-all"
                        >
                          Add rest day
                        </button>
                      </div>

                      <div>
                        <span className="block text-[9px] font-mono font-bold text-slate-550 uppercase tracking-wider mb-1.5 font-sans">Marked holidays ({adminDocUnavailableDays.length})</span>
                        {adminDocUnavailableDays.length === 0 ? (
                          <p className="text-[10px] text-slate-500 italic font-mono">No specific REST days logged.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-950 border border-slate-850 rounded-lg">
                            {adminDocUnavailableDays.map(dayStr => (
                              <span key={dayStr} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-950 border border-rose-900/30 text-[9px] font-mono text-rose-300 font-bold rounded">
                                {dayStr}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdminDocUnavailableDays(adminDocUnavailableDays.filter(d => d !== dayStr));
                                  }}
                                  className="text-rose-400 hover:text-rose-100 font-sans font-bold"
                                >
                                  &times;
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* WEEKLY TIMELINE GRID */}
                  <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 space-y-4">
                    <h4 className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest border-b border-slate-850 pb-2 mb-2">Weekly Availability Matrix</h4>
                    
                    <div className="space-y-3">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                        const sched = adminDocWeeklySchedule[day] || { isOff: true, startTime: '09:00 AM', endTime: '05:00 PM', breakStartTime: '12:00 PM', breakEndTime: '01:00 PM' };
                        
                        const handleDayUpdate = (fields: Partial<typeof sched>) => {
                          setAdminDocWeeklySchedule({
                            ...adminDocWeeklySchedule,
                            [day]: { ...sched, ...fields }
                          });
                        };

                        const TIME_OPTIONS = [
                          '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM',
                          '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
                          '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
                          '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM'
                        ];

                        return (
                          <div key={day} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-850 bg-slate-900/40 hover:bg-slate-900/80 transition-colors">
                            
                            {/* Day info */}
                            <div className="flex items-center justify-between lg:w-40 shrink-0">
                              <div>
                                <span className="block text-xs font-mono font-black text-slate-100">{day}</span>
                                <span className={`inline-block text-[8px] font-mono font-black uppercase rounded-full px-1.5 py-0.5 mt-0.5 ${sched.isOff ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                  {sched.isOff ? 'OFF DUTY' : 'ON-DUTY SHIFT'}
                                </span>
                              </div>
                              <div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!sched.isOff}
                                    onChange={(e) => handleDayUpdate({ isOff: !e.target.checked })}
                                    className="sr-only peer"
                                  />
                                  <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                              </div>
                            </div>

                            {/* Options */}
                            {!sched.isOff ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
                                <div>
                                  <span className="block text-[8px] font-mono text-slate-500 uppercase mb-0.5">Shift Starts</span>
                                  <select
                                    value={sched.startTime}
                                    onChange={(e) => handleDayUpdate({ startTime: e.target.value })}
                                    className="w-full text-[11px] font-mono p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                                  >
                                    {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <span className="block text-[8px] font-mono text-slate-500 uppercase mb-0.5">Shift Ends</span>
                                  <select
                                    value={sched.endTime}
                                    onChange={(e) => handleDayUpdate({ endTime: e.target.value })}
                                    className="w-full text-[11px] font-mono p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                                  >
                                    {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <span className="block text-[8px] font-mono text-slate-500 uppercase mb-0.5">Break Starts</span>
                                  <select
                                    value={sched.breakStartTime || '12:00 PM'}
                                    onChange={(e) => handleDayUpdate({ breakStartTime: e.target.value })}
                                    className="w-full text-[11px] font-mono p-1.5 bg-slate-950 border border-slate-850 rounded-lg text-slate-200 focus:outline-none"
                                  >
                                    {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <span className="block text-[8px] font-mono text-slate-500 uppercase mb-0.5">Break Ends</span>
                                  <select
                                    value={sched.breakEndTime || '01:00 PM'}
                                    onChange={(e) => handleDayUpdate({ breakEndTime: e.target.value })}
                                    className="w-full text-[11px] font-mono p-1.5 bg-slate-950 border border-slate-850 rounded-lg text-slate-200 focus:outline-none"
                                  >
                                    {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center justify-center py-2 text-xs text-slate-500 italic font-mono">
                                Rest period. Clinician is offline.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-mono font-bold text-xs px-8 py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Save className="h-4 block w-4" />
                      SAVE DOCTOR PRACTICE TIMES & VACATIONS
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl text-slate-500 font-mono text-xs">
                  Awaiting doctor targets validation selection.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: DOCTOR DEPARTMENT REQUESTS REVIEW */}
        {activeTab === 'doctor-requests' && (() => {
          // Verify authority check mimicking [Authorize(Roles = "Admin")]
          if (sessionUser.role !== 'Admin') {
            return (
              <div id="auth-gate-denied" className="bg-white border border-slate-200 p-8 rounded-3xl text-center space-y-4 shadow-sm animate-fadeIn text-slate-800">
                <div className="h-16 w-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold font-sans text-slate-900">[Authorize(Roles = "Admin")] Access Denied</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto font-sans leading-relaxed">
                  Only Admin accounts are allowed to review doctor department change requests.
                </p>
              </div>
            );
          }

          // Search filtering
          const filteredRequests = doctorRequests.filter(req => {
            const matchesSearch = req.doctorName.toLowerCase().includes(doctorSearch.toLowerCase()) || 
                                 req.doctorEmail.toLowerCase().includes(doctorSearch.toLowerCase());
            return matchesSearch;
          });

          // Stats computation
          const pendingCount = doctorRequests.filter(r => r.status === 'Pending').length;
          const approvedCount = doctorRequests.filter(r => r.status === 'Approved').length;
          const rejectedCount = doctorRequests.filter(r => r.status === 'Rejected').length;
          const totalCount = doctorRequests.length;

          return (
            <div className="space-y-6 animate-fadeIn text-left">
              {/* PAGE MAIN HEADER */}
              <div id="doctor-requests-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-mono font-bold text-slate-100">Doctor Requests</h2>
                  <p className="text-[10px] text-slate-455 font-mono">Review doctor department change requests.</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input 
                    type="text" 
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    placeholder="Search doctor name or email..."
                    className="w-full text-xs font-sans pl-9 pr-4 py-2 bg-white/70 backdrop-blur-md border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* STATS MATRIX CARDS */}
              <div id="requests-stats-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/60 p-5 rounded-2xl text-left shadow-sm hover:shadow transition-all">
                  <div className="flex items-center justify-between opacity-80 mb-3">
                    <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Pending Requests</span>
                    <Clock className="h-5 w-5 text-yellow-600 bg-yellow-50 p-1 rounded-lg" />
                  </div>
                  <span className="block text-3xl font-black text-slate-900">{pendingCount}</span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-1">Pending review</span>
                </div>

                <div className="bg-white border border-slate-200/60 p-5 rounded-2xl text-left shadow-sm hover:shadow transition-all">
                  <div className="flex items-center justify-between opacity-80 mb-3">
                    <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Approved Requests</span>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 bg-emerald-50 p-1 rounded-lg" />
                  </div>
                  <span className="block text-3xl font-black text-slate-900">{approvedCount}</span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-1">Completed transfers</span>
                </div>

                <div className="bg-white border border-slate-200/60 p-5 rounded-2xl text-left shadow-sm hover:shadow transition-all">
                  <div className="flex items-center justify-between opacity-80 mb-3">
                    <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Rejected Requests</span>
                    <X className="h-5 w-5 text-rose-600 bg-rose-50 p-1 rounded-lg" />
                  </div>
                  <span className="block text-3xl font-black text-slate-900">{rejectedCount}</span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-1">Declined transfers</span>
                </div>

                <div className="bg-white border border-slate-200/60 p-5 rounded-2xl text-left shadow-sm hover:shadow transition-all">
                  <div className="flex items-center justify-between opacity-80 mb-3">
                    <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Total Requests</span>
                    <GitPullRequest className="h-5 w-5 text-indigo-600 bg-indigo-50 p-1 rounded-lg" />
                  </div>
                  <span className="block text-3xl font-black text-slate-900">{totalCount}</span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-1">All processed & pending</span>
                </div>
              </div>

              {/* TABLE CONTAINER */}
              <div className="bg-white border border-slate-200/70 rounded-3xl p-5 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                     <thead>
                       <tr className="text-slate-500 uppercase border-b border-slate-100 text-[10px] tracking-wider bg-slate-50/50">
                         <th className="py-3 px-3">Doctor Name</th>
                         <th className="py-3 px-3">Current Department</th>
                         <th className="py-3 px-3">Requested Department</th>
                         <th className="py-3 px-3">Request Date</th>
                         <th className="py-3 px-3">Status</th>
                         <th className="py-3 px-3 text-right">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 font-sans">
                       {filteredRequests.length === 0 ? (
                         <tr>
                           <td colSpan={6} className="py-10 text-center text-slate-400 italic">
                             No doctor department change requests located in database.
                           </td>
                         </tr>
                       ) : (
                         filteredRequests.map((req) => (
                           <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                             <td className="py-3.5 px-3 font-semibold text-slate-800">
                               <span className="block">{req.doctorName}</span>
                               <span className="text-[10px] font-normal text-slate-450 block font-mono">{req.doctorEmail}</span>
                             </td>
                             <td className="py-3.5 px-3 text-slate-600 font-medium">
                               {req.currentDepartmentName}
                             </td>
                             <td className="py-3.5 px-3 text-teal-700 font-bold">
                               {req.requestedDepartmentName}
                             </td>
                             <td className="py-3.5 px-3 text-slate-500 font-mono">
                               {new Date(req.createdAt).toLocaleDateString(undefined, {
                                 year: 'numeric',
                                 month: 'short',
                                 day: 'numeric',
                                 hour: '2-digit',
                                 minute: '2-digit'
                               })}
                             </td>
                             <td className="py-3.5 px-3">
                               <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono uppercase tracking-wide border ${
                                 req.status === 'Pending' 
                                   ? 'bg-yellow-50 text-yellow-700 border-yellow-200/50' 
                                   : req.status === 'Approved' 
                                   ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' 
                                   : 'bg-rose-50 text-rose-700 border-rose-200/50'
                               }`}>
                                 {req.status}
                               </span>
                             </td>
                             <td className="py-3.5 px-3 text-right">
                               <div className="flex items-center justify-end space-x-1.5">
                                 <button 
                                   onClick={() => {
                                     setSelectedRequest(req);
                                     setAdminRejectionNotes(req.adminNotes || '');
                                     setShowRequestDetailsModal(true);
                                   }}
                                   title="View Details"
                                   className="p-1 px-2.5 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center space-x-1"
                                 >
                                   <Eye className="h-3.5 w-3.5" />
                                   <span>Details</span>
                                 </button>
                                 {req.status === 'Pending' && (
                                   <>
                                     <button 
                                       onClick={() => handleApproveDoctorDeptRequest(req)}
                                       title="Approve Request"
                                       className="p-1 px-2.5 rounded-lg text-[10px] font-semibold text-white bg-teal-600 hover:bg-teal-700 hover:shadow-sm transition-all flex items-center space-x-1"
                                     >
                                       <Check className="h-3.5 w-3.5" />
                                       <span>Approve</span>
                                     </button>
                                     <button 
                                       onClick={() => {
                                         setSelectedRequest(req);
                                         setAdminRejectionNotes('');
                                         setShowRequestDetailsModal(true);
                                       }}
                                       title="Reject Request"
                                       className="p-1 px-2.5 rounded-lg text-[10px] font-semibold text-rose-600 border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-100 transition-all flex items-center space-x-1"
                                     >
                                       <X className="h-3.5 w-3.5" />
                                       <span>Reject</span>
                                     </button>
                                   </>
                                 )}
                               </div>
                             </td>
                           </tr>
                         ))
                       )}
                     </tbody>
                   </table>
                 </div>
               </div>
             </div>
           );
         })()}

        {/* TAB 10: ADMIN CLINICAL DEPARTMENTS MANAGER */}
        {activeTab === 'departments-management' && (() => {
          // Verify authority check mimicking [Authorize(Roles = "Admin")]
          if (sessionUser.role !== 'Admin') {
            return (
              <div id="auth-gate-denied" className="bg-white border border-slate-200 p-8 rounded-3xl text-center space-y-4 shadow-sm animate-fadeIn text-slate-800">
                <div className="h-16 w-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold font-sans text-slate-900">[Authorize(Roles = "Admin")] Access Denied</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto font-sans leading-relaxed">
                  Only Admin accounts are allowed to enter the clinic department management view. Please contact the head administrator if you believe this is an error.
                </p>
              </div>
            );
          }

          // Filter and search computation
          const filteredDepts = departments.filter((dept) => {
            const matchesSearch = dept.name.toLowerCase().includes(deptSearch.toLowerCase()) || 
                                  (dept.description && dept.description.toLowerCase().includes(deptSearch.toLowerCase()));
            const matchesStatus = deptStatusFilter === 'all' || 
                                  (deptStatusFilter === 'active' && dept.isActive !== false) ||
                                  (deptStatusFilter === 'inactive' && dept.isActive === false);
            return matchesSearch && matchesStatus;
          });

          // Function to look up all doctors matched with a department
          const getAssignedDoctors = (deptId: string, deptName: string) => {
            return doctors.filter(
              (doc) => doc.departmentId === deptId || doc.specialty?.toLowerCase() === deptName.toLowerCase()
            );
          };

          const handleCancelEdit = () => {
            setEditingDeptId(null);
            setNewDeptName('');
            setNewDeptDesc('');
            setNewDeptImageUrl('');
          };

          const handleEditClick = (dept: Department) => {
            setEditingDeptId(dept.id);
            setNewDeptName(dept.name);
            setNewDeptDesc(dept.description || '');
            setNewDeptImageUrl(dept.imageUrl || '');
            setNewDeptIsActive(dept.isActive !== false);
          };

          const handleToggleActive = (dept: Department) => {
            const updated: Department = {
              ...dept,
              isActive: dept.isActive === false ? true : false
            };
            saveDepartment(updated);
            triggerToast(`Department "${dept.name}" has been ${updated.isActive ? 'activated' : 'deactivated'}.`);
            setRefreshTrigger((prev) => prev + 1);
          };

          const handleDeleteClick = (id: string, name: string) => {
            if (confirmAction(`Are you sure you want to delete the department "${name}"?`)) {
              deleteDepartment(id);
              triggerToast(`Department "${name}" deleted.`);
              setRefreshTrigger((prev) => prev + 1);
            }
          };

          return (
            <div id="departments-management-container" className="space-y-6 animate-fadeIn text-left max-w-5xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900 font-sans">Department Management</h2>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">Create, edit, and manage clinic departments.</p>
                </div>
                <div className="mt-2 sm:mt-0 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] uppercase font-bold tracking-wide">
                  [Authorize(Roles = "Admin")] Protected Directory
                </div>
              </div>

              {/* EMPTY STATE COMPONENT */}
              {departments.length === 0 ? (
                <div id="empty-departments-splash" className="bg-white border border-slate-200 p-12 rounded-3xl text-center space-y-6 shadow-sm">
                  <div className="h-20 w-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-450 shadow-inner">
                    <Building2 className="h-10 w-10 text-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-bold font-sans text-slate-800">No departments created yet.</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-sans">
                      Start by setting up your first clinic department. You will then be able to register and assign clinicians dynamically.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Pre-fill default cardiology for smooth developer guidance
                      setNewDeptName('Cardiology');
                      setNewDeptDesc('Heart disease diagnosis, ECG, hypertension management, and cardiovascular care.');
                      triggerToast('Quick populate initialized. Enter details below!');
                      const formElem = document.getElementById('dept-form-card');
                      if (formElem) {
                        formElem.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="inline-flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-6 py-3 rounded-xl shadow-md transition-all scale-100 active:scale-95 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create First Department</span>
                  </button>
                </div>
              ) : null}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Form column (4 cols / 12) */}
                <div id="dept-form-card" className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-2.5 font-sans">
                    <Building2 className="h-4 w-4 text-teal-600" />
                    {editingDeptId ? 'Edit Department details' : 'Add Department'}
                  </h3>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newDeptName.trim()) {
                        triggerToast('Department name is required.', 'error');
                        return;
                      }

                      if (editingDeptId) {
                        const existingDept = departments.find((d) => d.id === editingDeptId);
                        const updated: Department = {
                          id: editingDeptId,
                          name: newDeptName.trim(),
                          description: newDeptDesc.trim() || 'General clinic healthcare department.',
                          imageUrl: newDeptImageUrl.trim() || undefined,
                          isActive: newDeptIsActive,
                          createdAt: existingDept?.createdAt || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        };
                        saveDepartment(updated);
                        setEditingDeptId(null);
                        setNewDeptName('');
                        setNewDeptDesc('');
                        setNewDeptImageUrl('');
                        triggerToast(`Department "${updated.name}" updated successfully!`);
                      } else {
                        const newId = 'dept-' + Math.floor(1000 + Math.random() * 9000);
                        const created: Department = {
                          id: newId,
                          name: newDeptName.trim(),
                          description: newDeptDesc.trim() || 'General clinic healthcare department.',
                          imageUrl: newDeptImageUrl.trim() || undefined,
                          isActive: true, // Default to Active
                          createdAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        };
                        saveDepartment(created);
                        setNewDeptName('');
                        setNewDeptDesc('');
                        setNewDeptImageUrl('');
                        triggerToast(`Department "${created.name}" created successfully!`);
                      }
                      setRefreshTrigger((prev) => prev + 1);
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 tracking-wide uppercase font-sans">Department Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Cardiology"
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-sans text-slate-850 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 tracking-wide uppercase font-sans">Department Description</label>
                      <textarea
                        placeholder="Heart disease diagnosis, ECG, hypertension management, and cardiovascular care."
                        value={newDeptDesc}
                        onChange={(e) => setNewDeptDesc(e.target.value)}
                        rows={4}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-sans text-slate-850 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all leading-relaxed font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 tracking-wide uppercase font-sans">Optional Department Image/Icon URL</label>
                      <input
                        type="text"
                        placeholder="e.g. https://images.unsplash.com/... or leave empty"
                        value={newDeptImageUrl}
                        onChange={(e) => setNewDeptImageUrl(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-sans text-slate-850 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all font-medium"
                      />
                    </div>

                    {editingDeptId && (
                      <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                        <input
                          type="checkbox"
                          id="edit-dept-active-toggle"
                          checked={newDeptIsActive}
                          onChange={(e) => setNewDeptIsActive(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-teal-605 focus:ring-teal-500"
                        />
                        <label htmlFor="edit-dept-active-toggle" className="text-xs text-slate-650 font-sans cursor-pointer select-none">
                          Department is Active
                        </label>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-sans font-bold text-xs py-3 rounded-xl shadow-sm transition-all text-center cursor-pointer"
                      >
                        {editingDeptId ? 'Save Changes' : 'Add Department'}
                      </button>
                      {editingDeptId && (
                        <button
                          type="button"
                          onClick={() => handleCancelEdit()}
                          className="px-4 bg-slate-150 hover:bg-slate-200 text-slate-700 font-sans font-semibold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Directory list table column (8 cols / 12) */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  {/* Search and Filters panel */}
                  <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
                    {/* Search Field */}
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Search className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search Department..."
                        value={deptSearch}
                        onChange={(e) => setDeptSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-sans text-slate-850 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all font-medium"
                      />
                    </div>

                    {/* Filter Status Selector */}
                    <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 select-none">
                      <ListFilter className="h-3.5 w-3.5 text-slate-450 ml-1" />
                      <button
                        onClick={() => setDeptStatusFilter('all')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-sans transition-all cursor-pointer ${deptStatusFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setDeptStatusFilter('active')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-sans transition-all cursor-pointer ${deptStatusFilter === 'active' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-emerald-650'}`}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => setDeptStatusFilter('inactive')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-sans transition-all cursor-pointer ${deptStatusFilter === 'inactive' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-amber-650'}`}
                      >
                        Inactive
                      </button>
                    </div>
                  </div>

                  {/* List / Table */}
                  {filteredDepts.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 font-sans text-xs">
                      No matching departments found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-150">
                      <table className="min-w-full divide-y divide-slate-150">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Department Name</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Description</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">No. of Doctors</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Created Date</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Status</th>
                            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100 text-xs">
                          {filteredDepts.map((dept) => {
                            const deptDocs = getAssignedDoctors(dept.id, dept.name);
                            const isActive = dept.isActive !== false;
                            
                            return (
                              <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors">
                                {/* Name */}
                                <td className="px-4 py-3 font-bold text-slate-900 font-sans whitespace-nowrap">
                                  <div className="flex items-center space-x-2.5">
                                    {dept.imageUrl ? (
                                      <img
                                        src={dept.imageUrl}
                                        alt={dept.name}
                                        referrerPolicy="no-referrer"
                                        className="h-8 w-8 rounded-lg object-cover border border-slate-100"
                                      />
                                    ) : (
                                      <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-650 border border-teal-100 flex items-center justify-center font-bold font-sans text-[10px] uppercase">
                                        {dept.name.slice(0, 2)}
                                      </div>
                                    )}
                                    <span>{dept.name}</span>
                                  </div>
                                </td>

                                {/* Description */}
                                <td className="px-4 py-3 text-slate-500 font-sans max-w-[150px] truncate" title={dept.description}>
                                  {dept.description}
                                </td>

                                {/* Doctors Count */}
                                <td className="px-4 py-3 text-slate-800 font-bold font-sans">
                                  {deptDocs.length}
                                </td>

                                {/* Created Date */}
                                <td className="px-4 py-3 text-slate-500 font-sans whitespace-nowrap">
                                  {dept.createdAt || 'N/A'}
                                </td>

                                {/* Status */}
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold font-sans uppercase ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                    {isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                                  <button
                                    onClick={() => setViewingDept(dept)}
                                    className="p-1 text-slate-450 hover:text-slate-800 transition-colors cursor-pointer"
                                    title="View"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={() => handleEditClick(dept)}
                                    className="p-1 text-slate-450 hover:text-teal-600 transition-colors cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={() => handleToggleActive(dept)}
                                    className={`p-1 transition-colors cursor-pointer ${isActive ? 'text-slate-400 hover:text-amber-500' : 'text-slate-400 hover:text-emerald-500'}`}
                                    title={isActive ? "Deactivate" : "Activate"}
                                  >
                                    <Power className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      setAssigningDept(dept);
                                      setSelectedDoctorIdToAssign('');
                                    }}
                                    className="p-1 text-slate-450 hover:text-teal-600 transition-colors cursor-pointer"
                                    title="Assign Doctors"
                                  >
                                    <UserPlus className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteClick(dept.id, dept.name)}
                                    className="p-1 text-slate-450 hover:text-rose-600 transition-colors cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* MODAL: VIEW DETAILS */}
              {viewingDept && (() => {
                const docRoster = getAssignedDoctors(viewingDept.id, viewingDept.name);
                return (
                  <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-205 rounded-3xl w-full max-w-md p-6 relative shadow-2xl text-left text-slate-800 animate-scaleUp font-sans">
                      <button
                        onClick={() => setViewingDept(null)}
                        className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      >
                        <X className="h-4.5 w-4.5" />
                      </button>

                      <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 mb-4">
                        {viewingDept.imageUrl ? (
                          <img
                            src={viewingDept.imageUrl}
                            alt={viewingDept.name}
                            referrerPolicy="no-referrer"
                            className="h-12 w-12 rounded-xl object-cover border border-slate-100"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-650 border border-teal-100 flex items-center justify-center font-bold text-sm uppercase">
                            {viewingDept.name.slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{viewingDept.name}</h3>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase ${viewingDept.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                            {viewingDept.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4 font-sans text-xs">
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</span>
                          <p className="text-slate-650 font-sans leading-relaxed">{viewingDept.description}</p>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Created Date</span>
                          <p className="text-slate-650 font-sans">{viewingDept.createdAt || 'N/A'}</p>
                        </div>

                        <div className="border-t border-slate-100 pt-3.5">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Assigned Doctors ({docRoster.length})</span>
                          {docRoster.length === 0 ? (
                            <p className="text-slate-450 italic p-3 text-center border border-dashed border-slate-150 rounded-xl bg-slate-50">
                              No doctors assigned to this department yet.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                              {docRoster.map((doc) => (
                                <div key={doc.uid} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200/60">
                                  <div className="flex items-center space-x-2">
                                    <img
                                      src={doc.profileImage || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=120&auto=format&fit=crop'}
                                      alt={doc.fullName}
                                      referrerPolicy="no-referrer"
                                      className="h-7 w-7 rounded-full object-cover border border-slate-150"
                                    />
                                    <span className="font-bold text-slate-850 font-sans">Dr. {doc.fullName}</span>
                                  </div>
                                  <span className="text-[9px] bg-teal-50 text-teal-700 font-bold px-2 py-0.5 rounded border border-teal-100/60 font-sans">
                                    {doc.experience || 'Specialist'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* MODAL: ASSIGN DOCTOR */}
              {assigningDept && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 relative shadow-2xl text-left text-slate-800 animate-scaleUp">
                    <button
                      onClick={() => setAssigningDept(null)}
                      className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-750 transition-colors cursor-pointer"
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>

                    <h3 className="text-xs font-black tracking-wider text-slate-500 uppercase border-b border-slate-100 pb-2 mb-4 font-sans">
                      Assign Practitioner to {assigningDept.name}
                    </h3>

                    <div className="space-y-4">
                      <p className="text-xs text-slate-500 font-sans leading-relaxed">
                        Select a clinical practitioner to register and bind them instantly to the <strong>{assigningDept.name}</strong> department.
                      </p>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 font-sans">Select Practitioner</label>
                        <select
                          value={selectedDoctorIdToAssign}
                          onChange={(e) => setSelectedDoctorIdToAssign(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-202 rounded-xl px-3 py-2.5 text-xs font-sans text-slate-800 focus:outline-none"
                        >
                          <option value="">-- Choose doctor --</option>
                          {doctors.map((doc) => {
                            const isAssigned = doc.departmentId === assigningDept.id;
                            return (
                              <option key={doc.uid} value={doc.uid} disabled={isAssigned}>
                                Dr. {doc.fullName} ({doc.specialty || 'General practice'}) {isAssigned ? ' - Mapped' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            if (!selectedDoctorIdToAssign) {
                              triggerToast('Please select a doctor.', 'error');
                              return;
                            }
                            const doctor = doctors.find(d => d.uid === selectedDoctorIdToAssign);
                            if (doctor && assigningDept) {
                              const updatedDoc = {
                                ...doctor,
                                departmentId: assigningDept.id,
                                specialty: assigningDept.name
                              };
                              // Synchronize doctor
                              saveDoctor(updatedDoc);
                              triggerToast(`Dr. ${doctor.fullName} assigned to ${assigningDept.name}!`);
                              setAssigningDept(null);
                              setSelectedDoctorIdToAssign('');
                              setRefreshTrigger((prev) => prev + 1);
                            }
                          }}
                          className="flex-1 bg-teal-650 hover:bg-teal-700 text-white font-sans font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer text-center"
                        >
                          Confirm Assignment
                        </button>
                        <button
                          onClick={() => setAssigningDept(null)}
                          className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-650 font-semibold text-xs rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      </section>

      {/* VIEW DETAILS USER SPECIFIC MODAL */}
      {selectedUser && (() => {
        const matchingPatient = patients.find(p => p.uid === selectedUser.uid || p.email.toLowerCase() === selectedUser.email.toLowerCase());
        const emergency = selectedUser.emergencyContact || matchingPatient?.emergencyContact || "None specified during registration.";
        const passwordVal = selectedUser.password || "01158698584"; // admin default or registered key
        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative font-mono text-left">
              <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-200">
                <X className="h-4.5 w-4.5" />
              </button>
              <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-800 pb-2.5 mb-4">MEMBER DOSSIER RECORD</h3>
              <div className="flex items-center space-x-3.5 mb-4 pb-3 border-b border-slate-800/50">
                <div className="h-14 w-14 rounded-2xl bg-slate-850 text-slate-400 border border-slate-800 flex items-center justify-center font-bold text-lg shrink-0 font-mono">
                  {selectedUser.fullName ? selectedUser.fullName.split(' ').map(nBy => nBy[0]).join('').slice(0, 2).toUpperCase() : 'US'}
                </div>
                <div>
                  <span className="block font-bold text-slate-50 text-sm">{selectedUser.fullName}</span>
                  <span className="text-[10px] text-teal-400">{selectedUser.role.toUpperCase()}</span>
                </div>
              </div>
              <div className="space-y-2.5 text-xs text-slate-300">
                <p><span className="text-slate-500">Security Email:</span> {selectedUser.email}</p>
                <p><span className="text-slate-500">Security Password:</span> <span className="font-bold text-teal-400">{passwordVal}</span></p>
                <p><span className="text-slate-500">Emergency Contact:</span> <span className="text-rose-450 font-bold">{emergency}</span></p>
                <p><span className="text-slate-500">Direct Contact:</span> {selectedUser.phone}</p>
                <p><span className="text-slate-500">Birth day record:</span> {selectedUser.dob}</p>
                <p><span className="text-slate-500">Gender metric:</span> {selectedUser.gender}</p>
                <p><span className="text-slate-500">Living address:</span> {selectedUser.address}</p>
                {selectedUser.specialty && <p><span className="text-slate-500">Specialty field:</span> {selectedUser.specialty}</p>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* EDIT USER SPECIFIC MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveUserEdit} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative font-mono text-left space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-800 pb-2.5">EDIT USER ATTRIBUTES</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">FULL NAME DIRECTORY</label>
                <input 
                  type="text" 
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">EMAIL SECURITY KEY</label>
                <input 
                  type="email" 
                  value={editingUser.email}
                  disabled
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs opacity-60"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">PHONE NUMBER</label>
                <input 
                  type="text" 
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">RESIDENTIAL ADDRESS</label>
                <input 
                  type="text" 
                  value={editingUser.address}
                  onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="flex space-x-2.5 pt-3">
              <button type="submit" className="flex-1 bg-emerald-500 text-slate-950 py-2 rounded-xl font-bold text-xs">
                Save Changes
              </button>
              <button type="button" onClick={() => setEditingUser(null)} className="flex-1 border border-slate-800 text-slate-400 py-2 rounded-xl text-xs">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT PATIENT SPECIFIC MODAL */}
      {editingPatient && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEditPatientSave} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative font-mono text-left space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-800 pb-2.5">EDIT BIOLOGICAL RECORD</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">PATIENT FULL NAME</label>
                <input 
                  type="text" 
                  value={editingPatient.fullName}
                  onChange={(e) => setEditingPatient({ ...editingPatient, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">BLOOD BIOMARKER</label>
                <input 
                  type="text" 
                  value={editingPatient.bloodType}
                  onChange={(e) => setEditingPatient({ ...editingPatient, bloodType: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">EMERGENCY PHONE REFERENCE</label>
                <input 
                  type="text" 
                  value={editingPatient.emergencyContact}
                  onChange={(e) => setEditingPatient({ ...editingPatient, emergencyContact: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">MEDICAL HISTORY NOTES SUMMARY</label>
                <textarea 
                  value={editingPatient.medicalHistory}
                  onChange={(e) => setEditingPatient({ ...editingPatient, medicalHistory: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs leading-relaxed"
                />
              </div>
            </div>

            <div className="flex space-x-2.5 pt-3">
              <button type="submit" className="flex-1 bg-emerald-500 text-slate-950 py-2 rounded-xl font-bold text-xs">
                Commit Changes
              </button>
              <button type="button" onClick={() => setEditingPatient(null)} className="flex-1 border border-slate-800 text-slate-400 py-2 rounded-xl text-xs">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT DOCTOR ATTENTION DETAILS MODAL */}
      {editingDoctor && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEditDoctorSave} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative font-mono text-left space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-800 pb-2.5">EDIT CLINIC DIVISION CONSUL</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">SPECIALIST FULL NAME</label>
                <input 
                  type="text" 
                  value={editingDoctor.fullName}
                  onChange={(e) => setEditingDoctor({ ...editingDoctor, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">ASSIGNED CLINICAL DEPARTMENT</label>
                <select 
                  value={editingDoctor.specialty}
                  onChange={(e) => setEditingDoctor({ ...editingDoctor, specialty: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">EXPERIENCE METRIC DIVISION</label>
                <input 
                  type="text" 
                  value={editingDoctor.experience}
                  onChange={(e) => setEditingDoctor({ ...editingDoctor, experience: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="flex space-x-2.5 pt-3">
              <button type="submit" className="flex-1 bg-emerald-500 text-slate-950 py-2 rounded-xl font-bold text-xs">
                Commit Specialist Update
              </button>
              <button type="button" onClick={() => setEditingDoctor(null)} className="flex-1 border border-slate-800 text-slate-400 py-2 rounded-xl text-xs">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT APPOINTMENT ALLOCATOR MODAL */}
      {editingAppt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveApptEdit} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative font-mono text-left space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-800 pb-2.5">EDIT VISIT SESSIONS</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">VISIT DATE STATUS</label>
                <input 
                  type="date" 
                  value={editingAppt.date}
                  onChange={(e) => setEditingAppt({ ...editingAppt, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">TIME SLOT RANGE</label>
                <input 
                  type="text" 
                  value={editingAppt.time}
                  onChange={(e) => setEditingAppt({ ...editingAppt, time: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">VISIT OUTCOME CLEARANCE</label>
                <select 
                  value={editingAppt.status}
                  onChange={(e) => setEditingAppt({ ...editingAppt, status: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350"
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-2.5 pt-3">
              <button type="submit" className="flex-1 bg-emerald-500 text-slate-950 py-2 rounded-xl font-bold text-xs font-mono">
                Reschedule Visit
              </button>
              <button type="button" onClick={() => setEditingAppt(null)} className="flex-1 border border-slate-800 text-slate-400 py-2 rounded-xl text-xs">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW PATIENT HISTORY MODAL */}
      {selectedPatientHistory && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 relative font-mono text-left max-h-[85vh] overflow-y-auto">
            <button onClick={() => setSelectedPatientHistory(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-200">
              <X className="h-4.5 w-4.5" />
            </button>
            
            <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-800 pb-2.5 mb-6 uppercase">
              PATIENT HISTORY DOSSIER: {selectedPatientHistory.fullName}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 border-b border-slate-800 pb-6">
              <div className="space-y-2 text-xs text-slate-350">
                <p><span className="text-slate-500">Record ID:</span> {selectedPatientHistory.patientId}</p>
                <p><span className="text-slate-500">Email:</span> {selectedPatientHistory.email}</p>
                <p><span className="text-slate-500">Emergency Phone:</span> {selectedPatientHistory.emergencyContact}</p>
              </div>
              <div className="space-y-1.5 text-xs text-slate-350 bg-slate-950 border border-slate-850 p-3 rounded-2xl">
                <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">Historical Medical Summary Notes</span>
                <p className="leading-relaxed whitespace-pre-wrap">{selectedPatientHistory.medicalHistory || 'No pre-existing notes.'}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-100 uppercase mb-3 flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-teal-400" />
                  <span>Clinical Consult Notes on System File (Read-Only)</span>
                </h4>
                
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                  {medicalRecords.filter(r => r.patientId === selectedPatientHistory.uid || r.patientId === selectedPatientHistory.patientId).length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">No consult records recorded under active system.</p>
                  ) : (
                    medicalRecords.filter(r => r.patientId === selectedPatientHistory.uid || r.patientId === selectedPatientHistory.patientId).map(m => (
                      <div key={m.id} className="bg-slate-950 border border-slate-850 p-4 rounded-2xl space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 border-b border-slate-850 pb-1.5">
                          <span>Doctor consultant: <strong className="text-slate-300 font-bold">{m.doctorName}</strong></span>
                          <span>Visit stamp: {m.visitDate}</span>
                        </div>
                        <p className="text-xs font-bold text-emerald-400">Diagnosis Details: <span className="text-slate-200 font-normal">{m.diagnosis}</span></p>
                        <p className="text-xs"><span className="text-slate-500">Treatment Action:</span> <span className="text-slate-300">{m.treatmentPlan}</span></p>
                        {m.notes && <p className="text-[11px] italic text-slate-450 mt-1">&bull; {m.notes}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DOCTOR DUTY SCHEDULER MODAL */}
      {selectedDoctorSchedule && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative font-mono text-left">
            <button onClick={() => setSelectedDoctorSchedule(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-200">
              <X className="h-4.5 w-4.5" />
            </button>
            
            <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-800 pb-2.5 mb-4">DR. DUY HOURS SCHEDULER</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-800/60">
                <div className="h-10 w-10 rounded-xl bg-slate-850 text-slate-400 border border-slate-800 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                  {selectedDoctorSchedule.fullName ? selectedDoctorSchedule.fullName.split(' ').map(nBy => nBy[0]).join('').slice(0, 2).toUpperCase() : 'DR'}
                </div>
                <div>
                  <span className="block font-bold text-slate-100">{selectedDoctorSchedule.fullName}</span>
                  <span className="text-[9px] text-slate-500">Licence License ID: {selectedDoctorSchedule.doctorId}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] text-slate-500 font-bold block">DUTY DAYS SCHEDULED</span>
                <div className="flex flex-wrap gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                    const isActive = selectedDoctorSchedule.availability?.includes(day);
                    return (
                      <span key={day} className={`px-2.5 py-1 text-[10px] rounded-lg font-bold border ${isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-slate-950 text-slate-600 border-slate-850'}`}>
                        {day}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW DOCTOR MODAL */}
      {showAddDoctor && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddDoctorSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative font-mono text-left space-y-4 max-h-[85vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-800 pb-2.5">REGISTER CLINIC SPECIAIST</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">SPECIALIST NAME</label>
                <input 
                  type="text" 
                  required
                  value={newDoctorForm.fullName}
                  onChange={(e) => setNewDoctorForm({ ...newDoctorForm, fullName: e.target.value })}
                  placeholder="Dr. Ahmed Ali"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">ELECTRONIC MAIL KEY</label>
                <input 
                  type="email" 
                  required
                  value={newDoctorForm.email}
                  onChange={(e) => setNewDoctorForm({ ...newDoctorForm, email: e.target.value })}
                  placeholder="ahmed@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">MOBILE PHONE NO</label>
                <input 
                  type="text" 
                  required
                  value={newDoctorForm.phone}
                  onChange={(e) => setNewDoctorForm({ ...newDoctorForm, phone: e.target.value })}
                  placeholder="0100000000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">DEPARTMENT ASSIGNMENT</label>
                <select 
                  value={newDoctorForm.specialty}
                  onChange={(e) => setNewDoctorForm({ ...newDoctorForm, specialty: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">DOCTOR BIOGRAPHY</label>
                <textarea 
                  value={newDoctorForm.bio}
                  onChange={(e) => setNewDoctorForm({ ...newDoctorForm, bio: e.target.value })}
                  placeholder="Detailed board bio information..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100"
                />
              </div>
            </div>

            <div className="flex space-x-2.5 pt-3">
              <button type="submit" className="flex-1 bg-emerald-500 text-slate-950 py-2.5 rounded-xl font-bold text-xs">
                Register Specialist
              </button>
              <button type="button" onClick={() => setShowAddDoctor(false)} className="flex-1 border border-slate-800 text-slate-400 py-2.5 rounded-xl text-xs">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADMIT NEW PATIENT MODAL */}
      {showAddPatient && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddPatientSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative font-mono text-left space-y-4 max-h-[85vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-800 pb-2.5">ADMIT OUTPATIENT MEDICAL KEY</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">PATIENT FULL NAME</label>
                <input 
                  type="text" 
                  required
                  value={newPatientForm.fullName}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, fullName: e.target.value })}
                  placeholder="Patient Name"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">EMAIL KEY</label>
                <input 
                  type="email" 
                  required
                  value={newPatientForm.email}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, email: e.target.value })}
                  placeholder="patient@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">PHONE</label>
                <input 
                  type="text" 
                  required
                  value={newPatientForm.phone}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, phone: e.target.value })}
                  placeholder="0100000000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">BLOOD DIV</label>
                  <input 
                    type="text" 
                    required
                    value={newPatientForm.bloodType}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, bloodType: e.target.value })}
                    placeholder="A+"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">GENDER</label>
                  <select 
                    value={newPatientForm.gender}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, gender: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">DOB (YYYY-MM-DD)</label>
                <input 
                  type="text" 
                  required
                  value={newPatientForm.dob}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, dob: e.target.value })}
                  placeholder="1995-10-05"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>
            </div>

            <div className="flex space-x-2.5 pt-3">
              <button type="submit" className="flex-1 bg-emerald-500 text-slate-950 py-2.5 rounded-xl font-bold text-xs font-mono">
                Admit Patient
              </button>
              <button type="button" onClick={() => setShowAddPatient(false)} className="flex-1 border border-slate-800 text-slate-400 py-2.5 rounded-xl text-xs">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DRAFT INVOICE MODAL */}
      {showAddInvoice && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddInvoiceSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative font-mono text-left space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-800 pb-2.5">DRAFT CLINICAL BILL</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">SELECT INVOICED PATIENT</label>
                <select 
                  required
                  value={newInvoiceForm.patientId}
                  onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, patientId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350"
                >
                  <option value="">-- Choose Outpatient --</option>
                  {patients.map(p => (
                    <option key={p.uid} value={p.uid}>{p.fullName} ({p.patientId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">CLINIC SERVICE CHARGED</label>
                <input 
                  type="text" 
                  required
                  value={newInvoiceForm.service}
                  onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, service: e.target.value })}
                  placeholder="Dental Care Service"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">NET TOTAL AMOUNT</label>
                  <input 
                    type="number" 
                    required
                    value={newInvoiceForm.amount}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, amount: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">PAYMENT WAY</label>
                  <select 
                    value={newInvoiceForm.paymentMethod}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, paymentMethod: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350"
                  >
                    <option value="Cash">Cash (Physical)</option>
                    <option value="Card">Visa Credit/Debit</option>
                    <option value="Insurance">Third Policy Insur</option>
                    <option value="Bank Transfer">Wire bank</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">BILLING STATUS SET</label>
                <select 
                  value={newInvoiceForm.status}
                  onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, status: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350"
                >
                  <option value="Unpaid">Unpaid</option>
                  <option value="Paid">Paid</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-2.5 pt-3">
              <button type="submit" className="flex-1 bg-emerald-500 text-slate-950 py-2.5 rounded-xl font-bold text-xs">
                Draft Bill Invoice
              </button>
              <button type="button" onClick={() => setShowAddInvoice(false)} className="flex-1 border border-slate-800 text-slate-400 py-2.5 rounded-xl text-xs">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BOOK APPOINTMENT MODAL */}
      {showAddAppt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddApptSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative font-mono text-left space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-800 pb-2.5">BOOK CLINIC VISIT</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">CHOOSE INPATIENT NAME</label>
                <select 
                  required
                  value={newApptForm.patientId}
                  onChange={(e) => setNewApptForm({ ...newApptForm, patientId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map(p => (
                    <option key={p.uid} value={p.uid}>{p.fullName} ({p.patientId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">CHOOSE CLINIC DOCTOR</label>
                <select 
                  required
                  value={newApptForm.doctorId}
                  onChange={(e) => setNewApptForm({ ...newApptForm, doctorId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350"
                >
                  <option value="">-- Choose Specialist --</option>
                  {doctors.map(d => (
                    <option key={d.uid} value={d.uid}>{d.fullName} ({d.specialty})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">SLOT DATE</label>
                  <input 
                    type="text" 
                    required
                    value={newApptForm.date}
                    onChange={(e) => setNewApptForm({ ...newApptForm, date: e.target.value })}
                    placeholder="2026-06-12"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">SLOT TIME</label>
                  <input 
                    type="text" 
                    required
                    value={newApptForm.time}
                    onChange={(e) => setNewApptForm({ ...newApptForm, time: e.target.value })}
                    placeholder="10:00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">PRIMARY SYMPTOMS DECLARE</label>
                <input 
                  type="text" 
                  value={newApptForm.symptoms}
                  onChange={(e) => setNewApptForm({ ...newApptForm, symptoms: e.target.value })}
                  placeholder="Decription complaints..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>
            </div>

            <div className="flex space-x-2.5 pt-3">
              <button type="submit" className="flex-1 bg-emerald-500 text-slate-950 py-2.5 rounded-xl font-bold text-xs">
                Schedule Visit Admission
              </button>
              <button type="button" onClick={() => setShowAddAppt(false)} className="flex-1 border border-slate-800 text-slate-400 py-2.5 rounded-xl text-xs">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REQUEST DETAILS MODAL */}
      {showRequestDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 relative font-sans text-left space-y-4 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <GitPullRequest className="h-4.5 w-4.5 text-teal-400" />
                <span>Department Change Request Details</span>
              </h3>
              <button 
                onClick={() => setShowRequestDetailsModal(false)}
                className="text-slate-450 hover:text-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Details Grid */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-mono tracking-wider">Doctor Name</span>
                  <span className="text-xs font-semibold text-slate-200 font-sans block mt-0.5">{selectedRequest.doctorName}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-mono tracking-wider">Email Address</span>
                  <span className="text-xs font-semibold text-slate-200 font-sans block mt-0.5">{selectedRequest.doctorEmail}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-850 pt-3">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-mono tracking-wider">Current Department</span>
                  <span className="text-xs font-semibold text-slate-400 font-sans block mt-0.5">{selectedRequest.currentDepartmentName}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-mono tracking-wider">Requested Department</span>
                  <span className="text-xs font-bold text-teal-400 font-sans block mt-0.5">{selectedRequest.requestedDepartmentName}</span>
                </div>
              </div>

              <div className="border-t border-slate-850 pt-3">
                <span className="block text-[10px] text-slate-400 uppercase font-mono tracking-wider">Reason for Change</span>
                <p className="text-xs text-slate-300 font-sans leading-relaxed mt-1 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                  {selectedRequest.reason || "No review reason specified."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-850 pt-3">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-mono tracking-wider">Request Date</span>
                  <span className="text-xs text-slate-350 font-mono block mt-0.5">
                    {new Date(selectedRequest.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-mono tracking-wider">Current Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[9px] font-bold font-mono uppercase tracking-wide border ${
                    selectedRequest.status === 'Pending' 
                      ? 'bg-yellow-950/30 text-yellow-400 border-yellow-500/20' 
                      : selectedRequest.status === 'Approved' 
                      ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20' 
                      : 'bg-rose-950/30 text-rose-400 border-rose-500/20'
                  }`}>
                    {selectedRequest.status}
                  </span>
                </div>
              </div>

              {/* Display Rejection Reason if already rejected */}
              {selectedRequest.status === 'Rejected' && selectedRequest.adminNotes && (
                <div className="border-t border-slate-850 pt-3">
                  <span className="block text-[10px] text-rose-400 uppercase font-mono tracking-wider">Rejection Notes (Stored)</span>
                  <p className="text-xs text-rose-350 font-sans leading-relaxed mt-1 bg-rose-950/10 p-3 rounded-xl border border-rose-500/10">
                    {selectedRequest.adminNotes}
                  </p>
                </div>
              )}

              {/* Rejection input field if pending */}
              {selectedRequest.status === 'Pending' && (
                <div className="border-t border-slate-850 pt-3 space-y-2">
                  <label className="block text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">Admin Rejection Reason (If Rejecting)</label>
                  <textarea 
                    rows={2}
                    value={adminRejectionNotes}
                    onChange={(e) => setAdminRejectionNotes(e.target.value)}
                    placeholder="Enter reason for rejection here..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              )}
            </div>

            {/* Actions for Pending Requests */}
            <div className="flex space-x-2.5 pt-3 border-t border-slate-800">
              {selectedRequest.status === 'Pending' ? (
                <>
                  <button 
                    type="button" 
                    onClick={() => handleApproveDoctorDeptRequest(selectedRequest)}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl font-bold text-xs transition-colors"
                  >
                    Approve Request
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (!adminRejectionNotes.trim()) {
                        triggerToast('Please specify a rejection reason.', 'error');
                        return;
                      }
                      handleRejectDoctorDeptRequest(selectedRequest, adminRejectionNotes);
                    }}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold text-xs transition-colors"
                  >
                    Reject Request
                  </button>
                </>
              ) : (
                <button 
                  type="button" 
                  onClick={() => setShowRequestDetailsModal(false)}
                  className="flex-1 border border-slate-800 text-slate-400 hover:bg-slate-850 py-2.5 rounded-xl text-xs transition-colors"
                >
                  Close Detail Review
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
