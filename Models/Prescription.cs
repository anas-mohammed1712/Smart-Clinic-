namespace SmartClinicManagementSystem.Models
{
    public class Prescription
    {
        public string Id { get; set; } = string.Empty; // Rx Code e.g. RX-19011
        public string PatientId { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string DoctorId { get; set; } = string.Empty;
        public string DoctorName { get; set; } = string.Empty;
        public string MedicineName { get; set; } = string.Empty;
        public string Dosage { get; set; } = "500mg";
        public string Frequency { get; set; } = "Once Daily";
        public string Duration { get; set; } = "7 Days";
        public string Notes { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty; // YYYY-MM-DD
    }
}
