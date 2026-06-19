/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, ShieldCheck, Stethoscope, Clock, MapPin, 
  Sparkles, Phone, Mail, ChevronRight, Star, HelpCircle, ArrowRight 
} from 'lucide-react';
import { DoctorRecord } from '../types';
import { getDoctors, getCurrentSessionUser } from '../db/localDb';
import { CLINIC_CONFIG } from '../data/clinicConfig';

interface HomeViewProps {
  onNavigate: (view: string, tab?: string) => void;
}

export default function HomeView({ onNavigate }: HomeViewProps) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [contactSuccess, setContactSuccess] = useState(false);
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);

  // Load and sync doctors list from Local Database & Firestore Listener
  useEffect(() => {
    setDoctors(getDoctors());
    
    const handleSync = () => {
      setDoctors(getDoctors());
    };
    
    window.addEventListener('smartclinic_db_sync', handleSync);
    return () => {
      window.removeEventListener('smartclinic_db_sync', handleSync);
    };
  }, []);

  const hasSession = !!getCurrentSessionUser();

  const handleBookAction = () => {
    if (hasSession) {
      onNavigate('dashboard', 'book-appointment');
    } else {
      onNavigate('register');
    }
  };

  const handleConsultationAction = () => {
    if (hasSession) {
      onNavigate('dashboard', 'book-appointment');
    } else {
      onNavigate('register');
    }
  };

  // FAQ mock data with simpler clinic-approved copy
  const faqData = [
    { 
      q: "How do I book an appointment with a doctor?", 
      a: "Simply sign up for a patient portal account or log in if you already have one. Once in your dashboard, select your preferred doctor, consult type, and an available appointment slot. You will receive notifications directly in your portal once approved." 
    },
    { 
      q: "What should I prepare for my first appointment?", 
      a: "Please bring a valid photo ID, your insurance card (if applicable), and any previous clinical records, test results, or medications that help our medical team understand your details." 
    },
    { 
      q: "Are my medical records safe?", 
      a: "Absolutely. We employ strict data security standards including encryption and secure backend access to protect your patient profile, clinical notes, and billing history." 
    },
    { 
      q: "How long until my appointment request is confirmed?", 
      a: "Appointments are typically reviewed and approved within an hour. You will receive an immediate in-app alarm and dashboard update once your request is authorized." 
    }
  ];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contactForm.name && contactForm.email && contactForm.message) {
      const subject = `Appointment/Inquiry from ${contactForm.name}`;
      const body = `Visitor Details:\nName: ${contactForm.name}\nEmail: ${contactForm.email}\nPhone: ${contactForm.phone || 'N/A'}\n\nInquiry Details:\n${contactForm.message}`;
      
      const mailtoUri = `mailto:${CLINIC_CONFIG.adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      // Navigate to mailto link safely inside standard iframe configuration
      window.location.href = mailtoUri;

      setContactSuccess(true);
      setTimeout(() => setContactSuccess(false), 6000);
      setContactForm({ name: '', email: '', phone: '', message: '' });
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="font-sans text-gray-800 antialiased bg-gray-50/50">
      
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-white py-16 sm:py-24 border-b border-gray-100" id="hero-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
            
            {/* Left Texts */}
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
              <div className="inline-flex items-center space-x-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-600/10 mb-5 animate-pulse">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                <span>Trusted Healthcare Professionals</span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl md:text-6xl leading-[1.1]">
                Smart Healthcare for Better Patient Care
              </h1>
              <p className="mt-4 text-base text-gray-500 sm:mt-5 sm:text-lg leading-relaxed">
                Manage appointments, medical records, prescriptions, and clinic services in one secure platform.
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row sm:justify-center lg:justify-start gap-3">
                <button 
                  onClick={handleBookAction}
                  className="flex items-center justify-center space-x-1.5 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-700/20 hover:bg-teal-700 hover:scale-[1.01] transition-all cursor-pointer"
                  id="cta-book"
                >
                  <span>Book Appointment</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => scrollToSection('services-section')}
                  className="flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-gray-750 hover:bg-gray-50 hover:border-gray-300 hover:scale-[1.01] transition-all cursor-pointer"
                  id="cta-contact"
                >
                  Explore Services
                </button>
              </div>

              {/* Badges */}
              <div className="mt-8 border-t border-gray-100 pt-6 grid grid-cols-3 gap-4">
                <div>
                  <span className="block text-2xl font-bold text-gray-900">{CLINIC_CONFIG.specialties.length}</span>
                  <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Specialized Depts</span>
                </div>
                <div>
                  <span className="block text-2xl font-bold text-gray-900">Secure</span>
                  <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Patient Privacy</span>
                </div>
                <div>
                  <span className="block text-2xl font-bold text-gray-900">Direct</span>
                  <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Doctor Connection</span>
                </div>
              </div>

            </div>

            {/* Right Clinic Illustration Banner */}
            <div className="mt-12 sm:mt-16 lg:col-span-6 lg:mt-0 relative">
              <div className="aspect-video w-full rounded-2xl bg-gradient-to-tr from-teal-550 to-indigo-600 p-1 shadow-2xl relative overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=600" 
                  alt="Modern Clinic Consultation Office" 
                  className="h-full w-full object-cover rounded-[14px]"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gray-900/30 flex items-end p-6">
                  <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-white/20 w-full max-w-sm flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Board-Certified Specialists</h4>
                      <p className="text-[11px] text-gray-500">Fast appointment scheduling and dynamic clinical communication.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Quick Value Cards */}
      <section className="py-8 bg-white/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-start space-x-4">
              <div className="h-10 w-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Convenient Hours</h3>
                <p className="text-xs text-gray-505 mt-1 leading-relaxed">Serving families {CLINIC_CONFIG.operatingHoursShort} with guaranteed care coordination.</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-start space-x-4">
              <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Secure Records</h3>
                <p className="text-xs text-gray-505 mt-1 leading-relaxed">Protected user dashboards keeping your clinical summaries and prescription lists completely confidential.</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-start space-x-4">
              <div className="h-10 w-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Central Plaza Address</h3>
                <p className="text-xs text-gray-505 mt-1 leading-relaxed">{CLINIC_CONFIG.address}, with generous street parking.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. About Clinic Section */}
      <section className="py-16 sm:py-20 bg-white" id="about-us-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider font-mono">Our Heritage & Mission</span>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Dedicated to High-Standards of Clinical Practice
              </h2>
              <p className="mt-4 text-sm text-gray-500 leading-relaxed">
                Our Clinic is committed to bridging the gap between professional healthcare and secure digital accessibility. By introducing dynamic dashboards for Admin, Doctors, Receptionists, and Patients, we ensure scheduling, prescription writing, and billing are handled safely.
              </p>
              <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                Whether you need aesthetic dental restorations, customized skincare plans, pediatric care, or routine cardiac follow-ups, our doctors update clinical charts in real time. We make your family healthcare seamless and paperless.
              </p>
              <div className="mt-6">
                <button 
                  onClick={() => onNavigate('about')}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
                >
                  <span>Explore our clinical facilities & team</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-10 lg:mt-0">
              <img 
                src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=600" 
                alt="Modern Consultation Consultation Room" 
                className="rounded-2xl shadow-md border border-gray-100 w-full"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Specialties (Services) Cards */}
      <section className="py-16 bg-gray-50/70" id="services-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider font-mono">Multi-Specialty Facility</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-950 mt-1">Our Outpatient Departments</h2>
            <p className="text-sm text-gray-500 mt-2">Discover our board-appointed medical specialties staffed with experienced clinicians.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CLINIC_CONFIG.specialties.map((dept, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
                <div>
                  <span className={`text-[10px] font-mono font-bold ${dept.text} block mb-2`}>{dept.id}. DEPARTMENT</span>
                  <h3 className={`text-sm font-bold text-gray-900 ${dept.bg} px-3 py-1.5 rounded-lg inline-block`}>{dept.name}</h3>
                  <p className="text-xs text-gray-500 mt-3.5 leading-relaxed">{dept.description}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between gap-2">
                  <button 
                    onClick={() => scrollToSection('doctors-section')}
                    className="text-[11px] font-bold text-gray-600 hover:text-teal-600 transition-colors cursor-pointer"
                  >
                    View Doctors
                  </button>
                  <button 
                    onClick={handleConsultationAction}
                    className="text-[11px] font-bold text-teal-600 hover:text-teal-700 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Book Consultation</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Doctors Section */}
      <section className="py-16 bg-white" id="doctors-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider font-mono">Our Clinicians</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-950 mt-1">Meet Our Dedicated Doctors</h2>
            <p className="text-sm text-gray-500 mt-2">Dynamic real-time synchronization directly from our clinical databases.</p>
          </div>

          {doctors.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Stethoscope className="h-10 w-10 text-gray-400 mx-auto mb-3 animate-spin" />
              <p className="text-xs text-gray-550">Synchronizing clinical registry profiles...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {doctors.map((doc, idx) => (
                <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                  <div>
                    <div className="aspect-square w-full rounded-xl bg-teal-50/50 mb-3.5 relative flex flex-col justify-center items-center text-center p-4 border border-teal-100">
                      <div className="h-14 w-14 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xl mb-2">
                        {doc.fullName ? doc.fullName.split(' ').map(nBy => nBy[0]).join('').slice(0, 2).toUpperCase() : 'DR'}
                      </div>
                      <span className="absolute bottom-2.5 left-2.5 text-[9px] bg-teal-600 text-white font-bold uppercase tracking-wider px-2 py-1 rounded">
                        {doc.specialty}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">{doc.fullName}</h3>
                    <span className="text-[10px] text-gray-450 font-semibold block mt-0.5">{doc.experience} of Intensive Practice</span>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed italic line-clamp-2" title={doc.bio}>
                      "{doc.bio || 'Committed to delivering warm, high-quality family medical assistance.'}"
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-[9px] font-mono tracking-wider font-bold text-teal-800 bg-teal-50 px-2 py-1 rounded-full uppercase">
                      Availability: {doc.availability?.slice(0, 2).join(', ')}
                    </span>
                    <button 
                      onClick={handleBookAction}
                      className="text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 px-3.5 py-2 rounded-xl transition-all hover:scale-[1.01] flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Book Appointment</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 6. Testimonials Section */}
      <section className="py-16 bg-gradient-to-br from-teal-800 to-slate-900 text-white" id="testimonials-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono">Patient Voice</span>
            <h2 className="text-2xl font-bold tracking-tight mt-1 text-white">Loved by More Than 5,000 Verified Patients</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 text-left flex flex-col justify-between">
              <div>
                <div className="flex space-x-0.5 mb-3.5 text-amber-400">
                  <Star className="h-4 w-4 fill-amber-400" />
                  <Star className="h-4 w-4 fill-amber-400" />
                  <Star className="h-4 w-4 fill-amber-400" />
                  <Star className="h-4 w-4 fill-amber-400" />
                  <Star className="h-4 w-4 fill-amber-400" />
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  "Booking was incredibly easy. I selected my doctor, booked a consultation, and was approved within minutes. The actual physical checkup was outstanding."
                </p>
              </div>
              <div className="mt-6 flex items-center space-x-3 pt-3 border-t border-slate-700/60">
                <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=60" className="h-9 w-9 rounded-full object-cover shrink-0" />
                <div>
                  <span className="block text-xs font-bold text-white leading-tight">Eleanor Vance</span>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Dental Hygiene Patient</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 text-left flex flex-col justify-between">
              <div>
                <div className="flex space-x-0.5 mb-3.5 text-amber-400">
                  <Star className="h-4 w-4 fill-amber-400" />
                  <Star className="h-4 w-4 fill-amber-400" />
                  <Star className="h-4 w-4 fill-amber-400" />
                  <Star className="h-4 w-4 fill-amber-400" />
                  <Star className="h-4 w-4 fill-amber-400" />
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  "Highly professional medical clinic. Having my active prescriptions and personal medical history visible on my phone makes things incredibly convenient."
                </p>
              </div>
              <div className="mt-6 flex items-center space-x-3 pt-3 border-t border-slate-700/60">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=60" className="h-9 w-9 rounded-full object-cover shrink-0" />
                <div>
                  <span className="block text-xs font-bold text-white leading-tight">Robert Henderson</span>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Asthma Care Consult</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 text-left flex flex-col justify-between">
              <div>
                <div className="flex space-x-0.5 mb-3.5 text-amber-400">
                  <Star className="h-4 w-4 fill-amber-400" />
                  <Star className="h-4 w-4 fill-amber-400" />
                  <Star className="h-4 w-4 fill-amber-400" />
                  <Star className="h-4 w-4 fill-amber-400" />
                  <Star className="h-4 w-4 fill-amber-400" />
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  "Managing family care is stress-free now. We can coordinate doctor schedules instantly and skip routine waiting room delays. I strongly recommend this clinic."
                </p>
              </div>
              <div className="mt-6 flex items-center space-x-3 pt-3 border-t border-slate-700/60">
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=60" className="h-9 w-9 rounded-full object-cover shrink-0" />
                <div>
                  <span className="block text-xs font-bold text-white leading-tight">James Sterling</span>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Pediatric Care Father</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 7. FAQ Section */}
      <section className="py-16 bg-gray-50" id="faqs-section">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider font-mono">FAQ Desk</span>
            <h2 className="text-2xl font-bold text-gray-950 mt-1">Frequently Asked Clinical Questions</h2>
          </div>

          <div className="space-y-3.5">
            {faqData.map((faq, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl overflow-hidden transition-all duration-150">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4.5 text-left font-semibold text-sm text-gray-900 hover:text-teal-600 focus:outline-none cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <HelpCircle className="h-4.5 w-4.5 text-teal-500 shrink-0" />
                    <span>{faq.q}</span>
                  </div>
                  <ChevronRight className={`h-4.5 w-4.5 text-gray-400 transition-transform ${expandedFaq === i ? 'rotate-90' : ''}`} />
                </button>
                {expandedFaq === i && (
                  <div className="px-4.5 pb-4.5 pt-1 text-xs text-gray-500 leading-relaxed border-t border-gray-50 animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Contact & Help Desk Form Section */}
      <section className="py-16 bg-white border-t border-gray-100" id="contact-us-section">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Left Column Contact details */}
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-teal-600 uppercase tracking-wider font-mono">Instant Support Call</span>
                <h2 className="text-3xl font-extrabold text-gray-950 mt-1">Have operational questions? Reach out immediately!</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Our clinical response team is standing by to resolve any registration errors, doctor availability concerns, or general inquiries you have.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3.5">
                  <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 font-sans">General Office Desk</h4>
                    <p className="text-xs text-gray-500">{CLINIC_CONFIG.phone}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5">
                  <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 font-sans">Medical Support Email</h4>
                    <p className="text-xs text-gray-500">{CLINIC_CONFIG.email}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5">
                  <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 font-sans">Clinical Facility Address</h4>
                    <p className="text-xs text-gray-500">{CLINIC_CONFIG.fullAddress}</p>
                  </div>
                </div>
              </div>

              {/* Work Desk alerts */}
              <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-start space-x-3">
                <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-normal">
                  {CLINIC_CONFIG.closedMessage}
                </p>
              </div>
            </div>

            {/* Right Column Contact Form */}
            <div className="bg-gray-50/60 p-6 sm:p-8 rounded-3xl border border-gray-150">
              <h3 className="text-base font-bold text-gray-950 mb-4 flex items-center space-x-2">
                <HeartPulse className="h-5 w-5 text-teal-600" />
                <span>Clinic Desk Intake Form</span>
              </h3>
              
              {contactSuccess && (
                <div className="mb-4 bg-emerald-50 text-emerald-800 text-xs font-semibold p-3.5 rounded-xl border border-emerald-100">
                  Opening secure email client addressing {CLINIC_CONFIG.adminEmail} with inquiry details...
                </div>
              )}

              <form onSubmit={handleContactSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. James Smith"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g. james@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number (Optional)</label>
                    <input
                      type="text"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g. +1 (555) 012-3456"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Inquiry Message</label>
                  <textarea
                    required
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Describe your health symptoms or operational questions..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-teal-600 text-white p-3 text-xs font-bold tracking-wide hover:bg-teal-700 hover:scale-[1.01] transition-transform duration-100 cursor-pointer"
                >
                  Send Inquiry Message
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
