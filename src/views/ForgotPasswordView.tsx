/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, HelpCircle, ArrowLeft, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../db/firebase';

interface ForgotPasswordViewProps {
  onNavigate: (view: string) => void;
}

export default function ForgotPasswordView({ onNavigate }: ForgotPasswordViewProps) {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email) return;

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: any) {
      console.error("Firebase Password Reset error:", err);
      let localMsg = "Failed to send reset link. Please check the email entered.";
      if (err.code === 'auth/user-not-found') {
        localMsg = "Access denied: No registered clinical profile matches this email credential.";
      } else if (err.code === 'auth/invalid-email') {
        localMsg = "Please enter a valid email format.";
      }
      setErrorMsg(localMsg);
    }
  };

  return (
    <div className="min-h-[85vh] w-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden font-sans">
      
      {/* Radial Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-900/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-slate-900/30 blur-[100px] pointer-events-none"></div>

      <div className="relative w-full max-w-md z-10">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_-12px_rgba(30,41,59,0.4)] text-left transition-all duration-300 hover:border-slate-700/80">
          
          {/* Back Link */}
          <button 
            id="back-to-auth-btn"
            onClick={() => onNavigate('login')}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-teal-400 mb-6 font-mono font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>BACK TO LOG IN</span>
          </button>

          <div className="text-center mb-6">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-955 border border-slate-800 text-teal-450 mb-3 shadow-inner">
              <HelpCircle className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-100 leading-tight">Key Restoration</h2>
            <p className="text-xs text-slate-400 mt-1 leading-normal font-mono">Recover your outpatient security keys.</p>
          </div>

          {errorMsg && (
            <div 
              id="reset-error-alert"
              className="mb-4 bg-rose-950/20 border border-rose-500/20 text-rose-300 text-xs p-3.5 rounded-xl flex items-start space-x-2.5 shadow-sm"
            >
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-rose-450" />
              <div className="font-mono text-[11px] leading-relaxed">
                <span className="font-bold text-rose-400">CRITICAL: </span>
                {errorMsg}
              </div>
            </div>
          )}

          {success ? (
            <div className="space-y-4 font-mono">
              <div className="bg-emerald-950/20 text-emerald-300 text-xs p-4 rounded-xl border border-emerald-500/20 leading-relaxed flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  RESTORE SIGNAL SENT. A unique password restoration link has been dispatched to <strong className="text-emerald-250">{email}</strong>. Check your inbox nodes.
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Follow details outlined in transmission to unlock administrative or outpatient workspace access modules.
              </p>
              <button
                id="reset-done-back-to-login"
                onClick={() => onNavigate('login')}
                className="w-full text-xs font-bold font-mono p-3 rounded-xl border border-teal-500/30 text-teal-400 hover:bg-teal-950/40 text-center transition-all cursor-pointer"
              >
                PROCEED TO TERMINAL
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-4 font-mono">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-400 mb-1 flex items-center space-x-1">
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                  <span>REGISTRY EMAIL ADDRESS</span>
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 bg-slate-950 text-slate-100 placeholder-slate-650"
                  placeholder="e.g. john@example.com"
                />
              </div>

              <p className="text-[10px] text-slate-400 leading-normal">
                State path to retrieve secure credentials ledger details.
              </p>

              <button
                id="reset-submit-btn"
                type="submit"
                className="w-full rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 p-3.5 text-xs font-bold tracking-wider hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-teal-500/10 cursor-pointer text-center"
              >
                <Send className="h-4 w-4" />
                <span>DISPATCH RESTORE KEY</span>
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
