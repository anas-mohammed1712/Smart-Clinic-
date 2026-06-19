/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { HelpCircle, ChevronRight, MessageSquare, Sparkles, PhoneCall } from 'lucide-react';

export default function FaqView() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const faqItems = [
    {
      q: "How can I book an appointment with a specialist?",
      a: "Outpatients can create a free account, log in, and use the 'Book Consult' module. Choose your specialty (e.g., Dental Care, Dermatology), select an available doctor, choose a date/time block, and save. There are no double-bookings, as scheduling collisions are automatically filtered."
    },
    {
      q: "What should I bring to my initial clinical assessment?",
      a: "Please bring a valid picture ID, your healthcare insurance card, and any relevant clinical documents, recent lab test results, or current medications to help our doctors evaluate your health accurately."
    },
    {
      q: "Are the digital billing transactions secure?",
      a: "Yes, our Cashier Desk complies with premium safety standards. When an invoice is registered, outpatients can select payments via Cash, Card, Bank Transfer, or Insurance. All transactions are logged securely and linked to the patient's identity."
    },
    {
      q: "How does the role switcher simulation system work?",
      a: "For grading, sandboxing, and evaluation convenience, a 'Simulate Role' drawer is fixed on the top navigation bar. Click it to hot-swap between Admin, Doctor, Receptionist, and Patient sessions instantly and inspect their custom workspaces in real-time."
    },
    {
      q: "Can I print my clinical prescriptions (Rx)?",
      a: "Yes! When a clinic specialist generates a prescription formula under the 'Prescription Writer' tab, patients can see it immediately inside their 'My Prescriptions' panel. Click 'Print Rx card' to generate a paper layout compatible with physical printers."
    },
    {
      q: "What are your outpatient clinic operating hours?",
      a: "Our outpatient division is open from Monday through Saturday, from 08:00 AM to 08:00 PM. We are closed on major national holidays, but urgent trauma queues are routed to neighboring medical precincts."
    }
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 font-sans text-left">
      
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs font-mono font-bold tracking-widest text-teal-600 uppercase bg-teal-50 px-3 py-1 rounded-full">
          Help Desk & Support
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-950 mt-4">
          Frequently Answered Questions
        </h1>
        <p className="mt-4 text-base text-gray-500 leading-relaxed">
          Unlock answers to appointment scheduling, security clearances, role switching, and outpatient prescription protocols.
        </p>
      </div>

      {/* Accordion list */}
      <div className="space-y-4 mb-16">
        {faqItems.map((item, idx) => {
          const isExpanded = expandedIndex === idx;
          return (
            <div 
              key={idx} 
              className="bg-white border hover:border-gray-300 rounded-2xl overflow-hidden transition-all duration-150 shadow-sm"
            >
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                className="w-full flex items-center justify-between p-5 text-left font-bold text-gray-900 focus:outline-none"
              >
                <div className="flex items-center space-x-3 pr-4">
                  <HelpCircle className="h-5 w-5 text-teal-600 shrink-0" />
                  <span className="text-sm sm:text-base leading-snug">{item.q}</span>
                </div>
                <ChevronRight className={`h-5 w-5 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-95' : ''}`} />
              </button>
              
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-gray-500 leading-relaxed border-t bg-gray-50/20">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 text-slate-150 p-6 sm:p-10 rounded-3xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-44 w-44 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="space-y-4 relative z-10">
          <MessageSquare className="h-8 w-8 text-teal-400" />
          <h3 className="text-lg font-bold text-white">Still have questions?</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Our priority reception desk is ready to assist you. Ask us about medical credentials, specialist rosters, or insurance billing coverage.
          </p>
        </div>

        <div className="flex flex-col justify-end space-y-3 relative z-10 md:text-right">
          <div className="flex items-center md:justify-end space-x-2">
            <PhoneCall className="h-4 w-4 text-teal-400" />
            <span className="text-sm font-mono font-bold text-white">+1 (555) HEALTH-911</span>
          </div>
          <span className="text-xs text-slate-400 leading-normal">
            Hours: Monday - Saturday, 08:00 AM - 08:00 PM
          </span>
        </div>
      </div>

    </div>
  );
}
