/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Shield, Sparkles, Award, HeartPulse, Clock, HelpCircle, CheckCircle } from 'lucide-react';
import { CLINIC_CONFIG } from '../data/clinicConfig';

export default function AboutView() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 font-sans">
      
      {/* 1. Header Hero */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-teal-600 bg-teal-50 px-3 py-1 rounded-full">
          Est. 2018 &bull; {CLINIC_CONFIG.cityStateZip}
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-950 mt-4 sm:text-5xl">
          We exist to build better patient outcomes.
        </h1>
        <p className="mt-4 text-base sm:text-lg text-gray-500 leading-relaxed">
          Through modern role-based secure platforms, integrated prescription print engines, and zero schedule double-bookings.
        </p>
      </div>

      {/* 2. Core Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white p-6 rounded-2xl border border-gray-105 shadow-sm text-left">
          <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
            <Shield className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Patient-First Ethics</h3>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            All clinical diagnosis notes and treatment regimes remain strictly confidential inside secure local database records.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-105 shadow-sm text-left">
          <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Smart Schedule Slots</h3>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Our intelligent reservation algorithm screens doctor timetables to eliminate double-bookings and reduce outpatient waiting times to under 10 minutes.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-105 shadow-sm text-left">
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
            <Award className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Certified Specialists</h3>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Every clinic doctor possesses verified board credentials and is actively screened on outpatient safety and surgical precision.
          </p>
        </div>
      </div>

      {/* 3. Detailed Stats */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 mb-16 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-0 bottom-0 -translate-x-12 translate-y-12 h-64 w-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center relative z-10">
          <div>
            <span className="block text-4xl sm:text-5xl font-extrabold text-teal-400">12,000+</span>
            <span className="block text-xs uppercase font-mono tracking-wider text-slate-400 mt-2">Outpatients Treated</span>
          </div>
          <div>
            <span className="block text-4xl sm:text-5xl font-extrabold text-teal-400">18+</span>
            <span className="block text-xs uppercase font-mono tracking-wider text-slate-400 mt-2">Board-Certified Doctors</span>
          </div>
          <div>
            <span className="block text-4xl sm:text-5xl font-extrabold text-teal-400">99.8%</span>
            <span className="block text-xs uppercase font-mono tracking-wider text-slate-400 mt-2">Booking Approvals</span>
          </div>
          <div>
            <span className="block text-4xl sm:text-5xl font-extrabold text-teal-400">15 min</span>
            <span className="block text-xs uppercase font-mono tracking-wider text-slate-400 mt-2">Average Cycle Time</span>
          </div>
        </div>
      </div>

      {/* 4. Infrastructure Specifications */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center mb-16">
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider font-mono">Modern Facilities</span>
          <h2 className="text-3xl font-extrabold text-gray-950 mt-2">Clinical Architecture & Outpatient Comfort</h2>
          <p className="text-sm text-gray-500 mt-4 leading-relaxed">
            Our outpatient facility incorporates modern private consultation wards, pediatric play chambers, dermatology phototherapy machinery, and diagnostic ECG units.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "High-precision HEPA cleanroom grids",
              "Private physical security locks on record rooms",
              "Dedicated child play zones inside Outpatient lobbies",
              "Direct access to neighboring emergency pharmacies"
            ].map((text, i) => (
              <li key={i} className="flex items-center space-x-2 text-xs font-medium text-gray-700">
                <CheckCircle className="h-4 w-4 text-teal-500 shrink-0" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-10 lg:mt-0">
          <img 
            src="https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=600" 
            alt="Clinical Laboratory Ward" 
            className="rounded-2xl border border-gray-100 shadow-md w-full"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

    </div>
  );
}
