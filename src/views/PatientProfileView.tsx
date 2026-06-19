/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, Camera, Save, X, Lock, Shield, 
  Heart, Phone, Activity, Calendar, FileText, CheckCircle2, 
  AlertCircle, RefreshCw, ShieldAlert
} from 'lucide-react';
import { User, PatientRecord, Appointment, MedicalRecord, Prescription } from '../types';
import { 
  savePatient, saveUser, setCurrentSessionUser, 
  getPatients, getAppointments, getMedicalRecords, getPrescriptions 
} from '../db/localDb';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth, storage } from '../db/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface PatientProfileViewProps {
  sessionUser: User;
  onNavigate: (view: string, tab?: string) => void;
  onRefresh: () => void;
}

export default function PatientProfileView({ sessionUser, onNavigate, onRefresh }: PatientProfileViewProps) {
  // Sync fields
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  // Load patient details
  const [patientRecord, setPatientRecord] = useState<PatientRecord | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);

  // Feedback states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Editable Form Inputs
  const [fullName, setFullName] = useState(sessionUser.fullName);
  const [phone, setPhone] = useState(sessionUser.phone);
  const [address, setAddress] = useState(sessionUser.address || '');
  const [profileImage, setProfileImage] = useState(sessionUser.profileImage || '');
  
  // Emergency Contact info
  const [emergencyContact, setEmergencyContact] = useState('');

  // Medical values
  const [bloodType, setBloodType] = useState('O+');
  const [allergies, setAllergies] = useState('');
  const [chronicDiseases, setChronicDiseases] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');

  // Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSaving, setPassSaving] = useState(false);
  const [passSuccessMsg, setPassSuccessMsg] = useState('');
  const [passErrorMsg, setPassErrorMsg] = useState('');

  // Calculate age from Date of Birth
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

  // Sync data
  const loadData = () => {
    const listPat = getPatients();
    setPatients(listPat);
    setAppointments(getAppointments());
    setMedicalRecords(getMedicalRecords());
    setPrescriptions(getPrescriptions());

    const r = listPat.find(p => p.uid === sessionUser.uid);
    if (r) {
      setPatientRecord(r);
      // Load actual record values
      setFullName(r.fullName || sessionUser.fullName);
      setPhone(r.phone || sessionUser.phone);
      setAddress(r.address || sessionUser.address || '');
      setProfileImage(r.profileImage || sessionUser.profileImage || '');
      setEmergencyContact(r.emergencyContact || '');
      setBloodType(r.bloodType || 'O+');
      setAllergies(r.allergies || '');
      setChronicDiseases(r.chronicDiseases || '');
      setMedicalConditions(r.medicalConditions || '');
    }
  };

  useEffect(() => {
    loadData();
    // listening for real-time changes
    const handleSync = () => {
      loadData();
    };
    window.addEventListener('smartclinic_db_sync', handleSync);
    return () => {
      window.removeEventListener('smartclinic_db_sync', handleSync);
    };
  }, [sessionUser]);

  const patientId = patientRecord?.patientId || '';

  // Get filtered stats and info
  const patientAppts = appointments.filter(a => a.patientId === patientId);
  const totalAppointments = patientAppts.length;
  const upcomingAppointments = patientAppts.filter(a => a.status === 'Approved' || a.status === 'Pending').length;
  const completedVisits = patientAppts.filter(a => a.status === 'Completed').length;
  const cancelledAppointments = patientAppts.filter(a => a.status === 'Cancelled').length;

  const patientRecords = medicalRecords.filter(m => m.patientId === patientId);
  const sortedRecords = [...patientRecords].sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
  const lastRecord = sortedRecords[0];
  const lastDiagnosis = lastRecord?.diagnosis || 'No diagnoses recorded yet';
  const lastDoctorVisit = lastRecord ? `Dr. ${lastRecord.doctorName} on ${lastRecord.visitDate}` : 'No previous doctor visits';
  const activeRxsCount = prescriptions.filter(p => p.patientId === patientId).length;

  // Handle Profile Save Changes
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    
    if (!fullName.trim()) {
      setErrorMsg('Full Name is required');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Phone number is required');
      return;
    }

    setSaving(true);
    try {
      // 1. Update basic User profile in DB
      const updatedUser: User = {
        ...sessionUser,
        fullName,
        phone,
        address,
        profileImage,
        emergencyContact,
        bloodType,
        allergies,
        chronicDiseases,
        medicalConditions
      };

      // 2. Update PatientRecord details 
      if (patientRecord) {
        const updatedPatient: PatientRecord = {
          ...patientRecord,
          fullName,
          phone,
          address,
          profileImage,
          emergencyContact,
          bloodType,
          allergies,
          chronicDiseases,
          medicalConditions
        };
        savePatient(updatedPatient);
      }

      saveUser(updatedUser);
      setCurrentSessionUser(updatedUser);
      onRefresh();

      setSuccessMsg('Your profile has been saved successfully!');
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving profile changes');
    } finally {
      setSaving(false);
    }
  };

  // Handle Profile Image files upload with fallback Base64
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('File sizes must be under 2MB.');
      return;
    }

    setUploadingImage(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let downloadUrl = '';
      try {
        // Try uploading to Firebase Storage path
        const fileRef = ref(storage, `profiles/${sessionUser.uid}_${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(fileRef, file);
        downloadUrl = await getDownloadURL(snapshot.ref);
      } catch (storageError) {
        console.warn("Storage upload failed, fallback to local Base64 URL format:", storageError);
        // Fallback to offline FileReader Base64 String
        downloadUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed reading local media files.'));
          reader.readAsDataURL(file);
        });
      }

      setProfileImage(downloadUrl);
      
      // Auto-save the profile Image immediately to database as well
      const updatedUser: User = { ...sessionUser, profileImage: downloadUrl };
      if (patientRecord) {
        savePatient({ ...patientRecord, profileImage: downloadUrl });
      }
      saveUser(updatedUser);
      setCurrentSessionUser(updatedUser);
      onRefresh();
      
      setSuccessMsg('Profile photo updated successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update avatar photo');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Firebase Authenticated Password Changes
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassSuccessMsg('');
    setPassErrorMsg('');

    if (!currentPassword) {
      setPassErrorMsg('Please fill in your current password');
      return;
    }
    if (newPassword.length < 6) {
      setPassErrorMsg('New password must contain at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassErrorMsg('New passwords do not match');
      return;
    }

    setPassSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("No active Firebase session found. Please re-authenticate.");
      }

      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(sessionUser.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Save new password
      await updatePassword(user, newPassword);

      setPassSuccessMsg('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      let friendlyMessage = err.message;
      if (err.code === 'auth/wrong-password') {
        friendlyMessage = 'Current password entered is incorrect.';
      } else if (err.code === 'auth/requires-recent-login') {
        friendlyMessage = 'Please sign out and sign in again before updating your security credentials.';
      }
      setPassErrorMsg(friendlyMessage || 'Failed to update security credentials.');
    } finally {
      setPassSaving(false);
    }
  };

  const formattedAge = calculateAge(sessionUser.dob);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans text-left">
      
      {/* Alert Banners */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start space-x-3 text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <span className="text-xs font-semibold leading-normal">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start space-x-3 text-rose-800">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span className="text-xs font-semibold leading-normal">{errorMsg}</span>
        </div>
      )}

      {/* Grid wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Overview & Stats & Medical Summaries */}
        <div className="space-y-6">
          
          {/* PROFILE OVERVIEW CARD */}
          <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-b border-gray-100"></div>
            
            <div className="relative mt-10">
              <div className="w-28 h-28 rounded-full border-4 border-white shadow-md bg-teal-50 flex items-center justify-center text-teal-700 font-bold text-3xl">
                {sessionUser.fullName ? sessionUser.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'US'}
              </div>
            </div>

            <div className="mt-4">
              <h2 className="text-lg font-black text-gray-900 leading-tight">{sessionUser.fullName}</h2>
              <span className="text-[11px] font-mono text-gray-400 mt-1 block">{sessionUser.email}</span>
            </div>

            <div className="mt-5 w-full pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-left">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">Account Role</span>
                <span className="block text-xs font-bold text-teal-750 font-mono mt-0.5">Patient</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">Account Status</span>
                <span className="block text-xs font-bold text-emerald-600 font-mono mt-0.5 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  Active
                </span>
              </div>
              <div className="col-span-2 mt-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">Registration Date</span>
                <span className="block text-xs font-medium text-gray-750 font-mono mt-0.5">
                  {sessionUser.createdAt ? new Date(sessionUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'June 10, 2026'}
                </span>
              </div>
            </div>
          </div>

          {/* APPOINTMENT SUMMARY CARD */}
          <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm text-left">
            <h3 className="text-sm font-black text-gray-950 font-mono flex items-center gap-1.5 uppercase tracking-wide border-b pb-3 mb-4">
              <Calendar className="h-4.5 w-4.5 text-teal-600" />
              Appointment Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-2xl">
                <span className="block text-lg font-black text-slate-900 font-mono">{totalAppointments}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Booked</span>
              </div>
              <div className="bg-teal-50/40 border border-teal-100 p-3 rounded-2xl">
                <span className="block text-lg font-black text-teal-700 font-mono">{upcomingAppointments}</span>
                <span className="text-[10px] text-teal-600 font-bold uppercase tracking-wider block">Upcoming</span>
              </div>
              <div className="bg-emerald-50/30 border border-emerald-100 p-3 rounded-2xl">
                <span className="block text-lg font-black text-emerald-700 font-mono">{completedVisits}</span>
                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Completed</span>
              </div>
              <div className="bg-rose-50/30 border border-rose-100 p-3 rounded-2xl">
                <span className="block text-lg font-black text-rose-700 font-mono">{cancelledAppointments}</span>
                <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block">Cancelled</span>
              </div>
            </div>
          </div>

          {/* MEDICAL HISTORY SUMMARY CARD */}
          <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm text-left">
            <h3 className="text-sm font-black text-gray-950 font-mono flex items-center gap-1.5 uppercase tracking-wide border-b pb-3 mb-4">
              <Activity className="h-4.5 w-4.5 text-teal-600" />
              Medical History Summary
            </h3>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider block">Last Diagnosis</span>
                <p className="text-xs font-bold text-gray-800 mt-1 bg-gray-50 p-2.5 rounded-xl border border-gray-100 line-clamp-2">
                  {lastDiagnosis}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider block">Last Doctor Visit</span>
                <p className="text-xs font-semibold text-gray-700 mt-0.5">{lastDoctorVisit}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider block">Active Medications</span>
                <p className="text-xs font-semibold text-gray-700 mt-0.5">{activeRxsCount} active prescriptions</p>
              </div>
              <button 
                onClick={() => onNavigate('dashboard', 'patient-clinical-files')}
                className="w-full mt-2 bg-teal-50 hover:bg-teal-100 text-teal-800 py-2.5 rounded-xl text-xs font-black tracking-wide border border-teal-100 transition-all text-center flex items-center justify-center gap-1.5"
              >
                <FileText className="h-4 w-4" />
                View Full Medical Records
              </button>
            </div>
          </div>

        </div>

        {/* CENTER / RIGHT COLUMNS: Editable Forms & Security */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* PROFILE PERSONAL & EMERGENCY & MEDICAL CARDS FORM */}
          <div className="bg-white border border-gray-150 rounded-3xl shadow-sm overflow-hidden text-left">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-950 font-mono uppercase tracking-wider flex items-center gap-2">
                <UserIcon className="h-4.5 w-4.5 text-teal-600" />
                Personal Profile Details
              </h3>
              {!isEditing ? (
                <button 
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-xs font-bold leading-normal transition-all"
                >
                  Edit Profile
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      loadData(); // Cancel edits
                    }}
                    className="rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 text-xs font-bold leading-normal transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleSaveChanges}
                    className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-xs font-bold leading-normal flex items-center gap-1.5 transition-all"
                    disabled={saving}
                  >
                    {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveChanges} className="p-6 space-y-6">
              
              {/* SECTION A: CLIENT PERSONAL INFO */}
              <div>
                <h4 className="text-xs uppercase font-black text-teal-800 font-mono tracking-widest mb-3 flex items-center gap-1">
                  <span className="h-1 text-teal-600 pr-1">|</span>
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 font-mono mb-1.5">Full Name</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={!isEditing}
                      className={`w-full text-xs p-3 border rounded-xl font-medium focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all ${!isEditing ? 'bg-gray-50 border-gray-150 text-gray-500' : 'bg-white border-gray-250 text-gray-800'}`}
                      placeholder="e.g. Rachel Adams"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 font-mono mb-1.5">Phone Number</label>
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!isEditing}
                      className={`w-full text-xs p-3 border rounded-xl font-medium focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all ${!isEditing ? 'bg-gray-50 border-gray-150 text-gray-500' : 'bg-white border-gray-250 text-gray-800'}`}
                      placeholder="e.g. +1 (555) 732-8822"
                    />
                  </div>

                  {/* Email (Non-editable) */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 font-mono mb-1.5">Email Address</label>
                    <input 
                      type="email" 
                      value={sessionUser.email}
                      disabled={true}
                      className="w-full text-xs p-3 border rounded-xl font-medium bg-gray-50 border-gray-150 text-gray-400 font-mono"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">Your profile email is managed securely and is immutable.</span>
                  </div>

                  {/* Birthday (Non-editable) */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 font-mono mb-1.5">Date of Birth</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={sessionUser.dob}
                        disabled={true}
                        className="w-full text-xs p-3 border rounded-xl font-medium bg-gray-50 border-gray-150 text-gray-400 font-mono"
                      />
                    </div>
                  </div>

                  {/* Gender (Non-editable) */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 font-mono mb-1.5">Gender</label>
                    <input 
                      type="text" 
                      value={sessionUser.gender}
                      disabled={true}
                      className="w-full text-xs p-3 border rounded-xl font-medium bg-gray-50 border-gray-150 text-gray-400"
                    />
                  </div>

                  {/* Age (Auto-calculated, Non-editable) */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 font-mono mb-1.5">Age</label>
                    <input 
                      type="text" 
                      value={`${formattedAge} Years`}
                      disabled={true}
                      className="w-full text-xs p-3 border rounded-xl font-medium bg-gray-50 border-gray-150 text-gray-400 font-mono"
                    />
                  </div>

                  {/* Full Home Address (Col-span-2) */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-gray-400 font-mono mb-1.5">Home Address</label>
                    <textarea 
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={!isEditing}
                      rows={2}
                      className={`w-full text-xs p-3 border rounded-xl font-medium focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all ${!isEditing ? 'bg-gray-50 border-gray-150 text-gray-500' : 'bg-white border-gray-250 text-gray-800'}`}
                      placeholder="Enter details of your current physical residence..."
                    />
                  </div>

                </div>
              </div>

              {/* SECTION B: EMERGENCY CONTACTS */}
              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-xs uppercase font-black text-teal-800 font-mono tracking-widest mb-3 flex items-center gap-1">
                  <span className="h-1 text-teal-600 pr-1">|</span>
                  Emergency Contact Information
                </h4>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 font-mono mb-1.5">Emergency Contact Number / Details</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input 
                      type="text" 
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      disabled={!isEditing}
                      className={`w-full text-xs p-3 pl-10 border rounded-xl font-medium focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all ${!isEditing ? 'bg-gray-50 border-gray-150 text-gray-500' : 'bg-white border-gray-250 text-gray-800'}`}
                      placeholder="e.g. Susan Adams (Spouse) - +1 (555) 321-4830"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION C: MEDICAL INFOS */}
              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-xs uppercase font-black text-teal-800 font-mono tracking-widest mb-3 flex items-center gap-1">
                  <span className="h-1 text-teal-600 pr-1">|</span>
                  Medical Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Blood Type */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 font-mono mb-1.5">Blood Type</label>
                    <select 
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                      disabled={!isEditing}
                      className={`w-full text-xs p-3 border rounded-xl font-medium focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all ${!isEditing ? 'bg-gray-50 border-gray-150 text-gray-500' : 'bg-white border-gray-200 text-gray-800'}`}
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Allergies */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 font-mono mb-1.5">Allergies</label>
                    <input 
                      type="text" 
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      disabled={!isEditing}
                      className={`w-full text-xs p-3 border rounded-xl font-medium focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all ${!isEditing ? 'bg-gray-50 border-gray-150 text-gray-500' : 'bg-white border-gray-250 text-gray-800'}`}
                      placeholder="e.g. Penicillin, Peanuts, Pollen"
                    />
                  </div>

                  {/* Chronic Diseases */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 font-mono mb-1.5">Chronic Diseases</label>
                    <input 
                      type="text" 
                      value={chronicDiseases}
                      onChange={(e) => setChronicDiseases(e.target.value)}
                      disabled={!isEditing}
                      className={`w-full text-xs p-3 border rounded-xl font-medium focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all ${!isEditing ? 'bg-gray-50 border-gray-150 text-gray-500' : 'bg-white border-gray-250 text-gray-800'}`}
                      placeholder="e.g. Diabetes, Hypertension"
                    />
                  </div>

                  {/* Medical Conditions */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 font-mono mb-1.5">Medical Conditions</label>
                    <input 
                      type="text" 
                      value={medicalConditions}
                      onChange={(e) => setMedicalConditions(e.target.value)}
                      disabled={!isEditing}
                      className={`w-full text-xs p-3 border rounded-xl font-medium focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all ${!isEditing ? 'bg-gray-50 border-gray-150 text-gray-500' : 'bg-white border-gray-250 text-gray-800'}`}
                      placeholder="e.g. Asthma, Seasonally affected respiratory concerns"
                    />
                  </div>
                </div>
              </div>

            </form>
          </div>

          {/* SECURITY SETTINGS CARD */}
          <div className="bg-white border border-gray-150 rounded-3xl shadow-sm text-left">
            <div className="border-b border-gray-100 px-6 py-4 bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-950 font-mono uppercase tracking-wider flex items-center gap-2">
                <Lock className="h-4.5 w-4.5 text-teal-600" />
                Security Settings
              </h3>
            </div>
            
            <form onSubmit={handlePasswordUpdate} className="p-6 space-y-4">
              
              {passSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center space-x-2.5 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold leading-normal">{passSuccessMsg}</span>
                </div>
              )}

              {passErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center space-x-2.5 text-rose-800">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold leading-normal">{passErrorMsg}</span>
                </div>
              )}

              <p className="text-xs text-gray-500 pb-2">
                Use this security console to refresh or update your active Firebase credentials at any time.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Current Password */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 font-mono mb-1.5">Current Password</label>
                  <input 
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 font-mono mb-1.5">New Password</label>
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    placeholder="Min 6 characters"
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 font-mono mb-1.5">Confirm Password</label>
                  <input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    placeholder="Match new password"
                  />
                </div>

              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="submit"
                  disabled={passSaving}
                  className="rounded-xl bg-slate-900 hover:bg-slate-950 text-white px-5 py-2.5 text-xs font-bold leading-normal transition-all flex items-center justify-center gap-1.5"
                >
                  {passSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  Update Security Password
                </button>
              </div>

            </form>
          </div>

        </div>
        
      </div>
      
    </div>
  );
}
