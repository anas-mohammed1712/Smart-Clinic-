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
  ClipboardCheck, LayoutDashboard, GitPullRequest, Menu
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { 
  User as UserType, PatientRecord, DoctorRecord, Appointment, 
  MedicalRecord, Prescription, BillingInvoice, Role, Department, DoctorDepartmentRequest 
} from '../types';
import { 
  getUsers, saveUser, getPatients, savePatient, deletePatient,
  getDoctors, saveDoctor, deleteDoctor, getAppointments, saveAppointment, 
  deleteAppointment, checkAppointmentCollision, getMedicalRecords, saveMedicalRecord, 
  getPrescriptions, savePrescription, getBillingInvoices, saveBillingInvoice, 
  triggerNotification, getDepartments as getDbDepartments,
  getDoctorDepartmentRequests, saveDoctorDepartmentRequest, deleteDoctorDepartmentRequest 
} from '../db/localDb';
import { 
  parseTimeToMinutes, formatMinutesToTime, getGeneratedSlots, 
  getDayNameFromDate, DEFAULT_WEEKLY_SCHEDULE 
} from '../utils/scheduleUtils';
import { CLINIC_CONFIG } from '../data/clinicConfig';
import PatientProfileView from './PatientProfileView';
import { signOut } from 'firebase/auth';
import { auth } from '../db/firebase';
import { setCurrentSessionUser } from '../db/localDb';

interface DashboardViewProps {
  sessionUser: UserType | null;
  onNavigate: (view: string, tab?: string, extraId?: string) => void;
  initialTab?: string;
}

export default function DashboardView({ sessionUser, onNavigate, initialTab }: DashboardViewProps) {
  // If no user is logged in, show helper alert
  if (!sessionUser) {
    return (
      <div className="mx-auto max-w-md py-20 px-4 text-center font-sans">
        <div className="bg-white border rounded-3xl p-8 shadow-sm">
          <AlertCircle className="h-12 w-12 text-teal-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900">Session Expired</h3>
          <p className="text-xs text-gray-500 mt-2">Please login using your secure credentials to explore the dashboards.</p>
          <button 
            onClick={() => onNavigate('login')}
            className="mt-5 rounded-xl bg-teal-600 text-white px-5 py-2.5 text-xs font-bold hover:bg-teal-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Active workspace tab (based on role)
  const [activeTab, setActiveTab ] = useState(initialTab || 'overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Load and refresh state triggers
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [users, setUsers] = useState<UserType[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [billingInvoices, setBillingInvoices] = useState<BillingInvoice[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptName, setSelectedDeptName] = useState<string>('');
  const [deptRequests, setDeptRequests] = useState<DoctorDepartmentRequest[]>([]);
  const [showDeptRequestModal, setShowDeptRequestModal] = useState(false);
  const [requestDeptId, setRequestDeptId] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [activeRequestDetails, setActiveRequestDetails] = useState<DoctorDepartmentRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Search, filter, and form inputs
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('All');

  // Toast / Feedback states
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Modals controllers
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [activePrintPrescription, setActivePrintPrescription] = useState<Prescription | null>(null);

  // Form States: New Doctor
  const [doctorForm, setDoctorForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    specialty: 'Dental Care',
    experience: '5 Years',
    bio: '',
    availability: ['Monday', 'Wednesday'] as string[]
  });

  // Form States: New Medical Record
  const [recordForm, setRecordForm] = useState({
    patientId: '',
    symptoms: '',
    diagnosis: '',
    treatmentPlan: '',
    notes: ''
  });

  // Form States: New Prescription
  const [prescriptionForm, setPrescriptionForm] = useState({
    patientId: '',
    medicineName: '',
    dosage: '500mg',
    frequency: 'Once Daily',
    duration: '7 Days',
    notes: ''
  });

  // Form States: Book Appointment
  const [bookingForm, setBookingForm] = useState({
    doctorId: '',
    date: '',
    time: '09:00',
    notes: '',
    symptoms: ''
  });

  // Form States: Register Patient (Reception)
  const [patientForm, setPatientForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    dob: '',
    gender: 'Male',
    emergencyContact: ''
  });

  // Form States: Invoice Creation (Receptionist)
  const [billingFormState, setBillingFormState] = useState({
    patientId: '',
    service: 'Consultation',
    amount: 150,
    paymentMethod: 'Cash' as 'Cash' | 'Card' | 'Insurance' | 'Bank Transfer'
  });

  // --- RECEPTIONIST DASHBOARD EXTRA STATES ---
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleTime, setRescheduleTime] = useState<string>('09:00');
  const [activeReceptionistPatient, setActiveReceptionistPatient] = useState<PatientRecord | null>(null);
  const [viewingApptHistory, setViewingApptHistory] = useState<Appointment | null>(null);
  const [patientSearchText, setPatientSearchText] = useState<string>('');
  const [appointmentSearchText, setAppointmentSearchText] = useState<string>('');
  const [billingSearchText, setBillingSearchText] = useState<string>('');
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [activePrintInvoice, setActivePrintInvoice] = useState<BillingInvoice | null>(null);

  // Doctor Portal States
  const [selectedPatientHistoryId, setSelectedPatientHistoryId] = useState<string | null>(null);
  const [isEditingDoctorProfile, setIsEditingDoctorProfile] = useState(false);
  const [isEditingReceptionistProfile, setIsEditingReceptionistProfile] = useState(false);
  const [docProfileForm, setDocProfileForm] = useState({
    fullName: '',
    specialty: 'General Care',
    email: '',
    phone: '',
    experience: '5 Years',
    availability: [] as string[]
  });
  const [receptProfileForm, setReceptProfileForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: ''
  });
  const [docWeeklySchedule, setDocWeeklySchedule] = useState<any>(DEFAULT_WEEKLY_SCHEDULE);
  const [docApptDuration, setDocApptDuration] = useState<number>(30);
  const [docVacationMode, setDocVacationMode] = useState<boolean>(false);
  const [docUnavailableDays, setDocUnavailableDays] = useState<string[]>([]);
  const [newUnavailableDay, setNewUnavailableDay] = useState<string>('');
  const [medicalRecordFormMode, setMedicalRecordFormMode] = useState<'list' | 'create'>('list');

  // Synchronize dynamic databases
  useEffect(() => {
    setUsers(getUsers());
    setPatients(getPatients());
    setDoctors(getDoctors());
    setAppointments(getAppointments());
    setMedicalRecords(getMedicalRecords());
    setPrescriptions(getPrescriptions());
    setBillingInvoices(getBillingInvoices());
    setDepartments(getDbDepartments());
    setDeptRequests(getDoctorDepartmentRequests());
  }, [refreshTrigger, sessionUser]);

  // Sync logged in doctor profile form variables
  useEffect(() => {
    if (sessionUser && sessionUser.role === 'Doctor' && doctors.length > 0) {
      const docRec = doctors.find(d => d.uid === sessionUser.uid);
      setDocProfileForm({
        fullName: sessionUser.fullName || '',
        specialty: docRec?.specialty || sessionUser.specialty || 'General Practice',
        email: sessionUser.email || '',
        phone: sessionUser.phone || '',
        experience: docRec?.experience || sessionUser.experience || '5 Years',
        availability: docRec?.availability || sessionUser.availability || ['Monday', 'Wednesday', 'Friday']
      });
      if (docRec) {
        setDocWeeklySchedule(docRec.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE);
        setDocApptDuration(docRec.appointmentDuration || 30);
        setDocVacationMode(!!docRec.vacationMode);
        setDocUnavailableDays(docRec.unavailableDays || []);
      }
    }
  }, [sessionUser, doctors]);

  // Sync logged in receptionist profile form variables
  useEffect(() => {
    if (sessionUser && sessionUser.role === 'Receptionist') {
      setReceptProfileForm({
        fullName: sessionUser.fullName || '',
        email: sessionUser.email || '',
        phone: sessionUser.phone || '',
        address: sessionUser.address || ''
      });
    }
  }, [sessionUser]);

  // Helper trigger
  const forceRefresh = () => setRefreshTrigger(prev => prev + 1);

  const handleLogout = () => {
    signOut(auth).catch((err) => console.error("Firebase SignOut error:", err));
    setCurrentSessionUser(null);
    window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));
    onNavigate('home');
  };

  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    const handleSync = () => {
      forceRefresh();
    };
    window.addEventListener('smartclinic_db_sync', handleSync);
    return () => {
      window.removeEventListener('smartclinic_db_sync', handleSync);
    };
  }, []);

  // URL routing detector for receptionist patient details deep linking
  useEffect(() => {
    const checkPathForPatient = () => {
      const match = window.location.pathname.match(/\/receptionist\/patientdetails\/([^/]+)/i);
      if (match && sessionUser && sessionUser.role === 'Receptionist') {
        const uid = match[1];
        const patient = patients.find(p => p.uid === uid);
        if (patient) {
          setActiveReceptionistPatient(patient);
          setActiveTab('receptionist-patient-details');
        }
      }
    };
    checkPathForPatient();
    window.addEventListener('popstate', checkPathForPatient);
    return () => window.removeEventListener('popstate', checkPathForPatient);
  }, [patients, sessionUser]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const getDoctorSlotsForDate = (doctorUid: string, dateStr: string) => {
    if (!doctorUid || !dateStr) return [];
    const doc = doctors.find(d => d.uid === doctorUid);
    if (!doc) return [];
    
    // If doctor is in vacation mode, lock out booking completely
    if (doc.vacationMode) return [];
    
    // If the exact date is an unavailable holiday, lock out booking
    if (doc.unavailableDays && doc.unavailableDays.includes(dateStr)) return [];
    
    // Get the name of the weekday
    const dayName = getDayNameFromDate(dateStr);
    
    // Retrieve weekly recurring availability
    const weeklySched = doc.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
    const daySched = weeklySched[dayName];
    if (!daySched || daySched.isOff) return [];
    
    // Get the slot duration interval
    const duration = doc.appointmentDuration || 30;
    
    // Generate all shift intervals
    const candidateSlots = getGeneratedSlots(
      daySched.startTime,
      daySched.endTime,
      daySched.breakStartTime || '',
      daySched.breakEndTime || '',
      duration
    );
    
    // Retrieve existing booked appointments for this physician on this date
    const bookedForDocDate = appointments.filter(a => a.doctorId === doc.uid && a.date === dateStr);
    
    // Exclude those already booked
    return candidateSlots.filter(slot => {
      const isBooked = bookedForDocDate.some(a => {
        // Compare formatted times robustly
        return a.time.trim().toLowerCase() === slot.trim().toLowerCase();
      });
      return !isBooked;
    });
  };

  // --- ACTIONS: ADMIN ---
  const handleCreateDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorForm.fullName || !doctorForm.email || !doctorForm.phone) {
      showToast('Please populate all required doctor inputs.', 'error');
      return;
    }

    const fakeUid = 'doc-' + Math.random().toString(36).substr(2, 9);
    const newDocUser: UserType = {
      uid: fakeUid,
      fullName: doctorForm.fullName,
      email: doctorForm.email,
      phone: doctorForm.phone,
      role: 'Doctor',
      createdAt: new Date().toISOString(),
      profileImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
      isActive: true,
      gender: 'Male',
      dob: '1985-05-15',
      address: CLINIC_CONFIG.fullAddress,
      specialty: doctorForm.specialty,
      bio: doctorForm.bio,
      experience: doctorForm.experience,
      availability: doctorForm.availability
    };

    const newDocRecord: DoctorRecord = {
      uid: fakeUid,
      doctorId: 'DOC-' + Math.floor(1000 + Math.random() * 9000),
      fullName: doctorForm.fullName,
      specialty: doctorForm.specialty,
      experience: doctorForm.experience,
      phone: doctorForm.phone,
      email: doctorForm.email,
      availability: doctorForm.availability,
      profileImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
      bio: doctorForm.bio
    };

    saveUser(newDocUser);
    saveDoctor(newDocRecord);
    triggerNotification(sessionUser.uid, 'Doctor Added', `Dr. ${doctorForm.fullName} has been successfully added to departments.`, 'success');
    
    showToast(`Dr. ${doctorForm.fullName} saved successfully!`);
    setShowAddDoctorModal(false);
    setDoctorForm({ fullName: '', email: '', phone: '', specialty: 'Dental Care', experience: '5 Years', bio: '', availability: ['Monday'] });
    forceRefresh();
  };

  const handleDeleteDoctor = (uid: string) => {
    deleteDoctor(uid);
    showToast('Doctor record retired successfully.');
    forceRefresh();
  };

  const handleDeletePatient = (uid: string) => {
    deletePatient(uid);
    showToast('Patient record retired successfully.');
    forceRefresh();
  };

  const handleUpdateUserStatus = (selectedUser: UserType) => {
    const updated = { ...selectedUser, isActive: !selectedUser.isActive };
    saveUser(updated);
    showToast(`User status toggled to ${updated.isActive ? 'Active' : 'Suspended'}`);
    forceRefresh();
  };

  const handleSaveDoctorProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docProfileForm.fullName || !docProfileForm.email || !docProfileForm.phone) {
      showToast('Please populate all required details.', 'error');
      return;
    }

    const updatedUser: UserType = {
      ...sessionUser,
      fullName: docProfileForm.fullName,
      email: docProfileForm.email,
      phone: docProfileForm.phone,
      specialty: docProfileForm.specialty,
      experience: docProfileForm.experience,
      availability: docProfileForm.availability,
      weeklySchedule: docWeeklySchedule,
      appointmentDuration: docApptDuration,
      vacationMode: docVacationMode,
      unavailableDays: docUnavailableDays,
    };

    const updatedDocRecord: DoctorRecord = {
      uid: sessionUser.uid,
      doctorId: doctors.find(d => d.uid === sessionUser.uid)?.doctorId || 'DOC-' + Math.floor(1000 + Math.random() * 9000),
      fullName: docProfileForm.fullName,
      specialty: docProfileForm.specialty,
      experience: docProfileForm.experience,
      phone: docProfileForm.phone,
      email: docProfileForm.email,
      availability: docProfileForm.availability,
      bio: doctors.find(d => d.uid === sessionUser.uid)?.bio || 'Smart Clinic registered practitioner.',
      profileImage: doctors.find(d => d.uid === sessionUser.uid)?.profileImage || '',
      weeklySchedule: docWeeklySchedule,
      appointmentDuration: docApptDuration,
      vacationMode: docVacationMode,
      unavailableDays: docUnavailableDays,
    };

    saveUser(updatedUser);
    saveDoctor(updatedDocRecord);
    setCurrentSessionUser(updatedUser);

    showToast('Doctor Profile updated successfully!');
    setIsEditingDoctorProfile(false);
    forceRefresh();
  };

  const handleSaveReceptionistProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser) return;
    if (!receptProfileForm.fullName || !receptProfileForm.email) {
      showToast('Please populate all required details.', 'error');
      return;
    }

    const updatedUser: UserType = {
      ...sessionUser,
      fullName: receptProfileForm.fullName,
      email: receptProfileForm.email,
      phone: receptProfileForm.phone,
      address: receptProfileForm.address,
    };

    saveUser(updatedUser);
    setCurrentSessionUser(updatedUser);

    showToast('Receptionist Profile updated successfully!');
    setIsEditingReceptionistProfile(false);
    forceRefresh();
  };

  // --- ACTIONS: DEPARTMENT CHANGE REQUEST ENGINE ---
  const handleSubmitDeptRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDeptId) {
      showToast('Requested department is required.', 'error');
      return;
    }
    if (!requestReason.trim()) {
      showToast('Reason for change is required.', 'error');
      return;
    }

    const currentDoc = doctors.find(d => d.uid === sessionUser.uid);
    const matchedDocDept = departments.find(dept => 
      (currentDoc?.departmentId && dept.id === currentDoc.departmentId) ||
      (currentDoc?.department && dept.name.toLowerCase() === currentDoc.department.toLowerCase()) ||
      (sessionUser?.department && dept.name.toLowerCase() === sessionUser.department.toLowerCase())
    );
    const currentDeptName = matchedDocDept ? matchedDocDept.name : (currentDoc?.department || sessionUser?.department || 'Internal Medicine');
    const currentDeptId = matchedDocDept ? matchedDocDept.id : 'internal_medicine_id';

    const reqDept = departments.find(d => d.id === requestDeptId);
    if (!reqDept) {
      showToast('Invalid department selected.', 'error');
      return;
    }

    if (reqDept.id === currentDeptId || reqDept.name.toLowerCase() === currentDeptName.toLowerCase()) {
      showToast('Cannot request the same department as your current assignment.', 'error');
      return;
    }

    const newRequest: DoctorDepartmentRequest = {
      id: 'REQ-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      doctorId: sessionUser.uid,
      doctorName: sessionUser.fullName,
      doctorEmail: sessionUser.email,
      currentDepartmentId: currentDeptId,
      currentDepartmentName: currentDeptName,
      requestedDepartmentId: reqDept.id,
      requestedDepartmentName: reqDept.name,
      reason: requestReason,
      status: 'Pending',
      adminNotes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveDoctorDepartmentRequest(newRequest);
    triggerNotification(
      sessionUser.uid,
      'Department Change requested',
      `Request to transfer from ${currentDeptName} to ${reqDept.name} submitted.`,
      'info'
    );
    
    showToast('Department change request submitted successfully!');
    setShowDeptRequestModal(false);
    setRequestDeptId('');
    setRequestReason('');
    forceRefresh();
  };

  const handleApproveDeptRequest = (req: DoctorDepartmentRequest) => {
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
      };
      saveUser(updatedUser);
      // If of current-user, update active session user too
      if (sessionUser && sessionUser.uid === targetUserId) {
        setCurrentSessionUser(updatedUser);
      }
    }

    const dbDoctors = getDoctors();
    const matchedDoctor = dbDoctors.find(d => d.uid === targetUserId);
    if (matchedDoctor) {
      const updatedDoctor: DoctorRecord = {
        ...matchedDoctor,
        departmentId: req.requestedDepartmentId,
        department: req.requestedDepartmentName,
      };
      saveDoctor(updatedDoctor);
    }

    triggerNotification(
      targetUserId,
      'Department Change Approved',
      `Your request to transfer to ${req.requestedDepartmentName} has been approved by Admin.`,
      'success'
    );

    showToast('Department change request approved successfully!');
    forceRefresh();
  };

  const handleRejectDeptRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequestDetails) return;
    if (!rejectionNotes.trim()) {
      showToast('Please specify a rejection reason.', 'error');
      return;
    }

    const updatedRequest: DoctorDepartmentRequest = {
      ...activeRequestDetails,
      status: 'Rejected',
      adminNotes: rejectionNotes,
      updatedAt: new Date().toISOString()
    };
    saveDoctorDepartmentRequest(updatedRequest);

    triggerNotification(
      activeRequestDetails.doctorId,
      'Department Change Rejected',
      `Your request to transfer to ${activeRequestDetails.requestedDepartmentName} was rejected. Note: ${rejectionNotes}`,
      'error'
    );

    showToast('Department change request rejected.');
    setShowRejectModal(false);
    setRejectionNotes('');
    setActiveRequestDetails(null);
    forceRefresh();
  };

  // --- ACTIONS: DOCTOR ---
  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordForm.patientId || !recordForm.diagnosis || !recordForm.treatmentPlan) {
      showToast('Fill in diagnosis and treatment outline.', 'error');
      return;
    }

    const patient = patients.find(p => p.uid === recordForm.patientId || p.patientId === recordForm.patientId);
    if (!patient) {
      showToast('Error mapping patient records.', 'error');
      return;
    }

    const newRec: MedicalRecord = {
      id: 'REC-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      patientId: patient.patientId,
      patientName: patient.fullName,
      doctorId: sessionUser.uid,
      doctorName: sessionUser.fullName,
      symptoms: recordForm.symptoms || 'None recorded.',
      diagnosis: recordForm.diagnosis,
      treatmentPlan: recordForm.treatmentPlan,
      notes: recordForm.notes || '',
      visitDate: new Date().toISOString().split('T')[0]
    };

    saveMedicalRecord(newRec);
    triggerNotification(patient.uid, 'Clinical File Updated', `Dr. ${sessionUser.fullName} loaded new therapy details.`, 'info');
    
    showToast('Patient clinical record stored.');
    setShowAddRecordModal(false);
    setRecordForm({ patientId: '', symptoms: '', diagnosis: '', treatmentPlan: '', notes: '' });
    forceRefresh();
  };

  const handleCreatePrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescriptionForm.patientId || !prescriptionForm.medicineName) {
      showToast('Specify prescription chemical compounds.', 'error');
      return;
    }

    const patient = patients.find(p => p.uid === prescriptionForm.patientId || p.patientId === prescriptionForm.patientId);
    if (!patient) {
      showToast('Friction mapping patient record.', 'error');
      return;
    }

    const newPres: Prescription = {
      id: 'RX-' + Math.floor(10000 + Math.random() * 90000),
      patientId: patient.patientId,
      patientName: patient.fullName,
      doctorId: sessionUser.uid,
      doctorName: sessionUser.fullName,
      medicineName: prescriptionForm.medicineName,
      dosage: prescriptionForm.dosage,
      frequency: prescriptionForm.frequency,
      duration: prescriptionForm.duration,
      notes: prescriptionForm.notes || 'Take as indicated by clinical specialist.',
      date: new Date().toISOString().split('T')[0]
    };

    savePrescription(newPres);
    triggerNotification(patient.uid, 'Prescription Generated', `Prescription Rx: ${prescriptionForm.medicineName} written.`, 'success');
    
    showToast('Prescription saved. Ready to print!');
    setShowPrescriptionModal(false);
    setPrescriptionForm({ patientId: '', medicineName: '', dosage: '500mg', frequency: 'Once Daily', duration: '7 Days', notes: '' });
    forceRefresh();
  };

  const handleUpdateAppointmentStatus = (apptId: string, status: 'Approved' | 'Completed' | 'Cancelled' | 'Checked In' | 'In Consultation' | 'Pending') => {
    const match = appointments.find(a => a.id === apptId);
    if (match) {
      const updated = { ...match, status };
      saveAppointment(updated);
      triggerNotification(match.patientId, 'Appointment Updated', `Your scheduled session is raw marked as ${status}.`, 'info');
      showToast(`Appointment status updated to: ${status}`);
      forceRefresh();
    }
  };

  const handleUpdateCheckInStatus = (apptId: string, checkInStatus: 'Pending' | 'Checked In' | 'Waiting for Doctor' | 'Completed') => {
    const match = appointments.find(a => a.id === apptId);
    if (match) {
      const updated = { 
        ...match, 
        checkInStatus,
        status: checkInStatus === 'Completed' ? ('Completed' as const) : match.status
      };
      saveAppointment(updated);
      triggerNotification(
        match.patientId, 
        'Check-In Updated', 
        `Your clinic visit check-in status: ${checkInStatus}`, 
        'info'
      );
      showToast(`Checked in status set to: ${checkInStatus}`);
      forceRefresh();
    }
  };

  const handleRescheduleAppointment = (apptId: string, newDate: string, newTime: string) => {
    const match = appointments.find(a => a.id === apptId);
    if (match) {
      const updated = { ...match, date: newDate, time: newTime, status: 'Approved' as const };
      saveAppointment(updated);
      triggerNotification(
        match.patientId, 
        'Appointment Rescheduled', 
        `Your visit was re-allocated to ${newDate} at ${newTime}`, 
        'info'
      );
      showToast(`Appointment successfully rescheduled!`);
      forceRefresh();
    }
  };

  // --- ACTIONS: RECEPTIONIST / PATIENT APPOINTMENTS ---
  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.doctorId || !bookingForm.date) {
      showToast('All fields are key to book a consult slot.', 'error');
      return;
    }

    // Determine target patient
    let patientIdTemp = '';
    let patientNameTemp = '';
    let patientUidTemp = '';

    if (sessionUser.role === 'Patient') {
      const pRecord = patients.find(p => p.uid === sessionUser.uid);
      patientIdTemp = pRecord?.patientId || 'PT-1001';
      patientNameTemp = sessionUser.fullName;
      patientUidTemp = sessionUser.uid;
    } else {
      // For Receptionist, map selected patient from selector
      const pRecord = patients[0]; // fallback
      patientIdTemp = pRecord?.patientId || 'PT-1001';
      patientNameTemp = pRecord?.fullName || 'Walk-in Consultation';
      patientUidTemp = pRecord?.uid || 'patient1';
    }

    const doctor = doctors.find(d => d.uid === bookingForm.doctorId || d.doctorId === bookingForm.doctorId);
    if (!doctor) {
      showToast('Clinical medical doctor choice not loaded.', 'error');
      return;
    }

    // Collision check
    const isCollide = checkAppointmentCollision(doctor.uid, bookingForm.date, bookingForm.time);
    if (isCollide) {
      showToast('This timeframe maps to an existing scheduled session. Select another slot.', 'error');
      return;
    }

    const newAppt: Appointment = {
      id: 'APT-' + Math.floor(10000 + Math.random() * 90000),
      patientId: patientIdTemp,
      patientName: patientNameTemp,
      doctorId: doctor.uid,
      doctorName: doctor.fullName,
      date: bookingForm.date,
      time: bookingForm.time,
      status: 'Pending',
      notes: bookingForm.notes || '',
      symptoms: bookingForm.symptoms || 'Routine clinic checkup.'
    };

    saveAppointment(newAppt);
    triggerNotification(doctor.uid, 'Appointment Scheduled', `New appointment registered by ${patientNameTemp}.`, 'info');
    triggerNotification(patientUidTemp, 'Booking Stored', `Your slot with Dr. ${doctor.fullName} is registered. awaiting approvals.`, 'success');
    
    showToast('Appointment proposal submitted successfully!');
    setBookingForm({ doctorId: '', date: '', time: '09:00', notes: '', symptoms: '' });
    forceRefresh();
  };

  // --- ACTIONS: RECEPTIONIST ---
  const handleRegisterPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientForm.fullName || !patientForm.email || !patientForm.phone || !patientForm.dob || !patientForm.address) {
      showToast('Populate all required patient input cells.', 'error');
      return;
    }

    const fakeUid = 'user-' + Math.random().toString(36).substr(2, 9);
    const fakeId = 'PT-' + Math.floor(1000 + Math.random() * 9000);

    const newUser: UserType = {
      uid: fakeUid,
      fullName: patientForm.fullName,
      email: patientForm.email,
      phone: patientForm.phone,
      role: 'Patient',
      createdAt: new Date().toISOString(),
      profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300',
      isActive: true,
      gender: patientForm.gender,
      dob: patientForm.dob,
      address: patientForm.address,
    };

    const newPatient: PatientRecord = {
      uid: fakeUid,
      patientId: fakeId,
      fullName: patientForm.fullName,
      age: calculateAge(patientForm.dob),
      gender: patientForm.gender,
      phone: patientForm.phone,
      address: patientForm.address,
      bloodType: 'O+',
      medicalHistory: 'Walk-in client registered by receptionist.',
      emergencyContact: patientForm.emergencyContact || 'None listed.',
      email: patientForm.email,
      profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300'
    };

    saveUser(newUser);
    savePatient(newPatient);
    triggerNotification(sessionUser.uid, 'Patient Established', `${patientForm.fullName} registered manually.`, 'success');

    showToast('New Patient profile stored successfully!');
    setPatientForm({ fullName: '', email: '', phone: '', address: '', dob: '', gender: 'Male', emergencyContact: '' });
    forceRefresh();
  };

  const handleRegisterInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingFormState.patientId) {
      showToast('Identify patient receiver.', 'error');
      return;
    }

    const p = patients.find(pat => pat.patientId === billingFormState.patientId || pat.uid === billingFormState.patientId);
    if (!p) {
      showToast('Patient index query empty.', 'error');
      return;
    }

    const newInv: BillingInvoice = {
      id: 'INV-' + Math.floor(10000 + Math.random() * 90000),
      invoiceNumber: 'TAX-' + Math.floor(1000 + Math.random() * 9000),
      patientId: p.patientId,
      patientName: p.fullName,
      service: billingFormState.service,
      amount: Number(billingFormState.amount),
      paymentMethod: billingFormState.paymentMethod,
      status: 'Unpaid',
      date: new Date().toISOString().split('T')[0]
    };

    saveBillingInvoice(newInv);
    triggerNotification(p.uid, 'Billing Ledger Pending', `Clinic ledger generated invoice: ${billingFormState.service} - $${billingFormState.amount}`, 'warning');

    showToast('Invoice generated and logged.');
    setBillingFormState({ patientId: '', service: 'Consultation', amount: 150, paymentMethod: 'Cash' });
    forceRefresh();
  };

  const handlePayInvoice = (invId: string) => {
    const inv = billingInvoices.find(bi => bi.id === invId);
    if (inv) {
      const updated = { ...inv, status: 'Paid' as const };
      saveBillingInvoice(updated);
      triggerNotification(inv.patientId, 'Invoice Paid', `Invoice ${inv.invoiceNumber} paid via ${inv.paymentMethod}.`, 'success');
      showToast(`Invoice ${inv.invoiceNumber} paid!`);
      forceRefresh();
    }
  };



  // Safe search matchers
  const filteredDoctors = doctors.filter(d => 
    d.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPatients = patients.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.patientId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deptFilteredDoctors = selectedDeptName
    ? doctors.filter(
        (d) =>
          d.specialty?.toLowerCase() === selectedDeptName.toLowerCase() ||
          d.department?.toLowerCase() === selectedDeptName.toLowerCase()
      )
    : doctors;

  // Quick total calculations
  const totalRevenue = billingInvoices.filter(i => i.status === 'Paid').reduce((sum, current) => sum + current.amount, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 font-sans text-left">
      
      {/* Toast Feedback */}
      {toastMessage && (
        <div className={`fixed bottom-5 right-5 z-50 rounded-2xl px-5 py-4 text-white text-xs font-bold shadow-xl flex items-center space-x-2 transition-all transform animate-bounce ${toastType === 'success' ? 'bg-teal-600' : 'bg-rose-600'}`}>
          <Check className="h-4.5 w-4.5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Role Notice */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
        <div>
          <span className="text-xs font-mono font-bold tracking-widest text-teal-600 uppercase bg-teal-50 px-2.5 py-1 rounded-full">
            {sessionUser.role === 'Patient' ? 'Smart Clinic Patient Portal' : sessionUser.role === 'Doctor' ? 'Smart Clinic Doctor Portal' : (sessionUser.role === 'Receptionist' ? 'Smart Clinic Receptionist Portal' : 'Smart Clinic Portal')}
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-950 mt-1">
            {sessionUser.role === 'Patient' ? 'Patient Dashboard' : sessionUser.role === 'Doctor' ? 'Doctor Dashboard' : (sessionUser.role === 'Receptionist' ? 'Receptionist Dashboard' : 'Clinic Management Dashboard')}
          </h1>
          {sessionUser.role === 'Patient' && (
            <p className="text-xs text-gray-500 mt-1">
              Welcome, <span className="font-bold text-teal-700">{sessionUser.fullName}</span>
            </p>
          )}
          {sessionUser.role === 'Doctor' && (
            <div className="mt-1">
              <p className="text-sm text-teal-800 font-bold">
                Welcome Dr. {sessionUser.fullName}
              </p>
              <p className="text-xs text-gray-400 font-medium">
                Manage appointments, patient medical records, and prescriptions.
              </p>
            </div>
          )}
          {sessionUser.role === 'Receptionist' && (
            <div className="mt-1 text-left">
              <p className="text-sm text-teal-800 font-bold">
                Welcome, {sessionUser.fullName}
              </p>
              <p className="text-xs text-gray-400 font-medium">
                Manage appointments, patient registration, and billing.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="text-right">
            <span className="block text-xs text-gray-400 font-mono">
              {sessionUser.role === 'Doctor' ? 'Active Practitioner' : (sessionUser.role === 'Receptionist' ? 'Active Staff' : 'Administrator')}
            </span>
            <span className="text-xs font-bold text-gray-800 bg-gray-100 px-3 py-1 rounded-full">
              {sessionUser.fullName} ({sessionUser.role})
            </span>
          </div>
          <button 
            onClick={forceRefresh}
            className="p-2 border rounded-xl hover:bg-gray-50 flex items-center justify-center shrink-0 transition-transform duration-200 hover:rotate-180"
            title="Reload databases"
          >
            <RefreshCw className="h-4.5 w-4.5 text-gray-500" />
          </button>
        </div>
      </div>
        
      {/* MOBILE TOP BAR HEADER (< 992px) */}
      <header className="min-[992px]:hidden flex items-center justify-between px-4 py-3 bg-white border border-gray-200/80 rounded-2xl mb-6 sticky top-0 z-30 shadow-md w-full shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Toggle navigation menu"
            id="mobile-menu-trigger"
            className="p-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-sans font-extrabold text-gray-950 text-sm tracking-wide">
            ☰ {sessionUser.role === 'Patient' ? 'Patient Dashboard' : sessionUser.role === 'Doctor' ? 'Doctor' : 'Receptionist'} Dashboard
          </span>
        </div>
        <div>
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/30">
            {sessionUser?.role}
          </span>
        </div>
      </header>

      <div className="flex flex-col min-[992px]:flex-row gap-8 items-start w-full">
        
        {/* SHARED CLINIC RESPONSIVE SIDEBAR */}
        <Sidebar 
          role={sessionUser.role}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sessionUser={sessionUser}
          onNavigate={onNavigate}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          setMedicalRecordFormMode={setMedicalRecordFormMode}
          setIsEditingDoctorProfile={setIsEditingDoctorProfile}
        />

        {/* Workspace Panels */}
        <main className="flex-1 w-full bg-white border rounded-3xl p-6 shadow-sm overflow-hidden min-h-[500px]">
          
          {/* TAB 1: OVERVIEW & STATS */}
          {activeTab === 'overview' && sessionUser.role === 'Patient' && (
            <div className="space-y-6 text-left">
                
                {/* Quick Actions Row */}
                <div className="bg-gradient-to-r from-teal-500/5 to-emerald-500/5 border border-teal-100/50 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-teal-950">Quick Actions</h3>
                    <p className="text-[11px] text-teal-750/70 font-mono">Secure shortcuts for your patient portal</p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <button 
                      onClick={() => setActiveTab('book-appointment')}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      Book Appointment
                    </button>
                    <button 
                      onClick={() => setActiveTab('patient-clinical-files')}
                      className="px-4 py-2 bg-white hover:bg-gray-50 border text-gray-700 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      View Medical Records
                    </button>
                    <button 
                      onClick={() => setActiveTab('profile')}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      Update Profile
                    </button>
                  </div>
                </div>

                {/* Profile Card & Stats Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Patient Profile Card */}
                  <div className="lg:col-span-1 bg-white border border-gray-150 p-5 rounded-3xl shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-600"></div>
                    <div>
                      <h4 className="text-sm font-black text-gray-950 pb-3 border-b mb-3.5 font-mono uppercase tracking-wider flex items-center gap-1.5">
                        <User className="h-4 block w-4 text-teal-600" />
                        Patient Profile Card
                      </h4>
                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-gray-405 uppercase font-mono block">Full Name</span>
                          <span className="font-bold text-gray-800">{sessionUser.fullName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-450 uppercase font-mono block">Email Address</span>
                          <span className="font-medium text-gray-750 font-mono">{sessionUser.email}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-450 uppercase font-mono block">Phone Number</span>
                          <span className="font-bold text-gray-705 font-mono">{sessionUser.phone}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-455 uppercase font-mono block">Gender / Age</span>
                          <span className="font-medium text-gray-800">{sessionUser.gender} &nbsp;({calculateAge(sessionUser.dob)} years old)</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-455 uppercase font-mono block">Emergency Contact</span>
                          <span className="font-bold text-gray-800">{sessionUser.emergencyContact || 'Not configured'}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('profile')}
                      className="mt-5 w-full text-center py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-bold text-teal-800 cursor-pointer"
                    >
                      Update Profile
                    </button>
                  </div>

                  {/* Dynamic Stats Cards */}
                  <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    {/* Card 1: Upcoming Appointments */}
                    <div className="bg-teal-50/20 border border-teal-100 p-5 rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-teal-700 uppercase font-mono tracking-wider">Upcoming Appointments</span>
                      <span className="text-3xl font-black text-teal-900 font-mono mt-3">
                        {appointments.filter(a => a.patientId === patients.find(p => p.uid === sessionUser.uid)?.patientId && (a.status === 'Approved' || a.status === 'Pending')).length}
                      </span>
                      <p className="text-[10px] text-teal-600 font-mono mt-2">Active schedulings requiring clinic visit</p>
                    </div>

                    {/* Card 2: Medical Records */}
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">Medical Records</span>
                      <span className="text-3xl font-black text-slate-800 font-mono mt-3">
                        {medicalRecords.filter(m => m.patientId === patients.find(p => p.uid === sessionUser.uid)?.patientId).length}
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono mt-2">Official clinical diagnosis entries</p>
                    </div>

                    {/* Card 3: Active Prescriptions */}
                    <div className="bg-emerald-50/20 border border-emerald-100 p-5 rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase font-mono tracking-wider font-semibold">Active Prescriptions</span>
                      <span className="text-3xl font-black text-emerald-850 font-mono mt-3">
                        {prescriptions.filter(pr => pr.patientId === patients.find(p => p.uid === sessionUser.uid)?.patientId).length}
                      </span>
                      <p className="text-[10px] text-emerald-600 font-mono mt-2">Authorized medicine scripts</p>
                    </div>

                    {/* Card 4: Pending Requests */}
                    <div className="bg-amber-50/20 border border-amber-100 p-5 rounded-2xl flex flex-col justify-between font-sans">
                      <span className="text-[10px] font-bold text-amber-700 uppercase font-mono tracking-wider">Pending Requests</span>
                      <span className="text-3xl font-black text-amber-805 font-mono mt-3">
                        {appointments.filter(a => a.patientId === patients.find(p => p.uid === sessionUser.uid)?.patientId && a.status === 'Pending').length}
                      </span>
                      <p className="text-[10px] text-amber-600 font-mono mt-2">Awaiting doctor verification</p>
                    </div>
                  </div>

                </div>

                {/* Redesigned Appointment Table */}
                <div className="border border-gray-150 p-5 rounded-3xl bg-white">
                  <div className="border-b pb-3 mb-4.5 flex justify-between items-center bg-transparent">
                    <div>
                      <h4 className="text-xs uppercase font-black text-gray-900 font-mono tracking-wider">My Appointments Ledger</h4>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">Scheduled consultation history and status</p>
                    </div>
                    <span className="text-xs font-bold text-teal-850 font-mono">
                      Total: {appointments.filter(a => a.patientId === patients.find(p => p.uid === sessionUser.uid)?.patientId).length} scheduled
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-gray-700">
                      <thead>
                        <tr className="text-[10px] text-gray-400 uppercase font-mono border-b pb-2">
                          <th className="py-2.5">Doctor</th>
                          <th className="py-2.5">Department</th>
                          <th className="py-2.5">Appointment Date</th>
                          <th className="py-2.5">Time</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {appointments.filter(a => a.patientId === patients.find(p => p.uid === sessionUser.uid)?.patientId).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-400 font-mono text-[11px]">
                              You have no appointments registered.
                            </td>
                          </tr>
                        ) : (
                          appointments.filter(a => a.patientId === patients.find(p => p.uid === sessionUser.uid)?.patientId).map((appt) => (
                            <tr key={appt.id} className="hover:bg-gray-50/40">
                              <td className="py-3 font-bold text-teal-900">
                                {appt.doctorName}
                              </td>
                              <td className="py-3 text-gray-550">
                                {doctors.find(d => d.fullName.toLowerCase().includes(appt.doctorName.toLowerCase()))?.specialty || 'General Care'}
                              </td>
                              <td className="py-3 font-mono text-gray-650">{appt.date}</td>
                              <td className="py-3 font-mono text-gray-650">{appt.time}</td>
                              <td className="py-3">
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${appt.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : appt.status === 'Completed' ? 'bg-teal-50 text-teal-700 border border-teal-150' : appt.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                  {appt.status}
                                </span>
                              </td>
                              <td className="py-3 text-right space-x-1">
                                <button 
                                  onClick={() => {
                                    alert(`Appointment Details:\nReference ID: ${appt.id}\nDoctor Assigned: ${appt.doctorName}\nSchedule Date: ${appt.date} (${appt.time})\nSymptoms Logged: ${appt.symptoms || 'None'}\nNotes: ${appt.notes || 'None'}`);
                                  }}
                                  className="px-2.5 py-1.5 border border-gray-200 hover:bg-gray-50 text-[10px] font-bold text-gray-650 rounded-lg cursor-pointer"
                                >
                                  View Details
                                </button>
                                {appt.status === 'Pending' && (
                                  <button 
                                    onClick={() => {
                                      if (confirm("Are you sure you want to cancel this appointment?")) {
                                        saveAppointment({ ...appt, status: 'Cancelled' });
                                        showToast('Appointment cancelled successfully.', 'success');
                                      }
                                    }}
                                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                                  >
                                    Cancel Appointment
                                  </button>
                                )}
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

          {/* DOCTOR SMART CLINIC PORTAL OVERVIEW (DASHBOARD) */}
          {activeTab === 'overview' && sessionUser.role === 'Doctor' && (() => {
            const currentDoc = doctors.find(d => d.uid === sessionUser.uid);
            
            // Dynamic department loading from Firestore
            const matchedDocDept = departments.find(dept => 
              (currentDoc?.departmentId && dept.id === currentDoc.departmentId) ||
              (currentDoc?.department && dept.name.toLowerCase() === currentDoc.department.toLowerCase()) ||
              (sessionUser?.department && dept.name.toLowerCase() === sessionUser.department.toLowerCase())
            );
            const doctorDeptName = matchedDocDept ? matchedDocDept.name : (currentDoc?.department || sessionUser?.department || 'Internal Medicine');
            
            const docExperience = currentDoc?.experience || sessionUser.experience || '5 Years';

            // Today's schedule calculation
            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const todayDayName = daysOfWeek[new Date().getDay()];
            const weeklySched = currentDoc?.weeklySchedule || docWeeklySchedule || DEFAULT_WEEKLY_SCHEDULE || {};
            const todaySched = weeklySched[todayDayName];
            const todayScheduleText = (!todaySched || todaySched.isOff) ? 'OFF' : `${todaySched.startTime} – ${todaySched.endTime}`;

            // Next Appointment calculation
            const docAppointments = appointments
              .filter(a => a.doctorId === sessionUser.uid && a.status !== 'Cancelled' && a.status !== 'Completed')
              .sort((a, b) => {
                if (a.date !== b.date) {
                  return a.date.localeCompare(b.date);
                }
                return a.time.localeCompare(b.time);
              });
            const nextAppt = docAppointments[0];
            const nextApptText = nextAppt 
              ? `${nextAppt.patientName} (${nextAppt.date} @ ${nextAppt.time})`
              : "No upcoming appointments";

            // Availability status
            const isTodayOff = !todaySched || todaySched.isOff || currentDoc?.vacationMode;
            const availabilityStatusValue = isTodayOff ? "Off Duty" : "Available Today";

            // Unique assigned patients for My Patients list
            const uniquePatientIds: string[] = [];
            const assignedPatientsList = appointments
              .filter(a => a.doctorId === sessionUser.uid)
              .sort((a, b) => b.date.localeCompare(a.date))
              .reduce((list: any[], appt) => {
                if (!uniquePatientIds.includes(appt.patientId)) {
                  uniquePatientIds.push(appt.patientId);
                  const patientObj = patients.find(p => p.patientId === appt.patientId || p.uid === appt.patientId);
                  if (patientObj) {
                    list.push(patientObj);
                  }
                }
                return list;
              }, [])
              .slice(0, 5);

            return (
              <div className="space-y-6">

                {/* Department Change Requests Notifications */}
                {(() => {
                  const doctorRequests = deptRequests.filter(r => r.doctorId === sessionUser.uid);
                  if (doctorRequests.length === 0) return null;
                  return (
                    <div className="space-y-3" id="doctor-department-change-requests-notifications">
                      {doctorRequests.map(req => (
                        <div 
                          key={req.id} 
                          className={`p-4 rounded-2xl border text-left flex items-start space-x-3.5 transition-all ${
                            req.status === 'Pending' 
                              ? 'bg-amber-50/50 border-amber-200 text-amber-900' 
                              : req.status === 'Approved'
                              ? 'bg-emerald-50/50 border-emerald-250 text-emerald-950'
                              : 'bg-rose-50/50 border-rose-200 text-rose-950'
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${
                            req.status === 'Pending' 
                              ? 'bg-amber-100 text-amber-700' 
                              : req.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            <GitPullRequest className="h-4 w-4" />
                          </div>
                          <div className="flex-1 text-xs">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold font-sans">
                                Department Change Request: <span className="font-medium font-mono text-[11px] text-gray-500">#{req.id}</span>
                              </h4>
                              <span className={`text-[9.5px] uppercase font-mono px-2 py-0.5 rounded-full font-bold ${
                                req.status === 'Pending' 
                                  ? 'bg-amber-200 text-amber-800' 
                                  : req.status === 'Approved'
                                  ? 'bg-emerald-300 text-emerald-900'
                                  : 'bg-rose-200 text-rose-800'
                              }`}>
                                {req.status === 'Pending' ? 'Pending Approval' : req.status}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] opacity-90">
                              Requested to transfer from <strong className="font-bold">{req.currentDepartmentName}</strong> to <strong className="font-bold">{req.requestedDepartmentName}</strong>.
                            </p>
                            <p className="mt-1.5 text-slate-500 italic block font-mono text-[10px]">
                              "Reason: {req.reason}"
                            </p>
                            
                            {req.status === 'Rejected' && req.adminNotes && (
                              <div className="mt-2.5 p-2 bg-rose-100/55 rounded-xl border border-rose-200/50 text-rose-900">
                                <span className="block font-bold text-[9.5px] uppercase font-mono tracking-wider mb-0.5">Admin Advisory Note:</span>
                                <p className="text-[10.5px] font-sans">{req.adminNotes}</p>
                              </div>
                            )}
                            
                            {req.status === 'Approved' && (
                              <div className="mt-2 text-emerald-850 font-semibold text-[10.5px]">
                                Successfully reallocated to {req.requestedDepartmentName} department. You are now visible under the new department.
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                
                {/* UPGRADED PROFILES GRID: Active Practitioner & Doctor Overview Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Active Practitioner Card */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm text-left">
                    <h3 className="text-xs font-mono font-bold tracking-wider text-teal-600 uppercase mb-4">Active Practitioner</h3>
                    <div className="flex items-center space-x-4 mb-5">
                      <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl font-bold text-lg shrink-0">
                        MD
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-gray-950">Dr. {docProfileForm.fullName || sessionUser.fullName}</h4>
                        <p className="text-xs text-gray-400 font-mono">Specialist Physician</p>
                      </div>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
                        <span className="text-gray-400 font-bold font-mono text-[9px] uppercase">Department:</span>
                        <span className="font-semibold text-gray-800">{doctorDeptName}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
                        <span className="text-gray-400 font-bold font-mono text-[9px] uppercase">Experience:</span>
                        <span className="font-semibold text-gray-800">{docExperience}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 font-bold font-mono text-[9px] uppercase">Today's Schedule:</span>
                        <span className="font-mono font-bold text-teal-700">{todayScheduleText}</span>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Overview Card */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm text-left flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-mono font-bold tracking-wider text-teal-600 uppercase mb-4">Doctor Overview</h3>
                      <div className="space-y-4 text-xs">
                        <div>
                          <span className="block text-gray-450 font-bold font-mono text-[9px] uppercase mb-1">Department</span>
                          <span className="text-xs font-semibold text-gray-900 bg-gray-50 border border-gray-100/50 px-3 py-1.5 rounded-xl inline-block">{doctorDeptName}</span>
                        </div>
                        <div>
                          <span className="block text-gray-450 font-bold font-mono text-[9px] uppercase mb-1">Today's Schedule</span>
                          <span className="text-xs font-mono font-semibold text-teal-850 bg-teal-50 border border-teal-100/30 px-3 py-1.5 rounded-xl inline-block">{todayScheduleText}</span>
                        </div>
                        <div>
                          <span className="block text-gray-450 font-bold font-mono text-[9px] uppercase mb-1">Next Appointment</span>
                          <span className="text-xs font-semibold text-gray-900 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl inline-block">{nextApptText}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 border-t border-gray-100 pt-4 flex items-center justify-between">
                      <span className="text-gray-405 font-bold font-mono text-[9px] uppercase">Availability Status</span>
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold ${availabilityStatusValue === 'Available Today' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                        <span className={`h-2 w-2 rounded-full mr-2 ${availabilityStatusValue === 'Available Today' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        {availabilityStatusValue}
                      </span>
                    </div>
                  </div>
                </div>

                {/* DYNAMIC STATISTICS CARDS ROW */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-left flex items-center space-x-4">
                    <div className="p-3 bg-teal-50 text-teal-600 rounded-xl shrink-0">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="block text-2xl font-black text-gray-900 font-mono">
                        {appointments.filter(a => a.doctorId === sessionUser.uid && a.date === new Date().toISOString().split('T')[0] && a.status !== 'Cancelled').length}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">
                        Today's Appointments
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-left flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="block text-2xl font-black text-gray-900 font-mono">
                        {uniquePatientIds.length}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">
                        My Patients
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-left flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0 relative">
                      <Clock className="h-6 w-6" />
                      {appointments.filter(a => a.doctorId === sessionUser.uid && a.status === 'Pending').length > 0 && (
                        <span className="absolute top-2.5 right-2.5 h-2.5 w-2.5 bg-rose-500 rounded-full animate-ping" />
                      )}
                    </div>
                    <div>
                      <span className="block text-2xl font-black text-gray-900 font-mono">
                        {appointments.filter(a => a.doctorId === sessionUser.uid && a.status === 'Pending').length}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">
                        Pending Consultations
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-left flex items-center space-x-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
                      <Pill className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="block text-2xl font-black text-gray-900 font-mono">
                        {prescriptions.filter(p => p.doctorId === sessionUser.uid).length}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">
                        Prescriptions Written
                      </span>
                    </div>
                  </div>
                </div>

                {/* TODAY'S APPOINTMENTS TABLE */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-left">
                  <div className="flex items-center justify-between mb-4 border-b pb-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-905">Today's Appointments</h3>
                      <p className="text-[11px] text-gray-400 font-medium">Manage scheduled patient consultations</p>
                    </div>
                    <span className="text-[10.5px] bg-teal-50 text-teal-700 px-2.5 py-1 rounded font-bold uppercase tracking-wider">
                      Assigned: {appointments.filter(a => a.doctorId === sessionUser.uid).length} / Today: {appointments.filter(a => a.doctorId === sessionUser.uid && a.date === new Date().toISOString().split('T')[0]).length}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-[10px] text-gray-400 uppercase font-mono border-b pb-2">
                          <th className="py-3 px-3">Patient Name</th>
                          <th className="py-3 px-3">Department</th>
                          <th className="py-3 px-3">Appointment Date</th>
                          <th className="py-3 px-3">Time</th>
                          <th className="py-3 px-3">Symptoms / Reason for Visit</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {appointments.filter(a => a.doctorId === sessionUser.uid).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-gray-400">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <Calendar className="h-8 w-8 text-gray-300" />
                                <p className="font-medium text-gray-505">No appointments scheduled today.</p>
                                <button
                                  onClick={() => setActiveTab('my-schedule')}
                                  className="mt-1 px-4 py-2 bg-teal-600 hover:bg-teal-705 text-white text-[11px] font-bold rounded-xl shadow-sm transition-all"
                                >
                                  View Weekly Schedule
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          appointments.filter(a => a.doctorId === sessionUser.uid).map((appt) => {
                            return (
                              <tr key={appt.id} className="hover:bg-teal-50/10 transition-colors">
                                <td className="py-3.5 px-3 font-bold text-gray-900">{appt.patientName}</td>
                                <td className="py-3.5 px-3">
                                  <span className="px-2 py-1 bg-slate-50 border border-slate-100 text-gray-600 text-[10.5px] rounded-lg">
                                    {doctorDeptName}
                                  </span>
                                </td>
                                <td className="py-3.5 px-3 text-gray-650">{appt.date}</td>
                                <td className="py-3.5 px-3 font-mono text-gray-600">{appt.time}</td>
                                <td className="py-3.5 px-3 text-gray-500 italic max-w-xs truncate" title={appt.symptoms}>
                                  {appt.symptoms || 'Routine checkup.'}
                                </td>
                                <td className="py-3.5 px-3">
                                  <span className={`text-[9.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
                                    appt.status === 'Completed' ? 'bg-teal-50 text-teal-700' : 
                                    appt.status === 'Checked In' ? 'bg-emerald-55 text-emerald-800' : 
                                    appt.status === 'In Consultation' ? 'bg-blue-50 border border-blue-100 text-blue-700' : 
                                    appt.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 
                                    appt.status === 'Cancelled' ? 'bg-rose-50 text-rose-700' : 
                                    'bg-amber-50 text-amber-705 animate-pulse'
                                  }`}>
                                    {appt.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-3 text-right">
                                  <div className="inline-flex space-x-1.5">
                                    <button
                                      onClick={() => {
                                        setSelectedPatientHistoryId(appt.patientId);
                                        if (appt.status !== 'Completed' && appt.status !== 'Cancelled') {
                                          handleUpdateAppointmentStatus(appt.id, 'In Consultation');
                                        }
                                      }}
                                      className="px-2.5 py-1.5 bg-teal-50 text-teal-750 font-bold text-[10.5px] rounded-xl hover:bg-teal-100 transition-all shrink-0"
                                      title="Open Patient File"
                                    >
                                      Open Patient File
                                    </button>
                                    {appt.status !== 'Completed' && appt.status !== 'Cancelled' ? (
                                      <>
                                        <button
                                          onClick={() => {
                                            setRecordForm({ ...recordForm, patientId: appt.patientId });
                                            setActiveTab('medical-records');
                                            setMedicalRecordFormMode('create');
                                            if (appt.status !== 'In Consultation') {
                                              handleUpdateAppointmentStatus(appt.id, 'In Consultation');
                                            }
                                          }}
                                          className="px-2.5 py-1.5 bg-teal-600 text-white font-bold text-[10.5px] rounded-xl hover:bg-teal-700 transition-all shrink-0"
                                          title="Create Medical Record"
                                        >
                                          Create Medical Record
                                        </button>
                                        <button
                                          onClick={() => {
                                            setPrescriptionForm({ ...prescriptionForm, patientId: appt.patientId });
                                            setActiveTab('write-prescriptions');
                                            if (appt.status !== 'In Consultation') {
                                              handleUpdateAppointmentStatus(appt.id, 'In Consultation');
                                            }
                                          }}
                                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10.5px] rounded-xl transition-all shrink-0"
                                          title="Write Prescription"
                                        >
                                          Write Prescription
                                        </button>
                                        <button
                                          onClick={() => handleUpdateAppointmentStatus(appt.id, 'Completed')}
                                          className="px-2.5 py-1.5 bg-emerald-600 text-white font-bold text-[10.5px] rounded-xl hover:bg-emerald-700 transition-all shrink-0"
                                          title="Complete Visit"
                                        >
                                          Complete Visit
                                        </button>
                                      </>
                                    ) : null}
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

                {/* LOWER ROW GRID: Today's Schedule Map & My Patients Quick Directory List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Today's Schedule Widget */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-left">
                    <div className="flex items-center justify-between mb-4 border-b pb-3">
                      <div>
                        <h3 className="text-base font-bold text-gray-905">Today's Schedule</h3>
                        <p className="text-[11px] text-gray-400 font-medium font-mono">Your weekly recurring shift map</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('my-schedule')}
                        className="text-xs bg-teal-50 hover:bg-teal-100 text-teal-700 px-3 py-1.5 rounded-xl font-bold transition-all"
                      >
                        Update Availability
                      </button>
                    </div>
                    <div className="space-y-2 text-xs">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                        const sched = weeklySched[day];
                        const isToday = day === todayDayName;
                        let displayTime = "OFF";
                        if (sched && !sched.isOff) {
                          displayTime = `${sched.startTime} – ${sched.endTime}`;
                        }
                        return (
                          <div key={day} className={`flex items-center justify-between py-2 px-3 rounded-xl transition-colors ${isToday ? 'bg-teal-50/50 border border-teal-100/30 text-teal-900 font-bold' : 'text-gray-600 hover:bg-slate-50'}`}>
                            <span className="flex items-center">
                              {isToday && <span className="h-1.5 w-1.5 bg-teal-600 rounded-full mr-2" />}
                              {day}
                            </span>
                            <span className="font-mono font-semibold">{displayTime}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* My Patients Quick Directory */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4 border-b pb-3">
                        <div>
                          <h3 className="text-base font-bold text-gray-905">My Patients</h3>
                          <p className="text-[11px] text-gray-400 font-medium">Recent assigned patient logs</p>
                        </div>
                        <button
                          onClick={() => setActiveTab('my-patients')}
                          className="text-xs bg-teal-50 hover:bg-teal-100 text-teal-700 px-3 py-1.5 rounded-xl font-bold transition-all"
                        >
                          View Directory ({uniquePatientIds.length})
                        </button>
                      </div>

                      <div className="space-y-3">
                        {assignedPatientsList.length === 0 ? (
                          <p className="text-xs text-gray-400 italic py-6 text-center">No assigned patients recorded.</p>
                        ) : (
                          assignedPatientsList.map((pat) => {
                            const patHistory = medicalRecords.filter(r => r.patientId === pat.patientId && r.doctorId === sessionUser.uid);
                            const lastVisitDate = patHistory.length > 0 
                              ? patHistory.reduce((latest, r) => (r.visitDate || '') > latest ? (r.visitDate || '') : latest, '')
                              : 'No records yet';
                            return (
                              <div key={pat.patientId} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-gray-100/50 transition-all">
                                <div>
                                  <h4 className="text-xs font-bold text-gray-900">{pat.fullName}</h4>
                                  <span className="text-[10px] text-gray-400 font-mono">Last Record: {lastVisitDate}</span>
                                </div>
                                <button
                                  onClick={() => setSelectedPatientHistoryId(pat.patientId)}
                                  className="px-3 py-1.5 border border-teal-200 hover:bg-teal-50/50 text-teal-700 hover:text-teal-800 text-[10.5px] font-bold rounded-xl transition-all cursor-pointer"
                                >
                                  Open Medical Record
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            );
          })()}

          {activeTab === 'overview' && sessionUser.role === 'Admin' && (
            <div className="space-y-6">
                
                {/* Cards row */}
                <div className="grid grid-cols-2 gap-4">
                  
                  <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 text-left">
                    <span className="block text-2xl font-black text-gray-950 font-mono">
                      {doctors.length}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">
                      Total Specialists
                    </span>
                  </div>

                  <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 text-left">
                    <span className="block text-2xl font-black text-gray-950 font-mono">
                      {patients.length}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">
                      Registered Patients
                    </span>
                  </div>

                </div>

                {/* Pending Appointments Action Block */}
              <div className="border border-gray-100 rounded-2xl p-5 text-left">
                <div className="flex items-center justify-between mb-4.5 border-b pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-950">Pending Approvals</h3>
                    <p className="text-[10px] text-gray-400 font-mono">Real-time patient approval waitlist queues</p>
                  </div>
                  <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold font-mono">
                    Needs Action: {appointments.filter(a => a.status === 'Pending').length}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-[10px] text-gray-400 uppercase font-mono border-b pb-2">
                        <th className="py-2.5">Patient Name</th>
                        <th className="py-2.5">Doctor Assigned</th>
                        <th className="py-2.5">Time Schedule</th>
                        <th className="py-2.5">Symptoms / Notes</th>
                        <th className="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {appointments.filter(a => a.status === 'Pending').length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-gray-400 font-mono text-[11px]">
                            All scheduler pending queue files cleared! No actions required.
                          </td>
                        </tr>
                      ) : (
                        appointments.filter(a => a.status === 'Pending').map((appt) => (
                          <tr key={appt.id} className="hover:bg-gray-50/50">
                            <td className="py-3 font-semibold text-gray-900">{appt.patientName}</td>
                            <td className="py-3 text-teal-600 font-medium">{appt.doctorName}</td>
                            <td className="py-3 font-mono">{appt.date} &nbsp; {appt.time}</td>
                            <td className="py-3 text-gray-500 italic max-w-xs truncate" title={appt.symptoms}>
                              {appt.symptoms || appt.notes || 'Routine check.'}
                            </td>
                            <td className="py-3 text-right">
                              {sessionUser.role === 'Admin' || sessionUser.role === 'Doctor' ? (
                                <div className="inline-flex space-x-1">
                                  <button 
                                    onClick={() => handleUpdateAppointmentStatus(appt.id, 'Approved')}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                    title="Approve visit"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateAppointmentStatus(appt.id, 'Cancelled')}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                    title="Reject visit"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded italic">
                                  Pending approval
                                </span>
                              )}
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

          {/* RECEPTIONIST CUSTOM PORTAL - OVERVIEW & QUEUE */}
          {activeTab === 'overview' && sessionUser.role === 'Receptionist' && (() => {
            const todayString = new Date().toISOString().split('T')[0];
            const todaysAppts = appointments.filter(a => a.date === todayString && a.status !== 'Cancelled');
            const totalPatients = patients.length;
            const pendingCheckIns = todaysAppts.filter(a => !a.checkInStatus || a.checkInStatus === 'Pending').length;
            const pendingPaymentsCount = billingInvoices.filter(inv => inv.status === 'Unpaid').length;

            return (
              <div className="space-y-6">
                
                {/* Statistics Cards Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Card 1: Today's Appointments */}
                  <div className="bg-gradient-to-br from-teal-50 to-white p-5 rounded-2xl border border-teal-100 text-left shadow-sm animate-fade-in">
                    <span className="block text-3xl font-black text-teal-950 font-mono">
                      {todaysAppts.length}
                    </span>
                    <span className="block text-xs font-semibold text-teal-800 mt-1 uppercase font-mono tracking-wider">
                      Today's Appointments
                    </span>
                  </div>

                  {/* Card 2: Registered Patients */}
                  <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-2xl border border-slate-100 text-left shadow-sm animate-fade-in [animation-delay:100ms]">
                    <span className="block text-3xl font-black text-slate-950 font-mono">
                      {totalPatients}
                    </span>
                    <span className="block text-xs font-semibold text-slate-500 mt-1 uppercase font-mono tracking-wider">
                      Registered Patients
                    </span>
                  </div>

                  {/* Card 3: Pending Check-ins */}
                  <div className="bg-gradient-to-br from-amber-50 to-white p-5 rounded-2xl border border-amber-100 text-left shadow-sm animate-fade-in [animation-delay:200ms]">
                    <span className="block text-3xl font-black text-amber-950 font-mono">
                      {pendingCheckIns}
                    </span>
                    <span className="block text-xs font-semibold text-amber-800 mt-1 uppercase font-mono tracking-wider">
                      Pending Check-ins
                    </span>
                  </div>

                  {/* Card 4: Pending Payments */}
                  <div className="bg-gradient-to-br from-rose-50 to-white p-5 rounded-2xl border border-rose-100 text-left shadow-sm animate-fade-in [animation-delay:300ms]">
                    <span className="block text-3xl font-black text-rose-950 font-mono">
                      {pendingPaymentsCount}
                    </span>
                    <span className="block text-xs font-semibold text-rose-800 mt-1 uppercase font-mono tracking-wider">
                      Pending Payments
                    </span>
                  </div>

                </div>

                {/* Today's Patient Queue Content Box */}
                <div className="border border-gray-150 bg-white rounded-3xl p-6 text-left shadow-sm animate-fade-in [animation-delay:400ms]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 border-b pb-4 gap-2">
                    <div>
                      <h3 className="text-base font-extrabold text-gray-900">Today's Patient Queue</h3>
                      <p className="text-xs text-gray-500">Track and manage arriving patients for check-ins, waiting times, and consultation readiness.</p>
                    </div>
                    <span className="text-xs bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-bold">
                      Queue Active &bull; {todaysAppts.length} Registered Visits Today
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-[10px] text-gray-400 uppercase font-mono border-b pb-3">
                          <th className="py-3">Patient Name</th>
                          <th className="py-3">Scheduled Time</th>
                          <th className="py-3">Assigned Doctor</th>
                          <th className="py-3">Check-In Status</th>
                          <th className="py-3 text-right">Queue Operations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {todaysAppts.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-gray-400 font-medium font-mono">
                              No appts listed for today. Use the "Register Patient" or "Appointments" modules to schedule one.
                            </td>
                          </tr>
                        ) : (
                          todaysAppts.map((appt) => {
                            const currentCheckIn = appt.checkInStatus || 'Pending';
                            return (
                              <tr key={appt.id} className="hover:bg-slate-50/50">
                                <td className="py-4 font-bold text-gray-900">{appt.patientName}</td>
                                <td className="py-4 font-mono font-medium text-gray-600">{appt.time}</td>
                                <td className="py-4 text-teal-600 font-semibold">{appt.doctorName}</td>
                                <td className="py-4">
                                  <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                    currentCheckIn === 'Pending' ? 'bg-gray-100 text-gray-700' :
                                    currentCheckIn === 'Checked In' ? 'bg-blue-50 text-blue-700' :
                                    currentCheckIn === 'Waiting for Doctor' ? 'bg-amber-50 text-amber-700' :
                                    'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    {currentCheckIn}
                                  </span>
                                </td>
                                <td className="py-4 text-right">
                                  <div className="inline-flex space-x-1.5 z-10">
                                    <button
                                      onClick={() => handleUpdateCheckInStatus(appt.id, 'Checked In')}
                                      disabled={currentCheckIn === 'Checked In'}
                                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                                        currentCheckIn === 'Checked In'
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                      }`}
                                    >
                                      Check In
                                    </button>
                                    <button
                                      onClick={() => handleUpdateCheckInStatus(appt.id, 'Waiting for Doctor')}
                                      disabled={currentCheckIn === 'Waiting for Doctor'}
                                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                                        currentCheckIn === 'Waiting for Doctor'
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                                      }`}
                                    >
                                      Waiting
                                    </button>
                                    <button
                                      onClick={() => handleUpdateCheckInStatus(appt.id, 'Completed')}
                                      disabled={currentCheckIn === 'Completed'}
                                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                                        currentCheckIn === 'Completed'
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                      }`}
                                    >
                                      Completed
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
            );
          })()}

          {/* TAB 2: ADMIN - MANAGE CLINICIANS */}
          {activeTab === 'manage-doctors' && sessionUser.role === 'Admin' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-950">Board Specialists Registry</h3>
                  <p className="text-[10px] text-gray-400 font-mono">Activate, audit, or register clinic consultants</p>
                </div>
                <button 
                  onClick={() => setShowAddDoctorModal(true)}
                  className="rounded-xl bg-teal-600 text-white px-3 py-2 text-xs font-bold hover:bg-teal-700 flex items-center space-x-1.5"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Register Doctor</span>
                </button>
              </div>

              {/* Filters */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter clinicians by name, credentials division..."
                  className="w-full text-xs p-2.5 pl-10 border rounded-xl bg-white focus:outline-none"
                />
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 font-mono text-[10px] text-gray-400 uppercase">
                    <tr>
                      <th className="p-3">Doctor Consultant</th>
                      <th className="p-3">Credentials Division</th>
                      <th className="p-3">Active Outpatient Days</th>
                      <th className="p-3">Contact Email</th>
                      <th className="p-3 text-center">Security Switch</th>
                      <th className="p-3 text-right">Command Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredDoctors.map(doc => {
                      const correlatedUser = users.find(u => u.uid === doc.uid);
                      const isSuspended = correlatedUser ? !correlatedUser.isActive : false;
                      
                      return (
                        <tr key={doc.uid} className={`hover:bg-gray-50/40 ${isSuspended ? 'bg-slate-50/50 opacity-60' : ''}`}>
                          <td className="p-3 flex items-center space-x-2.5">
                            <div className="h-8.5 w-8.5 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {doc.fullName ? doc.fullName.split(' ').map(nBy => nBy[0]).join('').slice(0, 2).toUpperCase() : 'DR'}
                            </div>
                            <div>
                              <span className="block font-bold text-gray-900">{doc.fullName}</span>
                              <span className="block text-[9px] text-slate-400 font-mono">{doc.experience} Experience</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-bold uppercase">
                              {doc.specialty}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[10px]">
                            {doc.availability?.join(', ') || 'N/A'}
                          </td>
                          <td className="p-3 text-gray-550 font-mono">{doc.email}</td>
                          <td className="p-3 text-center">
                            {correlatedUser && (
                              <button 
                                onClick={() => handleUpdateUserStatus(correlatedUser)}
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${correlatedUser.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                              >
                                {correlatedUser.isActive ? 'Active Status' : 'Suspended'}
                              </button>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={() => handleDeleteDoctor(doc.uid)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
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

            </div>
          )}

          {/* TAB: ADMIN - DOCTOR DEPARTMENT CHANGE REQUESTS */}
          {activeTab === 'doctor-department-requests' && sessionUser.role === 'Admin' && (
            <div className="space-y-6" id="/Admin/DoctorDepartmentRequests">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-gray-950">Doctor Department Allocation Requests</h3>
                  <p className="text-xs text-gray-400 font-medium font-sans">Approve or reject doctor clinical reallocation petitions across medical divisions.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono font-bold bg-amber-50 text-amber-700 px-3 py-1 rounded-xl">
                    Pending Requests: {deptRequests.filter(r => r.status === 'Pending').length}
                  </span>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 font-mono text-[10px] text-gray-400 uppercase border-b">
                      <tr>
                        <th className="p-4">Doctor Name</th>
                        <th className="p-4">Current Assignments</th>
                        <th className="p-4">Requested Reallocation</th>
                        <th className="p-4">Submit Date</th>
                        <th className="p-4">Current Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {deptRequests.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-405 font-mono">
                            No department reallocation requests found in database.
                          </td>
                        </tr>
                      ) : (
                        [...deptRequests]
                          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                          .flatMap((req) => {
                            const isExpanded = selectedRequestId === req.id;
                            return [
                              <tr key={req.id} className="hover:bg-gray-50/50 transition-all">
                                <td className="p-4">
                                  <div className="font-extrabold text-gray-900">Dr. {req.doctorName}</div>
                                  <div className="text-[10px] text-gray-400 font-mono">{req.doctorEmail}</div>
                                </td>
                                <td className="p-4 text-gray-700">
                                  <span className="bg-gray-100 text-gray-750 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                                    {req.currentDepartmentName}
                                  </span>
                                </td>
                                <td className="p-4 text-teal-700">
                                  <span className="bg-teal-50 text-teal-705 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                                    {req.requestedDepartmentName}
                                  </span>
                                </td>
                                <td className="p-4 text-gray-450 font-mono text-[10.5px]">
                                  {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="p-4">
                                  <span className={`text-[9.5px] uppercase font-mono px-2 py-0.5 rounded-full font-bold ${
                                    req.status === 'Pending' 
                                      ? 'bg-amber-100 text-amber-700' 
                                      : req.status === 'Approved'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-700'
                                  }`}>
                                    {req.status}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end space-x-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedRequestId(isExpanded ? null : req.id)}
                                      className={`px-2.5 py-1.5 font-bold rounded-lg text-[10.5px] transition-all ${
                                        isExpanded 
                                          ? 'bg-gray-200 text-gray-800' 
                                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }`}
                                    >
                                      {isExpanded ? 'Collapse Details' : 'View Details'}
                                    </button>
                                    
                                    {req.status === 'Pending' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleApproveDeptRequest(req)}
                                          className="px-2.5 py-1.5 bg-emerald-650 text-white hover:bg-emerald-700 transition-all rounded-lg font-bold text-[10.5px]"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveRequestDetails(req);
                                            setRejectionNotes('');
                                            setShowRejectModal(true);
                                          }}
                                          className="px-2.5 py-1.5 bg-rose-650 text-white hover:bg-rose-700 transition-all rounded-lg font-bold text-[10.5px]"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>,
                              isExpanded && (
                                <tr key={`${req.id}-details`} className="bg-teal-50/10">
                                  <td colSpan={6} className="p-4 text-left border-t border-b border-gray-100">
                                    <div className="space-y-3">
                                      <div>
                                        <span className="block text-[10px] font-mono tracking-wider text-gray-400 font-bold uppercase mb-1">Detailed Change Justification</span>
                                        <p className="text-gray-800 text-xs bg-white p-3 rounded-xl border leading-relaxed shadow-3xs italic">
                                          "{req.reason}"
                                        </p>
                                      </div>
                                      
                                      {req.adminNotes && (
                                        <div>
                                          <span className="block text-[10px] font-mono tracking-wider text-gray-400 font-bold uppercase mb-1">Administrative Advisory Remarks</span>
                                          <p className="text-rose-900 text-xs bg-rose-50/50 p-3 rounded-xl border border-rose-100/80 font-medium">
                                            {req.adminNotes}
                                          </p>
                                        </div>
                                      )}

                                      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-100 font-mono">
                                        <span>Request Hash identifier: #{req.id}</span>
                                        <span>Last Synchronized: {new Date(req.updatedAt).toLocaleString()}</span>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )
                            ];
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Helper Audit log card */}
              <div className="p-4 bg-gray-50 border border-gray-150 rounded-2xl text-left text-xs text-gray-500 font-medium font-sans">
                <span className="font-extrabold text-gray-750 block mb-1">Administrative Protocol Policy</span>
                Once approved, the doctor's assigned department is updated immediately across the system. Booking availability slots, patient search lists, and active work metrics will adapt dynamically to display the physician under the approved target division. All status transitions are logged in Firestore and prompt on-screen notifications to the clinician in real-time.
              </div>
            </div>
          )}

          {/* TAB 3: ADMIN - PATIENTS REGISTER */}
          {activeTab === 'manage-patients' && sessionUser.role === 'Admin' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-950">Patient Outpatient Roster</h3>
                <p className="text-[10px] text-gray-400 font-mono">Manage active outpatient clinical logs</p>
              </div>

              {/* Filters */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Find patient profile files by name, clinical ID code..."
                  className="w-full text-xs p-2.5 pl-10 border rounded-xl bg-white focus:outline-none"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 font-mono text-[10px] text-gray-400 uppercase">
                    <tr>
                      <th className="p-3">Outpatient Identity</th>
                      <th className="p-3">Clinical Code</th>
                      <th className="p-3">Sex / Age</th>
                      <th className="p-3">Phone Line</th>
                      <th className="p-3">Registered Address</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPatients.map(p => (
                      <tr key={p.uid} className="hover:bg-gray-50/40">
                        <td className="p-3 flex items-center space-x-2.5">
                          <div className="h-8.5 w-8.5 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {p.fullName ? p.fullName.split(' ').map(nBy => nBy[0]).join('').slice(0, 2).toUpperCase() : 'PA'}
                          </div>
                          <div>
                            <span className="block font-bold text-gray-900">{p.fullName}</span>
                            <span className="block text-[9px] text-slate-400 font-mono">{p.email}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-gray-650">{p.patientId}</td>
                        <td className="p-3">{p.gender} &bull; {p.age} Yrs</td>
                        <td className="p-3 text-gray-500 font-mono">{p.phone}</td>
                        <td className="p-3 text-gray-500 truncate max-w-xs">{p.address}</td>
                        <td className="p-3 text-right">
                          <button 
                            onClick={() => handleDeletePatient(p.uid)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: FINANCIAL LEDGER & REVENUE */}
          {activeTab === 'billing-ledger' && (sessionUser.role === 'Admin' || sessionUser.role === 'Receptionist') && (() => {
            const filteredInvoices = billingInvoices.filter(inv => {
              const text = billingSearchText.toLowerCase();
              return inv.invoiceNumber.toLowerCase().includes(text) || inv.patientName.toLowerCase().includes(text) || inv.service.toLowerCase().includes(text);
            });

            return (
              <div className="space-y-6 text-left animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-950">Billing & Payments</h3>
                    <p className="text-xs text-gray-500 mt-1">Manage invoices, collect patient payments, and track transactions.</p>
                  </div>
                  
                  {sessionUser.role === 'Receptionist' && (
                    <div className="p-5 bg-teal-50/40 border border-teal-100 rounded-2xl max-w-sm w-full shadow-sm">
                      <h5 className="text-sm font-bold text-teal-950 mb-3">Create New Invoice</h5>
                      <form onSubmit={handleRegisterInvoice} className="space-y-2.5 text-xs">
                        <select 
                          required
                          value={billingFormState.patientId}
                          onChange={(e) => setBillingFormState({ ...billingFormState, patientId: e.target.value })}
                          className="w-full text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        >
                          <option value="">-- Choose Patient --</option>
                          {patients.map(p => (
                            <option key={p.uid} value={p.patientId}>{p.fullName} ({p.patientId})</option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <select 
                            value={billingFormState.service}
                            onChange={(e) => setBillingFormState({ ...billingFormState, service: e.target.value })}
                            className="text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                          >
                            <option value="Consultation">Consultation</option>
                            <option value="Dental Extraction">Extraction</option>
                            <option value="Skin Biopsy">Skin Biopsy</option>
                            <option value="Cardio ECG test">Cardio ECG</option>
                            <option value="Preventative vaccination">Vaccination</option>
                          </select>
                          <input 
                            type="number" 
                            required
                            value={billingFormState.amount || ''}
                            onChange={(e) => setBillingFormState({ ...billingFormState, amount: Number(e.target.value) })}
                            placeholder="Amount ($)"
                            className="text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                          />
                        </div>
                        <button 
                          type="submit" 
                          className="w-full p-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-xl font-bold transition-colors shadow-sm"
                        >
                          Register Invoice
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* Invoice Search box */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-gray-400" />
                  <input
                    type="text"
                    value={billingSearchText}
                    onChange={(e) => setBillingSearchText(e.target.value)}
                    placeholder="Search invoices by code, patient name, or treatment service..."
                    className="w-full text-xs p-3 pl-10 border rounded-2xl bg-white focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
                  />
                </div>

                {/* Refactored Billing Ledger Table */}
                <div className="overflow-x-auto border border-gray-150 rounded-3xl bg-white shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-[10px] uppercase font-mono text-gray-500 border-b">
                      <tr>
                        <th className="p-4">Invoice Number</th>
                        <th className="p-4">Patient Name</th>
                        <th className="p-4">Service / Treatment</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs text-gray-800">
                      {filteredInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-gray-400 font-medium">
                            No billing invoice statements found.
                          </td>
                        </tr>
                      ) : (
                        filteredInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/50">
                            <td className="p-4 font-mono font-bold text-gray-900">{inv.invoiceNumber}</td>
                            <td className="p-4 font-semibold">{inv.patientName} <span className="text-[10px] text-gray-400 font-normal">({inv.patientId})</span></td>
                            <td className="p-4 font-medium text-teal-700">{inv.service}</td>
                            <td className="p-4 font-mono font-bold">${inv.amount}</td>
                            <td className="p-4 font-mono text-gray-650">{inv.date}</td>
                            <td className="p-4">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'bg-rose-50 text-rose-700 font-bold'}`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="inline-flex space-x-1.5">
                                {inv.status === 'Unpaid' && (
                                  <button 
                                    onClick={() => handlePayInvoice(inv.id)}
                                    className="px-2.5 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 duration-150 font-bold text-white rounded-lg transition-colors"
                                  >
                                    Collect Payment
                                  </button>
                                )}
                                <button 
                                  onClick={() => setActivePrintInvoice(inv)}
                                  className="px-2.5 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 duration-150 font-bold text-slate-700 rounded-lg transition-colors border border-slate-200"
                                >
                                  Print Invoice
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Dynamic Patient Info Modal for Details action */}
                {activeReceptionistPatient && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-left border relative shadow-2xl">
                      <button 
                        onClick={() => setActiveReceptionistPatient(null)}
                        className="absolute right-4 top-4 p-1 rounded-full hover:bg-slate-50 transition-colors"
                      >
                        <X className="h-4.5 w-4.5 text-gray-400" />
                      </button>
                      
                      <div className="flex items-center space-x-3.5 border-b pb-4 mb-4">
                        <span className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-xl font-bold font-mono">
                          {activeReceptionistPatient.fullName.charAt(0)}
                        </span>
                        <div>
                          <h4 className="text-base font-bold text-gray-955 leading-tight">{activeReceptionistPatient.fullName}</h4>
                          <span className="text-[10px] font-mono text-teal-750 bg-teal-50 px-2 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                            {activeReceptionistPatient.patientId}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 text-xs text-gray-700">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="block text-[10px] text-gray-400 font-bold uppercase">Date of Birth</span>
                            <span className="text-gray-900 font-bold block mt-0.5">{activeReceptionistPatient.dob || "Unknown"}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-gray-400 font-bold uppercase">Gender</span>
                            <span className="text-gray-900 font-bold block mt-0.5">{activeReceptionistPatient.gender}</span>
                          </div>
                        </div>

                        <div>
                          <span className="block text-[10px] text-gray-400 font-bold uppercase">Email Registry</span>
                          <span className="text-gray-905 font-medium block mt-0.5">{activeReceptionistPatient.email}</span>
                        </div>

                        <div>
                          <span className="block text-[10px] text-gray-400 font-bold uppercase font-mono">Phone Contact</span>
                          <span className="text-gray-909 font-bold block mt-0.5">{activeReceptionistPatient.phone}</span>
                        </div>

                        <div>
                          <span className="block text-[10px] text-gray-400 font-bold uppercase font-mono">Residential Address</span>
                          <span className="text-gray-905 font-semibold block mt-0.5">{activeReceptionistPatient.address || "No address listed"}</span>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                          <span className="block text-[10px] text-gray-450 font-bold uppercase mb-1">Emergency Contact</span>
                          <span className="text-gray-900 font-semibold text-xs">{activeReceptionistPatient.emergencyContact || "No emergency contact listed"}</span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t">
                        <button
                          onClick={() => setActiveReceptionistPatient(null)}
                          className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold leading-none transition-colors"
                        >
                          Close Details File
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Printable Invoice / Receipt details modal */}
                {activePrintInvoice && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 text-left border relative shadow-2xl">
                      <button 
                        onClick={() => setActivePrintInvoice(null)}
                        className="absolute right-4 top-4 p-1 rounded-full hover:bg-slate-50 transition-colors"
                      >
                        <X className="h-4.5 w-4.5 text-gray-405" />
                      </button>

                      <div className="border border-gray-150 rounded-2xl p-6 bg-slate-50/50 space-y-4">
                        {/* Header logo */}
                        <div className="flex justify-between items-start border-b pb-4">
                          <div>
                            <h4 className="text-base font-extrabold text-teal-805 tracking-tight flex items-center space-x-1">
                              <span>Smart Clinic Portal Receipt</span>
                            </h4>
                            <p className="text-[10px] text-gray-500 font-medium">100 Clinic Parkway, Suite A</p>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] text-gray-400 font-bold uppercase font-mono">Official invoice</span>
                            <span className="font-mono text-xs font-bold text-gray-900 mt-0.5 block">{activePrintInvoice.invoiceNumber}</span>
                          </div>
                        </div>

                        {/* Bill context */}
                        <div className="grid grid-cols-2 gap-4 text-xs border-b pb-4">
                          <div>
                            <span className="block text-[10px] text-gray-400 font-bold uppercase">Patient Name</span>
                            <span className="text-gray-900 font-bold block mt-0.5">{activePrintInvoice.patientName}</span>
                            <span className="text-[10px] text-gray-500 font-mono">ID: {activePrintInvoice.patientId}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-gray-400 font-bold uppercase font-mono">Transaction details</span>
                            <span className="text-gray-900 font-medium block mt-0.5">Date: {activePrintInvoice.date}</span>
                            <span className="text-gray-900 font-medium block mt-0.5">Method: {activePrintInvoice.paymentMethod}</span>
                          </div>
                        </div>

                        {/* Line items list */}
                        <div className="text-xs space-y-2 border-b pb-4">
                          <span className="block text-[10px] text-gray-400 font-bold uppercase font-mono">Services rendered</span>
                          <div className="flex justify-between font-medium text-gray-800">
                            <span>{activePrintInvoice.service}</span>
                            <span>${activePrintInvoice.amount.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Total amount and Status */}
                        <div className="flex justify-between items-center pt-2">
                          <div>
                            <span className="block text-[10px] text-gray-450 font-bold uppercase">Payment Status</span>
                            <span className={`inline-block text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase mt-1 ${activePrintInvoice.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {activePrintInvoice.status}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] text-gray-455 font-bold uppercase font-mono">Grand Total Amount</span>
                            <span className="text-xl font-mono font-black text-gray-950">${activePrintInvoice.amount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Modal buttons */}
                      <div className="mt-6 flex space-x-3 border-t pt-4 font-sans">
                        <button
                          onClick={() => {
                            window.print();
                          }}
                          className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-md"
                        >
                          <Printer className="h-4.5 w-4.5 shrink-0" />
                          <span>Trigger Print</span>
                        </button>
                        <button
                          onClick={() => setActivePrintInvoice(null)}
                          className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all border border-slate-200"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Viewing Appointment History details modal */}
                {viewingApptHistory && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 text-left space-y-5 animate-scale-up">
                      <div className="flex justify-between items-start border-b pb-3">
                        <div>
                          <h4 className="font-extrabold text-gray-900 text-sm">Appointment Details</h4>
                          <p className="text-[11px] text-gray-400">Scheduled clinical session summary info</p>
                        </div>
                        <button 
                          onClick={() => setViewingApptHistory(null)}
                          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <span className="block text-[10px] text-gray-400 uppercase font-bold">Appointment ID</span>
                            <span className="text-gray-900 font-bold block mt-0.5 font-mono bg-slate-50 px-2 py-0.5 rounded border max-w-max">
                              {viewingApptHistory.id}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-gray-400 uppercase font-bold">Status Badge</span>
                            <span className="inline-block mt-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                viewingApptHistory.status === 'Completed' || viewingApptHistory.status === 'Approved'
                                  ? 'bg-green-50 text-green-750'
                                  : viewingApptHistory.status === 'Cancelled'
                                  ? 'bg-rose-50 text-rose-750'
                                  : 'bg-yellow-50 text-yellow-750'
                              }`}>
                                {viewingApptHistory.status}
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="border-t pt-3 space-y-3">
                          <div>
                            <span className="block text-[10px] text-gray-400 uppercase font-bold">Scheduled Doctor</span>
                            <span className="text-gray-900 font-bold block mt-0.5">{viewingApptHistory.doctorName}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-gray-400 uppercase font-bold">Patient Name</span>
                            <span className="text-gray-900 font-bold block mt-0.5">{viewingApptHistory.patientName}</span>
                            <span className="text-[10px] font-mono text-gray-500">ID: {viewingApptHistory.patientId}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="block text-[10px] text-gray-400 uppercase font-bold">Date</span>
                              <span className="text-gray-950 font-bold block mt-0.5 font-mono">{viewingApptHistory.date}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-gray-400 uppercase font-bold">Time Slot</span>
                              <span className="text-gray-950 font-bold block mt-0.5 font-mono">{viewingApptHistory.time}</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-3 space-y-2">
                          <div>
                            <span className="block text-[10px] text-gray-400 uppercase font-bold">Symptoms / Complaints</span>
                            <p className="text-gray-750 font-semibold leading-relaxed mt-0.5 bg-slate-50/55 p-2 rounded-xl">
                              {viewingApptHistory.symptoms || 'None recorded'}
                            </p>
                          </div>
                          <div>
                            <span className="block text-[10px] text-gray-400 uppercase font-bold">Notes / Description</span>
                            <p className="text-gray-750 font-semibold leading-relaxed mt-0.5 bg-slate-50/55 p-2 rounded-xl">
                              {viewingApptHistory.notes || 'No description notes filed.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <button
                          onClick={() => setViewingApptHistory(null)}
                          className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-colors"
                        >
                          Dismiss details
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })()}

          {/* TAB: TODAY'S APPOINTMENTS (Requirement 3) */}
          {activeTab === 'doctor-schedule' && sessionUser.role === 'Doctor' && (
            <div className="space-y-6 text-left">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900">Today's Appointment Log</h3>
                <p className="text-xs text-gray-405 font-medium">Verify daily outpatient visits, update consultation progress, or write prescription files</p>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-[10px] uppercase font-mono text-gray-500 border-b">
                    <tr>
                      <th className="p-4">Patient Name</th>
                      <th className="p-4">Appointment Time</th>
                      <th className="p-4">Reason / Symptoms</th>
                      <th className="p-4">Current Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs text-gray-850">
                    {appointments.filter(a => a.doctorId === sessionUser.uid).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-400 font-medium text-xs">
                          No appointments assigned. Day is clear!
                        </td>
                      </tr>
                    ) : (
                      appointments.filter(a => a.doctorId === sessionUser.uid).map((appt) => (
                        <tr key={appt.id} className="hover:bg-teal-50/5">
                          <td className="p-4 font-bold text-gray-950">
                            {appt.patientName}
                          </td>
                          <td className="p-4 font-mono font-medium text-gray-650">
                            {appt.date} @ {appt.time}
                          </td>
                          <td className="p-4 text-gray-500 italic max-w-xs truncate" title={appt.symptoms}>
                            {appt.symptoms || 'General consult.'}
                          </td>
                          <td className="p-4">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${appt.status === 'Completed' ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700 font-medium animate-pulse'}`}>
                              {appt.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="inline-flex space-x-1.5">
                              <button
                                onClick={() => setSelectedPatientHistoryId(appt.patientId)}
                                className="px-2 py-1 bg-teal-50 text-teal-750 font-bold rounded-lg hover:bg-teal-100 transition-all shrink-0"
                              >
                                View File
                              </button>
                              {appt.status !== 'Completed' && appt.status !== 'Cancelled' && (
                                <button
                                  onClick={() => handleUpdateAppointmentStatus(appt.id, 'Completed')}
                                  className="px-2 py-1 bg-teal-650 text-white font-bold rounded-lg hover:bg-teal-750 transition-all shrink-0"
                                >
                                  Complete Visit
                                </button>
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
          )}

          {/* TAB: MY PATIENTS (Requirement 8) */}
          {activeTab === 'my-patients' && sessionUser.role === 'Doctor' && (
            <div className="space-y-6 text-left">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900">My Patients Directory</h3>
                <p className="text-xs text-gray-450 font-medium">Directory of all patients registered with or treated under your clinic roster.</p>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-[10px] uppercase font-mono text-gray-500 border-b">
                    <tr>
                      <th className="p-4">Patient Name</th>
                      <th className="p-4">Age</th>
                      <th className="p-4">Gender</th>
                      <th className="p-4">Last Visit</th>
                      <th className="p-4 text-right">Clinical File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs text-gray-850">
                    {patients.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-400 font-medium text-xs">
                          No patients currently in list.
                        </td>
                      </tr>
                    ) : (
                      patients.map((pat) => (
                        <tr key={pat.uid || pat.patientId} className="hover:bg-teal-50/5">
                          <td className="p-4 py-4.5">
                            <div>
                              <div className="font-bold text-gray-950 text-sm">{pat.fullName}</div>
                              <div className="text-[10px] text-gray-400 font-mono font-medium">{pat.patientId}</div>
                            </div>
                          </td>
                          <td className="p-4 text-gray-600">
                            {pat.dob ? calculateAge(pat.dob) : 'N/A'}
                          </td>
                          <td className="p-4 text-gray-650 font-medium">
                            {pat.gender || 'Not specified'}
                          </td>
                          <td className="p-4 font-mono text-gray-500 text-xs">
                            {(() => {
                              const patHistory = medicalRecords.filter(r => r.patientId === pat.patientId);
                              if (patHistory.length === 0) return 'No records registered';
                              return patHistory.reduce((latest, r) => (r.visitDate || '') > latest ? (r.visitDate || '') : latest, '');
                            })()}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setSelectedPatientHistoryId(pat.patientId)}
                              className="px-3 py-1.5 bg-teal-50 text-teal-700 font-bold rounded-xl hover:bg-teal-100 transition-all text-[11px]"
                            >
                              Medical History
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: MEDICAL RECORDS (Requirement 3 & 6) */}
          {activeTab === 'medical-records' && sessionUser.role === 'Doctor' && (
            <div className="space-y-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-905">Patient Medical Records</h3>
                  <p className="text-xs text-gray-400 font-medium">Record diagnosis files, diagnostic vitals, and therapeutic treatment plans.</p>
                </div>
                <div>
                  {medicalRecordFormMode === 'list' ? (
                    <button
                      onClick={() => {
                        setMedicalRecordFormMode('create');
                        setRecordForm({
                          patientId: '',
                          symptoms: '',
                          diagnosis: '',
                          treatmentPlan: '',
                          notes: ''
                        });
                      }}
                      className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all flex items-center space-x-1.5 shadow-sm"
                    >
                      <PlusCircle className="h-4.5 w-4.5" />
                      <span>Create Medical Record</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setMedicalRecordFormMode('list')}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
                    >
                      Back to Records List
                    </button>
                  )}
                </div>
              </div>

              {medicalRecordFormMode === 'list' ? (
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-[10px] uppercase font-mono text-gray-500 border-b">
                      <tr>
                        <th className="p-4">Record ID</th>
                        <th className="p-4">Patient ID</th>
                        <th className="p-4">Diagnosis</th>
                        <th className="p-4">Treatment Plan</th>
                        <th className="p-4">Created Date</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs text-gray-800">
                      {medicalRecords.filter(r => r.doctorId === sessionUser.uid || r.doctorName === sessionUser.fullName).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-400 font-medium text-xs">
                            No medical records created by you yet.
                          </td>
                        </tr>
                      ) : (
                        medicalRecords.filter(r => r.doctorId === sessionUser.uid || r.doctorName === sessionUser.fullName).map((rec) => (
                          <tr key={rec.id} className="hover:bg-teal-50/5">
                            <td className="p-4 font-mono font-bold text-teal-750">{rec.id}</td>
                            <td className="p-4 font-mono text-gray-500">{rec.patientId}</td>
                            <td className="p-4 font-bold text-gray-900">{rec.diagnosis}</td>
                            <td className="p-4 text-gray-600 max-w-xs truncate" title={rec.treatmentPlan}>{rec.treatmentPlan}</td>
                            <td className="p-4 text-gray-400">{rec.date ? rec.date.split('T')[0] : 'N/A'}</td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => setSelectedPatientHistoryId(rec.patientId)}
                                className="px-2 py-1 bg-teal-50 text-teal-700 font-bold rounded hover:bg-teal-100 transition-all"
                              >
                                View Patient History
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm max-w-2xl mx-auto text-left">
                  <div className="mb-6">
                    <h4 className="text-base font-bold text-gray-900 border-b pb-2">Medical Diagnosis & Consultation Worksheet</h4>
                    <p className="text-xs text-gray-400 mt-1">Populate treatment specifics to sync with client EHR database.</p>
                  </div>
                  <form onSubmit={(e) => {
                    handleCreateRecord(e);
                    setMedicalRecordFormMode('list');
                  }} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Select Patient *</label>
                      <select 
                        required
                        value={recordForm.patientId}
                        onChange={(e) => setRecordForm({ ...recordForm, patientId: e.target.value })}
                        className="w-full text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                      >
                        <option value="">-- Click to choose patient --</option>
                        {patients.map(p => (
                          <option key={p.uid} value={p.patientId}>{p.fullName} ({p.patientId})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Symptoms / Vitals *</label>
                        <input 
                          type="text" 
                          required
                          value={recordForm.symptoms}
                          onChange={(e) => setRecordForm({ ...recordForm, symptoms: e.target.value })}
                          placeholder="e.g. Temp: 98.6F, severe back pain"
                          className="w-full text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Formal Clinical Diagnosis *</label>
                        <input 
                          type="text" 
                          required
                          value={recordForm.diagnosis}
                          onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                          placeholder="e.g. Acute Lumbar Sprain"
                          className="w-full text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Therapeutic Treatment Plan *</label>
                      <textarea 
                        required
                        rows={3}
                        value={recordForm.treatmentPlan}
                        onChange={(e) => setRecordForm({ ...recordForm, treatmentPlan: e.target.value })}
                        placeholder="Detail the target exercises, recovery timelines, rest parameters, and physical therapy referral..."
                        className="w-full text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Doctor Notes</label>
                      <input 
                        type="text" 
                        value={recordForm.notes}
                        onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                        placeholder="Input private references or physical check observations..."
                        className="w-full text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full rounded-xl bg-teal-600 text-white p-3 text-xs font-bold tracking-wide hover:bg-teal-700 transition-all flex items-center justify-center space-x-1.5"
                    >
                      <FilePlus className="h-4.5 w-4.5" />
                      <span>Save Medical Record</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB: WRITE PRESCRIPTION (Requirement 3 & 7) */}
          {activeTab === 'write-prescriptions' && sessionUser.role === 'Doctor' && (
            <div className="space-y-6 text-left max-w-2xl mx-auto">
              <div>
                <h3 className="text-xl font-extrabold text-gray-905">Write Prescription</h3>
                <p className="text-xs text-gray-400 font-medium">Issue regulatory prescriptions securely connected to the patient's record profile.</p>
              </div>

              <form onSubmit={handleCreatePrescription} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Select Patient *</label>
                  <select 
                    required
                    value={prescriptionForm.patientId}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientId: e.target.value })}
                    className="w-full text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                  >
                    <option value="">-- Click to choose patient --</option>
                    {patients.map(p => (
                      <option key={p.uid} value={p.patientId}>{p.fullName} ({p.patientId})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Medicine Name *</label>
                    <input 
                      type="text" 
                      required
                      value={prescriptionForm.medicineName}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, medicineName: e.target.value })}
                      placeholder="e.g. Amoxicillin Trihydrate"
                      className="w-full text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Dosage *</label>
                    <input 
                      type="text" 
                      required
                      value={prescriptionForm.dosage}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, dosage: e.target.value })}
                      placeholder="e.g. 500mg capsules"
                      className="w-full text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Frequency *</label>
                    <select 
                      value={prescriptionForm.frequency}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, frequency: e.target.value })}
                      className="w-full text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                    >
                      <option value="Once Daily">Once Daily</option>
                      <option value="Twice Daily">Twice Daily</option>
                      <option value="Thrice Daily">Thrice Daily</option>
                      <option value="Before sleep">Before sleep</option>
                      <option value="every 8 hours">every 8 hours</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Duration *</label>
                    <input 
                      type="text" 
                      required
                      value={prescriptionForm.duration}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, duration: e.target.value })}
                      placeholder="e.g. 7 Days course"
                      className="w-full text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
                  <input 
                    type="text" 
                    value={prescriptionForm.notes}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, notes: e.target.value })}
                    placeholder="Take after heavy food of choice..."
                    className="w-full text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full rounded-xl bg-teal-600 text-white p-3 text-xs font-bold tracking-wide hover:bg-teal-700 transition-all flex items-center justify-center space-x-1.5"
                >
                  <Sparkles className="h-4.5 w-4.5" />
                  <span>Save Prescription</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB: MY SCHEDULE (Requirement 3 & 4) */}
          {((activeTab === 'my-schedule' || activeTab === 'doctor-schedule-management') && sessionUser.role === 'Doctor') && (
            <div className="space-y-6 text-left max-w-4xl mx-auto animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Clinical Availability & Resource Planner</h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Define your clinic days, shift hours, lunch breaks, slot intervals, and vacation limits.</p>
                </div>
                <div className="mt-2 sm:mt-0 font-mono text-[10px] text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
                  /Doctor/Schedule Status: Active
                </div>
              </div>

              {/* SECTION: GENERAL CLINIC CONFIGS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Duration & Vacation Switch */}
                <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-black uppercase text-gray-400 font-mono tracking-wider">Clinic Booking Parameters</h4>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Default Slot Interval Duration</label>
                    <select
                      value={docApptDuration}
                      onChange={(e) => setDocApptDuration(parseInt(e.target.value, 10))}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white font-semibold text-gray-800"
                    >
                      <option value={15}>15 Minutes Slot Duration</option>
                      <option value={20}>20 Minutes Slot Duration</option>
                      <option value={30}>30 Minutes Slot Duration</option>
                      <option value={45}>45 Minutes Slot Duration</option>
                      <option value={60}>60 Minutes (1 hour) Slot Duration</option>
                    </select>
                  </div>

                  <div className="pt-3 border-t">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="block text-xs font-bold text-gray-850">Full Vacation Mode Trigger</span>
                        <span className="block text-[10px] text-gray-400">Instantly locks out bookings for all days until turned off.</span>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={docVacationMode}
                          onChange={(e) => setDocVacationMode(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-250 rounded-full peer peer-focus:ring-2 peer-focus:ring-teal-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Mark Specific Off Dates / Vacation Days */}
                <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-black uppercase text-gray-400 font-mono tracking-wider">Custom Rest Days / Absence Log</h4>
                  
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="date"
                        value={newUnavailableDay}
                        onChange={(e) => setNewUnavailableDay(e.target.value)}
                        className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newUnavailableDay) return;
                        if (docUnavailableDays.includes(newUnavailableDay)) {
                          showToast('Day is already tagged as unavailable', 'error');
                          return;
                        }
                        setDocUnavailableDays([...docUnavailableDays, newUnavailableDay].sort());
                        setNewUnavailableDay('');
                        showToast('Custom absence day added!');
                      }}
                      className="px-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl transition-all"
                    >
                      Add Day
                    </button>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 font-mono tracking-wider uppercase mb-1.5">Marked Unavailable Dates ({docUnavailableDays.length})</span>
                    {docUnavailableDays.length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic">No custom rest dates marked.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-gray-50 rounded-lg">
                        {docUnavailableDays.map(dayStr => (
                          <span key={dayStr} className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-100 text-[10px] text-rose-700 font-bold rounded">
                            {dayStr}
                            <button
                              type="button"
                              onClick={() => {
                                setDocUnavailableDays(docUnavailableDays.filter(d => d !== dayStr));
                              }}
                              className="text-rose-400 hover:text-rose-900 font-bold font-sans"
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

              {/* WEEKLY RECURRING SCHEDULE */}
              <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="border-b pb-3.5">
                  <h4 className="text-xs font-black uppercase text-gray-400 font-mono tracking-wider">Weekly Shift Availability Grid</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Toggle each weekday. Fill in shifts and break windows (e.g. lunch periods).</p>
                </div>

                <div className="space-y-4 pt-1">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                    const sched = docWeeklySchedule[day] || { isOff: true, startTime: '09:00 AM', endTime: '05:00 PM', breakStartTime: '12:00 PM', breakEndTime: '01:00 PM' };
                    
                    const handleDayUpdate = (fields: Partial<typeof sched>) => {
                      setDocWeeklySchedule({
                        ...docWeeklySchedule,
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
                      <div key={day} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        
                        {/* Day Title & Working Status switch */}
                        <div className="flex items-center justify-between lg:w-44 shrink-0">
                          <div>
                            <span className="block text-sm font-extrabold text-gray-905">{day}</span>
                            <span className={`inline-block text-[9px] font-mono font-black uppercase rounded-full px-2 py-0.5 ${sched.isOff ? 'bg-gray-200 text-gray-600' : 'bg-teal-100 text-teal-700'}`}>
                              {sched.isOff ? 'OFF / CLINIC CLOSED' : 'ON-DUTY'}
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
                              <div className="w-9 h-5 bg-gray-250 rounded-full peer peer-focus:ring-2 peer-focus:ring-teal-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                            </label>
                          </div>
                        </div>

                        {/* Shift Times */}
                        {!sched.isOff ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
                            <div>
                              <span className="block text-[9px] font-mono text-gray-400 uppercase tracking-widest mb-1">Shift Starts</span>
                              <select
                                value={sched.startTime}
                                onChange={(e) => handleDayUpdate({ startTime: e.target.value })}
                                className="w-full text-xs p-2 border border-gray-200 rounded-xl bg-white focus:outline-none"
                              >
                                {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            </div>
                            <div>
                              <span className="block text-[9px] font-mono text-gray-400 uppercase tracking-widest mb-1">Shift Ends</span>
                              <select
                                value={sched.endTime}
                                onChange={(e) => handleDayUpdate({ endTime: e.target.value })}
                                className="w-full text-xs p-2 border border-gray-200 rounded-xl bg-white focus:outline-none"
                              >
                                {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            </div>
                            <div>
                              <span className="block text-[9px] font-mono text-gray-400 uppercase tracking-widest mb-1">Break Starts</span>
                              <select
                                value={sched.breakStartTime || '12:00 PM'}
                                onChange={(e) => handleDayUpdate({ breakStartTime: e.target.value })}
                                className="w-full text-xs p-2 border border-gray-200 rounded-xl bg-white focus:outline-none"
                              >
                                {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            </div>
                            <div>
                              <span className="block text-[9px] font-mono text-gray-400 uppercase tracking-widest mb-1">Break Ends</span>
                              <select
                                value={sched.breakEndTime || '01:00 PM'}
                                onChange={(e) => handleDayUpdate({ breakEndTime: e.target.value })}
                                className="w-full text-xs p-2 border border-gray-200 rounded-xl bg-white focus:outline-none"
                              >
                                {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center py-4 text-xs text-gray-400 italic">
                            Clinician is offline on {day}. No scheduled slot intervals will be generated.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      const activeDays = Object.keys(docWeeklySchedule).filter(day => !docWeeklySchedule[day].isOff);

                      const updatedUser: UserType = {
                        ...sessionUser,
                        weeklySchedule: docWeeklySchedule,
                        appointmentDuration: docApptDuration,
                        vacationMode: docVacationMode,
                        unavailableDays: docUnavailableDays,
                        availability: activeDays
                      };

                      const currentDoc = doctors.find(d => d.uid === sessionUser.uid);
                      const updatedDocRecord: DoctorRecord = {
                        uid: sessionUser.uid,
                        doctorId: currentDoc?.doctorId || 'DOC-' + Math.floor(1000 + Math.random() * 9000),
                        fullName: currentDoc?.fullName || sessionUser.fullName || '',
                        specialty: currentDoc?.specialty || sessionUser.specialty || 'General Care',
                        experience: currentDoc?.experience || sessionUser.experience || '5 years',
                        phone: currentDoc?.phone || sessionUser.phone || '',
                        email: currentDoc?.email || sessionUser.email || '',
                        bio: currentDoc?.bio || 'Smart Clinic registered practitioner.',
                        profileImage: currentDoc?.profileImage || '',
                        availability: activeDays,
                        weeklySchedule: docWeeklySchedule,
                        appointmentDuration: docApptDuration,
                        vacationMode: docVacationMode,
                        unavailableDays: docUnavailableDays,
                        department: currentDoc?.department || sessionUser.department || 'Internal Medicine',
                      };

                      saveUser(updatedUser);
                      saveDoctor(updatedDocRecord);
                      setCurrentSessionUser(updatedUser);

                      showToast('Availability configurations written successfully!');
                      forceRefresh();
                    }}
                    className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-teal-600/10 transition-all flex items-center justify-center space-x-2"
                  >
                    <Check className="h-4.5 w-4.5" />
                    <span>Save Availability Planner</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MY PROFILE (Requirement 3 & 8) */}
          {activeTab === 'doctor-profile' && sessionUser.role === 'Doctor' && (() => {
            const currentDoc = doctors.find(d => d.uid === sessionUser.uid);
            const matchedDocDept = departments.find(dept => 
              (currentDoc?.departmentId && dept.id === currentDoc.departmentId) ||
              (currentDoc?.department && dept.name.toLowerCase() === currentDoc.department.toLowerCase()) ||
              (sessionUser?.department && dept.name.toLowerCase() === sessionUser.department.toLowerCase())
            );
            const currentDeptName = matchedDocDept ? matchedDocDept.name : (currentDoc?.department || sessionUser?.department || 'Dermatology');

            return (
              <div className="space-y-6 text-left max-w-2xl mx-auto">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">Physician Profile Credential</h3>
                  <p className="text-xs text-gray-400 font-medium">Verify or edit your clinical practitioner record profile.</p>
                </div>

                {!isEditingDoctorProfile ? (
                  <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="flex items-center space-x-4 border-b pb-4">
                      <div className="p-4 bg-teal-50 text-teal-700 rounded-2xl font-bold text-lg shrink-0">
                        MD
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-gray-950 font-sans tracking-tight">Dr. {docProfileForm.fullName}</h4>
                        <p className="text-xs text-teal-655 font-bold uppercase tracking-wider">{docProfileForm.specialty}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="block text-gray-400 font-bold font-mono tracking-wider uppercase text-[9.5px]">Email Address</span>
                        <span className="text-sm font-semibold text-gray-800">{docProfileForm.email}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 font-bold font-mono tracking-wider uppercase text-[9.5px]">Direct Phone Line</span>
                        <span className="text-sm font-semibold text-gray-800">{docProfileForm.phone}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 font-bold font-mono tracking-wider uppercase text-[9.5px]">Work Experience</span>
                        <span className="text-sm font-semibold text-gray-850 font-bold">{docProfileForm.experience}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 font-bold font-mono tracking-wider uppercase text-[9.5px]">Weekly Schedule Slots</span>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {docProfileForm.availability.map(day => (
                            <span key={day} className="bg-teal-50 text-teal-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                              {day}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Current Assignment Display (Read-Only) */}
                      <div className="sm:col-span-2 border-t pt-4">
                        <h5 className="text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase mb-3">Departmental Assignment</h5>
                        <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 border border-gray-150 rounded-xl relative">
                          <div id="doctor-profile-current-dept-display">
                            <span className="block text-gray-400 font-bold font-mono tracking-wider uppercase text-[9px]">Current Department</span>
                            <span className="text-sm font-bold text-gray-800">{currentDeptName}</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-gray-200/50 pt-2.5 mt-1">
                            <span className="text-[10.5px] font-medium text-gray-500 italic block">
                              Assigned by Administration
                            </span>
                            <button
                              type="button"
                              id="btn-request-dept-change"
                              onClick={() => {
                                setRequestDeptId('');
                                setRequestReason('');
                                setShowDeptRequestModal(true);
                              }}
                              className="px-3.5 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700 transition-all shadow-sm shrink-0"
                            >
                              Request Department Change
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsEditingDoctorProfile(true)}
                      className="w-full bg-teal-600 text-white text-xs font-bold p-3 rounded-xl hover:bg-teal-700 transition-all flex items-center justify-center space-x-1.5"
                    >
                      <span>Edit Profile Credentials</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSaveDoctorProfile} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
                    <h4 className="text-sm font-bold text-gray-900 border-b pb-2 mb-2">Edit Physician Credentials</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                        <input 
                          type="text" 
                          required
                          value={docProfileForm.fullName}
                          onChange={(e) => setDocProfileForm({ ...docProfileForm, fullName: e.target.value })}
                          className="w-full text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Medical Specialty *</label>
                        <input 
                          type="text" 
                          required
                          value={docProfileForm.specialty}
                          onChange={(e) => setDocProfileForm({ ...docProfileForm, specialty: e.target.value })}
                          className="w-full text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                        <input 
                          type="email" 
                          required
                          value={docProfileForm.email}
                          onChange={(e) => setDocProfileForm({ ...docProfileForm, email: e.target.value })}
                          className="w-full text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Direct Phone Line *</label>
                        <input 
                          type="tel" 
                          required
                          value={docProfileForm.phone}
                          onChange={(e) => setDocProfileForm({ ...docProfileForm, phone: e.target.value })}
                          className="w-full text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Practicing Experience Years *</label>
                      <input 
                        type="text" 
                        required
                        value={docProfileForm.experience}
                        onChange={(e) => setDocProfileForm({ ...docProfileForm, experience: e.target.value })}
                        className="w-full text-xs p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>

                    {/* Read-Only Department inside Editing mode */}
                    <div className="border-t pt-4">
                      <h5 className="text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase mb-3 text-left">Official Assignment Details (Disabled)</h5>
                      <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 border border-gray-150 rounded-xl text-left">
                        <div>
                          <span className="block text-gray-400 font-bold font-mono tracking-wider uppercase text-[9px]">Current Department</span>
                          <input 
                            type="text" 
                            disabled 
                            value={currentDeptName}
                            className="w-full mt-1 text-xs p-2 bg-gray-100 border rounded-lg text-gray-500 font-semibold cursor-not-allowed"
                          />
                        </div>
                        <div className="text-[10.5px] font-medium text-gray-500 italic">
                          Assigned by Administration. Direct editing is strictly disabled. Use "Request Department Change" from the main profile view.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-3 border-t">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all flex-1"
                      >
                        Save Profile Updates
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingDoctorProfile(false)}
                        className="px-4 py-2 bg-gray-100 text-gray-750 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })()}

          {/* TAB 8: RECEPTIONIST - REGISTER PATIENT */}
          {activeTab === 'register-patient' && sessionUser.role === 'Receptionist' && (
            <div className="space-y-6 text-left max-w-2xl mx-auto border border-gray-150 p-6 bg-white rounded-3xl shadow-sm animate-fade-in">
              <div className="border-b pb-4">
                <h3 className="text-xl font-extrabold text-gray-905">Register Patient</h3>
                <p className="text-xs text-gray-500 mt-1">Create patient record and demographic files.</p>
              </div>

              <form onSubmit={handleRegisterPatient} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wide">Full Name *</label>
                    <input 
                      type="text" 
                      required
                      value={patientForm.fullName}
                      onChange={(e) => setPatientForm({ ...patientForm, fullName: e.target.value })}
                      placeholder="e.g. Oliver Jones"
                      className="w-full text-xs p-2.5 rounded-xl border bg-white focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wide">Contact Email *</label>
                    <input 
                      type="email" 
                      required
                      value={patientForm.email}
                      onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                      placeholder="e.g. oliver@email.com"
                      className="w-full text-xs p-2.5 rounded-xl border bg-white focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wide">Phone Number *</label>
                    <input 
                      type="text" 
                      required
                      value={patientForm.phone}
                      onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                      placeholder="+1 (555) 754-0011"
                      className="w-full text-xs p-2.5 rounded-xl border bg-white focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wide">Emergency Contact</label>
                    <input 
                      type="text" 
                      value={patientForm.emergencyContact}
                      onChange={(e) => setPatientForm({ ...patientForm, emergencyContact: e.target.value })}
                      placeholder="Jane Jones (Mother) - +1..."
                      className="w-full text-xs p-2.5 rounded-xl border bg-white focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wide">Gender *</label>
                    <select 
                      value={patientForm.gender} 
                      onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border bg-white focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other / Non-Binary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wide">Date of Birth *</label>
                    <input 
                      type="date" 
                      required
                      value={patientForm.dob}
                      onChange={(e) => setPatientForm({ ...patientForm, dob: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border bg-white focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wide">Registered Residence Address *</label>
                  <input 
                    type="text" 
                    required
                    value={patientForm.address}
                    onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                    placeholder="Full street name and town registry details..."
                    className="w-full text-xs p-2.5 rounded-xl border bg-white focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-teal-600 text-white font-bold p-3 text-xs rounded-xl hover:bg-teal-700 transition-colors shadow-lg shadow-teal-500/5 mt-2"
                >
                  Create Patient Record
                </button>
              </form>
            </div>
          )}

          {/* RECEPTIONIST - APPOINTMENTS PORTAL */}
          {activeTab === 'appointments' && sessionUser.role === 'Receptionist' && (() => {
            const filteredAppts = appointments.filter(appt => {
              const text = appointmentSearchText.toLowerCase();
              return appt.patientName.toLowerCase().includes(text) || appt.doctorName.toLowerCase().includes(text);
            });

            return (
              <div className="space-y-6 text-left animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-900">Appointments Desk</h3>
                    <p className="text-xs text-gray-500">Search, schedule, check-in, and reschedule clinical appointments.</p>
                  </div>
                </div>

                {/* Filter and Search Box */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-gray-400" />
                  <input
                    type="text"
                    value={appointmentSearchText}
                    onChange={(e) => setAppointmentSearchText(e.target.value)}
                    placeholder="Search appointments by patient name or specialist name..."
                    className="w-full text-xs p-3 pl-10 border rounded-2xl bg-white focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
                  />
                </div>

                {/* Main Redesigned Appointments Table */}
                <div className="overflow-x-auto border border-gray-150 rounded-3xl bg-white shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-[10px] uppercase font-mono text-gray-500 border-b">
                      <tr>
                        <th className="p-4">Patient Name</th>
                        <th className="p-4">Doctor</th>
                        <th className="p-4">Department</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Time</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredAppts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-gray-450 font-medium">
                            No appointments found matching search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredAppts.map((appt) => {
                          const docRecord = doctors.find(d => d.uid === appt.doctorId || d.doctorId === appt.doctorId);
                          const department = docRecord?.department || docRecord?.specialty || "General Care";
                          const isCancelled = appt.status === 'Cancelled';
                          
                          return (
                            <tr key={appt.id} className="hover:bg-slate-50/50">
                              <td className="p-4 font-bold text-gray-900">{appt.patientName}</td>
                              <td className="p-4 text-teal-700 font-semibold">{appt.doctorName}</td>
                              <td className="p-4 text-gray-600 font-medium">{department}</td>
                              <td className="p-4 font-mono font-medium">{appt.date}</td>
                              <td className="p-4 font-mono font-medium">{appt.time}</td>
                              <td className="p-4">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  appt.status === 'Approved' ? 'bg-teal-50 text-teal-700 font-bold' :
                                  appt.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 font-bold' :
                                  appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 font-bold' :
                                  'bg-amber-50 text-amber-700 font-bold'
                                }`}>
                                  {appt.status}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <div className="inline-flex space-x-1.5">
                                  {/* Action 1: Check In */}
                                  <button
                                    onClick={() => handleUpdateCheckInStatus(appt.id, 'Checked In')}
                                    disabled={appt.checkInStatus === 'Checked In' || isCancelled || appt.status === 'Completed'}
                                    className={`px-2 py-1 text-[10px] font-bold rounded ${
                                      appt.checkInStatus === 'Checked In' || isCancelled || appt.status === 'Completed'
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                                    }`}
                                    title="Check In Outpatient"
                                  >
                                    Check In
                                  </button>

                                  {/* Action 2: Reschedule */}
                                  <button
                                    onClick={() => {
                                      setReschedulingAppt(appt);
                                      setRescheduleDate(appt.date);
                                      setRescheduleTime(appt.time);
                                    }}
                                    disabled={appt.status === 'Completed' || isCancelled}
                                    className="px-2 py-1 text-[10px] font-bold rounded bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                                  >
                                    Reschedule
                                  </button>

                                  {/* Action 3: Cancel */}
                                  <button
                                    onClick={() => handleUpdateAppointmentStatus(appt.id, 'Cancelled')}
                                    disabled={isCancelled || appt.status === 'Completed'}
                                    className={`px-2 py-1 text-[10px] font-bold rounded ${
                                      isCancelled || appt.status === 'Completed'
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                    }`}
                                  >
                                    Cancel
                                  </button>

                                  {/* Action 4: View Details */}
                                  <button
                                    onClick={() => {
                                      const pRec = patients.find(p => p.patientId === appt.patientId || p.uid === appt.patientId);
                                      if (pRec) {
                                        setActiveReceptionistPatient(pRec);
                                      } else {
                                        showToast("Patient record lookup unsuccessful.", "error");
                                      }
                                    }}
                                    className="px-2 py-1 text-[10px] font-bold rounded bg-teal-600 hover:bg-teal-700 text-white animate-fade-in"
                                  >
                                    Details
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
            );
          })()}

          {/* RECEPTIONIST - PATIENT DIRECTORY */}
          {activeTab === 'patients' && sessionUser.role === 'Receptionist' && (() => {
            const filteredPatients = patients.filter(p => {
              const text = patientSearchText.toLowerCase();
              return p.fullName.toLowerCase().includes(text) || p.patientId.toLowerCase().includes(text) || p.email.toLowerCase().includes(text);
            });

            return (
              <div className="space-y-6 text-left animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 font-sans">
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-950 font-sans">Patient Directory</h3>
                    <p className="text-xs text-gray-500 mt-1">View demographic information and verify emergency contacts.</p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-gray-400" />
                  <input
                    type="text"
                    value={patientSearchText}
                    onChange={(e) => setPatientSearchText(e.target.value)}
                    placeholder="Search patients by name, patient ID, or email address..."
                    className="w-full text-xs p-3 pl-10 border rounded-2xl bg-white focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPatients.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-450 font-medium">
                      No patients found in the register directory.
                    </div>
                  ) : (
                    filteredPatients.map((p) => (
                      <div key={p.uid} className="bg-white border border-gray-150 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center space-x-3 mb-3 border-b pb-2">
                            <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold font-mono">
                              {p.fullName.charAt(0)}
                            </span>
                            <div>
                              <h4 className="font-bold text-gray-900 leading-tight">{p.fullName}</h4>
                              <span className="text-[10px] font-mono text-teal-750 bg-teal-50 px-2 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                                {p.patientId}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs text-gray-600 mt-2">
                            <p><span className="font-semibold text-gray-400">DOB:</span> {p.dob || p.age + " Years Old"}</p>
                            <p><span className="font-semibold text-gray-400">Gender:</span> {p.gender}</p>
                            <p><span className="font-semibold text-gray-400">Phone:</span> {p.phone}</p>
                            <p className="truncate"><span className="font-semibold text-gray-400">Email:</span> {p.email}</p>
                            <p className="truncate"><span className="font-semibold text-gray-400">Emergency:</span> {p.emergencyContact || 'Not Listed'}</p>
                          </div>
                        </div>

                        <div className="mt-4 border-t pt-3">
                          <a
                            href={`/Receptionist/PatientDetails/${p.uid}`}
                            onClick={(e) => {
                              e.preventDefault();
                              setActiveReceptionistPatient(p);
                              onNavigate('dashboard', 'receptionist-patient-details', p.uid);
                            }}
                            className="block text-center w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold leading-none transition-colors cursor-pointer"
                          >
                            View Core Details
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}

          {/* RECEPTIONIST - PATIENT DETAILS PAGE */}
          {activeTab === 'receptionist-patient-details' && sessionUser.role === 'Receptionist' && (() => {
            const match = window.location.pathname.match(/\/receptionist\/patientdetails\/([^/]+)/i);
            const detailUid = match ? match[1] : (activeReceptionistPatient?.uid || '');
            const patient = patients.find(p => p.uid === detailUid);
            const user = users.find(u => u.uid === detailUid);
            
            if (!patient) {
              return (
                <div className="space-y-6 text-left animate-fade-in py-12 text-center">
                  <div className="max-w-md mx-auto space-y-4 font-sans">
                    <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">!</div>
                    <h3 className="text-xl font-bold text-gray-900">No patient information available.</h3>
                    <p className="text-xs text-gray-405">The referenced patient UID does not match any registered patients in the system directory.</p>
                    <button 
                      onClick={() => onNavigate('dashboard', 'patients')}
                      className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold leading-none transition-colors cursor-pointer"
                    >
                      Back to Patient Directory
                    </button>
                  </div>
                </div>
              );
            }

            const rRegDate = user?.createdAt 
              ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
              : 'Not Listed';

            // Extract Emergency Contact details
            const emergencyValue = patient.emergencyContact || '';
            let emergencyName = emergencyValue;
            let emergencyPhone = 'Not Separately Provided';

            if (emergencyValue.includes('-')) {
              const parts = emergencyValue.split('-');
              emergencyName = parts[0].trim();
              emergencyPhone = parts[1].trim();
            } else if (emergencyValue.includes(':')) {
              const parts = emergencyValue.split(':');
              emergencyName = parts[0].trim();
              emergencyPhone = parts[1].trim();
            } else {
              const phoneMatch = emergencyValue.match(/(\+?\d[\d\-\(\)\s]{7,15}\d)/);
              if (phoneMatch) {
                emergencyPhone = phoneMatch[0];
                emergencyName = emergencyValue.replace(phoneMatch[0], '').trim().replace(/[\(,\)\-]/g, '').trim() || 'Listed Contact';
              }
            }

            // Get patient's prescriptions
            const patientPrescriptions = prescriptions.filter(pr => pr.patientId === patient.uid || pr.patientId === patient.patientId);

            // Get historical appointments
            const patientAppts = appointments.filter(a => a.patientId === patient.patientId || a.patientId === patient.uid);

            return (
              <div className="space-y-8 text-left animate-fade-in font-sans">
                
                {/* Header view */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => onNavigate('dashboard', 'patients')}
                        className="p-1 px-2.5 rounded-lg text-xs bg-gray-50 border hover:bg-gray-100 text-gray-600 flex items-center gap-1 font-bold transition-colors cursor-pointer"
                      >
                        ← Back
                      </button>
                      <h3 className="text-xl font-black text-gray-950 font-sans tracking-tight">Patient Details</h3>
                    </div>
                    <p className="text-xs text-gray-500">View patient demographic information and appointment history.</p>
                  </div>
                  
                  <span className="text-[10px] font-mono font-bold text-teal-750 bg-teal-50 px-2.5 py-1.5 rounded-xl uppercase tracking-wider border border-teal-100/50">
                    UID: {patient.uid}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left block: Demographics card */}
                  <div className="lg:col-span-2 space-y-6 col-span-1">
                    
                    {/* Basic Info section */}
                    <div className="border border-gray-150 rounded-3xl p-6 bg-white space-y-5 shadow-xs">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 pb-3">
                          <span className="w-11 h-11 bg-teal-500/10 text-teal-700 rounded-xl flex items-center justify-center font-bold text-lg font-mono">
                            {patient.fullName.charAt(0)}
                          </span>
                          <div>
                            <h4 className="font-extrabold text-sm text-gray-900">{patient.fullName}</h4>
                            <span className="text-[10px] uppercase font-mono font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-lg mt-0.5 inline-block">
                              ID: {patient.patientId}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border-t pt-4">
                        <div>
                          <span className="block text-[10px] uppercase text-gray-400 font-bold tracking-wider">Email registry</span>
                          <span className="text-gray-900 font-semibold block mt-1">{patient.email}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-gray-400 font-bold tracking-wider">Phone number</span>
                          <span className="text-gray-900 font-bold block mt-1">{patient.phone}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-gray-400 font-bold tracking-wider">Gender identity</span>
                          <span className="text-gray-900 font-semibold block mt-1">{patient.gender}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-gray-400 font-bold tracking-wider">Date of birth</span>
                          <span className="text-gray-900 font-bold block mt-1">{patient.dob || "Unknown"}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-gray-400 font-bold tracking-wider">Calculated age</span>
                          <span className="text-gray-900 font-semibold block mt-1">{patient.dob ? `${calculateAge(patient.dob)} Years Old` : `${patient.age} Years Old`}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-gray-400 font-bold tracking-wider">Registration Date</span>
                          <span className="text-gray-900 font-bold block mt-1">{rRegDate}</span>
                        </div>
                        <div className="md:col-span-2 col-span-1">
                          <span className="block text-[10px] uppercase text-gray-400 font-bold tracking-wider">Residential address</span>
                          <span className="text-gray-900 font-medium block mt-1">{patient.address || 'None declared.'}</span>
                        </div>
                      </div>

                      {/* Emergency Contact Block */}
                      <div className="bg-slate-50 border border-slate-100/60 rounded-2xl p-4 space-y-3">
                        <span className="block text-[10px] uppercase text-slate-450 font-bold tracking-wider font-mono">Verified Emergency Contact</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="block text-[9px] uppercase text-gray-400">Contact name</span>
                            <span className="text-slate-800 font-bold block mt-0.5">{emergencyName || 'None listed.'}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase text-gray-400">Contact cell</span>
                            <span className="text-slate-800 font-bold block mt-0.5">{emergencyPhone}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Historical Appointment details list */}
                    <div className="border border-gray-150 rounded-3xl p-6 bg-white space-y-4 shadow-xs">
                      <div>
                        <h4 className="font-extrabold text-gray-900 text-sm">Appointment History</h4>
                        <p className="text-[11px] text-gray-400">Chronological history of scheduled consultations and appointments.</p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-[10px] text-gray-400 uppercase font-mono border-b pb-3">
                              <th className="py-2 pr-2">Doctor</th>
                              <th className="py-2 pr-2">Department</th>
                              <th className="py-2 pr-2">Date</th>
                              <th className="py-2 pr-2">Time</th>
                              <th className="py-2 pr-2">Status</th>
                              <th className="py-2 text-right">Operations</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {patientAppts.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-gray-400 font-medium font-mono">
                                  No clinical sessions logged for this patient.
                                </td>
                              </tr>
                            ) : (
                              patientAppts.map((appt) => {
                                const doctorRec = doctors.find(d => d.uid === appt.doctorId || d.doctorId === appt.doctorId);
                                const dept = doctorRec?.department || doctorRec?.specialty || 'General Care';

                                let badgeClass = "bg-yellow-50 text-yellow-750";
                                if (appt.status === 'Completed' || appt.status === 'Approved') {
                                  badgeClass = "bg-green-50 text-green-750 border border-green-100";
                                } else if (appt.status === 'Cancelled') {
                                  badgeClass = "bg-rose-50 text-rose-750 border border-rose-100";
                                } else if (appt.status === 'Checked In' || appt.status === 'In Consultation') {
                                  badgeClass = "bg-indigo-50 text-indigo-750 border border-indigo-100";
                                }

                                return (
                                  <tr key={appt.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3.5 pr-2 font-bold text-gray-900">{appt.doctorName}</td>
                                    <td className="py-3.5 pr-2 font-medium text-gray-600">{dept}</td>
                                    <td className="py-3.5 pr-2 font-mono text-gray-500">{appt.date}</td>
                                    <td className="py-3.5 pr-2 font-mono text-gray-500">{appt.time}</td>
                                    <td className="py-3.5">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                                        {appt.status}
                                      </span>
                                    </td>
                                    <td className="py-3.5 text-right">
                                      <button
                                        onClick={() => setViewingApptHistory(appt)}
                                        className="p-1 px-3.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                      >
                                        View Appointment
                                      </button>
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

                  {/* Right side: Medical info cards (restricted, read-only) */}
                  <div className="space-y-6 col-span-1">
                    <div className="border border-orange-100 rounded-3xl p-5 bg-orange-50/40 text-left space-y-3 shadow-xs">
                      <div className="flex items-center space-x-2 text-orange-700">
                        <AlertCircle className="h-4.5 w-4.5" />
                        <h4 className="font-extrabold text-xs uppercase tracking-wider font-mono">Restricted Access Block</h4>
                      </div>
                      <p className="text-[11px] text-orange-750 leading-relaxed font-sans">
                        You are authenticated as <strong>Receptionist</strong>. You can view clinical records and vital demographic documents, but editing diagnoses, medication lists, and medical histories to write prescriptions is strictly restricted to authorized doctors.
                      </p>
                    </div>

                    <div className="border border-gray-150 rounded-3xl p-6 bg-white space-y-4 shadow-xs">
                      <h4 className="font-extrabold text-gray-900 text-sm">Medical Overview</h4>
                      <p className="text-[11px] text-gray-400">Clinical summary indices from patient electronic health records.</p>
                      
                      <div className="space-y-4 border-t pt-4 text-xs">
                        <div>
                          <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono">Blood Type Group</span>
                          <span className="text-gray-900 font-extrabold text-sm block mt-1">{patient.bloodType || 'O+'}</span>
                        </div>
                        
                        <div>
                          <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono">Registered Allergies</span>
                          <span className="text-rose-700 font-bold bg-rose-50 max-w-max px-2.5 py-1 rounded-lg mt-1 block">
                            {patient.allergies || 'No known clinical allergies.'}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono">Chronic Diseases</span>
                          <p className="text-gray-900 font-semibold leading-normal mt-1 border-l-2 pl-2 border-slate-300">
                            {patient.chronicDiseases || 'None registered.'}
                          </p>
                        </div>

                        <div>
                          <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono">Current Medications</span>
                          {patientPrescriptions.length === 0 ? (
                            <span className="text-gray-500 italic block mt-1 font-sans">No current medications prescribed by clinic doctors.</span>
                          ) : (
                            <div className="space-y-2 mt-1.5">
                              {patientPrescriptions.map(ep => (
                                <div key={ep.id} className="p-2 border rounded-xl bg-slate-50/50 space-y-0.5">
                                  <span className="font-bold text-slate-850 block text-[11px]">{ep.medicineName}</span>
                                  <span className="text-[10px] text-slate-400 block font-mono">{ep.dosage} / {ep.frequency} • {ep.duration}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Return anchor button */}
                <div className="pt-4 border-t border-gray-100 text-left">
                  <button 
                    onClick={() => onNavigate('dashboard', 'patients')}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all flex items-center mx-auto cursor-pointer"
                  >
                    ← Go Back to Patients Register Directory
                  </button>
                </div>
              </div>
            );
          })()}

          {/* RECEPTIONIST - CHECK-IN DESK */}
          {activeTab === 'check-in-desk' && sessionUser.role === 'Receptionist' && (() => {
            const todayString = new Date().toISOString().split('T')[0];
            const todaysAppts = appointments.filter(a => a.date === todayString && a.status !== 'Cancelled');
            
            return (
              <div className="space-y-6 text-left animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-900">Check-In Desk</h3>
                    <p className="text-xs text-gray-500">Track real-time patient queues, waiting status, and room allocations.</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
                    {todaysAppts.length} appointments scheduled today
                  </span>
                </div>

                {/* Patient Queue Queue */}
                <div className="border border-gray-150 bg-white rounded-3xl p-6 text-left shadow-sm">
                  <h3 className="text-base font-extrabold text-gray-900 mb-2">Today's Patient Queue</h3>
                  <p className="text-xs text-gray-500 mb-5 pb-3 border-b">Manage arrive/waiting times for patient flow optimization.</p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-[10px] text-gray-400 uppercase font-mono border-b pb-3">
                          <th className="py-3">Patient Name</th>
                          <th className="py-3">Scheduled Time</th>
                          <th className="py-3">Assigned Doctor</th>
                          <th className="py-3">Check-In Status</th>
                          <th className="py-3 text-right">Queue Operations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {todaysAppts.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-gray-400 font-medium font-mono">
                              No visits scheduled on the roster today.
                            </td>
                          </tr>
                        ) : (
                          todaysAppts.map((appt) => {
                            const currentCheckIn = appt.checkInStatus || 'Pending';
                            return (
                              <tr key={appt.id} className="hover:bg-slate-50/50">
                                <td className="py-4 font-bold text-gray-900">{appt.patientName}</td>
                                <td className="py-4 font-mono font-medium text-gray-650">{appt.time}</td>
                                <td className="py-4 text-teal-600 font-semibold">{appt.doctorName}</td>
                                <td className="py-4">
                                  <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                    currentCheckIn === 'Pending' ? 'bg-gray-100 text-gray-700' :
                                    currentCheckIn === 'Checked In' ? 'bg-blue-50 text-blue-700' :
                                    currentCheckIn === 'Waiting for Doctor' ? 'bg-amber-50 text-amber-700' :
                                    'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    {currentCheckIn}
                                  </span>
                                </td>
                                <td className="py-4 text-right">
                                  <div className="inline-flex space-x-1.5 z-10 font-sans">
                                    <button
                                      onClick={() => handleUpdateCheckInStatus(appt.id, 'Checked In')}
                                      disabled={currentCheckIn === 'Checked In'}
                                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                                        currentCheckIn === 'Checked In'
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                      }`}
                                    >
                                      Check In
                                    </button>
                                    <button
                                      onClick={() => handleUpdateCheckInStatus(appt.id, 'Waiting for Doctor')}
                                      disabled={currentCheckIn === 'Waiting for Doctor'}
                                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                                        currentCheckIn === 'Waiting for Doctor'
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                                      }`}
                                    >
                                      Waiting
                                    </button>
                                    <button
                                      onClick={() => handleUpdateCheckInStatus(appt.id, 'Completed')}
                                      disabled={currentCheckIn === 'Completed'}
                                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                                        currentCheckIn === 'Completed'
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                      }`}
                                    >
                                      Completed
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
            );
          })()}

               {/* RECEPTIONIST - PROFILE DASHBOARD */}
          {activeTab === 'profile' && sessionUser.role === 'Receptionist' && (
            <div className="max-w-2xl mx-auto space-y-6 text-left animate-fade-in font-sans">
              <div>
                <h3 className="text-xl font-extrabold text-gray-950">Staff Profile settings</h3>
                <p className="text-xs text-gray-500">View or modify your authenticated staff profile metadata.</p>
              </div>

              {!isEditingReceptionistProfile ? (
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center space-x-4 border-b pb-5 mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-2xl font-bold font-mono border">
                      {sessionUser.fullName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-905">{sessionUser.fullName}</h4>
                      <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded font-mono font-bold uppercase mt-1 inline-block">
                        {sessionUser.role} Staff ID: {sessionUser.uid}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-4">
                    <div>
                      <span className="block text-[10px] text-gray-400 font-bold uppercase">Full Name</span>
                      <span className="text-gray-955 font-bold block mt-0.5">{sessionUser.fullName}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 font-bold uppercase font-mono">Email Address</span>
                      <span className="text-gray-955 font-semibold block mt-0.5">{sessionUser.email}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 font-bold uppercase">Phone Contact Number</span>
                      <span className="text-gray-955 font-semibold block mt-0.5">{sessionUser.phone || "Not set"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 font-bold uppercase font-mono">Home Residence Address</span>
                      <span className="text-gray-955 font-medium block mt-0.5">{sessionUser.address || "Not set"}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <button
                      onClick={() => setIsEditingReceptionistProfile(true)}
                      className="w-full bg-teal-600 text-white text-xs font-bold p-3 rounded-xl hover:bg-teal-700 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <span>Edit Profile Credentials</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveReceptionistProfile} className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 border-b pb-2 mb-2">Edit Staff Profile</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                      <input 
                        type="text" 
                        required
                        value={receptProfileForm.fullName}
                        onChange={(e) => setReceptProfileForm({ ...receptProfileForm, fullName: e.target.value })}
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                      <input 
                        type="email" 
                        required
                        value={receptProfileForm.email}
                        onChange={(e) => setReceptProfileForm({ ...receptProfileForm, email: e.target.value })}
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Phone Contact Number</label>
                      <input 
                        type="tel" 
                        value={receptProfileForm.phone}
                        onChange={(e) => setReceptProfileForm({ ...receptProfileForm, phone: e.target.value })}
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Home Residence Address</label>
                      <input 
                        type="text" 
                        value={receptProfileForm.address}
                        onChange={(e) => setReceptProfileForm({ ...receptProfileForm, address: e.target.value })}
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-3 border-t">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all flex-1 cursor-pointer"
                    >
                      Save Profile Updates
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingReceptionistProfile(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-750 hover:bg-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 9: PATIENT - BOOK APPOINTMENT MODAL SLOTS (Requirement 9) */}
          {activeTab === 'book-appointment' && sessionUser.role === 'Patient' && (
            <div className="space-y-6 text-left max-w-3xl mx-auto animate-fade-in">
              <div className="border-b pb-4">
                <span className="text-[10px] font-mono font-black text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Appointment Booking Wizard</span>
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight mt-1.5 font-sans">Secure Consultation Scheduler</h3>
                <p className="text-xs text-gray-500 font-medium">Select specialty departments, clinicians, and live slot times instantly.</p>
              </div>

              <form onSubmit={handleBookAppointment} className="space-y-6">
                
                {/* STEP 1: SELECT SPECIALTY DEPARTMENT */}
                <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="h-6 w-6 font-mono text-xs font-bold text-white bg-teal-600 rounded-full flex items-center justify-center">1</span>
                    <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">Select Practice Specialization</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1.5">
                    {departments.map((dept) => {
                      const isSelected = selectedDeptName.toLowerCase() === dept.name.toLowerCase();
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => {
                            setSelectedDeptName(dept.name);
                            // Reset doctor and slots
                            setBookingForm({ ...bookingForm, doctorId: '', time: '' });
                          }}
                          className={`p-3.5 text-xs text-left rounded-xl border transition-all flex flex-col justify-between h-20 outline-none ${
                            isSelected
                              ? 'bg-teal-50 border-teal-500 text-teal-900 font-bold ring-2 ring-teal-100'
                              : 'bg-white border-gray-250 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <span className="block font-bold">{dept.name}</span>
                          <span className="block text-[9px] text-gray-450 font-medium normal-case line-clamp-2 leading-relaxed">
                            {dept.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* STEP 2: SELECT DOCTOR */}
                {selectedDeptName && (
                  <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-3 animate-fade-in">
                    <div className="flex items-center space-x-2">
                      <span className="h-6 w-6 font-mono text-xs font-bold text-white bg-teal-600 rounded-full flex items-center justify-center">2</span>
                      <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">Select Clinical Specialist</h4>
                    </div>
                    {deptFilteredDoctors.length === 0 ? (
                      <p className="text-xs text-rose-500 bg-rose-50 p-3 rounded-xl border border-rose-100 font-medium font-mono">
                        No registered clinicians are associated with the {selectedDeptName} department at this moment.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1.5">
                        {deptFilteredDoctors.map((doc) => {
                          const isSelected = bookingForm.doctorId === doc.uid;
                          return (
                            <button
                              key={doc.uid}
                              type="button"
                              onClick={() => {
                                setBookingForm({ ...bookingForm, doctorId: doc.uid, time: '' });
                              }}
                              className={`p-4 text-xs text-left rounded-2xl border transition-all flex items-center space-x-3.5 outline-none ${
                                isSelected
                                  ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-100 text-teal-900 font-bold'
                                  : 'bg-white border-gray-250 hover:border-gray-350 text-gray-700'
                              }`}
                            >
                              <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-black shrink-0 font-mono text-sm leading-none">
                                {doc.fullName.slice(0, 7).replace('Dr. ', '').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="block font-bold text-gray-900">{doc.fullName}</span>
                                <span className="block text-[10px] text-gray-400 font-semibold">{doc.experience || '5 Years'} Experience &bull; {doc.phone || 'No phone'}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3 & 4: DATE & LIVE BOOKING SLOTS */}
                {bookingForm.doctorId && (
                  <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Date selection card */}
                      <div className="md:col-span-1 border-r pr-0 md:pr-6 border-gray-100 space-y-2">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="h-6 w-6 font-mono text-xs font-bold text-white bg-teal-600 rounded-full flex items-center justify-center">3</span>
                          <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">Select Date</h4>
                        </div>
                        <input 
                          type="date" 
                          required
                          min={new Date().toISOString().split('T')[0]}
                          value={bookingForm.date}
                          onChange={(e) => {
                            setBookingForm({ ...bookingForm, date: e.target.value, time: '' });
                          }}
                          className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-white font-semibold text-gray-800 focus:outline-none"
                        />
                      </div>

                      {/* Time slot picker chips */}
                      <div className="md:col-span-2 space-y-2">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="h-6 w-6 font-mono text-xs font-bold text-white bg-teal-600 rounded-full flex items-center justify-center">4</span>
                          <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">Select Available Time Slot</h4>
                        </div>
                        
                        {!bookingForm.date ? (
                          <div className="text-xs text-gray-400 italic py-4 font-medium">
                            Please pick an appointment date first to reveal operating slots.
                          </div>
                        ) : (() => {
                          const slots = getDoctorSlotsForDate(bookingForm.doctorId, bookingForm.date);
                          
                          if (slots.length === 0) {
                            return (
                              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-medium space-y-1 font-sans">
                                <p className="font-bold uppercase tracking-wider text-[9px] font-mono">Clinician Unavailable</p>
                                <p className="text-[10px]">No active working hours, breaks, holidays slots registry, or open intervals exist for this physician on this specific day.</p>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-2">
                              <span className="block text-[9px] font-mono text-gray-400 uppercase font-black tracking-wider mb-1.5">Click to choose a slot:</span>
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-gray-50 rounded-xl border border-gray-150">
                                {slots.map((slot) => {
                                  const isSelected = bookingForm.time === slot;
                                  return (
                                    <button
                                      key={slot}
                                      type="button"
                                      onClick={() => setBookingForm({ ...bookingForm, time: slot })}
                                      className={`p-2 text-center text-xs font-mono font-bold rounded-lg transition-all outline-none ${
                                        isSelected
                                          ? 'bg-teal-600 text-white font-black shadow shadow-teal-600/15 scale-[1.02]'
                                          : 'bg-white border border-gray-200 text-gray-750 hover:bg-gray-100'
                                      }`}
                                    >
                                      {slot}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: SYMPTOMS SUMMARY & SUBMIT */}
                {bookingForm.doctorId && bookingForm.date && bookingForm.time && (
                  <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
                    <div className="flex items-center space-x-2">
                      <span className="h-6 w-6 font-mono text-xs font-bold text-white bg-teal-600 rounded-full flex items-center justify-center">5</span>
                      <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">State Symptoms & Register Visit</h4>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Clinic booking symptoms logged</label>
                      <input 
                        type="text" 
                        required
                        value={bookingForm.symptoms}
                        onChange={(e) => setBookingForm({ ...bookingForm, symptoms: e.target.value })}
                        placeholder="e.g. Regular medical followups, consultation details"
                        className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-white focus:outline-none"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-teal-600 text-white font-bold p-3.5 text-xs rounded-xl hover:bg-teal-700 transition-all shadow-lg hover:shadow-teal-600/10 flex items-center justify-center space-x-2"
                    >
                      <CheckCircle2 className="h-4.5 w-4.5" />
                      <span>Confirm Appointment Scheduling (Slot: {bookingForm.time})</span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB 10: PATIENT - APPOINTMENTS HISTORY LEDGER */}
          {activeTab === 'appointments-ledger' && sessionUser.role === 'Patient' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-950">Admissions Ledger Status</h3>
                <p className="text-[10px] text-gray-400 font-mono">Awaiting verification, completed outpatient histories</p>
              </div>

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-[10px] font-mono tracking-wider text-gray-400">
                    <tr>
                      <th className="p-3">Reference ID</th>
                      <th className="p-3">Physician Consultant</th>
                      <th className="p-3">Schedule Date</th>
                      <th className="p-3">Symptoms Logged</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs text-gray-700">
                    {appointments.filter(a => a.patientId === patients.find(p => p.uid === sessionUser.uid)?.patientId).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400 font-mono">
                          You have no outpatient consultation sessions registered.
                        </td>
                      </tr>
                    ) : (
                      appointments.filter(a => a.patientId === patients.find(p => p.uid === sessionUser.uid)?.patientId).map((appt) => (
                        <tr key={appt.id} className="hover:bg-gray-50/55">
                          <td className="p-3 font-mono font-bold text-gray-500">{appt.id}</td>
                          <td className="p-3 font-bold text-teal-650">{appt.doctorName}</td>
                          <td className="p-3 font-mono">{appt.date} &nbsp; {appt.time}</td>
                          <td className="p-3 italic text-gray-500">{appt.symptoms || 'Routine clinic consult.'}</td>
                          <td className="p-3">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${appt.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : appt.status === 'Completed' ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-705'}`}>
                              {appt.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 11: PATIENT CLINICAL DIAGNOSIS FILES */}
          {activeTab === 'patient-clinical-files' && sessionUser.role === 'Patient' && (
            <div className="space-y-6 text-left">
              <div>
                <h3 className="text-sm font-black font-mono text-gray-950 uppercase tracking-wider">Medical Records</h3>
                <p className="text-[10px] text-gray-400 font-mono">Your official diagnoses, treatment plans, and doctor consultation notes</p>
              </div>

              <div className="space-y-4">
                {medicalRecords.filter(m => m.patientId === patients.find(p => p.uid === sessionUser.uid)?.patientId).length === 0 ? (
                  <p className="py-8 text-center text-gray-400 font-mono text-xs">
                    No clinical logs recorded for this outpatient profile yet.
                  </p>
                ) : (
                  medicalRecords.filter(m => m.patientId === patients.find(p => p.uid === sessionUser.uid)?.patientId).map((rec) => (
                    <div key={rec.id} className="p-5 border rounded-2xl bg-gray-50/30">
                      <div className="flex items-center justify-between border-b pb-2 mb-3">
                        <span className="text-xs font-mono font-bold text-slate-400">File Code: {rec.id}</span>
                        <span className="text-xs font-mono text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded">
                          Date: {rec.visitDate}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="block font-bold text-gray-400 font-mono text-[10px] uppercase">Specialist Consultant</span>
                          <span className="font-bold text-gray-900 leading-relaxed">{rec.doctorName}</span>
                        </div>
                        <div>
                          <span className="block font-bold text-gray-400 font-mono text-[10px] uppercase">Symptoms Vitals recorded</span>
                          <span className="text-gray-700 font-medium">{rec.symptoms}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="block font-bold text-gray-400 font-mono text-[10px] uppercase">Clinical Diagnosis</span>
                          <span className="font-bold text-rose-750 font-mono">{rec.diagnosis}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="block font-bold text-gray-400 font-mono text-[10px] uppercase">Therapeutic Treatment Plan</span>
                          <p className="text-gray-750 font-medium leading-relaxed mt-0.5 whitespace-pre-wrap">{rec.treatmentPlan}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 12: PATIENT PRESCRIPTIONS (Rx) & PRINT MACHINE */}
          {activeTab === 'patient-rxs' && sessionUser.role === 'Patient' && (
            <div className="space-y-6 text-left">
              <div>
                <h3 className="text-sm font-black font-mono text-gray-950 uppercase tracking-wider">Active Prescriptions</h3>
                <p className="text-[10px] text-gray-400 font-mono">Present active Rx codes and print medication sheets for direct dispatch</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {prescriptions.filter(pr => pr.patientId === patients.find(p => p.uid === sessionUser.uid)?.patientId).length === 0 ? (
                  <p className="sm:col-span-2 py-8 text-center text-gray-400 font-mono text-xs">
                    No pharmacological prescriptions saved under your account.
                  </p>
                ) : (
                  prescriptions.filter(pr => pr.patientId === patients.find(p => p.uid === sessionUser.uid)?.patientId).map((rx) => (
                    <div key={rx.id} className="p-5 border text-left rounded-2xl bg-white flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div>
                        <div className="flex items-center justify-between border-b pb-2 mb-3">
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-mono">
                            ACTIVE RX: {rx.id}
                          </span>
                          <span className="text-xs font-mono text-gray-400">{rx.date}</span>
                        </div>
                        
                        <h4 className="text-sm font-black text-gray-950 leading-relaxed">{rx.medicineName}</h4>
                        <p className="text-xs font-mono font-bold text-gray-405 mt-1">
                          Dosage: {rx.dosage} &nbsp; Frequency: {rx.frequency}
                        </p>
                        <p className="text-xs font-semibold text-teal-700 font-sans mt-0.5">
                          Duration: {rx.duration}
                        </p>
                        {rx.notes && (
                          <div className="p-2.5 rounded-xl bg-gray-50 text-[11px] text-gray-500 italic mt-3 border">
                            "{rx.notes}"
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 font-medium">Physician: {rx.doctorName}</span>
                        <button 
                          onClick={() => {
                            setActivePrintPrescription(rx);
                            setShowPrintModal(true);
                          }}
                          className="rounded-xl border hover:bg-gray-50 px-3 py-1.5 text-[10.5px] font-bold text-gray-700 flex items-center space-x-1"
                        >
                          <Printer className="h-4 w-4" />
                          <span>Print Rx card</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && sessionUser.role === 'Patient' && (
            <PatientProfileView 
              sessionUser={sessionUser}
              onNavigate={onNavigate}
              onRefresh={forceRefresh}
            />
          )}

        </main>
      </div>

      {/* MODAL: CLINICAL HISTORIES & MEDICAL PORTFOLIO (FOR DOCTOR PORTAL) */}
      {selectedPatientHistoryId && (() => {
        const patient = patients.find(p => p.patientId === selectedPatientHistoryId || p.uid === selectedPatientHistoryId);
        if (!patient) return null;

        const patientRecords = medicalRecords.filter(r => r.patientId === patient.patientId);
        const patientPrescriptions = prescriptions.filter(p => p.patientId === patient.patientId);

        return (
          <div className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-2xl w-full border text-left relative shadow-2xl flex flex-col max-h-[85vh]">
              
              <button 
                onClick={() => setSelectedPatientHistoryId(null)}
                className="absolute top-5 right-5 p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
                title="Close Dossier"
                id="close-dossier"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>

              <div className="p-6 border-b shrink-0 pr-16 bg-slate-50 rounded-t-3xl text-left">
                <span className="text-[10px] uppercase font-bold tracking-widest text-teal-650 font-mono">Outpatient Case Record</span>
                <h3 className="text-xl font-black text-gray-950 mt-1">{patient.fullName}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] text-gray-500 mt-3 font-medium">
                  <div>
                    <span className="block text-gray-400 uppercase text-[9px] font-bold">Age</span>
                    <span className="text-gray-800 font-bold">{patient.dob ? calculateAge(patient.dob) : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 uppercase text-[9px] font-bold">Gender</span>
                    <span className="text-gray-800 font-bold">{patient.gender || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 uppercase text-[9px] font-bold">Patient Code</span>
                    <span className="text-gray-800 font-mono font-bold">{patient.patientId}</span>
                  </div>
                  <div className="col-span-1 sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t pt-2 mt-1">
                    <div>
                      <span className="text-gray-400 text-[10px] block font-bold">Contact:</span>
                      <span className="text-gray-750 font-semibold">{patient.phone} | {patient.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] block font-bold">Emergency Line:</span>
                      <span className="text-gray-750 font-semibold">{patient.emergencyContact || 'None listed.'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                
                {/* Section 1: Diagnoses Checklist */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-teal-700 font-bold mb-3 font-mono border-b pb-1.5 flex items-center justify-between">
                    <span>Clinical Consultation Records</span>
                    <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded text-[9.5px] font-bold font-mono">{patientRecords.length} Files</span>
                  </h4>
                  
                  {patientRecords.length === 0 ? (
                    <p className="text-[11px] text-gray-405 italic py-4">No past diagnosis records registered for this outpatient.</p>
                  ) : (
                    <div className="space-y-4">
                      {patientRecords.map((rec) => (
                        <div key={rec.id} className="p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100 relative text-left">
                          <span className="absolute top-3.5 right-3.5 text-[9.5px] font-mono text-gray-400">{rec.date ? rec.date.split('T')[0] : 'N/A'}</span>
                          <span className="text-[10px] font-mono text-teal-650 font-bold block">{rec.id}</span>
                          <div className="text-sm font-bold text-gray-950 mt-1">{rec.diagnosis}</div>
                          
                          <div className="mt-2.5 text-xs grid grid-cols-1 gap-2 border-t pt-2">
                            <div>
                              <span className="text-gray-400 font-bold block text-[10px]">Symptoms / Vitals</span>
                              <span className="text-gray-750 font-medium italic">{rec.symptoms || 'Not listed.'}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 font-bold block text-[10px]">Treatment Plan / Referrals</span>
                              <span className="text-gray-750 font-medium">{rec.treatmentPlan}</span>
                            </div>
                            {rec.notes && (
                              <div>
                                <span className="text-gray-400 font-bold block text-[10px]">Internal Physician Notes</span>
                                <span className="text-slate-500 italic block">"{rec.notes}"</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-[10px] text-gray-400 mt-2 text-right">
                            Physician: <span className="font-semibold text-gray-650">{rec.doctorName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 2: Prescription List */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-teal-700 font-bold mb-3 font-mono border-b pb-1.5 flex items-center justify-between">
                    <span>Active Pharmaceuticals & Rx</span>
                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[9.5px] font-bold font-mono">{patientPrescriptions.length} Active</span>
                  </h4>
                  
                  {patientPrescriptions.length === 0 ? (
                    <p className="text-[11px] text-gray-405 italic py-4">No active prescriptions written for this outpatient.</p>
                  ) : (
                    <div className="space-y-3">
                      {patientPrescriptions.map((pres) => (
                        <div key={pres.id} className="p-3.5 bg-amber-50/20 rounded-2xl border border-amber-100/50 relative text-left">
                          <span className="absolute top-3.5 right-3.5 text-[9.5px] font-mono text-gray-405">{pres.date ? pres.date.split('T')[0] : 'N/A'}</span>
                          <div className="inline-flex items-center space-x-1">
                            <Pill className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-xs font-black text-gray-950">{pres.medicineName}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-600 mt-2 bg-white/70 p-2 rounded-xl border border-amber-50">
                            <div>
                              <span className="block text-[8px] uppercase text-gray-400 font-bold">Dosage</span>
                              <span className="font-bold text-gray-900">{pres.dosage}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] uppercase text-gray-400 font-bold">Frequency</span>
                              <span className="font-bold text-gray-900">{pres.frequency}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] uppercase text-gray-400 font-bold">Duration</span>
                              <span className="font-bold text-gray-900">{pres.duration}</span>
                            </div>
                          </div>
                          {pres.notes && (
                            <p className="text-[10.5px] text-gray-500 italic mt-2 bg-gray-50/50 p-2 rounded-lg border">"{pres.notes}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              <div className="p-4 border-t bg-gray-50 text-right shrink-0 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setSelectedPatientHistoryId(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition-all"
                >
                  Close Dossier
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL: REGISTER DOCTOR (ADMIN SCREEN) */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border text-left relative shadow-2xl">
            <button 
              onClick={() => setShowAddDoctorModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-150"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>

            <h3 className="text-base font-bold text-gray-950 mb-3.5">Intake Certified Clinician</h3>
            <form onSubmit={handleCreateDoctor} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-gray-550 uppercase">Doctor Name *</label>
                <input 
                  type="text" 
                  required
                  value={doctorForm.fullName}
                  onChange={(e) => setDoctorForm({ ...doctorForm, fullName: e.target.value })}
                  placeholder="e.g. Dr. Arthur Pendelton"
                  className="w-full text-xs p-2 rounded-xl border bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-550 uppercase">Email *</label>
                  <input 
                    type="email" 
                    required
                    value={doctorForm.email}
                    onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                    placeholder="doctor@smartclinic.com"
                    className="w-full text-xs p-2 rounded-xl border bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-550 uppercase">Phone Line *</label>
                  <input 
                    type="text" 
                    required
                    value={doctorForm.phone}
                    onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                    placeholder="+1 (555) 019..."
                    className="w-full text-xs p-2 rounded-xl border bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-555 uppercase">Department *</label>
                  <select 
                    value={doctorForm.specialty}
                    onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })}
                    className="w-full text-xs p-2 rounded-xl border bg-white"
                  >
                    <option value="Dental Care">Dental Care</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Internal Medicine">Internal Medicine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-555 uppercase">Experience *</label>
                  <input 
                    type="text" 
                    required
                    value={doctorForm.experience}
                    onChange={(e) => setDoctorForm({ ...doctorForm, experience: e.target.value })}
                    placeholder="e.g. 12 Years"
                    className="w-full text-xs p-2 rounded-xl border bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-555 uppercase font-mono">Specialist short biography</label>
                <input 
                  type="text" 
                  value={doctorForm.bio}
                  onChange={(e) => setDoctorForm({ ...doctorForm, bio: e.target.value })}
                  placeholder="Dedicated general dentist..."
                  className="w-full text-xs p-2 rounded-xl border bg-white"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-teal-650 text-white font-bold p-3 rounded-xl hover:bg-teal-700"
              >
                Register Physician Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRINT PRESCRIPTION VIEW (Rx RECEIPT) */}
      {showPrintModal && activePrintPrescription && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border text-left relative shadow-2xl font-sans">
            <button 
              onClick={() => setShowPrintModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-150"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>

            {/* Print Area Markup */}
            <div className="border border-dashed p-4.5 rounded-2xl bg-slate-50/50">
              <div className="text-center pb-3 border-b border-dashed mb-4">
                <HeartPulse className="h-8 w-8 text-rose-500 mx-auto" />
                <h4 className="text-sm font-black text-gray-900 mt-1 uppercase font-mono tracking-wide">SmartClinic Medical Rx Card</h4>
                <p className="text-[9px] text-gray-400 tracking-wider">{CLINIC_CONFIG.fullAddress}</p>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[10px] uppercase font-bold text-gray-400 font-mono">Rx Code:</span>
                  <span className="font-mono font-bold text-rose-600">{activePrintPrescription.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] uppercase font-bold text-gray-400 font-mono">Date:</span>
                  <span className="font-mono">{activePrintPrescription.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] uppercase font-bold text-gray-400 font-mono">Outpatient:</span>
                  <span className="font-bold text-gray-900">{activePrintPrescription.patientName}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400 font-mono">Physician:</span>
                  <span className="font-bold text-teal-650">{activePrintPrescription.doctorName}</span>
                </div>

                <div className="pt-2 text-center">
                  <span className="block text-[10px] uppercase font-black text-rose-600 font-mono">Prescribed Formula</span>
                  <span className="block text-sm font-black text-gray-900 leading-normal mt-1">{activePrintPrescription.medicineName}</span>
                  <span className="block text-[11px] font-semibold text-gray-700 font-mono mt-1">
                    Dosage: {activePrintPrescription.dosage}
                  </span>
                  <span className="block text-[11.5px] text-gray-650">
                    Frequency: {activePrintPrescription.frequency} &bull; {activePrintPrescription.duration}
                  </span>
                </div>

                {activePrintPrescription.notes && (
                  <div className="p-2 border rounded-lg bg-white text-[10px] leading-relaxed italic text-gray-400 mt-3 text-center">
                    "{activePrintPrescription.notes}"
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t text-center text-[9px] text-gray-400 leading-normal border-dashed">
                Present this HIPAA authorized code card to neighbor pharmacy services for outpatient dispense.
              </div>
            </div>

            <button 
              onClick={() => {
                window.print();
              }}
              className="w-full mt-4 bg-gray-900 text-white font-bold p-3 text-xs rounded-xl hover:bg-black flex items-center justify-center space-x-1.5"
            >
              <Printer className="h-4.5 w-4.5" />
              <span>Proceed to System Printer</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: REQUEST DEPARTMENT CHANGE (/Doctor/DepartmentRequest) */}
      {showDeptRequestModal && (() => {
        const currentDoc = doctors.find(d => d.uid === sessionUser.uid);
        const matchedDocDept = departments.find(dept => 
          (currentDoc?.departmentId && dept.id === currentDoc.departmentId) ||
          (currentDoc?.department && dept.name.toLowerCase() === currentDoc.department.toLowerCase()) ||
          (sessionUser?.department && dept.name.toLowerCase() === sessionUser.department.toLowerCase())
        );
        const currentDeptName = matchedDocDept ? matchedDocDept.name : (currentDoc?.department || sessionUser?.department || 'Dermatology');
        const currentDeptId = matchedDocDept ? matchedDocDept.id : 'internal_medicine_id';

        // Filter: Only active departments should appear
        const activeDepts = departments.filter(d => d.isActive);

        return (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="Doctor/DepartmentRequest">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border text-left relative shadow-2xl">
              <button 
                onClick={() => setShowDeptRequestModal(false)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-150"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>

              <div className="flex items-center space-x-2.5 mb-4 border-b pb-4">
                <GitPullRequest className="h-5 w-5 text-teal-605" />
                <div>
                  <h3 className="text-base font-extrabold text-gray-950">Request Department Change</h3>
                  <p className="text-[11px] text-gray-400 font-medium">Internal clinician assignment reallocation portal</p>
                </div>
              </div>

              <form onSubmit={handleSubmitDeptRequest} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-400 uppercase mb-1">Current Department (Read-Only)</label>
                  <input 
                    type="text" 
                    disabled
                    value={currentDeptName}
                    className="w-full text-xs p-2.5 rounded-xl border bg-gray-50 text-gray-505 font-bold cursor-not-allowed"
                    id="dept-request-current-dept-input"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-550 uppercase mb-1">Requested Department *</label>
                  <select 
                    required
                    value={requestDeptId}
                    onChange={(e) => setRequestDeptId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                    id="dept-request-select"
                  >
                    <option value="">-- Choose Target Department --</option>
                    {activeDepts.map(dept => (
                      <option key={dept.id} value={dept.id} disabled={dept.id === currentDeptId || dept.name.toLowerCase() === currentDeptName.toLowerCase()}>
                        {dept.name} { (dept.id === currentDeptId || dept.name.toLowerCase() === currentDeptName.toLowerCase()) ? '(Current Assignment)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-550 uppercase mb-1">Reason for Change *</label>
                  <textarea 
                    required
                    rows={4}
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="Explain why you want to move to this department."
                    className="w-full text-xs p-2.5 rounded-xl border bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                    id="dept-request-reason"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button 
                    type="submit"
                    className="flex-1 bg-teal-600 text-white font-bold p-3 rounded-xl hover:bg-teal-700 transition-all text-xs"
                    id="btn-dept-request-submit"
                  >
                    Submit Request
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowDeptRequestModal(false)}
                    className="px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-xs"
                    id="btn-dept-request-cancel"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL: ADMIN REQUEST REJECTION NOTE */}
      {showRejectModal && activeRequestDetails && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border text-left relative shadow-2xl">
            <button 
              onClick={() => {
                setShowRejectModal(false);
                setRejectionNotes('');
                setActiveRequestDetails(null);
              }}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-150"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>

            <h3 className="text-sm font-bold text-gray-950 mb-1">Specify Rejection Reason</h3>
            <p className="text-[10.5px] text-gray-400 mb-4">Provide feedback to Dr. {activeRequestDetails.doctorName} for record auditing.</p>

            <form onSubmit={handleRejectDeptRequest} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-mono font-bold text-gray-550 uppercase mb-1">Rejection Note *</label>
                <textarea 
                  required
                  rows={3}
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="e.g. Clinical prerequisites missing or department currently full."
                  className="w-full text-xs p-2.5 rounded-xl border bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div className="flex items-center space-x-3">
                <button 
                  type="submit"
                  className="flex-1 bg-rose-600 text-white font-bold p-2.5 rounded-xl hover:bg-rose-700 transition-all text-xs"
                >
                  Submit Rejection
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionNotes('');
                    setActiveRequestDetails(null);
                  }}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
