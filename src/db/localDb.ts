/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SEED_USERS, SEED_PATIENTS, SEED_DOCTORS, SEED_APPOINTMENTS, SEED_MEDICAL_RECORDS, SEED_PRESCRIPTIONS, SEED_BILLING, SEED_NOTIFICATIONS } from '../data/mockData';
import { User, PatientRecord, DoctorRecord, Appointment, MedicalRecord, Prescription, BillingInvoice, AppNotification, Department, DoctorDepartmentRequest } from '../types';
import { db, auth } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Storage keys
const KEYS = {
  USERS: 'smartclinic_users',
  PATIENTS: 'smartclinic_patients',
  DOCTORS: 'smartclinic_doctors',
  APPOINTMENTS: 'smartclinic_appointments',
  MEDICAL_RECORDS: 'smartclinic_medical_records',
  PRESCRIPTIONS: 'smartclinic_prescriptions',
  BILLING: 'smartclinic_billing',
  NOTIFICATIONS: 'smartclinic_notifications',
  CURRENT_USER: 'smartclinic_current_user',
  DEPARTMENTS: 'smartclinic_departments',
  DOCTOR_DEPARTMENT_REQUESTS: 'smartclinic_doctor_department_requests',
};

// Error handle types and helpers matching Zero-Trust Firebase Integration Skill
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Write & delete helper abstractions
function sanitizeUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeUndefined);
  }
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        res[key] = sanitizeUndefined(obj[key]);
      }
    }
    return res;
  }
  return obj;
}

async function writeToFirestore(collectionPath: string, docId: string, data: any) {
  try {
    const sanitized = sanitizeUndefined(data);
    await setDoc(doc(db, collectionPath, docId), sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionPath}/${docId}`);
  }
}

async function removeFromFirestore(collectionPath: string, docId: string) {
  try {
    await deleteDoc(doc(db, collectionPath, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionPath}/${docId}`);
  }
}

// Background Live synchronizer
let listenersRegistered = false;
let activeUnsubscribes: (() => void)[] = [];

export function setupFirestoreListeners(): void {
  if (listenersRegistered) return;
  listenersRegistered = true;

  onAuthStateChanged(auth, async (user) => {
    // 1. Clean up existing active subscriptions to prevent permission leaks
    activeUnsubscribes.forEach(unsub => unsub());
    activeUnsubscribes = [];

    if (!user) {
      console.log("No authenticated user session, holding Firestore subscriptions.");
      return;
    }

    console.log("User authenticated in Firestore context:", user.email, "- initializing database synchronization.");

    // 2. Perform local data seeding to Firestore if it has not been done yet for this user
    const syncKey = `smartclinic_firestore_synced_${user.uid}`;
    if (!localStorage.getItem(syncKey)) {
      localStorage.setItem(syncKey, 'true');
      console.log("First-time session start for active user. Copying local datasets to cloud Firestore storage...");
      try {
        // Seed users
        const users = getUsers();
        for (const u of users) {
          await writeToFirestore('users', u.uid, u);
        }
        // Seed patients
        const patients = getPatients();
        for (const p of patients) {
          await writeToFirestore('patients', p.uid || p.patientId, p);
        }
        // Seed raw doctors
        const rawDoctors = getCollection<DoctorRecord>(KEYS.DOCTORS);
        for (const d of rawDoctors) {
          await writeToFirestore('doctors', d.uid || d.doctorId, d);
        }
        // Seed appointments
        const appointments = getCollection<Appointment>(KEYS.APPOINTMENTS);
        for (const a of appointments) {
          await writeToFirestore('appointments', a.id, a);
        }
        // Seed medical records
        const medicalRecords = getCollection<MedicalRecord>(KEYS.MEDICAL_RECORDS);
        for (const m of medicalRecords) {
          await writeToFirestore('medical_records', m.id, m);
        }
        // Seed prescriptions
        const prescriptions = getCollection<Prescription>(KEYS.PRESCRIPTIONS);
        for (const pr of prescriptions) {
          await writeToFirestore('prescriptions', pr.id, pr);
        }
        // Seed billing
        const billing = getCollection<BillingInvoice>(KEYS.BILLING);
        for (const b of billing) {
          await writeToFirestore('billing', b.id, b);
        }
        // Seed notifications
        const notifications = getCollection<AppNotification>(KEYS.NOTIFICATIONS);
        for (const n of notifications) {
          await writeToFirestore('notifications', n.id, n);
        }
        // Seed departments
        const departments = getCollection<Department>(KEYS.DEPARTMENTS);
        for (const dept of departments) {
          await writeToFirestore('departments', dept.id, dept);
        }
        // Seed doctor department requests
        const requests = getCollection<DoctorDepartmentRequest>(KEYS.DOCTOR_DEPARTMENT_REQUESTS);
        for (const r of requests) {
          await writeToFirestore('doctorDepartmentRequests', r.id, r);
        }
        console.log("Local datasets successfully pushed to Firestore.");
      } catch (err) {
        console.error("Critical error during initial local-to-cloud Firestore seeding:", err);
      }
    }

    // 3. Set up listeners
    const collections = [
      { key: KEYS.USERS, path: 'users' },
      { key: KEYS.PATIENTS, path: 'patients' },
      { key: KEYS.DOCTORS, path: 'doctors' },
      { key: KEYS.APPOINTMENTS, path: 'appointments' },
      { key: KEYS.MEDICAL_RECORDS, path: 'medical_records' },
      { key: KEYS.PRESCRIPTIONS, path: 'prescriptions' },
      { key: KEYS.BILLING, path: 'billing' },
      { key: KEYS.NOTIFICATIONS, path: 'notifications' },
      { key: KEYS.DEPARTMENTS, path: 'departments' },
      { key: KEYS.DOCTOR_DEPARTMENT_REQUESTS, path: 'doctorDepartmentRequests' },
    ];

    collections.forEach(({ key, path }) => {
      const unsub = onSnapshot(collection(db, path), (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((doc) => {
          items.push({ ...doc.data() });
        });
        saveCollection(key, items);
        window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));
      }, (error) => {
        console.warn(`Firestore onSnapshot subscription failed/restricted for ${path}:`, error.message);
      });
      activeUnsubscribes.push(unsub);
    });
  });
}

// Help initialize data if not present
export function initializeDatabase() {
  // Wipe old stale mock data when the dummy data deletion is requested
  if (!localStorage.getItem('smartclinic_dummy_data_cleared_v4')) {
    localStorage.removeItem(KEYS.USERS);
    localStorage.removeItem(KEYS.PATIENTS);
    localStorage.removeItem(KEYS.DOCTORS);
    localStorage.removeItem(KEYS.APPOINTMENTS);
    localStorage.removeItem(KEYS.MEDICAL_RECORDS);
    localStorage.removeItem(KEYS.PRESCRIPTIONS);
    localStorage.removeItem(KEYS.BILLING);
    localStorage.removeItem(KEYS.NOTIFICATIONS);
    localStorage.removeItem(KEYS.CURRENT_USER);
    localStorage.removeItem(KEYS.DEPARTMENTS);
    localStorage.removeItem(KEYS.DOCTOR_DEPARTMENT_REQUESTS);
    localStorage.setItem('smartclinic_dummy_data_cleared_v4', 'true');
  }

  if (!localStorage.getItem(KEYS.DEPARTMENTS)) {
    const defaultDepts: Department[] = [
      {
        id: "01",
        name: "Dental Care",
        description: "Complete family aesthetic dentistry, crowns, root canals, and emergency tooth replacements.",
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "02",
        name: "Dermatology",
        description: "Advanced skincare consults, eczema triggers management, and benign mole removals.",
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "03",
        name: "Pediatrics",
        description: "Warm growth examinations, infant immunization calendars, and childhood nutrition counseling.",
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "04",
        name: "Cardiology",
        description: "Electrocardiography tests, preventative wellness plans, and arterial hypertension medical monitors.",
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "05",
        name: "Internal Medicine",
        description: "Comprehensive systemic reviews, chronic endocrine management, and regular adult lab followups.",
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(KEYS.DEPARTMENTS, JSON.stringify(defaultDepts));
  }

  if (!localStorage.getItem(KEYS.DOCTOR_DEPARTMENT_REQUESTS)) {
    localStorage.setItem(KEYS.DOCTOR_DEPARTMENT_REQUESTS, JSON.stringify([]));
  }

  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(SEED_USERS));
  }
  if (!localStorage.getItem(KEYS.PATIENTS)) {
    localStorage.setItem(KEYS.PATIENTS, JSON.stringify(SEED_PATIENTS));
  }
  if (!localStorage.getItem(KEYS.DOCTORS)) {
    localStorage.setItem(KEYS.DOCTORS, JSON.stringify(SEED_DOCTORS));
  }
  if (!localStorage.getItem(KEYS.APPOINTMENTS)) {
    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(SEED_APPOINTMENTS));
  }
  if (!localStorage.getItem(KEYS.MEDICAL_RECORDS)) {
    localStorage.setItem(KEYS.MEDICAL_RECORDS, JSON.stringify(SEED_MEDICAL_RECORDS));
  }
  if (!localStorage.getItem(KEYS.PRESCRIPTIONS)) {
    localStorage.setItem(KEYS.PRESCRIPTIONS, JSON.stringify(SEED_PRESCRIPTIONS));
  }
  if (!localStorage.getItem(KEYS.BILLING)) {
    localStorage.setItem(KEYS.BILLING, JSON.stringify(SEED_BILLING));
  }
  if (!localStorage.getItem(KEYS.NOTIFICATIONS)) {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
  }
  // Ensure the starter state of current user is unauthenticated to show the Login/Signup flow
  if (!localStorage.getItem('smartclinic_auth_reset_done_v2')) {
    localStorage.removeItem(KEYS.CURRENT_USER);
    localStorage.setItem('smartclinic_auth_reset_done_v2', 'true');
  }

  // Register real-time observers for automatic model mapping
  setupFirestoreListeners();
}

// Low-level storage accessors
function getCollection<T>(key: string): T[] {
  initializeDatabase();
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function saveCollection<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Current User Session
export function getCurrentSessionUser(): User | null {
  initializeDatabase();
  const raw = localStorage.getItem(KEYS.CURRENT_USER);
  return raw ? JSON.parse(raw) : null;
}

export function setCurrentSessionUser(user: User | null): void {
  if (user) {
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(KEYS.CURRENT_USER);
  }
}

// --- Users ---
export function getUsers(): User[] {
  return getCollection<User>(KEYS.USERS);
}

export function saveUser(user: User): void {
  const users = getUsers();
  const index = users.findIndex(u => u.uid === user.uid);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  saveCollection(KEYS.USERS, users);

  window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));

  // Sync to Firestore
  writeToFirestore('users', user.uid, user);
}

export function deleteUser(uid: string): void {
  const users = getUsers().filter(u => u.uid !== uid);
  saveCollection(KEYS.USERS, users);

  window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));

  // Sync to Firestore
  removeFromFirestore('users', uid);
}

// --- Patients ---
export function getPatients(): PatientRecord[] {
  return getCollection<PatientRecord>(KEYS.PATIENTS);
}

export function savePatient(patient: PatientRecord): void {
  const patients = getPatients();
  const index = patients.findIndex(p => p.uid === patient.uid || p.patientId === patient.patientId);
  const patientToSave = index >= 0 ? { ...patients[index], ...patient } : patient;
  if (index >= 0) {
    patients[index] = patientToSave;
  } else {
    patients.push(patientToSave);
  }
  saveCollection(KEYS.PATIENTS, patients);

  // Sync to general users if patient changes details
  const users = getUsers();
  const userIndex = users.findIndex(u => u.uid === patientToSave.uid);
  if (userIndex >= 0) {
    users[userIndex].fullName = patientToSave.fullName;
    users[userIndex].phone = patientToSave.phone;
    users[userIndex].address = patientToSave.address;
    users[userIndex].gender = patientToSave.gender;
    saveCollection(KEYS.USERS, users);

    writeToFirestore('users', users[userIndex].uid, users[userIndex]);
  }

  window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));

  // Sync to Firestore
  const docId = patientToSave.uid || patientToSave.patientId;
  writeToFirestore('patients', docId, patientToSave);
}

export function deletePatient(uidOrId: string): void {
  const patients = getPatients().filter(p => p.uid !== uidOrId && p.patientId !== uidOrId);
  saveCollection(KEYS.PATIENTS, patients);

  window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));

  removeFromFirestore('patients', uidOrId);
}

// --- Doctors ---
export function getDoctors(): DoctorRecord[] {
  const rawDoctors = getCollection<DoctorRecord>(KEYS.DOCTORS);
  const doctorUsers = getUsers().filter(u => u.role === 'Doctor');
  
  return doctorUsers.map(user => {
    const matchedDoc = rawDoctors.find(d => d.uid === user.uid || d.doctorId === user.uid);
    return {
      uid: user.uid,
      doctorId: user.uid,
      fullName: user.fullName,
      specialty: user.specialty || matchedDoc?.specialty || 'General Care',
      experience: user.experience || matchedDoc?.experience || '3 Years',
      phone: user.phone || matchedDoc?.phone || '',
      email: user.email,
      availability: user.availability || matchedDoc?.availability || ['Monday', 'Wednesday'],
      profileImage: user.profileImage || matchedDoc?.profileImage || '',
      bio: user.bio || matchedDoc?.bio || 'Committed to delivering warm, high-quality family medical assistance.',
      department: user.department || matchedDoc?.department || 'General Practice',
      departmentId: user.departmentId || matchedDoc?.departmentId || '',
      specialization: user.specialization || matchedDoc?.specialization || '',
      experienceYears: user.experienceYears || matchedDoc?.experienceYears || 3,
      weeklySchedule: user.weeklySchedule || matchedDoc?.weeklySchedule,
      appointmentDuration: user.appointmentDuration || matchedDoc?.appointmentDuration || 30,
      vacationMode: user.vacationMode || matchedDoc?.vacationMode || false,
      unavailableDays: user.unavailableDays || matchedDoc?.unavailableDays || []
    };
  });
}

export function saveDoctor(doctor: DoctorRecord): void {
  const rawDoctors = getCollection<DoctorRecord>(KEYS.DOCTORS);
  const index = rawDoctors.findIndex(d => d.uid === doctor.uid || d.doctorId === doctor.doctorId);
  const doctorToSave = index >= 0 ? { ...rawDoctors[index], ...doctor } : doctor;
  if (index >= 0) {
    rawDoctors[index] = doctorToSave;
  } else {
    rawDoctors.push(doctorToSave);
  }
  saveCollection(KEYS.DOCTORS, rawDoctors);

  // Sync to general users if doctor specialty/details change
  const users = getUsers();
  const userIndex = users.findIndex(u => u.uid === doctorToSave.uid);
  if (userIndex >= 0) {
    users[userIndex].fullName = doctorToSave.fullName;
    users[userIndex].phone = doctorToSave.phone;
    users[userIndex].specialty = doctorToSave.specialty;
    users[userIndex].experience = doctorToSave.experience;
    users[userIndex].availability = doctorToSave.availability;
    users[userIndex].bio = doctorToSave.bio;
    users[userIndex].department = doctorToSave.department;
    users[userIndex].departmentId = doctorToSave.departmentId;
    users[userIndex].weeklySchedule = doctorToSave.weeklySchedule;
    users[userIndex].appointmentDuration = doctorToSave.appointmentDuration;
    users[userIndex].vacationMode = doctorToSave.vacationMode;
    users[userIndex].unavailableDays = doctorToSave.unavailableDays;
    saveCollection(KEYS.USERS, users);

    writeToFirestore('users', users[userIndex].uid, users[userIndex]);
  }

  window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));

  // Sync to Firestore
  const docId = doctorToSave.uid || doctorToSave.doctorId;
  writeToFirestore('doctors', docId, doctorToSave);
}

export function deleteDoctor(uidOrId: string): void {
  const doctors = getCollection<DoctorRecord>(KEYS.DOCTORS).filter(d => d.uid !== uidOrId && d.doctorId !== uidOrId);
  saveCollection(KEYS.DOCTORS, doctors);

  window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));

  removeFromFirestore('doctors', uidOrId);
}

// --- Appointments ---
export function getAppointments(): Appointment[] {
  return getCollection<Appointment>(KEYS.APPOINTMENTS);
}

export function saveAppointment(appointment: Appointment): void {
  const appointments = getAppointments();
  const index = appointments.findIndex(a => a.id === appointment.id);
  if (index >= 0) {
    appointments[index] = appointment;
  } else {
    appointments.push(appointment);
  }
  saveCollection(KEYS.APPOINTMENTS, appointments);

  window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));

  // Sync to Firestore
  writeToFirestore('appointments', appointment.id, appointment);
}

export function deleteAppointment(id: string): void {
  const appointments = getAppointments().filter(a => a.id !== id);
  saveCollection(KEYS.APPOINTMENTS, appointments);

  window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));

  removeFromFirestore('appointments', id);
}

// Prevents scheduled collision on same date + time for same Doctor
export function checkAppointmentCollision(doctorId: string, date: string, time: string, excludeId?: string): boolean {
  const appointments = getAppointments();
  return appointments.some(a => 
    a.doctorId === doctorId && 
    a.date === date && 
    a.time === time && 
    a.status !== 'Cancelled' &&
    a.id !== excludeId
  );
}

// --- Medical Records ---
export function getMedicalRecords(): MedicalRecord[] {
  return getCollection<MedicalRecord>(KEYS.MEDICAL_RECORDS);
}

export function saveMedicalRecord(record: MedicalRecord): void {
  const records = getMedicalRecords();
  const index = records.findIndex(r => r.id === record.id);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }
  saveCollection(KEYS.MEDICAL_RECORDS, records);

  window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));

  // Sync to Firestore
  writeToFirestore('medical_records', record.id, record);
}

// --- Prescriptions ---
export function getPrescriptions(): Prescription[] {
  return getCollection<Prescription>(KEYS.PRESCRIPTIONS);
}

export function savePrescription(prescription: Prescription): void {
  const prescriptions = getPrescriptions();
  const index = prescriptions.findIndex(p => p.id === prescription.id);
  if (index >= 0) {
    prescriptions[index] = prescription;
  } else {
    prescriptions.push(prescription);
  }
  saveCollection(KEYS.PRESCRIPTIONS, prescriptions);

  window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));

  // Sync to Firestore
  writeToFirestore('prescriptions', prescription.id, prescription);
}

// --- Billing ---
export function getBillingInvoices(): BillingInvoice[] {
  return getCollection<BillingInvoice>(KEYS.BILLING);
}

export function saveBillingInvoice(invoice: BillingInvoice): void {
  const invoices = getBillingInvoices();
  const index = invoices.findIndex(i => i.id === invoice.id || i.invoiceNumber === invoice.invoiceNumber);
  const invoiceToSave = index >= 0 ? { ...invoices[index], ...invoice } : invoice;
  if (index >= 0) {
    invoices[index] = invoiceToSave;
  } else {
    invoices.push(invoiceToSave);
  }
  saveCollection(KEYS.BILLING, invoices);

  window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));

  // Sync to Firestore
  writeToFirestore('billing', invoiceToSave.id, invoiceToSave);
}

// --- Notifications ---
export function getNotifications(): AppNotification[] {
  return getCollection<AppNotification>(KEYS.NOTIFICATIONS);
}

export function saveNotification(notif: AppNotification): void {
  const notifications = getNotifications();
  const index = notifications.findIndex(n => n.id === notif.id);
  if (index >= 0) {
    notifications[index] = notif;
  } else {
    notifications.unshift(notif);
  }
  saveCollection(KEYS.NOTIFICATIONS, notifications);

  window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));

  // Sync to Firestore
  writeToFirestore('notifications', notif.id, notif);
}

export function triggerNotification(userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  const textId = 'not-' + Math.random().toString(36).substr(2, 9);
  const newNotif: AppNotification = {
    id: textId,
    userId,
    title,
    message,
    type,
    read: false,
    timestamp: new Date().toISOString()
  };
  saveNotification(newNotif);
}

// --- Departments ---
export function getDepartments(): Department[] {
  initializeDatabase();
  const raw = localStorage.getItem(KEYS.DEPARTMENTS);
  return raw ? JSON.parse(raw) : [];
}

export function saveDepartment(dept: Department): void {
  const depts = getDepartments();
  const index = depts.findIndex(d => d.id === dept.id || d.name.toLowerCase() === dept.name.toLowerCase());
  if (index >= 0) {
    depts[index] = { ...depts[index], ...dept };
  } else {
    depts.push(dept);
  }
  saveCollection(KEYS.DEPARTMENTS, depts);
  window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));
  writeToFirestore('departments', dept.id, dept);
}

export function deleteDepartment(id: string): void {
  const depts = getDepartments();
  const filtered = depts.filter(d => d.id !== id);
  saveCollection(KEYS.DEPARTMENTS, filtered);
  window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));
  removeFromFirestore('departments', id);
}

// --- Doctor Department Requests ---
export function getDoctorDepartmentRequests(): DoctorDepartmentRequest[] {
  initializeDatabase();
  const raw = localStorage.getItem(KEYS.DOCTOR_DEPARTMENT_REQUESTS);
  return raw ? JSON.parse(raw) : [];
}

export function saveDoctorDepartmentRequest(req: DoctorDepartmentRequest): void {
  const requests = getDoctorDepartmentRequests();
  const index = requests.findIndex(r => r.id === req.id);
  if (index >= 0) {
    requests[index] = { ...requests[index], ...req };
  } else {
    requests.push(req);
  }
  saveCollection(KEYS.DOCTOR_DEPARTMENT_REQUESTS, requests);
  window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));
  writeToFirestore('doctorDepartmentRequests', req.id, req);
}

export function deleteDoctorDepartmentRequest(id: string): void {
  const requests = getDoctorDepartmentRequests();
  const filtered = requests.filter(r => r.id !== id);
  saveCollection(KEYS.DOCTOR_DEPARTMENT_REQUESTS, filtered);
  window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));
  removeFromFirestore('doctorDepartmentRequests', id);
}
