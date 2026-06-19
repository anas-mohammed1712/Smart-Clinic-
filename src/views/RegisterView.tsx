/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserCheck, Sparkles, AlertCircle, Eye, EyeOff, ClipboardList, Shield, CheckCircle } from 'lucide-react';
import { User, PatientRecord } from '../types';
import { saveUser, savePatient, triggerNotification, setCurrentSessionUser } from '../db/localDb';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../db/firebase';

interface RegisterViewProps {
  onNavigate: (view: string) => void;
  onRefreshSession?: () => void;
}

export default function RegisterView({ onNavigate, onRefreshSession }: RegisterViewProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const validateEmail = (val: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(val);
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: 'AWAITING ACCESS KEY', color: 'text-slate-400', barColor: 'bg-slate-200' };
    let score = 0;
    
    // Criteria checks
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) || /[!@#$%^&*_(),.?":{}|<>]/.test(pass)) score++;
    
    if (pass.length < 6) {
      return { score: 1, text: 'CRITICAL: WEAK KEY', color: 'text-rose-600 font-bold', barColor: 'bg-rose-500' };
    }
    if (score === 1) {
      return { score: 2, text: 'AVERAGE: MODERATE SECURITY', color: 'text-amber-600 font-bold', barColor: 'bg-amber-500' };
    }
    return { score: 3, text: 'SECURE: STRONG CRYPTO KEY', color: 'text-teal-600 font-bold', barColor: 'bg-teal-500' };
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Field-level check
    if (!fullName || !email || !phone || !password || !confirmPassword || !dob || !address) {
      setErrorMsg('All mandatory clinical directory field blocks must be populated.');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMsg('Invalid user directory email format detected. Please verify key structure.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('The matching validation password fields do not map together.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Clinical security standard mandates keys of at least 6 characters.');
      return;
    }

    try {
      // Register credentials via Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const realUid = userCredential.user.uid;
      const fakePatientId = 'PT-' + Math.floor(1000 + Math.random() * 9000);

      const newUser: User = {
        uid: realUid,
        fullName,
        email,
        phone,
        role: email.toLowerCase() === 'elkinganas495@gmail.com' ? 'Admin' : 'Patient',
        createdAt: new Date().toISOString(),
        profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300', // default patient avatar
        isActive: true,
        gender,
        dob,
        address,
        password: password,
        emergencyContact: emergencyContact || 'None specified during signup.'
      };

      const newPatient: PatientRecord = {
        uid: realUid,
        patientId: fakePatientId,
        fullName,
        age: calculateAge(dob),
        gender,
        phone,
        address,
        bloodType: 'O+', // default
        medicalHistory: 'New user registered via Patient Online Portal creation.',
        emergencyContact: emergencyContact || 'None specified during signup.',
        email,
        profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300'
      };

      // Save to simulated Firestore collection
      saveUser(newUser);
      savePatient(newPatient);

      // Auto Login Session mapping
      setCurrentSessionUser(newUser);
      if (onRefreshSession) {
        onRefreshSession();
      }

      // Register success notification
      triggerNotification(
        realUid, 
        'Profile Established', 
        'Congratulations! Your SmartClinic outpatient account has been successfully configured.', 
        'success'
      );

      setSuccessMsg(`Session security registry cleared! Initializing direct clinic workspace routing...`);
      
      setTimeout(() => {
        onNavigate('dashboard');
      }, 1500);

    } catch (err: any) {
      console.error("Firebase SignUp error:", err);
      let localErr = err.message;
      if (err.code === 'auth/email-already-in-use') {
        localErr = 'This email address is already registered in our system.';
      } else if (err.code === 'auth/invalid-email') {
        localErr = 'The email address format is invalid.';
      } else if (err.code === 'auth/weak-password') {
        localErr = 'The security key is too weak.';
      }
      setErrorMsg(localErr || 'An error occurred during registration. Please try again.');
    }
  };

  const calculateAge = (dateString: string): number => {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const strength = getPasswordStrength(password);

  return (
    <div className="min-h-[85vh] w-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-55 relative overflow-hidden font-sans" style={{ backgroundColor: '#f1f5f9' }}>
      
      {/* Dynamic Radial Glow Backdrops using Light Slate/Teal colors */}
      <div 
        id="reg-glow-left"
        className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-teal-100/40 blur-[120px] pointer-events-none"
      ></div>
      <div 
        id="reg-glow-right"
        className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-slate-200/50 opacity-60 blur-[100px] pointer-events-none"
      ></div>

      <div className="relative w-full max-w-lg z-10 my-4">
        
        {/* Crisp White Card Container */}
        <div 
          id="registration-panel-card"
          className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 text-left transition-all duration-300 hover:border-slate-300 hover:shadow-2xl hover:shadow-slate-200/50"
        >
          
          {/* Header layout */}
          <div className="text-center mb-6">
            <span 
              id="registry-badge"
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] uppercase font-mono font-bold tracking-widest text-teal-700 border border-teal-200 bg-teal-50 mb-3"
            >
              <ClipboardList className="h-3 w-3 text-teal-600" />
              <span>OUTPATIENT CLINIC ENROLLMENT</span>
            </span>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 leading-tight">Patient Registration</h2>
            <p className="text-xs text-slate-500 mt-1 leading-normal font-mono">Create an outpatient directory entry securely.</p>
          </div>

          {/* Feedback banners */}
          {errorMsg && (
            <div 
              id="reg-error-alert"
              className="mb-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs p-3.5 rounded-xl flex items-start space-x-2.5 shadow-sm"
              style={{ borderColor: '#fecdd3' }}
            >
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-rose-600" />
              <div className="font-mono text-[11px] leading-relaxed">
                <span className="font-bold text-rose-700">CRITICAL: </span>
                {errorMsg}
              </div>
            </div>
          )}

          {successMsg && (
            <div 
              id="reg-success-alert"
              className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs p-3.5 rounded-xl flex items-start space-x-2.5 shadow-sm font-mono"
            >
              <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-emerald-600" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold text-emerald-750">AUTHENTICATED: </span>
                {successMsg}
              </div>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            
            {/* Row 1: Full Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-650 uppercase tracking-wider mb-1">
                  Full Legal Name *
                </label>
                <input
                  id="reg-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-205 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white transition-all font-mono shadow-inner"
                  style={{ borderColor: '#cbd5e1' }}
                  placeholder="e.g. Johnathan Smith"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-650 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-205 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white transition-all font-mono shadow-inner"
                  style={{ borderColor: '#cbd5e1' }}
                  placeholder="e.g. name@domain.com"
                />
                {email && !validateEmail(email) && (
                  <span className="text-[9px] text-rose-600 font-mono mt-1 block">× Check layout email standard format</span>
                )}
              </div>
            </div>

            {/* Row 2: Phone & Emergency Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-650 uppercase tracking-wider mb-1">
                  Cell Phone Number *
                </label>
                <input
                  id="reg-phone"
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-205 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white transition-all font-mono shadow-inner"
                  style={{ borderColor: '#cbd5e1' }}
                  placeholder="+1 (555) 012-3456"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-650 uppercase tracking-wider mb-1">
                  Emergency Contact Name/Cell *
                </label>
                <input
                  id="reg-emergency"
                  type="text"
                  required
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-205 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white transition-all font-mono shadow-inner"
                  style={{ borderColor: '#cbd5e1' }}
                  placeholder="Jane Smith (Mother) - +1..."
                />
              </div>
            </div>

            {/* Row 3: Gender & DOB */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-650 uppercase tracking-wider mb-1">
                  Biological Gender *
                </label>
                <select
                  id="reg-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-205 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all font-mono cursor-pointer"
                  style={{ borderColor: '#cbd5e1' }}
                >
                  <option className="bg-white text-slate-900" value="Male">Male</option>
                  <option className="bg-white text-slate-900" value="Female">Female</option>
                  <option className="bg-white text-slate-900" value="Other">Other / Non-Binary</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-650 uppercase tracking-wider mb-1">
                  Date of Birth *
                </label>
                <input
                  id="reg-dob"
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-205 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all font-mono cursor-pointer shadow-inner"
                  style={{ borderColor: '#cbd5e1' }}
                />
              </div>
            </div>

            {/* Row 4: Mailing Address */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-650 uppercase tracking-wider mb-1">
                Primary Home Directory Address *
              </label>
              <input
                id="reg-address"
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-205 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white transition-all font-mono shadow-inner"
                style={{ borderColor: '#cbd5e1' }}
                placeholder="Full home or mailing directory address"
              />
            </div>

            {/* Row 5: Secrets Security Key Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 pt-3.5">
              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-650 uppercase tracking-wider mb-1">
                  Security Access Key *
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-205 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white transition-all font-mono pr-10 shadow-inner"
                    style={{ borderColor: '#cbd5e1' }}
                    placeholder="Min 6 characters"
                  />
                  <button
                    id="reg-password-toggle"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-650 uppercase tracking-wider mb-1">
                  Validate Access Key *
                </label>
                <input
                  id="reg-confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-205 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white transition-all font-mono shadow-inner"
                  style={{ borderColor: '#cbd5e1' }}
                  placeholder="Repeat access key"
                />
              </div>
            </div>

            {/* Live Interactive Password Strength Meter */}
            <div id="reg-password-meter" className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-slate-600 font-bold">KEY METRICS ANALYSIS:</span>
                <span className={`tracking-wide text-[9px] px-1.5 py-0.5 rounded border border-slate-200 bg-white ${strength.color}`}>
                  {strength.text}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-1.5">
                <div className={`h-1.5 rounded bg-slate-200 transition-all duration-300 ${password.length > 0 ? strength.barColor : ''}`}></div>
                <div className={`h-1.5 rounded bg-slate-200 transition-all duration-300 ${password.length >= 6 && strength.score >= 2 ? strength.barColor : ''}`}></div>
                <div className={`h-1.5 rounded bg-slate-200 transition-all duration-300 ${password.length >= 8 && strength.score === 3 ? strength.barColor : ''}`}></div>
              </div>

              <div id="pass-checks-text" className="grid grid-cols-2 gap-1 text-[9px] font-mono text-slate-500 pt-1">
                <div className="flex items-center space-x-1">
                  <span className={password.length >= 6 ? "text-teal-600 font-bold" : "text-slate-400"}>
                    {password.length >= 6 ? "✓" : "○"} At least 6 symbols
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className={(/[A-Z]/.test(password) || /[!@#$%^&*_(),.?":{}|<>]/.test(password)) && password.length >= 6 ? "text-teal-600 font-bold" : "text-slate-400"}>
                    {(/[A-Z]/.test(password) || /[!@#$%^&*_(),.?":{}|<>]/.test(password)) && password.length >= 6 ? "✓" : "○"} Uppercase/Special Char
                  </span>
                </div>
              </div>
            </div>

            {/* Secure data disclaimer */}
            <div 
              id="registry-disclaimer"
              className="p-3 bg-slate-50 rounded-xl flex items-start space-x-2 border border-slate-150 text-[10px] leading-relaxed font-mono"
            >
              <Shield className="h-4.5 w-4.5 text-teal-600 mt-0.5 shrink-0" />
              <p className="text-slate-500">
                Outpatient registry data is compiled securely inline with local host compliance protocols. Access permission modules default to role PATIENT.
              </p>
            </div>

            {/* Submit Button */}
            <button
              id="registration-submit-btn"
              type="submit"
              className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white p-3.5 text-xs font-mono font-bold tracking-wider hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center space-x-2 shadow-lg shadow-teal-600/10 cursor-pointer"
            >
              <UserCheck className="h-4 w-4" />
              <span>ENGAGE NEW CLIENT NODE</span>
            </button>
          </form>

          {/* Prompt switch button */}
          <div className="mt-5 text-center text-xs text-slate-550 font-mono border-t border-slate-100 pt-4">
            <span>Already registered clinician/patient? </span>
            <button 
              id="switch-to-login-btn"
              onClick={() => onNavigate('login')}
              className="font-bold text-teal-600 hover:text-teal-700 transition-colors hover:underline"
            >
              Authenticate Portal
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
