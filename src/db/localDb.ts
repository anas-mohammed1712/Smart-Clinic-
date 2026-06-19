/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SEED_USERS, SEED_PATIENTS, SEED_DOCTORS, SEED_APPOINTMENTS, SEED_MEDICAL_RECORDS, SEED_PRESCRIPTIONS, SEED_BILLING, SEED_NOTIFICATIONS } from '../data/mockData';
import { User, PatientRecord, DoctorRecord, Appointment, MedicalRecord, Prescription, BillingInvoice, AppNotification, Department, DoctorDepartmentRequest } from '../types';
import { db, auth } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

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

export function setupFirestoreListeners(): void {
  if (listenersRegistered) return;
  listenersRegistered = true;

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
    onSnapshot(collection(db, path), (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => {
        items.push({ ...doc.data() });
      });
      // Update local cache
      saveCollection(key, items);
      // Dispatch sync event to notify any mounted visual views
      window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));
    }, (error) => {
      console.warn(`Firestore onSnapshot subscription failed/restricted for ${path}:`, error.message);
    });
  });
}

// Help initialize data if not present
export function initializeDatabase() {
  // Wipe old stale mock data when the dummy data deletion is requested
  if (!localStorage.getItem('smartclinic_dummy_data_cleared_v3')) {
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
    localStorage.setItem('smartclinic_dummy_data_cleared_v3', 'true');
  }

  if (!localStorage.getItem(KEYS.DEPARTMENTS)) {
    localStorage.setItem(KEYS.DEPARTMENTS, JSON.stringify([]));
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
  return getCollection<DoctorRecord>(KEYS.DOCTORS);
}

export function saveDoctor(doctor: DoctorRecord): void {
  const doctors = getDoctors();
  const index = doctors.findIndex(d => d.uid === doctor.uid || d.doctorId === doctor.doctorId);
  const doctorToSave = index >= 0 ? { ...doctors[index], ...doctor } : doctor;
  if (index >= 0) {
    doctors[index] = doctorToSave;
  } else {
    doctors.push(doctorToSave);
  }
  saveCollection(KEYS.DOCTORS, doctors);

  // Sync to general users if doctor specialty/details change
  const users = getUsers();
  const userIndex = users.findIndex(u => u.uid === doctorToSave.uid);
  if (userIndex >= 0) {
    users[userIndex].fullName = doctorToSave.fullName;
    users[userIndex].phone = doctorToSave.phone;
    users[userIndex].specialty = doctorToSave.specialty;
    users[userIndex].experience = doctorToSave.experience;
    users[userIndex].availability = doctorToSave.availability;
    saveCollection(KEYS.USERS, users);

    writeToFirestore('users', users[userIndex].uid, users[userIndex]);
  }

  window.dispatchEvent(new CustomEvent('smartclinic_db_sync'));

  // Sync to Firestore
  const docId = doctorToSave.uid || doctorToSave.doctorId;
  writeToFirestore('doctors', docId, doctorToSave);
}

export function deleteDoctor(uidOrId: string): void {
  const doctors = getDoctors().filter(d => d.uid !== uidOrId && d.doctorId !== uidOrId);
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
