namespace SmartClinicManagementSystem.Models
{
    public class Patient
    {
        public string Uid { get; set; } = string.Empty; // links to User identity
        public string PatientId { get; set; } = string.Empty; // e.g., PT-1001
        public string FullName { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Gender { get; set; } = "Male";
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string BloodType { get; set; } = "O+";
        public string MedicalHistory { get; set; } = string.Empty;
        public string EmergencyContact { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string ProfileImage { get; set; } = string.Empty;
    }
}
