namespace SmartClinicManagementSystem.Models
{
    public class Appointment
    {
        public string Id { get; set; } = string.Empty;
        public string PatientId { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string DoctorId { get; set; } = string.Empty;
        public string DoctorName { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty; // YYYY-MM-DD
        public string Time { get; set; } = string.Empty; // HH:MM
        public string Status { get; set; } = "Pending"; // Pending, Approved, Completed, Cancelled
        public string Notes { get; set; } = string.Empty;
        public string Symptoms { get; set; } = string.Empty;
    }
}
