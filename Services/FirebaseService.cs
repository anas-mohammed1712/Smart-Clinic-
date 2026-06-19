using SmartClinicManagementSystem.Models;

namespace SmartClinicManagementSystem.Services
{
    public class FirebaseService
    {
        private readonly List<User> _users = new();
        private readonly List<Patient> _patients = new();
        private readonly List<Doctor> _doctors = new();
        private readonly List<Appointment> _appointments = new();
        private readonly List<Prescription> _prescriptions = new();
        private readonly List<Invoice> _invoices = new();

        public FirebaseService()
        {
            SeedSampleData();
        }

        private void SeedSampleData()
        {
            // Seed Admin Clinician
            _users.Add(new User 
            { 
                Uid = "admin1", 
                FullName = "Dr. Arthur Pendelton", 
                Email = "admin@smartclinic.com", 
                Role = "Admin", 
                Phone = "+1 (555) 019-2831",
                Address = "77 Baker St, London, UK"
            });

            // Seed Doctor Consultant
            _users.Add(new User 
            { 
                Uid = "doc-sam", 
                FullName = "Dr. Samantha Reed", 
                Email = "sam.reed@smartclinic.com", 
                Role = "Doctor", 
                Phone = "+1 (555) 014-9921",
                Address = "12 Baker St, London, UK"
            });

            _doctors.Add(new Doctor
            {
                Uid = "doc-sam",
                DoctorId = "DOC-2041",
                FullName = "Dr. Samantha Reed",
                Specialty = "Dermatology",
                Experience = "12 Years",
                Email = "sam.reed@smartclinic.com",
                Phone = "+1 (555) 014-9921",
                Bio = "Board-certified dermatologist with over 12 years of experience focusing on advanced skincare.",
                Availability = new List<string> { "Monday", "Wednesday", "Friday" }
            });

            // Seed Receptionist
            _users.Add(new User 
            { 
                Uid = "receptionist1", 
                FullName = "Clara Oswald", 
                Email = "clara@smartclinic.com", 
                Role = "Receptionist", 
                Phone = "+1 (555) 012-3210" 
            });

            // Seed Outpatient
            _users.Add(new User 
            { 
                Uid = "patient1", 
                FullName = "Marcus Aurelius", 
                Email = "marcus@philosophy.com", 
                Role = "Patient", 
                Phone = "+1 (555) 015-7788",
                Address = "32 Roman Forum Blvd, London, UK"
            });

            _patients.Add(new Patient
            {
                Uid = "patient1",
                PatientId = "PT-1001",
                FullName = "Marcus Aurelius",
                Age = 38,
                Gender = "Male",
                Phone = "+1 (555) 015-7788",
                Address = "32 Roman Forum Blvd, London, UK",
                BloodType = "A+",
                MedicalHistory = "New patient registered via self-portal.",
                Email = "marcus@philosophy.com"
            });

            // Seed Initial Appointment
            _appointments.Add(new Appointment
            {
                Id = "APT-54011",
                PatientId = "PT-1001",
                PatientName = "Marcus Aurelius",
                DoctorId = "doc-sam",
                DoctorName = "Dr. Samantha Reed",
                Date = "2026-06-15",
                Time = "10:00",
                Status = "Pending",
                Symptoms = "Aggressive eczema flareup under right arm."
            });

            // Seed Invoice
            _invoices.Add(new Invoice
            {
                Id = "INV-78401",
                InvoiceNumber = "TAX-3041",
                PatientId = "PT-1001",
                PatientName = "Marcus Aurelius",
                Service = "Dermatology Consultation",
                Amount = 150.00m,
                PaymentMethod = "Card",
                Status = "Unpaid",
                Date = "2026-06-10"
            });
        }

        // --- User API ---
        public List<User> GetUsers() => _users;
        public User? Authenticate(string email, string password)
        {
            return _users.FirstOrDefault(u => u.Email.Equals(email, StringComparison.OrdinalIgnoreCase));
        }

        public void RegisterUser(User user)
        {
            if (!_users.Any(u => u.Uid == user.Uid))
            {
                _users.Add(user);
            }
        }

        // --- Outpatients API ---
        public List<Patient> GetPatients() => _patients;
        public void SavePatient(Patient patient)
        {
            var match = _patients.FirstOrDefault(p => p.Uid == patient.Uid || p.PatientId == patient.PatientId);
            if (match != null)
            {
                _patients.Remove(match);
            }
            _patients.Add(patient);
        }

        public void DeletePatient(string id)
        {
            _patients.RemoveAll(p => p.Uid == id || p.PatientId == id);
        }

        // --- Clinicians API ---
        public List<Doctor> GetDoctors() => _doctors;
        public void SaveDoctor(Doctor doc)
        {
            var match = _doctors.FirstOrDefault(d => d.Uid == doc.Uid || d.DoctorId == doc.DoctorId);
            if (match != null)
            {
                _doctors.Remove(match);
            }
            _doctors.Add(doc);
        }

        public void DeleteDoctor(string id)
        {
            _doctors.RemoveAll(d => d.Uid == id || d.DoctorId == id);
        }

        // --- Schedules Appts API ---
        public List<Appointment> GetAppointments() => _appointments;
        public void SaveAppointment(Appointment appt)
        {
            var match = _appointments.FirstOrDefault(a => a.Id == appt.Id);
            if (match != null)
            {
                _appointments.Remove(match);
            }
            _appointments.Add(appt);
        }

        // --- Prescriptions Rx API ---
        public List<Prescription> GetPrescriptions() => _prescriptions;
        public void SavePrescription(Prescription rx)
        {
            _prescriptions.Add(rx);
        }

        // --- Financial billing API ---
        public List<Invoice> GetInvoices() => _invoices;
        public void SaveInvoice(Invoice inv)
        {
            var match = _invoices.FirstOrDefault(i => i.Id == inv.Id);
            if (match != null)
            {
                _invoices.Remove(match);
            }
            _invoices.Add(inv);
        }
    }
}
