/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DailySchedule {
  isOff: boolean;
  startTime: string; // e.g. "09:00 AM"
  endTime: string;   // e.g. "05:00 PM"
  breakStartTime?: string; // e.g. "12:00 PM"
  breakEndTime?: string;   // e.g. "01:00 PM"
}

export interface DoctorWeeklySchedule {
  [day: string]: DailySchedule;
}

export type Role = 'Admin' | 'Doctor' | 'Receptionist' | 'Patient';

export interface User {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  createdAt: string;
  profileImage: string;
  isActive: boolean;
  gender: string;
  dob: string;
  address: string;
  specialty?: string;
  bio?: string;
  experience?: string;
  availability?: string[];
  password?: string;
  emergencyContact?: string;
  bloodType?: string;
  allergies?: string;
  chronicDiseases?: string;
  medicalConditions?: string;
  department?: string;
  departmentId?: string;
  specialization?: string;
  experienceYears?: number;
  weeklySchedule?: DoctorWeeklySchedule;
  appointmentDuration?: number;
  vacationMode?: boolean;
  unavailableDays?: string[];
}

export interface PatientRecord {
  uid: string;
  patientId: string;
  fullName: string;
  age: number;
  gender: string;
  phone: string;
  address: string;
  bloodType: string;
  medicalHistory: string;
  emergencyContact: string;
  email: string;
  profileImage: string;
  allergies?: string;
  chronicDiseases?: string;
  medicalConditions?: string;
}

export interface DoctorRecord {
  uid: string;
  doctorId: string;
  fullName: string;
  specialty: string;
  experience: string;
  phone: string;
  email: string;
  availability: string[]; // List of available week days like "Monday", "Tuesday"
  profileImage: string;
  bio?: string;
  department?: string;
  departmentId?: string;
  specialization?: string;
  experienceYears?: number;
  weeklySchedule?: DoctorWeeklySchedule;
  appointmentDuration?: number;
  vacationMode?: boolean;
  unavailableDays?: string[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: 'Pending' | 'Approved' | 'Completed' | 'Cancelled' | 'Checked In' | 'In Consultation';
  notes?: string;
  symptoms?: string;
  checkInStatus?: 'Pending' | 'Checked In' | 'Waiting for Doctor' | 'Completed';
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  symptoms: string;
  diagnosis: string;
  treatmentPlan: string;
  notes: string;
  visitDate: string; // YYYY-MM-DD
}

export interface Prescription {
  id: string;
  appointmentId?: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
  date: string; // YYYY-MM-DD
}

export interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  service: string;
  amount: number;
  paymentMethod: 'Cash' | 'Card' | 'Insurance' | 'Bank Transfer';
  status: 'Unpaid' | 'Paid' | 'Refunded';
  date: string; // YYYY-MM-DD
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: string; // Date string
}

export type Specialization = 'Dental Care' | 'Dermatology' | 'Pediatrics' | 'Cardiology' | 'Internal Medicine';

export interface Department {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DoctorDepartmentRequest {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  currentDepartmentId: string;
  currentDepartmentName: string;
  requestedDepartmentId: string;
  requestedDepartmentName: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

