/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LogIn, Key, Mail, Eye, EyeOff, Sparkles, AlertCircle, HeartPulse, ShieldAlert, CheckCircle } from 'lucide-react';
import { getUsers, setCurrentSessionUser, saveUser } from '../db/localDb';
import { User, Role } from '../types';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../db/firebase';

interface LoginViewProps {
  onNavigate: (view: string) => void;
  onRefreshSession: () => void;
}

export default function LoginView({ onNavigate, onRefreshSession }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const validateEmail = (val: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(val);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Please input your registered email address and security access key.');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMsg('Please enter a valid email format (e.g. name@domain.com).');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('Password must verify containing at least 4 characters for security standards.');
      return;
    }

    try {
      // Authenticate via Firebase Authentication
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: any) {
        // If it's the designated Super Admin entering the correct designated password, auto-register on-the-fly!
        if (email.toLowerCase() === 'elkinganas495@gmail.com' && password === '01158698584') {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } catch (createErr: any) {
            console.error("Super Admin auto-creation error:", createErr);
            throw signInErr; // Fall back to throwing original sign-in error if creation fails for some other reason
          }
        } else {
          throw signInErr;
        }
      }
      
      const realUid = userCredential.user.uid;

      const allUsers = getUsers();
      let match = allUsers.find(u => u.uid === realUid || u.email.toLowerCase() === email.toLowerCase());

      if (!match) {
        // Create user profile on the fly so they can use the app seamlessly
        match = {
          uid: realUid,
          fullName: email.split('@')[0].toUpperCase(),
          email: email.toLowerCase(),
          phone: '+1 (555) 010-0000',
          role: email.toLowerCase() === 'elkinganas495@gmail.com' ? 'Admin' : 'Patient', // Assign Admin if Super Admin
          createdAt: new Date().toISOString(),
          profileImage: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=300',
          isActive: true,
          gender: 'Male',
          dob: '1990-01-01',
          address: 'Default Registered Address',
          password: password
        };
        saveUser(match);
      } else {
        if (!match.uid) {
          match.uid = realUid;
        }
        if (email.toLowerCase() === 'elkinganas495@gmail.com') {
          match.role = 'Admin';
          match.isActive = true;
        }
        match.password = password;
        saveUser(match);
      }

      // Success Authentication
      setCurrentSessionUser(match);
      onRefreshSession();
      setSuccessMsg(`AUTHENTICATION SIGNALS RESOLVED. Routing ${match.fullName} (${match.role}) to work station...`);
      
      setTimeout(() => {
        onNavigate('dashboard');
      }, 1200);

    } catch (err: any) {
      console.error("Firebase SignIn error:", err);
      let localErr = 'Access denied: No active clinician or patient matches this email credential.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        localErr = 'Access denied: Incorrect security access code.';
      } else if (err.code === 'auth/user-not-found') {
        localErr = 'Access denied: No registered clinical profile matches this email credential.';
      } else if (err.code === 'auth/invalid-email') {
        localErr = 'Please enter a valid email format (e.g. name@domain.com).';
      }
      setErrorMsg(localErr);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const realUid = userCredential.user.uid;
      const email = userCredential.user.email || '';
      const fullName = userCredential.user.displayName || email.split('@')[0].toUpperCase();

      const allUsers = getUsers();
      let match = allUsers.find(u => u.uid === realUid || (email && u.email.toLowerCase() === email.toLowerCase()));

      if (!match) {
        // Create user profile on the fly so they can use the app seamlessly
        match = {
          uid: realUid,
          fullName: fullName,
          email: email.toLowerCase(),
          phone: userCredential.user.phoneNumber || '+1 (555) 010-0000',
          role: email.toLowerCase() === 'elkinganas495@gmail.com' ? 'Admin' : 'Patient', // Assign Admin if Super Admin
          createdAt: new Date().toISOString(),
          profileImage: userCredential.user.photoURL || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=300',
          isActive: true,
          gender: 'Male',
          dob: '1990-01-01',
          address: 'Default Registered Address'
        };
        saveUser(match);
      } else {
        // Update user's UID or profile image if not already set
        if (!match.uid) {
          match.uid = realUid;
        }
        if (userCredential.user.photoURL && !match.profileImage) {
          match.profileImage = userCredential.user.photoURL;
        }
        if (email.toLowerCase() === 'elkinganas495@gmail.com') {
          match.role = 'Admin';
          match.isActive = true;
        }
        saveUser(match);
      }

      // Success Authentication
      setCurrentSessionUser(match);
      onRefreshSession();
      setSuccessMsg(`AUTHENTICATION SIGNALS RESOLVED. Routing ${match.fullName} (${match.role}) to work station...`);
      
      setTimeout(() => {
        onNavigate('dashboard');
      }, 1200);

    } catch (err: any) {
      console.error("Firebase Google SignIn error:", err);
      if (err.code === 'auth/popup-blocked') {
        setErrorMsg('Authentication popup was blocked by your browser. Please allow popups or try again.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Authentication popup was closed before completion. Please try again.');
      } else {
        setErrorMsg(err.message || 'An error occurred during Google Sign In.');
      }
    }
  };

  // Quick Account Login fills for easier testing evaluation
  const handleQuickFill = (role: Role) => {
    const allUsers = getUsers();
    const candidate = allUsers.find(u => u.role === role);
    if (candidate) {
      setEmail(candidate.email);
      setPassword('password123'); // fill a standard mock password
      setErrorMsg('');
    }
  };

  return (
    <div className="min-h-[85vh] w-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 relative overflow-hidden font-sans">
      
      {/* Subtle Light Teal & Emerald Radial Glow Effects */}
      <div 
        id="radial-glow-top-left"
        className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-teal-100/40 blur-[100px] pointer-events-none"
      ></div>
      <div 
        id="radial-glow-bottom-right"
        className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] rounded-full bg-slate-200/50 opacity-70 blur-[130px] pointer-events-none"
      ></div>
      <div 
        id="radial-glow-center"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-60 blur-[140px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(20, 184, 166, 0.1) 0%, rgba(248, 250, 252, 0) 70%)' }}
      ></div>

      <div className="relative w-full max-w-md z-10">
        
        {/* Crisp Card Container */}
        <div 
          id="login-card-panel"
          className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 text-left transition-all duration-300 hover:border-slate-300/90 hover:shadow-2xl hover:shadow-slate-200/50"
        >
          
          {/* Top Header Badge and Title */}
          <div className="text-center mb-6">
            <span 
              id="secure-badge"
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] uppercase font-mono font-bold tracking-widest text-teal-700 border border-teal-200 bg-teal-50 mb-3"
            >
              <HeartPulse className="h-3 w-3 animate-pulse text-teal-600" />
              <span>SECURE OUTPOST AUTHENTICATOR</span>
            </span>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 leading-tight">Welcome to SmartClinic</h2>
            <p className="text-xs text-slate-500 mt-1 leading-normal font-mono">Input secure session clearance keys.</p>
          </div>

          {/* Feedback alerts */}
          {errorMsg && (
            <div 
              id="login-error-alert"
              className="mb-4 bg-rose-50 border border-rose-205 text-rose-900 text-xs p-3.5 rounded-xl flex items-start space-x-2.5 shadow-sm"
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
              id="login-success-alert"
              className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs p-3.5 rounded-xl flex items-start space-x-2.5 shadow-sm font-mono"
            >
              <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-emerald-600" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold text-emerald-750">RESOLVED: </span>
                {successMsg}
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div id="email-field-group">
              <label className="block text-xs font-mono font-bold text-slate-600 mb-1 flex items-center space-x-1">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>USER DIRECTORY EMAIL</span>
              </label>
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-205 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white transition-all font-mono shadow-inner"
                style={{ borderColor: '#cbd5e1' }}
                placeholder="e.g. admin@smartclinic.com"
                required
              />
            </div>

            {/* Password Field */}
            <div id="password-field-group">
              <label className="block text-xs font-mono font-bold text-slate-600 mb-1 flex items-center space-x-1">
                <Key className="h-3.5 w-3.5 text-slate-400" />
                <span>SECURITY ACCESS CODE</span>
              </label>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-205 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white transition-all font-mono pr-10 shadow-inner"
                  style={{ borderColor: '#cbd5e1' }}
                  placeholder="••••••••"
                  required
                />
                <button
                  id="password-visibility-toggle"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember me & forgot password */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label 
                id="remember-me-label"
                className="flex items-center space-x-2 cursor-pointer font-mono font-medium text-slate-650 hover:text-slate-800"
              >
                <input
                  id="remember-me-checkbox"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 bg-slate-50 text-teal-600 focus:ring-teal-500 focus:ring-offset-white h-4 w-4"
                />
                <span>Keep Logged In</span>
              </label>
              <button 
                id="forgot-password-trigger"
                type="button" 
                onClick={() => onNavigate('forgot-password')}
                className="font-mono font-bold text-teal-600 hover:text-teal-700 transition-all hover:underline"
              >
                Restore Key
              </button>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-button"
              type="submit"
              className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white p-3.5 text-xs font-mono font-bold tracking-wider hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center space-x-2 shadow-lg shadow-teal-600/10 cursor-pointer"
            >
              <LogIn className="h-4 w-4" />
              <span>ENGAGE WORK SPACE</span>
            </button>

            {/* Divider */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-slate-450 text-[10px] font-mono font-black">OR</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Google Sign-In Button */}
            <button
              id="google-signin-button"
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 p-3.5 text-xs font-mono font-bold tracking-wider hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center space-x-2.5 cursor-pointer shadow-sm"
              style={{ borderColor: '#e2e8f0' }}
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" id="google-icon-svg">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.56-4.45 10.56-10.75 0-.725-.075-1.275-.165-1.635l-10.4-3.33z"
                />
              </svg>
              <span>ACCESS VIA GOOGLE ACCOUNT</span>
            </button>
          </form>

          {/* Navigation prompt */}
          <div className="mt-5 text-center text-xs text-slate-550 font-mono border-t border-slate-100 pt-4">
            <span>New clinic outpatient? </span>
            <button 
              id="switch-to-register-btn"
              onClick={() => onNavigate('register')}
              className="font-bold text-teal-600 hover:text-teal-700 transition-colors hover:underline"
            >
              Sign Up Profile
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
