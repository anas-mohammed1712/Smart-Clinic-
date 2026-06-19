namespace SmartClinicManagementSystem.Models
{
    public class Doctor
    {
        public string Uid { get; set; } = string.Empty;
        public string DoctorId { get; set; } = string.Empty; // e.g., DOC-4041
        public string FullName { get; set; } = string.Empty;
        public string Specialty { get; set; } = "Dental Care";
        public string Experience { get; set; } = "5 Years";
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public List<string> Availability { get; set; } = new List<string> { "Monday", "Wednesday" };
        public string ProfileImage { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;
    }
}
