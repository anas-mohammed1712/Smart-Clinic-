/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HeartPulse, Mail, Phone, MapPin, Clock, Calendar, ShieldCheck, Heart } from 'lucide-react';
import { CLINIC_CONFIG } from '../data/clinicConfig';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800 font-sans" id="app-footer">
      
      {/* Top Main Footer Block */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand & Introduction */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onNavigate('home')}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 text-white shadow-md shadow-teal-900/30">
                <HeartPulse className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white leading-none">{CLINIC_CONFIG.name}</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Delivering high-precision healthcare services powered by intelligent medical coordinators and role-based specialists.
            </p>
            <div className="flex space-x-3 pt-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-teal-400 hover:bg-teal-500 hover:text-white transition-colors duration-155 cursor-pointer">f</span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-teal-400 hover:bg-teal-500 hover:text-white transition-colors duration-155 cursor-pointer">t</span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-teal-400 hover:bg-teal-500 hover:text-white transition-colors duration-155 cursor-pointer">in</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono">Clinic Departments</h4>
            <ul className="space-y-2.5 text-sm">
              {CLINIC_CONFIG.specialties.slice(0, 4).map((specialty, idx) => (
                <li key={idx}>
                  <button onClick={() => onNavigate('home')} className="hover:text-white transition-colors text-left text-gray-400">
                    {specialty.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Resource Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono">Patient Portal Guides</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-white transition-colors text-left text-gray-400">About Our Facilities</button>
              </li>
              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-white transition-colors text-left text-gray-400">Frequently Asked Questions</button>
              </li>
              <li>
                <button onClick={() => onNavigate('login')} className="hover:text-white transition-colors text-left text-gray-400">Login Authentication</button>
              </li>
              <li>
                <button onClick={() => onNavigate('register')} className="hover:text-white transition-colors text-left text-gray-400">Patient Registration</button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono">Emergency Desk</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start space-x-2.5">
                <Phone className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                <span>{CLINIC_CONFIG.phone}</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <Mail className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                <span>{CLINIC_CONFIG.email}</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <MapPin className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                <span>{CLINIC_CONFIG.fullAddress}</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <Clock className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                <span>{CLINIC_CONFIG.operatingHoursShort}</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Divider and bottom info */}
        <div className="mt-12 border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} {CLINIC_CONFIG.name} Inc. All rights reserved. Secure clinical facilities.
          </p>
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <span>Built with using React, Tailwind CSS, and clinical precision</span>
          </div>
        </div>

      </div>

    </footer>
  );
}
